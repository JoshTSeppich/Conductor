// MB-T-MVP-W1-EXPANSION-2 WB3 — OrchestratorStrip scaffold + ProgressBar.
//
// Sibling-component to FocusPane per design-handoff orchestrator-strip.jsx
// (133 lines). This WB ships: header (▦ mark + title text + count pill),
// 3-segment progress bar (done/running/queued), and per-stat surfaces
// (running/queued/done) with em-dash placeholders when count props unset.
//
// Per Q-EXP2-1 auto-ack (W1 Q6=(c) mech-translation): NO #header-bar touch.
// This component is consumed by the EXPANSION-2 mount entry (WB-final) as
// part of the body-level fixed-position overlay alongside Topbar +
// orchestrator-focus-pane.
//
// Per Q-EXP2-2 auto-ack (W1 Q3/Q4 em-dash precedent): all count props
// optional; undefined renders em-dash for stats. ProgressBar widths
// compute from defined counts (0 when undefined; denominator guard
// `Math.max(total, sum, 1)` per design line 13).
//
// SlotGrid → WB4, throughput/ETA → WB5, footer/legend → WB-final closure.

import * as React from 'react';

const EM_DASH = '—';

// Design-handoff dark-theme literals per Conductor V_MVP.html:11-32.
const COLOR_PANEL = '#131318';
const COLOR_BORDER = '#23232b';
const COLOR_TEXT = '#ececef';
const COLOR_TEXT_MUTE = '#5a5a63';
const COLOR_OK = '#6ad4b8';
const COLOR_ACCENT = '#f0a062';

// Per Conductor V_MVP.html:194-202 .ostrip rule.
const OSTRIP_ROOT_STYLE: React.CSSProperties = {
  background: COLOR_PANEL,
  border: `1px solid ${COLOR_BORDER}`,
  borderRadius: 6,
  padding: '10px 12px 12px 12px',
  display: 'grid',
  gridTemplateRows: 'auto auto auto',
  gap: 8,
};

// Per HTML:203-207 .ostrip-header.
const OSTRIP_HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minHeight: 22,
  flexWrap: 'wrap',
};

// Per HTML:208 .ostrip-title.
const OSTRIP_TITLE_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
  flex: '1 1 auto',
};

// Per HTML:209 .ostrip-mark.
const OSTRIP_MARK_STYLE: React.CSSProperties = {
  color: COLOR_ACCENT,
  fontSize: 14,
  lineHeight: 1,
};

// Per HTML:210-219 .ostrip-title-text.
const OSTRIP_TITLE_TEXT_STYLE: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 12,
  color: COLOR_TEXT,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
};

// Per HTML:220-228 .ostrip-count.
const OSTRIP_COUNT_STYLE: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10.5,
  color: COLOR_TEXT_MUTE,
  padding: '1px 6px',
  border: `1px solid ${COLOR_BORDER}`,
  borderRadius: 99,
  flexShrink: 0,
};

// Per HTML:229 .ostrip-stats.
const OSTRIP_STATS_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: 14,
  flexShrink: 0,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

// Per HTML:230 .ostrip-stat.
const OSTRIP_STAT_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  lineHeight: 1.1,
};

// Per HTML:231-237 .ostrip-stat-label.
const OSTRIP_STAT_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 9.5,
  color: COLOR_TEXT_MUTE,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};

// Per HTML:238-244 .ostrip-stat-value.
const OSTRIP_STAT_VALUE_STYLE: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 13,
  color: COLOR_TEXT,
  fontVariantNumeric: 'tabular-nums',
  marginTop: 1,
};

const OSTRIP_STAT_VALUE_ACCENT_STYLE: React.CSSProperties = {
  ...OSTRIP_STAT_VALUE_STYLE,
  color: COLOR_ACCENT,
};

// Per HTML:246-252 .ostrip-bar.
const OSTRIP_BAR_STYLE: React.CSSProperties = {
  display: 'flex',
  height: 5,
  background: COLOR_BORDER,
  borderRadius: 99,
  overflow: 'hidden',
};

const OSTRIP_BAR_SEG_BASE: React.CSSProperties = {
  height: '100%',
  transition: 'width 240ms ease',
};

// Per HTML:254-264 segment colors.
const OSTRIP_BAR_DONE_STYLE: React.CSSProperties = {
  ...OSTRIP_BAR_SEG_BASE,
  background: COLOR_OK,
};

const OSTRIP_BAR_RUNNING_STYLE: React.CSSProperties = {
  ...OSTRIP_BAR_SEG_BASE,
  background: COLOR_ACCENT,
};

