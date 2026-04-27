import type { ReactNode } from 'react';
import type {
  SessionResponseV2Type,
  StatusJson,
} from 'dispatch-core/src/v2/schema.js';
import { useUIStore } from '../store/ui.js';
import { useSession } from '../query/useSession.js';
import { formatAge } from '../utils/format-age.js';
import type { CommitEntry } from '../store/ui.js';
import { StateControlCluster } from './StateControlCluster.js';
import { SendButton } from './SendButton.js';

const PLACEHOLDER = 'Click a session card';
const LOADING = 'Loading session details…';
const ERROR = "Couldn't load session details";
const DASH = '—';

function latestActionMs(session: SessionResponseV2Type): number | null {
  const candidates: number[] = [];
  if (session.last_prompt_sent_at !== null) {
    candidates.push(Date.parse(session.last_prompt_sent_at));
  }
  if (session.last_handoff_pulled_at !== null) {
    candidates.push(Date.parse(session.last_handoff_pulled_at));
  }
  return candidates.length === 0 ? null : Math.max(...candidates);
}

function formatLastAction(session: SessionResponseV2Type): string {
  const ms = latestActionMs(session);
  return ms === null ? DASH : formatAge(Date.now() - ms);
}

// Per-field nullability per Decision 3: when status_json itself is
// null OR a specific field within is null, render em dash for that
// field. Avoids visual instability between sessions.
function formatTests(statusJson: StatusJson | null): string {
  if (!statusJson) return DASH;
  const passing =
    statusJson.tests_passing === null
      ? DASH
      : `${statusJson.tests_passing} passing`;
  const failing =
    statusJson.tests_failing === null
      ? DASH
      : `${statusJson.tests_failing} failing`;
  return `${passing} · ${failing}`;
}

function formatPhase(statusJson: StatusJson | null): string {
  if (!statusJson) return DASH;
  return statusJson.phase ?? DASH;
}

// 3-tier precedence per Decision 2 + TICKETS.md:
//   1. commitBySession[name] entry (GAP-2 reduce result) → full
//   2. session.last_commit_sha alone → sha-only fallback
//   3. neither → em dash
function formatCommit(
  commitEntry: CommitEntry | undefined,
  fallbackSha: string | null,
): string {
  if (commitEntry) {
    return `${commitEntry.sha} — ${commitEntry.subject} (${commitEntry.branch})`;
  }
  if (fallbackSha !== null) return fallbackSha;
  return DASH;
}

function Row({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}): ReactNode {
  return (
    <div
      data-testid={testId}
      className="flex justify-between gap-4 py-1 border-b border-gray-200 dark:border-gray-800 text-sm"
    >
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
}

export function FocusedDetailPanel(): ReactNode {
  const focusedName = useUIStore((s) => s.focusedSessionName);
  const commitBySession = useUIStore((s) => s.commitBySession);
  // useSession with empty name is disabled (T04 enabled: name.length > 0)
  const { data, isLoading, isError } = useSession(focusedName ?? '');

  // Common section wrapper preserves Layout's role=region + aria-label
  // (T06 contract); content swaps based on state.
  const wrap = (content: ReactNode) => (
    <section
      role="region"
      aria-label="Session detail"
      className="overflow-auto p-3"
    >
      {content}
    </section>
  );

  if (focusedName === null) {
    return wrap(<p className="text-gray-500 dark:text-gray-400">{PLACEHOLDER}</p>);
  }

  if (isLoading) {
    return wrap(
      <p className="text-gray-500 dark:text-gray-400">{LOADING}</p>,
    );
  }

  if (isError || !data) {
    return wrap(
      <p className="text-red-600 dark:text-red-400">{ERROR}</p>,
    );
  }

  const commitEntry = commitBySession[focusedName];

  return wrap(
    <div className="flex flex-col">
      <h2 className="text-base font-bold mb-2">{focusedName}</h2>
      <Row
        label="State"
        value={data.state.toUpperCase()}
        testId="detail-row-state"
      />
      <Row
        label="Status"
        value={data.computed_status}
        testId="detail-row-status"
      />
      <Row
        label="Last commit"
        value={formatCommit(commitEntry, data.last_commit_sha)}
        testId="detail-row-commit"
      />
      <Row
        label="Tests"
        value={formatTests(data.status_json)}
        testId="detail-row-tests"
      />
      <Row
        label="Phase"
        value={formatPhase(data.status_json)}
        testId="detail-row-phase"
      />
      <Row
        label="Last action"
        value={formatLastAction(data)}
        testId="detail-row-last-action"
      />
      <StateControlCluster session={data} name={focusedName} />
      <div className="flex gap-2 mt-2">
        <SendButton session={data} />
        {/* PullButton lands in WEB-T16 as sibling here. */}
      </div>
    </div>,
  );
}
