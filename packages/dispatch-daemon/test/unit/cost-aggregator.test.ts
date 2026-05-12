// MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW WB2 RED —
// probe: daemon-side cost-aggregator pure-fn behavior contract.
//
// Round 11 §3.9 SPECULATIVE — operator-arbitrated (β) reshape 2026-05-12:
// T8 scope narrowed to daemon-side aggregator + bottom-rail consumer
// test only, per phase4-t8-exec.txt manifest (corrected at 6d7dff3
// to .test.ts after .spec.ts→.test.ts discoverability fix).
//
// Encoded contract (4 assertions; all RED at HEAD de6620e):
//   (1) Module `packages/dispatch-daemon/src/cost-aggregator.ts` exists.
//   (2) Module exports `aggregateDailyCost` as a function.
//   (3) Behavior: sums `cost_info.usd_today` across sessions where
//       `cost_info` is present.
//   (4) Behavior: sessions without `cost_info` contribute 0 (graceful
//       degradation; daemon `/v2/sessions` cost_info is OPTIONAL per
//       SessionResponseV2 line 339 in dispatch-core/src/v2/schema.ts).
//
// Flips RED → GREEN at WB3 (module ship).
//
// Test-fixture rationale: usd_today=0.42 mirrors daemon MOCK_COST_INFO
// at packages/dispatch-daemon/src/routes/sessions.ts:64 (request-time-
// computed mock pending MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION Tier 2).
// Sum-of-3-mocks = 1.26 is the load-bearing real-aggregation evidence;
// when real-Anthropic-integration lands daemon-side, the same pure-fn
// transparently aggregates real values without aggregator code change.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DAEMON_ROOT = resolve(HERE, '../..');
const AGGREGATOR_SOURCE = resolve(DAEMON_ROOT, 'src/cost-aggregator.ts');

interface MockCostInfo {
  usd_today: number;
  usd_this_month: number;
  token_count: number;
}

interface MockSession {
  cost_info?: MockCostInfo;
}

describe('MB-T-WIREFRAME-T8 WB2 RED — daemon cost-aggregator presence', () => {
  it('Condition (1): src/cost-aggregator.ts exists at filesystem', () => {
    expect(existsSync(AGGREGATOR_SOURCE)).toBe(true);
  });
});

describe('MB-T-WIREFRAME-T8 WB2 RED — aggregateDailyCost behavior', () => {
  it('Condition (2): aggregateDailyCost is a function', async () => {
    let fn: unknown;
    try {
      const mod = await import('../../src/cost-aggregator.js');
      fn = (mod as { aggregateDailyCost?: unknown }).aggregateDailyCost;
    } catch {
      fn = undefined;
    }
    expect(typeof fn).toBe('function');
  });

  it('Condition (3): sums usd_today across sessions with cost_info', async () => {
    const mod = await import('../../src/cost-aggregator.js');
    const aggregateDailyCost = (
      mod as { aggregateDailyCost: (s: ReadonlyArray<MockSession>) => number }
    ).aggregateDailyCost;

    const MOCK_COST_INFO: MockCostInfo = {
      usd_today: 0.42,
      usd_this_month: 8.17,
      token_count: 124_500,
    };

    // 3 sessions × 0.42 → 1.26 (mirrors daemon MOCK_COST_INFO real-
    // aggregation evidence; same fn covers real-data when daemon-side
    // integration replaces MOCK_COST_INFO).
    expect(
      aggregateDailyCost([
        { cost_info: MOCK_COST_INFO },
        { cost_info: MOCK_COST_INFO },
        { cost_info: MOCK_COST_INFO },
      ]),
    ).toBeCloseTo(1.26, 6);

    // Single session, asymmetric value, distinct from mock
    expect(
      aggregateDailyCost([
        { cost_info: { usd_today: 1.5, usd_this_month: 0, token_count: 0 } },
      ]),
    ).toBeCloseTo(1.5, 6);

    // Empty list → 0
    expect(aggregateDailyCost([])).toBe(0);
  });

  it('Condition (4): sessions without cost_info contribute 0 (graceful degradation)', async () => {
    const mod = await import('../../src/cost-aggregator.js');
    const aggregateDailyCost = (
      mod as { aggregateDailyCost: (s: ReadonlyArray<MockSession>) => number }
    ).aggregateDailyCost;

    // Mixed: one with cost_info, one without
    expect(
      aggregateDailyCost([
        { cost_info: { usd_today: 1.5, usd_this_month: 0, token_count: 0 } },
        {},
      ]),
    ).toBeCloseTo(1.5, 6);

    // All sessions without cost_info → 0
    expect(aggregateDailyCost([{}, {}, {}])).toBe(0);
  });
});
