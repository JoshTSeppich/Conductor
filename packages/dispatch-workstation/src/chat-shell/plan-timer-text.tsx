// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB10 (green) —
// PlanTimerText: countdown text derived from MB-T34 RateLimitState.
//
// Per ticket body f8fc24d §4 WB10 + Sub-Q-T4-D=(i) operator-acked
// default 2026-05-12:
//   - Consumes RateLimitState from MB-T34 onRateLimitUpdate stream
//     (caller subscribes; this component is pure prop-driven).
//   - Primary source: `state.requests?.reset` (closest plan-window
//     signal per WB9 investigation finding; Tier 3 followup
//     MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION may refine).
//   - Renders `<span data-testid="plan-timer-text">Max plan resets
//     in Xh Ym</span>` (placeholder "—" if no signal).
//   - `nowMs` prop is test-injectable for deterministic countdown
//     testing; production passes `Date.now()` via mount.ts wiring.

import { useEffect, useState, type CSSProperties } from 'react';
import type { RateLimitState } from './ring-helpers.js';

export interface PlanTimerTextProps {
  readonly state: RateLimitState | null;
  /** Test seam — production passes Date.now() at render time. */
  readonly nowMs: number;
}

const STYLE: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '11px',
  color: '#9ca3af',
  fontVariantNumeric: 'tabular-nums',
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

function resolveResetMs(state: RateLimitState | null): number | null {
  if (!state) return null;
  // Primary source: requests dimension (per WB9 investigation finding
  // — closest plan-window signal in Anthropic API rate-limit headers).
  const reset = state.requests?.reset;
  if (reset === undefined) {
    // Fallback to tokens dimension if requests absent — keeps the
    // timer functional under partial-header conditions.
    const tokensReset = state.tokens?.reset;
    if (tokensReset === undefined) return null;
    return typeof tokensReset === 'string'
      ? new Date(tokensReset).getTime()
      : tokensReset;
  }
  return typeof reset === 'string' ? new Date(reset).getTime() : reset;
}

function formatHM(deltaMs: number): string {
  if (deltaMs <= 0) return '0h 0m';
  const totalMinutes = Math.floor(deltaMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function PlanTimerText(props: PlanTimerTextProps): JSX.Element {
  const { state, nowMs } = props;
  const resetMs = resolveResetMs(state);
  const text = resetMs === null ? '—' : formatHM(resetMs - nowMs);
  return (
    <span
      data-testid="plan-timer-text"
      style={STYLE}
      title="Time until Anthropic plan rate-limit window resets"
    >
      Max plan resets in {text}
    </span>
  );
}

// MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB7 — production container.
//
// Sibling to MB-T25 PlanUsageRing's bridge-subscription pattern: takes
// an `onRateLimitUpdate` bridge, subscribes at mount, renders the
// pure-prop-driven PlanTimerText with the latest state, and ticks
// `nowMs` once per `tickMs` (60s production default per ADR-MBTWFT9-C
// — minute-granularity countdown display).
//
// Under Sub-Q-T9-A=(f) skeleton-with-deferred-source, the bridge
// fires zero state updates in production (aggregator wired to
// createNullRateLimitSource), so the container renders the honest
// "Max plan resets in —" placeholder until a real source is plugged
// via follow-on. The tick interval still runs — minimal overhead
// (one Date.now() per minute) and zero behavioral effect under null
// state.

export interface PlanTimerTextContainerBridge {
  readonly onRateLimitUpdate: (
    cb: (state: RateLimitState) => void,
  ) => () => void;
}

export interface PlanTimerTextContainerProps {
  readonly bridge: PlanTimerTextContainerBridge;
  /** Tick interval in ms; production = 60_000 per ADR-MBTWFT9-C; test seam. */
  readonly tickMs?: number;
}

export function PlanTimerTextContainer(
  props: PlanTimerTextContainerProps,
): JSX.Element {
  const { bridge, tickMs = 60_000 } = props;
  const [state, setState] = useState<RateLimitState | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const dispose = bridge.onRateLimitUpdate((next) => setState(next));
    return dispose;
  }, [bridge]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return <PlanTimerText state={state} nowMs={nowMs} />;
}
