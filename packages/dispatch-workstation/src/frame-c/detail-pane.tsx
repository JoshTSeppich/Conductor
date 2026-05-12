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

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ActionBar, type ActionBarFailureState } from './action-bar.js';
import { TerminalHeaderBar } from './terminal-header-bar.js';
import { TerminalStream } from './terminal-stream.js';
import { ToolIndicatorStrip } from './tool-indicator-strip.js';
import { parseToolIndicators } from './tool-indicator-parser.js';
import type { ConsoleBridge } from '../main/console-bridge.js';
import type { TerminalAdapter } from '../console-panel/terminal-adapter.js';

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
// separates from scrollable body region above. WB8 GREEN — removed
// `justifyContent: 'flex-end'` so ActionBar fills width (ActionBar's
// internal flex space-between distributes bypass-perms indicator +
// source-label LEFT and 4 buttons RIGHT per wireframe).
const DETAIL_PANE_FOOTER_STYLE: CSSProperties = {
  flexShrink: 0,
  borderTop: '1px solid #303030',
  padding: '8px 12px',
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
  /**
   * MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB8 GREEN — Sub-Q-E=(ii)
   * per-session spawn-mode for the bypass-perms indicator. 'auto' →
   * indicator renders (session spawned with
   * `--dangerously-skip-permissions`). 'ask' OR undefined → hidden.
   * Threaded down to ActionBar's `spawnMode` prop verbatim.
   *
   * FrameCRoot currently passes undefined ship-shy because
   * `TileGridSessionEntry.spawnMode` field is absent at HEAD —
   * tracked at `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` Tier 2.
   * Future T1-territory work threads `TileGridSessionEntry.spawnMode`
   * from spawn-result into this prop.
   */
  readonly spawnMode?: 'auto' | 'ask';
  /**
   * MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB11 — branch name
   * threaded into TerminalHeaderBar's left slot
   * (`<sessionName> @ <branchName>`). Optional; absent renders
   * em-dash placeholder per HALT-WB3 operator-acked convention.
   */
  readonly branchName?: string;
  /**
   * MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB11 + WB2 — CONSOLE-
   * T02 bridge for the embedded TerminalStream Live-tab PTY
   * subscription. Optional: when present, DetailPane renders the
   * HYBRID tab strip (Sub-Q-MBTWFT2-A=ii operator-acked) with "Live"
   * (default) and "Summary" tabs. When absent, DetailPane falls back
   * to the Summary-only render (existing Wave B behavior). FrameCRoot
   * threads this via mount.tsx propagation (WB12 wiring point).
   */
  readonly consoleBridge?: ConsoleBridge;
  /**
   * MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB11 + WB2 — terminal
   * adapter factory for the embedded TerminalStream xterm renderer.
   * Same optionality semantics as `consoleBridge`.
   */
  readonly createTerminal?: () => TerminalAdapter;
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

// MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB6 GREEN — SessionKillError shape.
// Matches `session-kill-ipc.ts:61-86` (MB-T11 WB3) verbatim. Renderer-
// local mirror (not imported from main process per audit §4.1 main-
// process module-boundary discipline).
type SessionKillError =
  | { error_type: 'SchemaValidationError'; field_path: string; reason: string }
  | { error_type: 'SessionNotFoundError'; sessionName: string }
  | { error_type: 'TmuxKillError'; sessionName: string; reason: string }
  | {
      error_type: 'DaemonUnreachable';
      sessionName: string;
      reason: string;
      tmuxKillSucceeded: boolean;
    };

type SessionKillReply = { ok: true } | { ok: false; error: SessionKillError };

// MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB6 GREEN — adapter mapping nested
// `SessionKillReply` (workstationBridge.killSession return shape) into
// the flat `ActionBarFailureState` consumed by the existing failure-
// banner UX (Wave C #3 WB6 `cdf05db`). Top-level pure function for
// unit-testability + isolation from React lifecycle. Returns null on
// success → caller clears failureState; non-null on failure → caller
// sets failureState.
export function adaptSessionKillFailure(
  reply: SessionKillReply,
): ActionBarFailureState | null {
  if (reply.ok) return null;
  const e = reply.error;
  let message: string;
  switch (e.error_type) {
    case 'SchemaValidationError':
      message = `${e.field_path}: ${e.reason}`;
      break;
    case 'SessionNotFoundError':
      message = `session "${e.sessionName}" not found`;
      break;
    case 'TmuxKillError':
      message = e.reason;
      break;
    case 'DaemonUnreachable':
      message = `daemon unreachable (tmux kill ${
        e.tmuxKillSucceeded ? 'succeeded' : 'failed'
      }): ${e.reason}`;
      break;
  }
  return {
    action: 'kill',
    result: { ok: false, error_type: e.error_type, message },
  };
}

// MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB6 GREEN — FrameCActionError flat
// shape used by frameCBridge.{diff,merge,focus} return values (mirrors
// frame-c-ipc.ts:67-104). Discriminator `ok:false` + `error_type` +
// `message` + optional `conflictFiles` (MergeConflict variant).
interface FrameCActionFailure {
  ok: false;
  error_type: string;
  message: string;
  conflictFiles?: readonly string[];
}

interface FrameCDiffSuccess {
  ok: true;
  diffText: string;
}

interface FrameCActionGenericSuccess {
  ok: true;
}

type FrameCBridgeResult =
  | FrameCDiffSuccess
  | FrameCActionGenericSuccess
  | FrameCActionFailure;

function isFrameCFailure(r: unknown): r is FrameCActionFailure {
  return (
    typeof r === 'object' &&
    r !== null &&
    (r as { ok?: unknown }).ok === false &&
    typeof (r as { error_type?: unknown }).error_type === 'string' &&
    typeof (r as { message?: unknown }).message === 'string'
  );
}

function isFrameCDiffSuccess(r: unknown): r is FrameCDiffSuccess {
  return (
    typeof r === 'object' &&
    r !== null &&
    (r as { ok?: unknown }).ok === true &&
    typeof (r as { diffText?: unknown }).diffText === 'string'
  );
}

function isSessionKillReply(r: unknown): r is SessionKillReply {
  if (typeof r !== 'object' || r === null) return false;
  const ok = (r as { ok?: unknown }).ok;
  return ok === true || ok === false;
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

// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB11 — chunk-buffer cap
// for per-session PTY chunk accumulation used by ToolIndicatorStrip
// parsing. 16KB is well above the typical CC indicator block size
// (Cooking + tool-event lines from a single round) while bounding
// memory growth across long-running sessions. Buffer truncates from
// the front when over cap.
const CHUNK_BUFFER_CAP = 16_384;

const TAB_STRIP_STYLE: CSSProperties = {
  display: 'flex',
  gap: '4px',
  padding: '4px 12px',
  borderBottom: '1px solid #303030',
  background: '#0a0a0a',
};

const TAB_BUTTON_STYLE_BASE: CSSProperties = {
  padding: '4px 10px',
  fontFamily: 'inherit',
  fontSize: '11px',
  background: 'transparent',
  color: '#888888',
  border: '1px solid transparent',
  cursor: 'pointer',
};

const TAB_BUTTON_STYLE_ACTIVE: CSSProperties = {
  ...TAB_BUTTON_STYLE_BASE,
  color: '#dddddd',
  borderColor: '#444444',
};

const TAB_PANEL_STYLE: CSSProperties = {
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
};

export function DetailPane(props: DetailPaneProps): JSX.Element {
  const {
    selectedSessionName,
    tokensUsed,
    tokenBudget,
    spawnMode,
    branchName,
    consoleBridge,
    createTerminal,
  } = props;
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // MB-T-WIREFRAME-T2 WB11 — per-session PTY chunk-buffer for
  // ToolIndicatorStrip parsing. Reset on selection-change so the
  // previous session's tool events do not leak into the new
  // session's indicator strip.
  const [chunkBuffer, setChunkBuffer] = useState<string>('');
  // HYBRID tab state per Sub-Q-MBTWFT2-A=(ii) operator-acked default.
  // 'live' is the default active tab so the wireframe-primary view
  // shows immediately on selection. Summary tab is rendered with CSS
  // visibility toggle (display:none) — NOT React unmount — so the
  // xterm scrollback in the Live tab is preserved across tab toggles
  // (ticket §8 risk register: Sub-Q-A=(ii) tab-switch xterm-loss
  // mitigation).
  const [activeTab, setActiveTab] = useState<'live' | 'summary'>('live');
  // MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB6 GREEN — failureState now
  // stateful (WB4 ship was read-only placeholder). Handlers await
  // bridge calls + set on failure; Dismiss callback clears to null.
  const [failureState, setFailureState] = useState<ActionBarFailureState | null>(
    null,
  );
  // MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB6 GREEN — diff result text for
  // Sub-Q-MBTWFT3-C=(i) inline-expansion-below-ActionBar rendering.
  // Cleared on any new action click (operator may re-click Diff to
  // refresh OR click Merge/Focus/Kill which implicitly clears prior
  // diff). null → no diff `<pre>` rendered.
  const [diffOutput, setDiffOutput] = useState<string | null>(null);

  // Guard tokenBudget undefined/0 to avoid NaN (0/0) or Infinity (n/0).
  // Fallback ctxPct=0 → "ctx 0%" surface (honest "no data yet").
  const ctxPct =
    tokenBudget !== undefined && tokenBudget > 0
      ? Math.round(((tokensUsed ?? 0) / tokenBudget) * 100)
      : 0;

  // MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB6 GREEN — bridge plumb
  // useCallbacks. Resolves bridges via `globalThis.window` lookup
  // mirroring existing `WindowWithBridge` pattern. Awaits bridge call
  // + on `{ok:false}` sets failureState; on diff `{ok:true}` populates
  // diffOutput state for inline rendering (Sub-Q-C=(i)).
  const handleDiff = useCallback((sessionName: string): void => {
    const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
    const bridge = win?.frameCBridge;
    if (!bridge?.diff) return;
    setDiffOutput(null); // clear prior diff before new action
    void (async () => {
      try {
        const result = (await bridge.diff(sessionName)) as FrameCBridgeResult;
        if (isFrameCFailure(result)) {
          setFailureState({
            action: 'diff',
            result: {
              ok: false,
              error_type: result.error_type,
              message: result.message,
              // conflictFiles is a MergeConflict-only field; diff never
              // populates it. Pass through if (defensively) present.
              ...(result.conflictFiles !== undefined
                ? { conflictFiles: result.conflictFiles }
                : {}),
            },
          });
        } else if (isFrameCDiffSuccess(result)) {
          setFailureState(null);
          setDiffOutput(result.diffText);
        }
      } catch {
        // Bridge invocation threw (rejection beyond discriminated union).
        // Surface as a generic failure banner; absent a specific
        // error_type from the IPC layer, label it as a bridge-level
        // exception per honest-surface discipline.
        setFailureState({
          action: 'diff',
          result: { ok: false, error_type: 'BridgeError', message: 'frameCBridge.diff threw' },
        });
      }
    })();
  }, []);
  const handleMerge = useCallback((sessionName: string): void => {
    const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
    const bridge = win?.frameCBridge;
    if (!bridge?.merge) return;
    setDiffOutput(null);
    void (async () => {
      try {
        const result = (await bridge.merge(sessionName)) as FrameCBridgeResult;
        if (isFrameCFailure(result)) {
          setFailureState({
            action: 'merge',
            result: {
              ok: false,
              error_type: result.error_type,
              message: result.message,
              ...(result.conflictFiles !== undefined
                ? { conflictFiles: result.conflictFiles }
                : {}),
            },
          });
        } else {
          setFailureState(null);
        }
      } catch {
        setFailureState({
          action: 'merge',
          result: { ok: false, error_type: 'BridgeError', message: 'frameCBridge.merge threw' },
        });
      }
    })();
  }, []);
  const handleFocus = useCallback((sessionName: string): void => {
    const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
    const bridge = win?.frameCBridge;
    if (!bridge?.focus) return;
    setDiffOutput(null);
    void (async () => {
      try {
        const result = (await bridge.focus(sessionName)) as FrameCBridgeResult;
        if (isFrameCFailure(result)) {
          setFailureState({
            action: 'focus',
            result: {
              ok: false,
              error_type: result.error_type,
              message: result.message,
            },
          });
        } else {
          setFailureState(null);
        }
      } catch {
        setFailureState({
          action: 'focus',
          result: { ok: false, error_type: 'BridgeError', message: 'frameCBridge.focus threw' },
        });
      }
    })();
  }, []);
  const handleKill = useCallback((sessionName: string): void => {
    const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
    const bridge = win?.workstationBridge;
    if (!bridge?.killSession) return;
    setDiffOutput(null);
    void (async () => {
      try {
        // PAYLOAD-OBJECT shape per WorkstationSessionKillRequestSchema
        // (distinct from frameCBridge bare-sessionName).
        const result = await bridge.killSession({ sessionName });
        if (isSessionKillReply(result)) {
          const adapted = adaptSessionKillFailure(result);
          setFailureState(adapted);
        }
      } catch {
        setFailureState({
          action: 'kill',
          result: { ok: false, error_type: 'BridgeError', message: 'workstationBridge.killSession threw' },
        });
      }
    })();
  }, []);
  const handleDismissFailure = useCallback((): void => {
    setFailureState(null);
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

  // MB-T-WIREFRAME-T2 WB11 — PTY chunk accumulator for the
  // ToolIndicatorStrip parser. Listener-only (NO openPanel here —
  // TerminalStream owns that lifecycle per spike ADR §3.1). Reset
  // buffer on selection-change. Cap at CHUNK_BUFFER_CAP bytes.
  useEffect(() => {
    if (!consoleBridge) return undefined;
    setChunkBuffer('');
    const cleanup = consoleBridge.onStdoutChunk((p) => {
      if (p.sessionName !== selectedSessionName) return;
      const text =
        p.encoding === 'base64' ? decodeBase64ForIndicators(p.bytes) : p.bytes;
      setChunkBuffer((prev) => {
        const next = prev + text;
        if (next.length <= CHUNK_BUFFER_CAP) return next;
        return next.slice(-CHUNK_BUFFER_CAP);
      });
    });
    return cleanup;
  }, [consoleBridge, selectedSessionName]);

  const toolState = useMemo(
    () => parseToolIndicators(chunkBuffer),
    [chunkBuffer],
  );

  const body = error
    ? `Error reading swarm-state: ${error}`
    : content.length > 0
      ? content
      : `No swarm-state section found for session "${selectedSessionName}".`;

  const hybridMode = consoleBridge !== undefined && createTerminal !== undefined;

  const summaryBody = (
    <pre style={error ? { ...PRE_STYLE, ...ERROR_STYLE } : PRE_STYLE}>
      {body}
    </pre>
  );

  return (
    <div data-testid="frame-c-detail-pane" style={DETAIL_PANE_STYLE}>
      {/* MB-T-WIREFRAME-T2 WB11 — TerminalHeaderBar replaces the
          legacy meta-row + ctx pill. The `frame-c-detail-pane-ctx-
          text` testid moves into TerminalHeaderBar (backward-compat
          for Wave C #5 probe-mbtwtws-02 — see terminal-header-bar.tsx
          ctx span). */}
      <TerminalHeaderBar
        sessionName={selectedSessionName}
        branchName={branchName}
        tokensUsed={tokensUsed}
        tokenBudget={tokenBudget}
      />
      {hybridMode && (
        <div style={TAB_STRIP_STYLE} data-testid="frame-c-detail-tabs">
          <button
            type="button"
            data-testid="frame-c-detail-tab-live"
            onClick={() => setActiveTab('live')}
            style={
              activeTab === 'live'
                ? TAB_BUTTON_STYLE_ACTIVE
                : TAB_BUTTON_STYLE_BASE
            }
          >
            Live
          </button>
          <button
            type="button"
            data-testid="frame-c-detail-tab-summary"
            onClick={() => setActiveTab('summary')}
            style={
              activeTab === 'summary'
                ? TAB_BUTTON_STYLE_ACTIVE
                : TAB_BUTTON_STYLE_BASE
            }
          >
            Summary
          </button>
        </div>
      )}
      {hybridMode ? (
        <>
          {/* Live tab — kept mounted always (CSS visibility toggle)
              so xterm scrollback survives tab switches. */}
          <div
            data-testid="frame-c-detail-live-panel"
            style={{
              ...TAB_PANEL_STYLE,
              display: activeTab === 'live' ? 'flex' : 'none',
            }}
          >
            <ToolIndicatorStrip state={toolState} />
            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
              <TerminalStream
                targetSessionName={selectedSessionName}
                consoleBridge={consoleBridge}
                createTerminal={createTerminal}
              />
            </div>
          </div>
          {/* Summary tab — preserves Wave B WB8 swarm-state body.
              `display:none` (not unmount) keeps `<pre>` textContent
              available to existing probes (probe-mbtwbfcs-04
              consumer non-regression). */}
          <div
            data-testid="frame-c-detail-summary-panel"
            style={{
              ...DETAIL_PANE_BODY_STYLE,
              display: activeTab === 'summary' ? 'block' : 'none',
            }}
          >
            {summaryBody}
          </div>
        </>
      ) : (
        <div style={DETAIL_PANE_BODY_STYLE}>{summaryBody}</div>
      )}
      {diffOutput !== null ? (
        <pre
          data-testid="frame-c-diff-output"
          style={{
            ...PRE_STYLE,
            maxHeight: '40%',
            overflowY: 'auto',
            padding: '8px 12px',
            borderTop: '1px solid #303030',
            fontSize: '12px',
            flexShrink: 0,
          }}
        >
          {diffOutput}
        </pre>
      ) : null}
      <div style={DETAIL_PANE_FOOTER_STYLE}>
        <ActionBar
          sessionName={selectedSessionName}
          onDiff={handleDiff}
          onMerge={handleMerge}
          onFocus={handleFocus}
          onKill={handleKill}
          failureState={failureState}
          onDismissFailure={handleDismissFailure}
          spawnMode={spawnMode}
        />
      </div>
    </div>
  );
}

/** Base64 → UTF-8 decoder usable in browser + Node — used for the
 *  WB11 chunk-buffer accumulator feeding parseToolIndicators. Mirrors
 *  console-panel.tsx:189-205 + terminal-stream.tsx pattern. */
function decodeBase64ForIndicators(b64: string): string {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: false }).decode(arr);
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}
