// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB8 (green) — DetailPane: renders
// the swarm-state.md section for the currently-selected session.
//
// Per ticket body a1f7a03 §4 WB8 + Sub-Q-MBTWBFCS-B=i operator-pre-
// arbitrated 2026-05-11:
//   - Mounted by FrameCRoot ONLY when `selectedSessionName !== null`
//     (render-gating; Condition (a) of WB7 probe-mbtwbfcs-04).
//   - On selection-change, queries `window.workstationBridge.readSwarmState()`
//     to fetch full swarm-state.md content. Bridge wired at preload.mts
//     extension + main.ts `workstation:read-swarm-state` IPC handler
//     (WB8 GREEN; WORKSTATION_CONTRACT.md §6 amendment territory per
//     CLAUDE.md §2.4 → HALT-WB8-PRE-COMMIT operator review).
//   - Parses per-session sections from returned markdown text. The
//     parser looks for lines matching `- sessionName: <name>` /
//     `sessionName: <name>` / `peer_session: <name>` (canonical
//     swarm-state.md emission patterns per swarm-state-writer.ts:252/
//     313); captures from match until the next session-marker line.
//   - Renders `data-testid="frame-c-detail-pane"` with the extracted
//     section text in a <pre>-formatted block. Empty/no-match state
//     surfaces honest "no swarm-state section found" placeholder.
//
// Lifecycle:
//   - useEffect on `selectedSessionName` change → re-invokes the bridge
//     + re-parses. Cancellation via local `cancelled` flag prevents
//     state updates after unmount or rapid selection-changes (avoids
//     React's "set state on unmounted component" warning).
//   - Errors (bridge missing OR read failure) surface as inline error
//     text; do not crash the parent. ENOENT (swarm-state.md not yet
//     written by HSO) returns empty string from IPC → parser surfaces
//     "no swarm-state section found" placeholder honestly.

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { ActionBar, type ActionBarFailureState } from './action-bar.js';

// MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB4 GREEN — flex column layout
// places swarm-state body on top (flex:1, overflow:auto) and ActionBar
// at the bottom (flex-shrink:0) per Sub-Q-MBTWFT3-B=(i) inside-DetailPane-
// bottom-right operator arbitration 2026-05-12. height:100% inherits
// from the FrameCRoot detail-col flexbox host (frame-c-root.tsx:48-52
// DETAIL_COL_STYLE flex:1+overflow:auto).
const DETAIL_PANE_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  boxSizing: 'border-box',
  color: '#dddddd',
};

const DETAIL_PANE_BODY_STYLE: CSSProperties = {
  flex: '1 1 auto',
  overflowY: 'auto',
  padding: '12px',
  fontFamily: 'monospace',
  fontSize: '13px',
  boxSizing: 'border-box',
};

// ActionBar host: flex-shrink:0 anchors it to the bottom; border-top
// separates from scrollable body region above.
const DETAIL_PANE_FOOTER_STYLE: CSSProperties = {
  flexShrink: 0,
  borderTop: '1px solid #303030',
  padding: '8px 12px',
  display: 'flex',
  justifyContent: 'flex-end',
};

const META_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '8px',
  marginBottom: '8px',
};

