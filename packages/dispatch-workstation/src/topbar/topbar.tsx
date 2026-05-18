// MB-T-MVP-W1-EXPANSION-2 WB1 — Topbar scaffold.
//
// Component-1 sibling-chrome surface per operator vision §"Top chrome" +
// design-handoff app.jsx:282-309 inline render. This WB ships the scaffold
// (brand glyph + name + version pill + env label) with em-dash placeholder
// for env label (Q-EXP2-2 auto-ack mirrors W1 Q3/Q4 em-dash precedent).
//
// Mount strategy per Q-EXP2-1 auto-ack (W1 Q6=(c) mech-translation): body-
// level fixed-position overlay stacked above the existing orchestrator-
// focus-pane overlay; NO touch of workstation-shell.html `#header-bar`
// (lines 23-32 of shell.html — already hosts #spawn-button +
// #header-indicators-root FrameShellHeader tab strip + MixIndicator +
// PlanRing chrome). The overlay strategy preserves territorial boundary
// from chat-shell/** + frame-shell-header chrome.
//
// Live counts (panes/running/queue/done/budget) belong to WB2 probe-02.
// CSS tokens (--accent etc.) per Q-EXP2-5 auto-ack are inlined as literal
// design-handoff values (no shell.html style block edit).

import * as React from 'react';

const EM_DASH = '—';

// Design-handoff CSS variables resolved to dark-theme literals per
// docs/design-handoff/conductor-v-mvp/project/Conductor V_MVP.html:11-32
// (:root dark-by-default). Q-EXP2-5 auto-ack: inline-style component-
// scoped CSS only — no shell.html :root token plumbing edit.
const COLOR_BG_ELEV = '#0f0f12';
const COLOR_BORDER = '#23232b';
const COLOR_TEXT = '#ececef';
const COLOR_TEXT_DIM = '#8a8a93';
const COLOR_TEXT_MUTE = '#5a5a63';
const COLOR_ACCENT = '#f0a062';

// Mirrors design-handoff Conductor V_MVP.html .topbar rule lines 86-110:
// 36px height, border-bottom, bg-elev, padding 0 14px, font-size 12px,
// gap 10px, flex space-between.
const TOPBAR_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 14px',
  borderBottom: `1px solid ${COLOR_BORDER}`,
  background: COLOR_BG_ELEV,
  fontSize: 12,
  color: COLOR_TEXT_DIM,
  gap: 10,
  zIndex: 1100,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const TOPBAR_SIDE_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const BRAND_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const BRAND_GLYPH_STYLE: React.CSSProperties = {
  color: COLOR_ACCENT,
  fontSize: 14,
};

const BRAND_NAME_STYLE: React.CSSProperties = {
  color: COLOR_TEXT,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  fontSize: 13,
};

const BRAND_VERSION_STYLE: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  color: COLOR_TEXT_MUTE,
  padding: '1px 5px',
  border: `1px solid ${COLOR_BORDER}`,
  borderRadius: 3,
};

const TOPBAR_META_STYLE: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 11,
  letterSpacing: '0.01em',
  whiteSpace: 'nowrap',
};

// WB2 — separator pip between meta items (design-handoff:
// .topbar-sep { width: 1px; height: 14px; background: var(--border); }).
const TOPBAR_SEP_STYLE: React.CSSProperties = {
  width: 1,
  height: 14,
  background: COLOR_BORDER,
  display: 'inline-block',
};

