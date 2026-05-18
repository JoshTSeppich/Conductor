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

// Per HTML:270-282 .ostrip-footer + .ostrip-slots.
const OSTRIP_FOOTER_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const OSTRIP_SLOTS_WRAP_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const OSTRIP_SLOTS_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, 10px)',
  gridAutoRows: '10px',
  gap: 3,
  maxHeight: 36,
  overflow: 'hidden',
};

// Per HTML:284-296 .ostrip-slot.
const OSTRIP_SLOT_BASE_STYLE: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 2,
  position: 'relative',
  overflow: 'hidden',
  padding: 0,
  border: 'none',
  transition: 'transform 120ms ease, background 200ms ease',
};

// Status background colors per HTML:297-301.
const OSTRIP_SLOT_STATUS_BG: Record<string, string> = {
  empty: 'rgba(35, 35, 43, 0.6)',      // color-mix(--border 60%, transparent)
  starting: '#f0a062',                  // --warn
  running: '#6ad4b8',                   // --ok
  done: 'rgba(35, 35, 43, 0.7)',        // color-mix(--ok 30%, --border) — approximate
  error: '#e07472',                     // --err
};

// Per HTML:302-307 .ostrip-slot-pulse.
const OSTRIP_SLOT_PULSE_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: COLOR_OK,
  opacity: 0.4,
};

// Per HTML:313-330 .ostrip-legend.
const OSTRIP_LEGEND_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 9.5,
  color: COLOR_TEXT_MUTE,
  flexShrink: 0,
};

const OSTRIP_LEGEND_ENTRY_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

const OSTRIP_LEGEND_SWATCH_BASE: React.CSSProperties = {
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: 2,
};

export type SlotSessionStatus = 'starting' | 'running' | 'done' | 'error';

export interface SlotSession {
  id: string;
  name: string;
  status: SlotSessionStatus;
}

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
  /**
   * Live sessions filling the SlotGrid in order. Slots beyond
   * sessions.length render as empty (disabled buttons). Per design
   * jsx:32 `Array.from({ length: maxSlots }, (_, i) => sessions[i] || null)`.
   */
  sessions?: SlotSession[];
  /**
   * Max slot count (10×10 squares fill the grid). Default 64 per
   * operator vision chat1.md:107 + scope-arbitration §2.3 (maxSlots
   * radio ∈ {16, 32, 64}; production cap arbitration deferred).
   */
  maxSlots?: number;
  /**
   * Click handler invoked with the slot's session (live slots only;
   * empty slots are disabled).
   */
  onSlotClick?: (session: SlotSession) => void;
  /**
   * Errored session count. Per design jsx:109 `{errored > 0 && <Stat label="failed" .../>}`.
   * undefined / 0 hides the failed stat.
   */
  erroredCount?: number;
  /**
   * Throughput rate per minute (pre-computed via computeThroughputAndEta).
   * Default 0 renders "0.0/min" per design jsx:110.
   */
  ratePerMin?: number;
  /**
   * Estimated time-to-empty-queue in seconds (pre-computed via
   * computeThroughputAndEta). null → ETA stat hidden per design jsx:111
   * `{eta != null && <Stat label="eta" .../>}`.
   */
  etaSeconds?: number | null;
}

// Per design jsx:76: 30-second rolling window for throughput calc.
const DEFAULT_MAX_SLOTS = 64;

const DEFAULT_THROUGHPUT_WINDOW_MS = 30_000;

export interface ThroughputSample {
  /** Wall-clock millis at which this sample was taken. */
  t: number;
  /** done-count snapshot at time t. */
  done: number;
}

export interface ThroughputResult {
  /** Computed rate per minute. 0 when insufficient history. */
  ratePerMin: number;
  /**
   * ETA in seconds (queue / (rate/60)). null when (a) rate=0 OR
   * (b) queued=0 (design jsx:87-89 guard).
   */
  etaSeconds: number | null;
}

/**
 * Pure-fn helper computing throughput rate + ETA per design jsx:70-89:
 *
 *   const oldest = history[0];
 *   const delta = done - oldest.done;
 *   const secs = (now - oldest.t) / 1000;
 *   setThroughput(secs > 0 ? (delta / secs) * 60 : 0);
 *   const eta = throughput > 0 && queue.length > 0
 *     ? (queue.length / (throughput / 60))
 *     : null;
 *
 * History is filtered to entries within `windowMs` of the latest sample
 * before rate calc, mirroring design `histRef.current.filter(h => now - h.t < 30000)`.
 *
 * Pure (no side effects, no React); caller orchestrates timer / history
 * accumulation.
 */
export function computeThroughputAndEta({
  history,
  queued,
  windowMs,
}: {
  history: ThroughputSample[];
  queued: number;
  windowMs: number;
}): ThroughputResult {
  if (history.length < 2) return { ratePerMin: 0, etaSeconds: null };
  const latest = history[history.length - 1]!;
  // Inclusive `<=` semantics (boundary kept): the design's strict `<` at
  // jsx:77 is push-then-filter pragmatism (just-pushed `t===now` would
  // never hit the boundary). As a pure-fn over caller-supplied history,
  // inclusive semantics avoid the trap when samples land exactly at
  // windowMs ago.
  const windowed = history.filter((h) => latest.t - h.t <= windowMs);
  if (windowed.length < 2) return { ratePerMin: 0, etaSeconds: null };
  const oldest = windowed[0]!;
  const deltaDone = latest.done - oldest.done;
  const deltaSecs = (latest.t - oldest.t) / 1000;
  const ratePerMin = deltaSecs > 0 ? (deltaDone / deltaSecs) * 60 : 0;
  const etaSeconds =
    ratePerMin > 0 && queued > 0 ? queued / (ratePerMin / 60) : null;
  return { ratePerMin, etaSeconds };
}