const HEADER_STYLE: CSSProperties = {
  fontSize: '12px',
  color: '#888888',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

// MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB4 — ctx N% inline label.
// marginLeft:auto right-aligns within the meta-row flex container,
// placing ctx-text alongside (not below) the session-name header per
// Sub-Q-MBTWTWS-B=(a) inline-not-stacked format.
const CTX_TEXT_STYLE: CSSProperties = {
  fontSize: '11px',
  color: '#9ca3af',
  marginLeft: 'auto',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

const PRE_STYLE: CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
  lineHeight: 1.4,
};

const ERROR_STYLE: CSSProperties = {
  color: '#ff8888',
};

export interface DetailPaneProps {
  /**
   * The currently-selected session's name. FrameCRoot gates the render
   * on `selected !== null`; this component assumes a valid session name.
   */
  readonly selectedSessionName: string;
  /**
   * Tokens consumed in the selected session's current window. Sourced
   * from the corresponding TileGridSessionEntry via FrameCRoot's
   * sessions[] lookup. Optional — undefined/missing renders ctx 0%
   * (honest "no data yet" surface for sessions pre-first-scrape).
   */
  readonly tokensUsed?: number;
  /**
   * Token budget (model context window). Optional — undefined or 0
   * renders ctx 0% fallback (avoids divide-by-zero).
   */
  readonly tokenBudget?: number;
}

interface WorkstationBridgeShape {
  readSwarmState?: () => Promise<string>;
  // MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB4 GREEN — existing kill IPC
  // bridge per MB-T11 WB3 (preload.mts:137). Sub-Q-MBTWFT3-A=(α) reuse:
  // payload shape `{sessionName}` per WorkstationSessionKillRequestSchema
  // (dispatch-core/src/v3/schema.ts:1030). Return shape: SessionKillReply
  // discriminated union (handled at WB6 via adaptSessionKillFailure).
  killSession?: (payload: { sessionName: string }) => Promise<unknown>;
}

// MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB4 GREEN — frame-c bridge
// (separate `contextBridge.exposeInMainWorld('frameCBridge', ...)`
// binding per Wave C #3 §6.6 Channel #2/#3/#4 signatures). Methods
// take BARE sessionName arg (distinct from workstationBridge.killSession
// payload-object shape).
interface FrameCBridgeShape {
  diff?: (sessionName: string) => Promise<unknown>;
  merge?: (sessionName: string) => Promise<unknown>;
  focus?: (sessionName: string) => Promise<unknown>;
}

interface WindowWithBridge {
  workstationBridge?: WorkstationBridgeShape;
  frameCBridge?: FrameCBridgeShape;
}

/**
 * Extracts the section of swarm-state.md text corresponding to the
 * given session name. A "section" starts at a line whose trimmed form
 * starts with one of:
 *   - `- sessionName: <name>`
 *   - `sessionName: <name>`
 *   - `peer_session: <name>`
 * and continues until the next line matching ANY session-marker
 * (regardless of name) or end-of-document.
 *
 * Multiple matches for the same name are concatenated with a `---`
 * separator. No-match returns the empty string (caller surfaces
 * placeholder copy).
 */
export function extractSwarmStateSection(text: string, sessionName: string): string {
  const lines = text.split('\n');
  const matchesTarget = (line: string): boolean => {
    const t = line.trim();
    return (
      t.startsWith(`- sessionName: ${sessionName}`) ||
      t.startsWith(`sessionName: ${sessionName}`) ||
      t.startsWith(`peer_session: ${sessionName}`)
    );
  };
  const isAnySessionStart = (line: string): boolean => {
    const t = line.trim();
    return (
      /^- sessionName:\s/.test(t) ||
      /^sessionName:\s/.test(t) ||
      /^peer_session:\s/.test(t)
    );
  };

  const sections: string[] = [];
  let inSection = false;
  let buf: string[] = [];

  for (const line of lines) {
    if (matchesTarget(line)) {
      if (inSection && buf.length > 0) {
        sections.push(buf.join('\n'));
      }
      buf = [line];
      inSection = true;
    } else if (inSection) {
      if (isAnySessionStart(line)) {
        sections.push(buf.join('\n'));
        buf = [];
        inSection = false;
      } else {
        buf.push(line);
      }
    }
  }
  if (inSection && buf.length > 0) {
    sections.push(buf.join('\n'));
  }

  return sections.join('\n\n---\n\n');
}

export function DetailPane(props: DetailPaneProps): JSX.Element {
  const { selectedSessionName, tokensUsed, tokenBudget } = props;
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB4 GREEN — placeholder for
  // failure-banner UX. WB6 wires the SessionKillError adapter +
  // FrameCActionError plumb-through; WB4 ships bare bridge invocation
  // only (call-shape correctness per WB3 probe). Setter retained for
  // WB6 wiring; reads only flow through to ActionBar's failureState
  // prop today (which is null → no banner per Wave C #3 probe-05a).
  const [failureState] = useState<ActionBarFailureState | null>(null);

  // Guard tokenBudget undefined/0 to avoid NaN (0/0) or Infinity (n/0).
  // Fallback ctxPct=0 → "ctx 0%" surface (honest "no data yet").
  const ctxPct =
    tokenBudget !== undefined && tokenBudget > 0
      ? Math.round(((tokensUsed ?? 0) / tokenBudget) * 100)
      : 0;

  // MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB4 GREEN — bridge plumb
  // useCallbacks. Resolves bridges via `globalThis.window` lookup
  // mirroring existing `WindowWithBridge` pattern. WB4 fires-and-
  // forgets the bridge call; WB6 will await + plumb result through
  // `failureState` setter for the failure-banner UX.
  const handleDiff = useCallback((sessionName: string): void => {
    const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
    const bridge = win?.frameCBridge;
    if (!bridge?.diff) return;
    void bridge.diff(sessionName);
  }, []);
  const handleMerge = useCallback((sessionName: string): void => {
    const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
    const bridge = win?.frameCBridge;
    if (!bridge?.merge) return;
    void bridge.merge(sessionName);
  }, []);
  const handleFocus = useCallback((sessionName: string): void => {
    const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
    const bridge = win?.frameCBridge;
    if (!bridge?.focus) return;
    void bridge.focus(sessionName);
  }, []);
  const handleKill = useCallback((sessionName: string): void => {
    const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
    const bridge = win?.workstationBridge;
    if (!bridge?.killSession) return;
    // PAYLOAD-OBJECT shape per WorkstationSessionKillRequestSchema at
    // dispatch-core/src/v3/schema.ts:1030 (distinct from frameCBridge
    // bare-sessionName signature).
    void bridge.killSession({ sessionName });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
    const bridge = win?.workstationBridge;
    if (!bridge?.readSwarmState) {
      setError('workstationBridge.readSwarmState unavailable');
      setContent('');
      return;
    }
    void bridge
      .readSwarmState()
      .then((text: string) => {
        if (cancelled) return;
        const section = extractSwarmStateSection(text, selectedSessionName);
        setContent(section);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(String(e));
        setContent('');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSessionName]);

  const body = error
    ? `Error reading swarm-state: ${error}`
    : content.length > 0
      ? content
      : `No swarm-state section found for session "${selectedSessionName}".`;

  return (
    <div data-testid="frame-c-detail-pane" style={DETAIL_PANE_STYLE}>
      <div style={DETAIL_PANE_BODY_STYLE}>
        <div style={META_ROW_STYLE}>
          <div style={HEADER_STYLE}>{selectedSessionName}</div>
          <span
            data-testid="frame-c-detail-pane-ctx-text"
            style={CTX_TEXT_STYLE}
          >
            ctx {ctxPct}%
          </span>
        </div>
        <pre style={error ? { ...PRE_STYLE, ...ERROR_STYLE } : PRE_STYLE}>
          {body}
        </pre>
      </div>
      <div style={DETAIL_PANE_FOOTER_STYLE}>
        <ActionBar
          sessionName={selectedSessionName}
          onDiff={handleDiff}
          onMerge={handleMerge}
          onFocus={handleFocus}
          onKill={handleKill}
          failureState={failureState}
        />
      </div>
    </div>
  );
}
