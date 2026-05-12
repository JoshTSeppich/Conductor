// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB2 (green) — Frame C top-level
// two-column layout component.
//
// Per ticket body a1f7a03 §1.1 item 3-4 + §4 WB2 acceptance:
//   - Top-level component renders `data-testid="frame-c-root"`.
//   - Two-column layout: session-list (left) + detail-pane (right).
//   - WB2 ships placeholder slot divs only:
//       <div data-testid="frame-c-session-list-col" /> — WB4 SessionList
//         component lands here.
//       <div data-testid="frame-c-detail-col" /> — WB8 DetailPane
//         component lands here.
//   - Selection state (Sub-Q-MBTWBFCS-A = α renderer-only) lives in
//     this component via `useState`; wired at WB6 GREEN.
//
// Frame Router CSS hook (per §C.1′ ticket #1 at 44764fd):
//   - `#shell[data-frame-mode='C']` selector scopes Frame C visibility.
//   - Frame C root mounts inside an element whose visibility is gated
//     by that attribute (workstation-shell.html DOM region; WB10
//     adds the region per HALT-WB10-PRE-COMMIT operator review).
//
// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB3 (green) — sessions-stream
// subscription source-of-truth surface per Sub-Q-T1-A=(α) renderer-only
// useState binding (operator-acked 2026-05-12, commit `ec60622`;
// binding interpretation per `ec60622` commit body: "independent
// subscription pattern mirroring tile-grid-app.tsx:159-185"):
//   - FrameCRootProps gains optional `workstationBridge` accepting a
//     narrow `{ onSpawnResult: (cb) => () => void }` shape (subset of
//     WorkstationBridgeShape at tile-grid-app.tsx:41-86). When provided,
//     FrameCRoot subscribes on mount via useEffect; each
//     SpawnSuccessReply (shape per tile-grid-app.tsx:121-141
//     `isSpawnSuccessReply`) appends a new TileGridSessionEntry to
//     internal `useState<TileGridSessionEntry[]>` with idempotent
//     dedup by `name` field (tile-grid-app.tsx:173 pattern).
//   - `sessions` prop continues to seed initial state (test fixtures +
//     parent-controlled mounts). When prop is provided and bridge is
//     not, behavior is unchanged from WB2 (controlled-from-above).
//     When BOTH are provided, prop seeds initial state and bridge
//     adds incremental updates — matches existing TileGridApp.

import { useEffect, useState, type CSSProperties } from 'react';
import type { TileGridSessionEntry } from '../tile-grid/tile-grid.js';
import { SessionList } from './session-list.js';
import { DetailPane } from './detail-pane.js';

// Narrow subset of WorkstationBridgeShape (tile-grid-app.tsx:41-86)
// — only the onSpawnResult method is load-bearing for T1 WB3 sessions-
// stream subscription. Keeps Frame C's bridge coupling minimal.
export interface FrameCWorkstationBridge {
  readonly onSpawnResult: (
    cb: (reply: unknown) => void,
  ) => () => void;
}

// SpawnSuccessReply parser — mirrors tile-grid-app.tsx:121-141
// `isSpawnSuccessReply` contract verbatim so Frame C's stream consumer
// matches TileGridApp's exactly (single-source-of-truth for the wire
// shape; duplication here is intentional per anti-abstraction CLAUDE.md
// guidance — extracting to a shared util would couple frame-c/ to
// tile-grid/ internals beyond the TileGridSessionEntry type already
// re-exported).
interface SpawnSuccessReply {
  type: 'success';
  result: {
    sessionName: string;
    cwd?: string;
  };
}