function formatRate(ratePerMin: number): string {
  return `${ratePerMin.toFixed(1)}/min`;
}

/**
 * mm:ss formatter per design jsx:5-10 fmtClock. Non-finite / negative
 * returns em-dash placeholder (W1 Q3/Q4 mech-translation). Zero is a
 * valid ETA and renders 00:00 (test asserts).
 */
function formatEtaClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return EM_DASH;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

function SlotGrid({
  sessions,
  maxSlots,
  onSlotClick,
}: {
  sessions: SlotSession[];
  maxSlots: number;
  onSlotClick?: (session: SlotSession) => void;
}): React.ReactElement {
  // Design jsx:32: `Array.from({ length: maxSlots }, (_, i) => sessions[i] || null)`.
  const slots: (SlotSession | null)[] = Array.from(
    { length: maxSlots },
    (_, i) => sessions[i] ?? null,
  );
  return (
    <div data-testid="ostrip-slots" style={OSTRIP_SLOTS_STYLE}>
      {slots.map((session, i) => {
        const status: 'empty' | SlotSessionStatus = session?.status ?? 'empty';
        const title = session ? `${session.name} · ${status}` : 'empty slot';
        const bg = OSTRIP_SLOT_STATUS_BG[status] ?? OSTRIP_SLOT_STATUS_BG.empty;
        return (
          <button
            key={i}
            data-testid={`ostrip-slot-${i}`}
            data-status={status}
            title={title}
            type="button"
            disabled={session === null}
            style={{
              ...OSTRIP_SLOT_BASE_STYLE,
              background: bg,
              cursor: session === null ? 'default' : 'pointer',
            }}
            onClick={() => {
              if (session !== null) onSlotClick?.(session);
            }}
          >
            {session?.status === 'running' && (
              <span
                data-testid={`ostrip-slot-pulse-${i}`}
                style={OSTRIP_SLOT_PULSE_STYLE}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function Legend(): React.ReactElement {
  const entries: { key: string; label: string; bg: string }[] = [
    { key: 'running', label: 'running', bg: COLOR_OK },
    { key: 'starting', label: 'starting', bg: '#f0a062' },
    { key: 'done', label: 'done', bg: 'rgba(35, 35, 43, 0.7)' },
    { key: 'error', label: 'error', bg: '#e07472' },
    { key: 'empty', label: 'idle', bg: 'rgba(35, 35, 43, 0.6)' },
  ];
  return (
    <div data-testid="ostrip-legend" style={OSTRIP_LEGEND_STYLE}>
      {entries.map((e) => (
        <span
          key={e.key}
          data-testid={`ostrip-legend-${e.key}`}
          style={OSTRIP_LEGEND_ENTRY_STYLE}
        >
          <i style={{ ...OSTRIP_LEGEND_SWATCH_BASE, background: e.bg }} />
          {e.label}
        </span>
      ))}
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
  sessions,
  maxSlots,
  onSlotClick,
  erroredCount,
  ratePerMin,
  etaSeconds,
}: OrchestratorStripProps = {}): React.ReactElement {
  const resolvedRate = typeof ratePerMin === 'number' && Number.isFinite(ratePerMin)
    ? ratePerMin
    : 0;
  const showFailed =
    typeof erroredCount === 'number' && Number.isFinite(erroredCount) && erroredCount > 0;
  const showEta = etaSeconds !== undefined && etaSeconds !== null;
  const safeDone = safeCount(done);
  const safeRunning = safeCount(runningCount);
  const safeQueued = safeCount(queuedCount);
  const safeTotal = safeCount(totalSteps);
  const resolvedSessions = sessions ?? [];
  const resolvedMaxSlots = typeof maxSlots === 'number' ? maxSlots : DEFAULT_MAX_SLOTS;

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
          {showFailed && (
            <Stat
              label="failed"
              testid="ostrip-stat-failed"
              value={String(erroredCount)}
            />
          )}
          <Stat
            label="rate"
            testid="ostrip-stat-rate"
            value={formatRate(resolvedRate)}
          />
          {showEta && (
            <Stat
              label="eta"
              testid="ostrip-stat-eta"
              value={formatEtaClock(etaSeconds as number)}
            />
          )}
        </div>
      </div>
      <ProgressBar
        done={safeDone}
        runningCount={safeRunning}
        queuedCount={safeQueued}
        totalSteps={safeTotal}
      />
      <div style={OSTRIP_FOOTER_STYLE}>
        <div style={OSTRIP_SLOTS_WRAP_STYLE}>
          <SlotGrid
            sessions={resolvedSessions}
            maxSlots={resolvedMaxSlots}
            onSlotClick={onSlotClick}
          />
        </div>
        <Legend />
      </div>
    </div>
  );
}
