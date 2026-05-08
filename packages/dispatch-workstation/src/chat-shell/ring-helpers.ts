// MB-T25 WB1 — Ring math + tinting + countdown helpers (RED scaffold).
//
// Pure-fn module. Consumed by plan-usage-ring.tsx (PlanUsageRing component)
// and unit-tested via test/unit/ring-helpers/probe-01-math.spec.ts.
//
// At WB1 (red), every exported fn throws "not implemented" so the
// probe-01-math suite fails the GREEN assertions. WB2 GREEN replaces
// each stub with the real implementation.
//
// Type contract (RateLimitState) [MODELED] from operator's HALT 0 ack:
// Terminal D's MB-T34 AnthropicAPIClient produces RateLimitState with
// 4 nested dimensions (requests, tokens combined, input-tokens,
// output-tokens). At WB2 GREEN, narrow against D's actually-exported
// type (replace this local definition with an import from D's
// surface, OR keep this local type if D doesn't export — operator
// arbitrates at WB2 if needed).

/**
 * One rate-limit dimension's snapshot at the time of an API response.
 * Per Anthropic API doc convention: `limit` is the bucket capacity,
 * `remaining` is the remaining quota, `reset` is when the bucket
 * refills (ISO 8601 string OR epoch ms — accept both, normalize in
 * pure helpers).
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
 * pixels with stroke `strokeWidth`. Returns the `d` attribute
 * value for an SVG `<path>` element.
 *
 * Contract:
 *   - percentage in [0, 100]
 *   - radius > 0, strokeWidth > 0
 *   - 0% returns a degenerate (zero-length) arc
 *   - 100% returns a full circle (two arcs joined per SVG arc-flag
 *     constraints; cannot be expressed as one arc command)
 */
export function arcPath(
  percentage: number,
  radius: number,
  strokeWidth: number,
): string {
  void percentage;
  void radius;
  void strokeWidth;
  throw new Error('ring-helpers.ts WB1 RED — arcPath not implemented');
}

/**
 * Threshold-based color tinting per wireframe.
 *   - <70%  → green
 *   - 70-85% (inclusive of 70, exclusive of 85) → yellow
 *   - >=85% → red
 */
export function tintForPercentage(
  percentage: number,
): 'green' | 'yellow' | 'red' {
  void percentage;
  throw new Error('ring-helpers.ts WB1 RED — tintForPercentage not implemented');
}

/**
 * Format a reset timestamp as countdown text "Hh MMm".
 *
 * Contract:
 *   - resetMs may be ISO 8601 string OR epoch ms
 *   - returns "Hh MMm" e.g. "5h 30m"
 *   - past or zero-delta returns "0h 00m" (no negative countdown)
 *   - hours are not zero-padded; minutes are zero-padded to 2 digits
 */
export function formatResetCountdown(
  resetMsOrIso: string | number,
  nowMs: number,
): string {
  void resetMsOrIso;
  void nowMs;
  throw new Error(
    'ring-helpers.ts WB1 RED — formatResetCountdown not implemented',
  );
}

/**
 * Compute percentage of `limit` that has been used given `used`
 * (i.e. `limit - remaining`).
 *
 * Contract:
 *   - returns number in [0, 100]
 *   - clamps to [0, 100] when used > limit (defensive — server
 *     should never emit `remaining` > `limit`, but tolerate)
 *   - returns 0 when limit === 0 (defensive — division-by-zero guard)
 */
export function computePercentageUsed(used: number, limit: number): number {
  void used;
  void limit;
  throw new Error(
    'ring-helpers.ts WB1 RED — computePercentageUsed not implemented',
  );
}

/**
 * Select the primary dimension to feed the outer ring's `% used`
 * computation. Q-MBT25-7 operator-arbitrated at WB1 ack
 * (recommended: 'tokens' as the most-operator-relevant single
 * dimension; alternative: max-of-all-4 selecting whichever
 * dimension is closest to its limit).
 *
 * RED scaffold throws; WB2 GREEN implements per operator's ack.
 *
 * Returns null when all 4 dimensions are null (no headers
 * observed yet — placeholder state).
 */
export function selectPrimaryDimension(
  state: RateLimitState,
): RateLimitDimension | null {
  void state;
  throw new Error(
    'ring-helpers.ts WB1 RED — selectPrimaryDimension not implemented',
  );
}