function isSpawnSuccessReply(x: unknown): x is SpawnSuccessReply {
  if (x === null || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  if (r['type'] !== 'success') return false;
  const result = r['result'];
  if (result === null || typeof result !== 'object') return false;
  const sessionName = (result as Record<string, unknown>)['sessionName'];
  return typeof sessionName === 'string' && sessionName.length > 0;
}

const ROOT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  height: '100%',
  width: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

const SESSION_LIST_COL_STYLE: CSSProperties = {
  // Wireframe-recommended primary mode (per audit §3 Dim 1) puts the
  // session list as a narrower left column. 280px is a placeholder
  // matching the existing splitter default (chat-region pattern);
  // refine when WB4 SessionList renders real rows + operator gives
  // visual feedback at WB11 smoke.
  width: '280px',
  flexShrink: 0,
  borderRight: '1px solid #303030',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

const DETAIL_COL_STYLE: CSSProperties = {
  flex: '1 1 auto',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

export interface FrameCRootProps {
  /**
   * Sessions to render in the SessionList column (WB4). Defaults to []
   * (empty list) when omitted — matches WB3 probe Condition (5) empty-
   * state contract.
   *
   * MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB3: when provided, seeds the
   * internal sessions state; subsequent bridge-emitted spawn-results
   * append incrementally with dedup-by-name. When omitted, internal
   * state starts empty and is driven entirely by the bridge stream.
   */
  readonly sessions?: readonly TileGridSessionEntry[];
  /**
   * WB6 GREEN wires this through to SessionList.onSelect + DetailPane
   * selectedSessionName per Sub-Q-MBTWBFCS-A=α renderer-only selection
   * state. WB4 leaves selection logic to WB6.
   */
  readonly onSelectSession?: (sessionName: string) => void;
  readonly selectedSessionName?: string | null;
  /**
   * MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB3 — workstationBridge for
   * sessions-stream subscription per Sub-Q-T1-A=(α) renderer-only
   * useState binding (operator-acked 2026-05-12, ec60622). When
   * provided, FrameCRoot subscribes via useEffect to
   * bridge.onSpawnResult; each SpawnSuccessReply appends a new
   * TileGridSessionEntry with idempotent dedup by `name` field
   * (mirroring tile-grid-app.tsx:159-185 pattern). When undefined
   * (test fixtures, parent-controlled mounts), no subscription is
   * created — behavior reduces to WB2 controlled-from-above mode.
   *
   * CLOSES MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION (Tier 2,
   * FOLLOWUPS.md:327, filed at e2688fa) at WB4 GREEN when
   * tile-grid/mount.ts:175-181 `tryAutoMountFrameC` passes
   * window.workstationBridge through to this prop.
   */
  readonly workstationBridge?: FrameCWorkstationBridge;
}

/**
 * Frame C top-level two-column shell. WB2 rendered empty slot divs;
 * WB4 wires SessionList into the left column. WB8 wires DetailPane
 * into the right column.
 *
 * MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB3: when `workstationBridge`
 * prop is provided, internal `useState<TileGridSessionEntry[]>` is the
 * sessions source-of-truth and subscribes to bridge.onSpawnResult.
 * When `sessions` prop is provided without bridge, behaviour is
 * unchanged from WB2 (controlled-from-above; SessionList renders the
 * prop directly). Both-provided seeds initial state from prop +
 * appends from bridge.
 */
export function FrameCRoot(props: FrameCRootProps): JSX.Element {
  const {
    sessions: initialSessions,
    onSelectSession: externalOnSelect,
    selectedSessionName: externalSelected,
    workstationBridge,
  } = props;

  // MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB3 — sessions state. When
  // `initialSessions` prop omitted, starts empty []; when provided,
  // seeds initial state. When `workstationBridge` is also provided,
  // the useEffect below subscribes to spawn-result emissions and
  // appends new entries with name-dedup.
  const [sessions, setSessions] = useState<readonly TileGridSessionEntry[]>(
    initialSessions ?? [],
  );

  // MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB3 — sessions-stream
  // subscription (independent subscription pattern per Sub-Q-T1-A=α
  // operator binding; mirrors tile-grid-app.tsx:159-185). When the
  // bridge is undefined, no subscription is created and `sessions`
  // remains whatever `initialSessions` seeded (or empty).
  useEffect(() => {
    if (!workstationBridge) return undefined;
    return workstationBridge.onSpawnResult((reply) => {
      if (!isSpawnSuccessReply(reply)) return;
      const sessionName = reply.result.sessionName;
      const replyCwd = reply.result.cwd;
      setSessions((current) => {
        // Idempotent dedup — duplicate spawn-result for the same name
        // (e.g., daemon recovery re-fire) does NOT add a second row.
        // Mirrors tile-grid-app.tsx:173 guard.
        if (current.some((s) => s.name === sessionName)) return current;
        return [
          ...current,
          {
            name: sessionName,
            ...(typeof replyCwd === 'string' && replyCwd.length > 0
              ? { cwd: replyCwd }
              : {}),
          },
        ];
      });
    });
  }, [workstationBridge]);

  // WB6 — Sub-Q-MBTWBFCS-A=α renderer-only selection state (operator-
  // acked 2026-05-11 via orchestrator-mediated paste). Internal useState
  // is the default selection source; an external `selectedSessionName`
  // prop takes precedence (controlled-component pattern) so the parent
  // can pin a selection from above when needed. Both paths invoke
  // `externalOnSelect` if provided so the parent can observe selection
  // changes without driving them.
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const selected =
    externalSelected !== undefined ? externalSelected : internalSelected;

  const handleSelect = (name: string): void => {
    if (externalSelected === undefined) {
      setInternalSelected(name);
    }
    externalOnSelect?.(name);
  };

  // MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB4 — look up the selected
  // session's tokens for DetailPane's ctx N% rendering. Lookup
  // returns undefined if not found (e.g., stale selection), which
  // DetailPane handles as the "ctx 0%" fallback.
  const selectedEntry =
    selected !== null ? sessions.find((s) => s.name === selected) : undefined;

  return (
    <div data-testid="frame-c-root" style={ROOT_STYLE}>
      <div
        data-testid="frame-c-session-list-col"
        style={SESSION_LIST_COL_STYLE}
      >
        <SessionList
          sessions={sessions}
          onSelect={handleSelect}
          selectedSessionName={selected}
        />
      </div>
      <div data-testid="frame-c-detail-col" style={DETAIL_COL_STYLE}>
        {selected !== null && (
          <DetailPane
            selectedSessionName={selected}
            tokensUsed={selectedEntry?.tokensUsed}
            tokenBudget={selectedEntry?.tokenBudget}
          />
        )}
      </div>
    </div>
  );
}
