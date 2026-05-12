/**
 * MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW WB3 GREEN —
 * Pure-fn daemon-side cost aggregator.
 *
 * Round 11 §3.9 SPECULATIVE — operator-arbitrated (β) reshape 2026-05-12:
 * T8 narrowed to daemon-side aggregator + bottom-rail consumer test only.
 *
 * Sums `cost_info.usd_today` across a session list, gracefully handling
 * sessions whose `cost_info` field is absent (the SessionResponseV2
 * `cost_info` field is OPTIONAL per dispatch-core v2/schema.ts:339 —
 * daemon /v2/sessions currently emits MOCK_COST_INFO unconditionally per
 * routes/sessions.ts:114, but a future daemon-side
 * MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION Tier 2 may emit `cost_info`
 * only when real-Anthropic-API has data — both shapes are aggregator-
 * transparent).
 *
 * Input shape (structural; not Zod-validated here — caller validates
 * upstream against SessionResponseV2 if needed):
 *   ReadonlyArray<{ cost_info?: { usd_today: number; ... } }>
 *
 * Output: number (USD; non-negative invariant inherited from
 * CostInfoSchema.usd_today.nonnegative()).
 *
 * Purity: no I/O, no closures over external state, no Date.now().
 * Caller injects the session list snapshot.
 *
 * Consumers (anticipated):
 *   - workstation-side aggregator (sibling-session territory; out of T8
 *     scope under (β) reshape) polls daemon /v2/sessions, applies
 *     aggregateDailyCost, broadcasts via coarchitect:cost-update.
 *   - daemon-side aggregation endpoint (if Sub-Q-T8-A=(b) is later
 *     re-arbitrated) wraps this fn in a /v2/sessions/cost-summary route.
 *
 * Frozen-contract awareness: this module DOES NOT touch CostInfoSchema
 * (v2/schema.ts §1 FROZEN) — it consumes the shape structurally.
 */

export interface SessionWithCostInfo {
  readonly cost_info?: {
    readonly usd_today: number;
    readonly usd_this_month: number;
    readonly token_count: number;
  };
}

export function aggregateDailyCost(
  sessions: ReadonlyArray<SessionWithCostInfo>,
): number {
  let total = 0;
  for (const session of sessions) {
    if (session.cost_info) {
      total += session.cost_info.usd_today;
    }
  }
  return total;
}
