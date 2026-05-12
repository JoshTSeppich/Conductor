// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB4 (green) — TerminalHeaderBar
// top-row chrome for the Frame C DetailPane right pane.
//
// Per ticket body 30ab109 §4 WB4 + Sub-Q-MBTWFT2-C=(γ) operator-acked
// (T2 TICKET-BODY ACK 2026-05-12) + HALT-WB3-PRE-COMMIT operator-acked
// header text convention (`<sessionName> @ <branchName>`) 2026-05-12:
//   - Single monospace row matching detail-pane.tsx:34-69 meta-row
//     style precedent.
//   - Left slot: `<sessionName> @ <branchName>`. When branchName is
//     undefined, renders em-dash placeholder (`<sessionName> @ —`).
//   - Right cluster: `ctx N%` (computed Math.round((tokensUsed /
//     tokenBudget) * 100); 0% when budget undefined or 0 per
//     detail-pane.tsx:178-181 divide-by-zero guard) + literal
//     `uptime —` + literal `plan —` placeholders.
//
// Sub-Q-C=γ placeholders (`uptime —` / `plan —`) ship as the Tier 2
// followup `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH` closure path. When
// the follow-on extends TileGridSessionEntry with `spawnedAt` +
// `plan`, this component's props expand and the placeholders flip
// to live data without a structural rewrite.
//
// WB11 integration (forward reference): this component subsumes the
// current detail-pane.tsx:218-226 meta-row when TerminalHeaderBar is
// mounted inside DetailPane. The existing ctx N% pill is moved here.

import type { CSSProperties } from 'react';

const HEADER_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '12px',
  padding: '6px 12px',
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#dddddd',
  borderBottom: '1px solid #303030',
  boxSizing: 'border-box',
  whiteSpace: 'nowrap',
};

const SESSION_BRANCH_STYLE: CSSProperties = {
  color: '#dddddd',
  fontWeight: 500,
};

const META_PILL_STYLE: CSSProperties = {
  color: '#9ca3af',
  fontVariantNumeric: 'tabular-nums',
};

const RIGHT_CLUSTER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '12px',
  marginLeft: 'auto',
  flexShrink: 0,
};

export interface TerminalHeaderBarProps {
  /** The session name to display in the left slot of the header. */
  readonly sessionName: string;
  /** The session's branch name. When undefined, renders em-dash
   *  placeholder in the branch slot (`<sessionName> @ —`). */
  readonly branchName?: string;
  /** Tokens consumed in the session's current window. Sourced from
   *  the corresponding TileGridSessionEntry via FrameCRoot's sessions
   *  lookup (frame-c-root.tsx:104-106). Optional — undefined renders
   *  `ctx 0%`. */
  readonly tokensUsed?: number;
  /** Token budget (model context window). Optional — undefined or 0
   *  renders `ctx 0%` (divide-by-zero guard per detail-pane.tsx:
   *  176-181 precedent). */
  readonly tokenBudget?: number;
}

export function TerminalHeaderBar({
  sessionName,
  branchName,
  tokensUsed,
  tokenBudget,
}: TerminalHeaderBarProps): JSX.Element {
  // Compute ctx N%. Guard tokenBudget undefined/0 to avoid NaN (0/0)
  // or Infinity (n/0). Fallback ctxPct=0 surfaces honest "no data yet"
  // per detail-pane.tsx:176-181 + Wave B Sub-Q-MBTWTWS pattern.
  const ctxPct =
    tokenBudget !== undefined && tokenBudget > 0
      ? Math.round(((tokensUsed ?? 0) / tokenBudget) * 100)
      : 0;

  const branchSlot = branchName ?? '—';

  return (
    <div
      data-testid="frame-c-terminal-header-bar"
      style={HEADER_ROW_STYLE}
    >
      <span style={SESSION_BRANCH_STYLE}>
        {sessionName} @ {branchSlot}
      </span>
      <span style={RIGHT_CLUSTER_STYLE}>
        {/* `frame-c-detail-pane-ctx-text` testid preserved for
            backward-compat with Wave C #5 (MB-T-WIREFRAME-C5-TOKEN-
            WIRING-SURFACE) probe-mbtwtws-02-detail-pane-ctx-text.
            When TerminalHeaderBar replaces the legacy meta-row inside
            DetailPane (WB11 integration), the same testid moves to
            the header — no Wave-C consumer-probe regression. */}
        <span
          data-testid="frame-c-detail-pane-ctx-text"
          style={META_PILL_STYLE}
        >
          ctx {ctxPct}%
        </span>
        <span style={META_PILL_STYLE}>uptime —</span>
        <span style={META_PILL_STYLE}>plan —</span>
      </span>
    </div>
  );
}
