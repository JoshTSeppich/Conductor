// MB-T22 WB4 GREEN — Commits tab renderer.
//
// Replaces the WB1 throwing stub with the real component:
//   - Renders Today / Yesterday / Older group containers via the
//     `groups` prop (test mode) or via internal state populated from
//     `bridge.listCommits()` on mount (production mode).
//   - Per-row content: short SHA + session-attribution chip + subject +
//     diff stat + time-ago.
//   - 60s setInterval refreshes time-ago text. The interval runs only
//     when `now` prop is undefined; tests pin `now` and bypass the
//     interval for determinism (Q-MBT22-6=a). The interval is cleared
//     on unmount — safe under multi-tab switching since ChatShell only
//     renders the active tab body.
//   - Empty / loading / error states surface their own data-testid
//     containers per the contract authored at WB1 in
//     test/unit/commits-tab/probe-01-render-and-grouping.spec.tsx.
//
// data-testid contract (probe-01 + WB4 wiring):
//   - commits-tab-root            outer container
//   - commits-tab-loading         loading row (effectiveLoading)
//   - commits-tab-error           error row (effectiveError non-null)
//   - commits-tab-empty           empty-state row (no groups)
//   - commits-tab-group-{label}   per-group container (today|yesterday|older)
//   - commits-tab-row-{shortSha}  per-commit row
//   - commits-tab-row-{shortSha}-attribution  session-attribution chip
//   - commits-tab-row-{shortSha}-time-ago     time-ago text (auto-updates)
//
// Props vs bridge state precedence:
//   - props.{groups, loading, error, now} win over bridge-driven internal
//     state when supplied (probe-03 fixture-driven mode).
//   - When `bridge` is supplied AND a prop is undefined, the bridge-
//     populated internal state fills in (production mode).
//   - When neither is supplied, empty-state row renders.

import { useEffect, useState, type ReactNode } from 'react';
import type { CommitGroup, CommitEntry } from './commits-reader.js';

/**
 * Renderer-side bridge surface — production source of truth is
 * `window.commitsBridge` exposed by preload.mts. Decoupled from
 * `import type { CommitsBridge }` over IPC to avoid pulling
 * `node:child_process` into the renderer bundle (CommitsBridge in
 * commits-ipc.ts is main-process-only).
 */
export interface CommitsBridge {
  readonly listCommits: (opts?: {
    readonly limit?: number;
  }) => Promise<{
    readonly groups: readonly CommitGroup[];
    readonly error?: string;
  }>;
}

export interface CommitsTabProps {
  /** Pre-grouped commits (test mode); when supplied, wins over bridge. */
  readonly groups?: readonly CommitGroup[];
  /** Loading flag; when supplied, wins over bridge state. */
  readonly loading?: boolean;
  /** Error string (or null); when supplied, wins over bridge state. */
  readonly error?: string | null;
  /** Injected for deterministic time-ago tests; defaults to internal Date. */
  readonly now?: Date;
  /** Production data source — when supplied, fetched on mount. */
  readonly bridge?: CommitsBridge;
}

export function CommitsTab(props: CommitsTabProps = {}): ReactNode {
  // Bridge-driven internal state — only populated when bridge is supplied.
  const [bridgeGroups, setBridgeGroups] = useState<
    readonly CommitGroup[] | undefined
  >(undefined);
  const [bridgeLoading, setBridgeLoading] = useState<boolean>(
    props.bridge !== undefined,
  );
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  // Internal "now" for the 60s tick. Recomputed at unmount + every
  // 60s. Only used when props.now is undefined.
  const [tickNow, setTickNow] = useState<Date>(() => new Date());

  // Bridge fetch on mount (production data path).
  useEffect(() => {
    const bridge = props.bridge;
    if (!bridge) return;
    let cancelled = false;
    setBridgeLoading(true);
    void bridge
      .listCommits({ limit: 50 })
      .then((res) => {
        if (cancelled) return;
        setBridgeGroups(res.groups);
        setBridgeError(res.error ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setBridgeError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (cancelled) return;
        setBridgeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [props.bridge]);

  // 60s tick for time-ago refresh — only when props.now is undefined.
  // Q-MBT22-6=a (component-local useEffect + setInterval(60_000)).
  useEffect(() => {
    if (props.now !== undefined) return;
    const id = setInterval(() => {
      setTickNow(new Date());
    }, 60_000);
    return () => {
      clearInterval(id);
    };
  }, [props.now]);

  // Resolve effective state — props win over bridge state.
  const effectiveGroups = props.groups ?? bridgeGroups;
  const effectiveLoading = props.loading ?? bridgeLoading;
  const effectiveError =
    props.error !== undefined ? props.error : bridgeError;
  const effectiveNow = props.now ?? tickNow;

  return (
    <div data-testid="commits-tab-root">
      {effectiveLoading ? (
        <div data-testid="commits-tab-loading">Loading commits…</div>
      ) : effectiveError ? (
        <div data-testid="commits-tab-error">{effectiveError}</div>
      ) : !effectiveGroups || effectiveGroups.length === 0 ? (
        <div data-testid="commits-tab-empty">No commits to display.</div>
      ) : (
        effectiveGroups.map((group) => (
          <CommitGroupRender
            key={group.label}
            group={group}
            now={effectiveNow}
          />
        ))
      )}
    </div>
  );
}

interface CommitGroupRenderProps {
  readonly group: CommitGroup;
  readonly now: Date;
}

function CommitGroupRender({ group, now }: CommitGroupRenderProps) {
  const labelTestid = group.label.toLowerCase();
  return (
    <div data-testid={`commits-tab-group-${labelTestid}`}>
      <div>{group.label}</div>
      {group.commits.map((c) => (
        <CommitRowRender key={c.sha} commit={c} now={now} />
      ))}
    </div>
  );
}

interface CommitRowRenderProps {
  readonly commit: CommitEntry;
  readonly now: Date;
}

function CommitRowRender({ commit, now }: CommitRowRenderProps) {
  const timeAgo = formatTimeAgo(commit.authoredAt, now);
  return (
    <div data-testid={`commits-tab-row-${commit.shortSha}`}>
      <span>{commit.shortSha}</span>
      <span data-testid={`commits-tab-row-${commit.shortSha}-attribution`}>
        {commit.sessionAttribution}
      </span>
      <span>{commit.subject}</span>
      <span>
        {commit.filesChanged} files +{commit.insertions} −{commit.deletions}
      </span>
      <span data-testid={`commits-tab-row-${commit.shortSha}-time-ago`}>
        {timeAgo}
      </span>
    </div>
  );
}

/**
 * Format a commit's authored time as a relative-to-`now` string. Buckets:
 *   < 60s     → "just now"
 *   < 60min   → "Xmin ago"
 *   < 24h     → "Xh ago"
 *   < 30d     → "Xd ago"
 *   ≥ 30d     → ISO date (YYYY-MM-DD)
 */
function formatTimeAgo(authoredAtIso: string, now: Date): string {
  const then = new Date(authoredAtIso).getTime();
  const nowMs = now.getTime();
  const deltaSec = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (deltaSec < 60) return 'just now';
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}min ago`;
  if (deltaSec < 86_400) return `${Math.floor(deltaSec / 3600)}h ago`;
  if (deltaSec < 30 * 86_400) return `${Math.floor(deltaSec / 86_400)}d ago`;
  return authoredAtIso.slice(0, 10);
}
