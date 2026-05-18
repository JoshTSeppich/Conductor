// MB-T-MVP-W1-EXPANSION-2 WB6 — TmuxPaneBody surface.
//
// Renders the orchestrator focus-pane body per design-handoff
// tmux-pane.jsx:78-108 styling: classified line colors per TMUX_COLORS
// (sys/ok/warn/err/banner) + optional ORCH_BANNER ASCII box header +
// blinking cwd cursor when status='running' + done/error state
// footers.
//
// Sibling to the xterm-based body in focus-pane.tsx: this component
// renders structured TmuxLine[] arrays as React elements (NOT raw PTY
// stream). Composition at WB-final mount entry: focus-pane.tsx
// continues to host the xterm-backed live PTY stream; TmuxPaneBody
// is consumed when the orchestrator emits classified line stream
// (deferred to follow-up wiring, tracked as Tier-2 followup at
// WB-final).
//
// CSS variable literals resolved per Conductor V_MVP.html:11-32
// :root dark-theme defaults. Per Q-EXP2-5 auto-ack (W1 OVERLAY_STYLE
// pattern), styles are inline component-scoped — no shell.html
// :root token plumbing edit.
//
// Animation polish (paneIn/paneOut keyframes per HTML:458-466) is
// EXPLICITLY EXCLUDED at WB6 per scope-arbitration §5.6 (W1.5 deferred).

import * as React from 'react';

const EM_DASH = '—';

// Design CSS variable literals (Conductor V_MVP.html:11-32).
const COLOR_MONO = '#c8c8cc';
const COLOR_MONO_DIM = '#6e6e78';
const COLOR_OK = '#6ad4b8';
const COLOR_WARN = '#f0a062';
const COLOR_ERR = '#e07472';
const COLOR_ACCENT = '#f0a062';
const COLOR_PANEL = '#131318';

export type TmuxLineClass = 'sys' | 'ok' | 'warn' | 'err' | 'banner';
export type TmuxStatus = 'starting' | 'running' | 'done' | 'error';

/**
 * Per design tmux-pane.jsx:5-11:
 *   const TMUX_COLORS = {
 *     sys:    'var(--mono)',
 *     ok:     'var(--ok)',
 *     warn:   'var(--warn)',
 *     err:    'var(--err)',
 *     banner: 'var(--accent)',
 *   };
 */
export const TMUX_COLORS: Record<TmuxLineClass, string> = {
  sys: COLOR_MONO,
  ok: COLOR_OK,
  warn: COLOR_WARN,
  err: COLOR_ERR,
  banner: COLOR_ACCENT,
};

export interface TmuxLine {
  t: TmuxLineClass;
  s: string;
}

/**
 * Per design tmux-content.jsx:163-170 ORCH_BANNER: 5-line ASCII box
 * (top edge ┌, 3 inner │ rows, bottom edge └) + trailing sys-class
 * blank to separate from streaming content below.
 */
export const ORCH_BANNER: readonly TmuxLine[] = [
  { t: 'banner', s: '  ┌─ conductor orchestrator ──────────────────────────────────' },
  { t: 'banner', s: '  │  build.md      —' },
  { t: 'banner', s: '  │  total steps   —    queued —    running —    done —' },
  { t: 'banner', s: '  │  budget        —     wall clock  —' },
  { t: 'banner', s: '  └────────────────────────────────────────────────────────────' },
  { t: 'sys', s: '' },
];

// Per HTML:416-429 .tmux-body.
const TMUX_BODY_STYLE: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10.5,
  lineHeight: 1.45,
  color: COLOR_MONO,
  padding: '8px 10px 10px 10px',
  overflow: 'auto',
  minHeight: 0,
  background: COLOR_PANEL,
};

// Per HTML:432-436 .tmux-line.
const TMUX_LINE_BASE_STYLE: React.CSSProperties = {
  whiteSpace: 'pre',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

// Per HTML:438-447 .tmux-cursor.
const TMUX_CURSOR_STYLE: React.CSSProperties = {
  display: 'inline-block',
  width: '0.55em',
  height: '1em',
  background: COLOR_ACCENT,
  verticalAlign: 'text-bottom',
  marginLeft: 2,
  opacity: 0.85,
};

export interface TmuxPaneBodyProps {
  /** Classified lines stream (caller-supplied). */
  lines: TmuxLine[];
  /**
   * Render ORCH_BANNER above lines when true. Default false; the
   * banner is shown when the focus-pane has been "primed" with an
   * orchestrator session (caller decides; mirrors design app.jsx
   * pattern of conditional inclusion).
   */
  showBanner?: boolean;
  /** Pane status driving cursor / footer rendering. */
  status: TmuxStatus;
  /** Working directory shown before the cursor when status='running'. */
  cwd?: string;
}

function renderLine(
  line: TmuxLine,
  testid: string,
): React.ReactElement {
  const color = TMUX_COLORS[line.t] ?? COLOR_MONO;
  return (
    <div
      key={testid}
      data-testid={testid}
      data-line-class={line.t}
      style={{ ...TMUX_LINE_BASE_STYLE, color }}
    >
      {line.s || ' '}
    </div>
  );
}

export function TmuxPaneBody({
  lines,
  showBanner = false,
  status,
  cwd,
}: TmuxPaneBodyProps): React.ReactElement {
  const resolvedCwd =
    typeof cwd === 'string' && cwd.length > 0 ? cwd : EM_DASH;
  return (
    <div data-testid="tmux-body" style={TMUX_BODY_STYLE}>
      {showBanner && (
        <div data-testid="tmux-banner">
          {ORCH_BANNER.map((line, i) =>
            renderLine(line, `tmux-line-banner-${i}`),
          )}
        </div>
      )}
      {lines.map((line, i) => renderLine(line, `tmux-line-${i}`))}
      {status === 'running' && (
        <div
          data-testid="tmux-prompt"
          style={{ ...TMUX_LINE_BASE_STYLE, color: COLOR_MONO }}
        >
          <span style={{ color: COLOR_ACCENT }}>{resolvedCwd}</span>
          <span style={{ color: COLOR_MONO_DIM }}> $ </span>
          <span data-testid="tmux-cursor" style={TMUX_CURSOR_STYLE} />
        </div>
      )}
      {status === 'done' && (
        <div
          data-testid="tmux-done"
          style={{ ...TMUX_LINE_BASE_STYLE, color: COLOR_MONO_DIM }}
        >
          [process exited 0 — press any key]
        </div>
      )}
      {status === 'error' && (
        <div
          data-testid="tmux-error"
          style={{ ...TMUX_LINE_BASE_STYLE, color: COLOR_ERR }}
        >
          [process exited 1 — press any key]
        </div>
      )}
    </div>
  );
}
