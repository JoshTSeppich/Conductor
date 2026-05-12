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

import type { CSSProperties } from 'react';
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