export interface TopbarProps {
  /**
   * Environment label (e.g. "staging · us-east"). Per Q-EXP2-2 auto-ack
   * (W1 Q3/Q4 em-dash precedent), undefined renders em-dash placeholder
   * pending live IPC wiring (Tier-2 followup at WB-final).
   */
  envLabel?: string;
  /**
   * Live pane count (N panes). undefined → em-dash placeholder.
   * Design app.jsx:292 `${sessions.length} pane${sessions.length === 1 ? '' : 's'}`.
   */
  paneCount?: number;
  /**
   * Live running session count (M running). 0 renders verbatim per
   * focus-pane-header.tsx renderNumericOrDash precedent.
   */
  runningCount?: number;
  /**
   * Gates queue/done block visibility per design app.jsx:295
   * `{attached && (<><span/><span/></>)}`.
   */
  buildMdAttached?: boolean;
  /**
   * Queue depth shown under buildMdAttached. undefined → em-dash.
   */
  buildMdQueue?: number;
  /**
   * Done count shown under buildMdAttached. undefined → em-dash.
   * (Computed in design as `attached.steps - queue.length - runningCount`;
   * caller supplies pre-computed value.)
   */
  buildMdDone?: number;
  /**
   * Budget used in dollars. Display formatted as "$U.UU" with 2-decimal
   * currency rounding. Per atomic display rule: both used+total must be
   * present, else render em-dash for the whole budget label.
   */
  budgetUsedDollars?: number;
  /**
   * Budget total in dollars. See budgetUsedDollars.
   */
  budgetTotalDollars?: number;
}

function renderEnvLabelOrDash(value: string | undefined): string {
  if (typeof value !== 'string' || value.length === 0) return EM_DASH;
  return value;
}

function renderPaneCountOrDash(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return EM_DASH;
  return `${value} pane${value === 1 ? '' : 's'}`;
}

function renderRunningCountOrDash(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return EM_DASH;
  return `${value} running`;
}

function renderNumericOrDash(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return EM_DASH;
  return String(value);
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function renderBudgetOrDash(
  used: number | undefined,
  total: number | undefined,
): string {
  if (
    typeof used !== 'number' ||
    !Number.isFinite(used) ||
    typeof total !== 'number' ||
    !Number.isFinite(total)
  ) {
    return EM_DASH;
  }
  return `${formatCurrency(used)} / ${formatCurrency(total)}`;
}

export function Topbar({
  envLabel,
  paneCount,
  runningCount,
  buildMdAttached,
  buildMdQueue,
  buildMdDone,
  budgetUsedDollars,
  budgetTotalDollars,
}: TopbarProps = {}): React.ReactElement {
  return (
    <div data-testid="topbar-root" style={TOPBAR_STYLE}>
      <div data-testid="topbar-left" style={TOPBAR_SIDE_STYLE}>
        <div data-testid="topbar-brand" style={BRAND_STYLE}>
          <span data-testid="topbar-brand-glyph" style={BRAND_GLYPH_STYLE}>
            ◐
          </span>
          <span data-testid="topbar-brand-name" style={BRAND_NAME_STYLE}>
            Conductor
          </span>
          <span data-testid="topbar-brand-version" style={BRAND_VERSION_STYLE}>
            v_mvp
          </span>
        </div>
        <span style={TOPBAR_SEP_STYLE} />
        <span data-testid="topbar-pane-count" style={TOPBAR_META_STYLE}>
          {renderPaneCountOrDash(paneCount)}
        </span>
        <span style={TOPBAR_SEP_STYLE} />
        <span data-testid="topbar-running-count" style={TOPBAR_META_STYLE}>
          {renderRunningCountOrDash(runningCount)}
        </span>
        {buildMdAttached && (
          <>
            <span style={TOPBAR_SEP_STYLE} />
            <span data-testid="topbar-queue-done" style={TOPBAR_META_STYLE}>
              {`queue: ${renderNumericOrDash(buildMdQueue)} · done: ${renderNumericOrDash(buildMdDone)}`}
            </span>
          </>
        )}
      </div>
      <div data-testid="topbar-right" style={TOPBAR_SIDE_STYLE}>
        <span data-testid="topbar-env-label" style={TOPBAR_META_STYLE}>
          {renderEnvLabelOrDash(envLabel)}
        </span>
        <span style={TOPBAR_SEP_STYLE} />
        <span data-testid="topbar-budget" style={TOPBAR_META_STYLE}>
          {renderBudgetOrDash(budgetUsedDollars, budgetTotalDollars)}
        </span>
      </div>
    </div>
  );
}
