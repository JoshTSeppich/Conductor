// MB-T26 WB1 — probe-01 red: cost-calc rate multiplication.
//
// Asserts the WB2 green contract:
//   1. MODEL_RATES contains at least the Conductor's current chat model
//      (claude-sonnet-4-6 per anthropic-client.ts:7) with positive rates.
//   2. computeCost(model, in, out) = in/1e6 * inputRate + out/1e6 * outputRate.
//   3. computeCost(model, 0, 0) === 0 for any known model.
//   4. computeCost(unknownModel, ...) throws (defensive — operator must
//      explicitly add a model to MODEL_RATES before it can incur cost).
//
// At WB1 (red), all four assertions FAIL because:
//   - MODEL_RATES is an empty const map (no claude-sonnet-4-6 entry)
//   - computeCost throws unconditionally with the WB1 red-scaffold message
//
// Confidence on rate values: [MODELED] from Anthropic's published Sonnet-
// tier pricing structure as of operator's knowledge cutoff. Rates can drift;
// MB-F-T26-RATE-TABLE-PROFILE-MIGRATION (filed WB4) tracks the migration to
// operator-editable profile YAML at MB-T33 ship.

import { describe, it, expect } from 'vitest';
import { computeCost, MODEL_RATES } from '../../../src/main/cost-calc.js';

describe('MB-T26 WB1 — MODEL_RATES table shape', () => {
  it('contains an entry for the Conductor chat model (claude-sonnet-4-6)', () => {
    expect(MODEL_RATES['claude-sonnet-4-6']).toBeDefined();
  });

  it('exposes positive USD-per-Mtok rates for the chat model', () => {
    const rate = MODEL_RATES['claude-sonnet-4-6'];
    expect(rate?.inputPerMtok).toBeGreaterThan(0);
    expect(rate?.outputPerMtok).toBeGreaterThan(0);
  });
});

describe('MB-T26 WB1 — computeCost rate multiplication', () => {
  it('multiplies input + output tokens by per-MTok rates (Sonnet 4.6 [MODELED] $3/$15)', () => {
    // 1000 input + 500 output @ $3/Mtok input + $15/Mtok output:
    //   (1000/1e6) * 3 + (500/1e6) * 15 = 0.003 + 0.0075 = 0.0105
    const cost = computeCost('claude-sonnet-4-6', 1000, 500);
    expect(cost).toBeCloseTo(0.0105, 6);
  });

  it('returns 0 for a known model with zero tokens (no API spend)', () => {
    expect(computeCost('claude-sonnet-4-6', 0, 0)).toBe(0);
  });

  it('throws for an unknown model (defensive — operator must add to MODEL_RATES)', () => {
    expect(() => computeCost('not-a-real-model', 100, 100)).toThrow();
  });
});
