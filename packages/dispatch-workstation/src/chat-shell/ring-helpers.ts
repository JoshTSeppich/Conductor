// MB-T25 WB2 — Ring math + tinting + countdown helpers (GREEN).
//
// Pure-fn module. Consumed by plan-usage-ring.tsx (PlanUsageRing component
// at WB3 GREEN) and unit-tested via test/unit/ring-helpers/probe-01-math
// .spec.ts (26/26 RED → GREEN at this WB2).
//
// Q-MBT25-7=a operator-confirmed at WB1 ack 2026-05-08:
// selectPrimaryDimension returns the `tokens` (combined input+output)
// dimension for the outer ring — single-glance UX clarity for v3.0
// ship-gate. Multi-dimension drilldown deferred to v3.1 followup
// MB-F-T25-MULTI-DIMENSION-RING-DRILLDOWN (filed at WB-final).
//
// Type contract (RateLimitState) [MODELED] from operator's HALT 0 ack
// on Terminal D's MB-T34 diagnose §VIII data contract (Round 4
// 2026-05-08). Tightened to [KNOWN] at WB3 integration time when D
// exports the type from its API client surface — ratchet via deep
// import per CLAUDE.md §3.4 mechanical-translation discipline.

/**
 * One rate-limit dimension's snapshot at the time of an API response.
 * Per Anthropic API doc convention: `limit` is the bucket capacity,
 * `remaining` is the remaining quota, `reset` is when the bucket
 * refills (ISO 8601 string OR epoch ms — both accepted by
 * formatResetCountdown).
 */
export interface RateLimitDimension {
  readonly limit: number;
  readonly remaining: number;
  readonly reset: string | number;
}

/**
 * 4-dimension nested-bucket rate-limit shape per Terminal D's
 * MB-T34 spike capture (Round 4 HALT 0 ack 2026-05-08). Each
 * dimension may be null if the corresponding header was absent
 * from the API response.
 */
export interface RateLimitState {
  readonly requests: RateLimitDimension | null;
  readonly tokens: RateLimitDimension | null;
  readonly inputTokens: RateLimitDimension | null;
  readonly outputTokens: RateLimitDimension | null;
}

/**
 * Compute SVG path string for a circular arc representing
 * `percentage` of a full circle, drawn on a circle of `radius`
 * pixels. Returns the `d` attribute value for an SVG `<path>`.
 *
 * Path geometry:
 *   - Centered at (0, 0); caller positions via SVG transform/viewBox.
 *   - Starts at top (0, -radius) — i.e. 12 o'clock.
 *   - Sweeps clockwise (SVG default y-down + sweepFlag=1).
 *   - 0% returns degenerate move-to (zero-length arc; non-empty path).
 *   - 100% returns two 180° arcs (SVG cannot represent a full
 *     circle as one arc command — start === end is ambiguous).
 *   - Otherwise emits one `A` command from top to the angle
 *     corresponding to `percentage / 100 * 2π`.
 *
 * `strokeWidth` is accepted for caller-side ergonomics (a typical
 * consumer passes the same strokeWidth they use on the `<path>`
 * stroke-width attribute) but does NOT influence the path
 * geometry — the path is the centerline; strokeWidth is applied
 * at render time by the consumer's `<path stroke-width=...>`.
 */
export function arcPath(
  percentage: number,
  radius: number,
  strokeWidth: number,
): string {
  void strokeWidth;
  const r = radius;
  const p = Math.max(0, Math.min(100, percentage));

  if (p === 0) {
    return `M 0 ${-r}`;
  }

  if (p >= 100) {
    return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r}`;
  }

  const angle = (p / 100) * 2 * Math.PI;
  const endX = r * Math.sin(angle);
  const endY = -r * Math.cos(angle);
  const largeArcFlag = angle > Math.PI ? 1 : 0;

  return `M 0 ${-r} A ${r} ${r} 0 ${largeArcFlag} 1 ${endX.toFixed(4)} ${endY.toFixed(4)}`;
}

/**
 * Threshold-based color tinting per wireframe.
 *   - <70%        → green
 *   - 70% to <85% → yellow
 *   - >=85%       → red
 */
export function tintForPercentage(
  percentage: number,
): 'green' | 'yellow' | 'red' {
  if (percentage >= 85) return 'red';
  if (percentage >= 70) return 'yellow';
  return 'green';
}

/**
 * Format a reset timestamp as countdown text "Hh MMm".
 *   - resetMsOrIso may be ISO 8601 string OR epoch ms
 *   - returns "Hh MMm" e.g. "5h 30m"
 *   - past or zero-delta returns "0h 00m" (no negative countdown)
 *   - hours are not zero-padded; minutes are zero-padded to 2 digits
 *
 * Sub-minute remainders are floored — "59 seconds left" rounds DOWN
 * to 0 minutes, not up to 1. The widget displays whole-minute
 * granularity; sub-minute precision would flicker noisily.
 */
export function formatResetCountdown(
  resetMsOrIso: string | number,
  nowMs: number,
): string {
  const resetMs =
    typeof resetMsOrIso === 'string'
      ? new Date(resetMsOrIso).getTime()
      : resetMsOrIso;
  const deltaMs = resetMs - nowMs;
  if (deltaMs <= 0) return '0h 00m';
  const totalMinutes = Math.floor(deltaMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Compute percentage of `limit` that has been used given `used`
 * (i.e. `limit - remaining`).
 *   - returns number in [0, 100]
 *   - clamps to 100 when used > limit (defensive — server should
 *     never emit `remaining` < 0, but tolerate)
 *   - returns 0 when limit <= 0 (defensive — division-by-zero guard)
 *   - clamps to 0 for negative `used` (defensive — same shape as
 *     the limit guard; non-negative percentage by contract)
 */
export function computePercentageUsed(used: number, limit: number): number {
  if (limit <= 0) return 0;
  if (used <= 0) return 0;
  if (used >= limit) return 100;
  return (used / limit) * 100;
}

/**
 * Select the primary dimension to feed the outer ring's `% used`
 * computation. Q-MBT25-7=a operator-confirmed at WB1 ack 2026-05-08:
 * tokens-combined dimension as primary (single-glance UX clarity
 * for v3.0; multi-dimension drilldown deferred to v3.1 followup
 * MB-F-T25-MULTI-DIMENSION-RING-DRILLDOWN).
 *
 * Returns null when state.tokens is null — even if other dimensions
 * are present. Strict (a) disposition: NOT a max-of-all-4 fallback;
 * placeholder state when tokens dimension unavailable.
 */
export function selectPrimaryDimension(
  state: RateLimitState,
): RateLimitDimension | null {
  return state.tokens ?? null;
}