const OSTRIP_BAR_QUEUED_STYLE: React.CSSProperties = {
  ...OSTRIP_BAR_SEG_BASE,
  background: COLOR_BORDER,
};

export interface OrchestratorStripProps {
  /**
   * Filename of currently-attached build.md (drives title text override).
   * Falsy / unset → render default "build progress" per design line 97.
   */
  attachedName?: string;
  /**
   * Whether a build.md is attached (gates count pill visibility per design
   * line 99 `{attached && (...)}`).
   */
  attached?: boolean;
  /**
   * Live counts. undefined → em-dash per W1 Q3/Q4 mech-translation.
   * Used for both progress-bar widths (computed against denominator
   * fallback `Math.max(totalSteps, sum, 1)` per design line 13) and
   * per-stat displays.
   */
  done?: number;
  runningCount?: number;
  queuedCount?: number;
  totalSteps?: number;
}

function safeCount(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return value;
}

function renderCountOrDash(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return EM_DASH;
  return String(value);
}

function ProgressBar({
  done,
  runningCount,
  queuedCount,
  totalSteps,
}: {
  done: number;
  runningCount: number;
  queuedCount: number;
  totalSteps: number;
}): React.ReactElement {
  // Per design orchestrator-strip.jsx:13:
  // `const all = Math.max(total, done + running + queued, 1);`
  const denominator = Math.max(totalSteps, done + runningCount + queuedCount, 1);
  const donePct = (done / denominator) * 100;
  const runningPct = (runningCount / denominator) * 100;
  const queuedPct = (queuedCount / denominator) * 100;
  return (
    <div data-testid="ostrip-bar" style={OSTRIP_BAR_STYLE}>
      <div
        data-testid="ostrip-bar-done"
        style={{ ...OSTRIP_BAR_DONE_STYLE, width: `${donePct}%` }}
      />
      <div
        data-testid="ostrip-bar-running"
        style={{ ...OSTRIP_BAR_RUNNING_STYLE, width: `${runningPct}%` }}
      />
      <div
        data-testid="ostrip-bar-queued"
        style={{ ...OSTRIP_BAR_QUEUED_STYLE, width: `${queuedPct}%` }}
      />
    </div>
  );
}

function Stat({
  label,
  testid,
  value,
  accent,
}: {
  label: string;
  testid: string;
  value: string;
  accent?: boolean;
}): React.ReactElement {
  return (
    <div style={OSTRIP_STAT_STYLE}>
      <div style={OSTRIP_STAT_LABEL_STYLE}>{label}</div>
      <div
        data-testid={testid}
        style={accent ? OSTRIP_STAT_VALUE_ACCENT_STYLE : OSTRIP_STAT_VALUE_STYLE}
      >
        {value}
      </div>
    </div>
  );
}

export function OrchestratorStrip({
  attachedName,
  attached,
  done,
  runningCount,
  queuedCount,
  totalSteps,
}: OrchestratorStripProps = {}): React.ReactElement {
  const safeDone = safeCount(done);
  const safeRunning = safeCount(runningCount);
  const safeQueued = safeCount(queuedCount);
  const safeTotal = safeCount(totalSteps);

  const titleText =
    typeof attachedName === 'string' && attachedName.length > 0
      ? attachedName
      : 'build progress';
  const countPillText = `${safeDone + safeRunning}/${safeTotal}`;

  return (
    <div data-testid="ostrip-root" style={OSTRIP_ROOT_STYLE}>
      <div data-testid="ostrip-header" style={OSTRIP_HEADER_STYLE}>
        <div data-testid="ostrip-title" style={OSTRIP_TITLE_STYLE}>
          <span data-testid="ostrip-mark" style={OSTRIP_MARK_STYLE}>
            ▦
          </span>
          <span data-testid="ostrip-title-text" style={OSTRIP_TITLE_TEXT_STYLE}>
            {titleText}
          </span>
          {attached && (
            <span data-testid="ostrip-count" style={OSTRIP_COUNT_STYLE}>
              {countPillText}
            </span>
          )}
        </div>
        <div data-testid="ostrip-stats" style={OSTRIP_STATS_STYLE}>
          <Stat
            label="running"
            testid="ostrip-stat-running"
            value={renderCountOrDash(runningCount)}
            accent
          />
          <Stat
            label="queued"
            testid="ostrip-stat-queued"
            value={renderCountOrDash(queuedCount)}
          />
          <Stat
            label="done"
            testid="ostrip-stat-done"
            value={renderCountOrDash(done)}
          />
        </div>
      </div>
      <ProgressBar
        done={safeDone}
        runningCount={safeRunning}
        queuedCount={safeQueued}
        totalSteps={safeTotal}
      />
    </div>
  );
}
