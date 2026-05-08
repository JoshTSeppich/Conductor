// MB-T26 WB2 — cost-calc green: per-model rate table + USD cost computation.
//
// Operator-confirmed Q-MBT26-2=a (hardcoded MODEL_RATES + TODO followup
// linking MB-T33 profile system) 2026-05-07.
//
// Pure-fn module — no side effects, no I/O. All cost rounding is up to the
// caller (computeCost returns full-precision USD).

export interface ModelRate {
  /** USD per 1,000,000 input tokens. */
  readonly inputPerMtok: number;
  /** USD per 1,000,000 output tokens. */
  readonly outputPerMtok: number;
}

// [MODELED] Sonnet 4.6 published rates as of operator's knowledge cutoff
// (January 2026): $3 / Mtok input, $15 / Mtok output. Hardcoded for v3.0
// per Q-MBT26-2=a. MB-F-T26-RATE-TABLE-PROFILE-MIGRATION (filed at WB4)
// tracks migration to operator-editable profile YAML at MB-T33 ship.
export const MODEL_RATES: Readonly<Record<string, ModelRate>> = {
  'claude-sonnet-4-6': { inputPerMtok: 3, outputPerMtok: 15 },
};

export function computeCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = MODEL_RATES[model];
  if (!rate) {
    throw new Error(
      `MB-T26: unknown model "${model}" — not in MODEL_RATES. Add to cost-calc.ts MODEL_RATES (or wait for MB-T33 profile system) before incurring cost on this model.`,
    );
  }
  return (
    (inputTokens / 1_000_000) * rate.inputPerMtok +
    (outputTokens / 1_000_000) * rate.outputPerMtok
  );
}
