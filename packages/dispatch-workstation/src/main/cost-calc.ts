// MB-T26 WB1 — cost-calc red scaffold.
//
// Operator-confirmed Q-MBT26-2=a (hardcoded MODEL_RATES + TODO followup
// linking MB-T33 profile system) 2026-05-07.
//
// WB2 (green) implements MODEL_RATES + computeCost. WB1 only exposes the
// public-API shape so test/unit/cost-calc/probe-01 can import-resolve and
// fail at the assertion level (RED).

export interface ModelRate {
  /** USD per 1,000,000 input tokens. */
  readonly inputPerMtok: number;
  /** USD per 1,000,000 output tokens. */
  readonly outputPerMtok: number;
}

// TODO MB-F-T26-RATE-TABLE-PROFILE-MIGRATION (filed at WB4): migrate to
// operator-editable profile YAML when MB-T33 profile system ships.
export const MODEL_RATES: Readonly<Record<string, ModelRate>> = {};

export function computeCost(
  _model: string,
  _inputTokens: number,
  _outputTokens: number,
): number {
  throw new Error(
    'MB-T26 WB1: computeCost not yet implemented (red scaffold; WB2 green)',
  );
}
