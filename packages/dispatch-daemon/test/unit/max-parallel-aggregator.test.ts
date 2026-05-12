// MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW WB1 RED —
// probe: daemon-side max-parallel-aggregator pure-fn behavior contract.
//
// Round 11 §3.9 SPECULATIVE — operator-arbitrated manifest at
// phase4-t9-t10-exec.txt scopes T10 to daemon-side aggregator +
// workstation component-tier consumer (mirrors T8 (β) reshape
// precedent at 6d7dff3 + 155933f). Ticket body §1.1's
// "workstation settings file" disposition (Sub-Q-T10-B=(β)) is
// out-of-manifest for this session; T10 manifest-bound ladder
// ships daemon-side pure-fn aggregator + workstation component
// regression probe + cross-package contract bridge only.
//
// Architectural pattern mirrors T8 cost-aggregator (155933f) +
// T9 rate-limit-aggregator (3fef80d — workstation-side under
// expanded manifest e5c7c96): pure-fn module on daemon side;
// downstream consumers are deferred to future tickets per
// MB-F-T10-MAX-PARALLEL-CONSUMER-WIRING (filed at WB5 findings).
//
// Encoded contract (5 assertions; all RED at HEAD afa3f4d):
//   (1) Module `packages/dispatch-daemon/src/max-parallel-aggregator.ts`
//       exists at filesystem.
//   (2) Module exports `aggregateActiveSessionCount` as a function;
//       returns count of sessions with `status === 'open'`;
//       sessions with other statuses or missing status contribute 0;
//       empty list returns 0.
//   (3) Module exports `resolveMaxParallel` as a function; returns
//       `config.maxParallel` when present; returns DEFAULT_MAX_PARALLEL
//       (16) when config is absent or config.maxParallel is undefined.
//   (4) Module exports `DEFAULT_MAX_PARALLEL` constant === 16
//       (RATIFY T4 WB4 Sub-Q-T4-E=(i) wireframe-fixed default).
//   (5) `aggregateActiveSessionCount` + `resolveMaxParallel` are
//       pure functions — repeated calls with same args return
//       equal results; no I/O, no Date.now(), no random.
//
// Flips RED → GREEN at WB2 (module ship).
//
// Wireframe target per dispatch §1 bottom-rail bullet 5:
// `max-parallel · 16/16 counter`. Pure-fn semantics:
//   N = aggregateActiveSessionCount(sessionList)
//   M = resolveMaxParallel({ maxParallel: configValue })
// Component renders `max-parallel · N/M`. Manifest-bound T10 does
// not plumb a config source (workstation settings-file is out-of-
// manifest) — DEFAULT_MAX_PARALLEL acts as the fallback until a
// follow-on ticket plugs a real source.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DAEMON_ROOT = resolve(HERE, '../..');
const AGGREGATOR_SOURCE = resolve(
  DAEMON_ROOT,
  'src/max-parallel-aggregator.ts',
);

interface MockSession {
  status?: string;
}

describe('MB-T-WIREFRAME-T10 WB1 RED — daemon max-parallel-aggregator presence', () => {
  it('Condition (1): src/max-parallel-aggregator.ts exists at filesystem', () => {
    expect(existsSync(AGGREGATOR_SOURCE)).toBe(true);
  });
});

describe('MB-T-WIREFRAME-T10 WB1 RED — aggregateActiveSessionCount behavior', () => {
  it('Condition (2a): aggregateActiveSessionCount is a function', async () => {
    let fn: unknown;
    try {
      const mod = await import('../../src/max-parallel-aggregator.js');
      fn = (mod as { aggregateActiveSessionCount?: unknown })
        .aggregateActiveSessionCount;
    } catch {
      fn = undefined;
    }
    expect(typeof fn).toBe('function');
  });

  it('Condition (2b): counts sessions with status === "open"', async () => {
    const mod = await import('../../src/max-parallel-aggregator.js');
    const aggregateActiveSessionCount = (
      mod as {
        aggregateActiveSessionCount: (s: ReadonlyArray<MockSession>) => number;
      }
    ).aggregateActiveSessionCount;

    // 3 open + 2 non-open + 1 missing-status → 3
    expect(
      aggregateActiveSessionCount([
        { status: 'open' },
        { status: 'open' },
        { status: 'open' },
        { status: 'closed' },
        { status: 'idle' },
        {},
      ]),
    ).toBe(3);

    // All open
    expect(
      aggregateActiveSessionCount([
        { status: 'open' },
        { status: 'open' },
      ]),
    ).toBe(2);

    // Empty list → 0
    expect(aggregateActiveSessionCount([])).toBe(0);

    // None open → 0
    expect(
      aggregateActiveSessionCount([
        { status: 'closed' },
        { status: 'idle' },
        {},
      ]),
    ).toBe(0);
  });
});

describe('MB-T-WIREFRAME-T10 WB1 RED — resolveMaxParallel behavior', () => {
  it('Condition (3a): resolveMaxParallel is a function', async () => {
    let fn: unknown;
    try {
      const mod = await import('../../src/max-parallel-aggregator.js');
      fn = (mod as { resolveMaxParallel?: unknown }).resolveMaxParallel;
    } catch {
      fn = undefined;
    }
    expect(typeof fn).toBe('function');
  });

  it('Condition (3b): returns config.maxParallel when present; returns DEFAULT_MAX_PARALLEL when absent', async () => {
    const mod = await import('../../src/max-parallel-aggregator.js');
    const resolveMaxParallel = (
      mod as {
        resolveMaxParallel: (config?: { maxParallel?: number }) => number;
      }
    ).resolveMaxParallel;
    const DEFAULT_MAX_PARALLEL = (
      mod as { DEFAULT_MAX_PARALLEL: number }
    ).DEFAULT_MAX_PARALLEL;

    // Config supplied: returns config value
    expect(resolveMaxParallel({ maxParallel: 8 })).toBe(8);
    expect(resolveMaxParallel({ maxParallel: 32 })).toBe(32);
    expect(resolveMaxParallel({ maxParallel: 1 })).toBe(1);

    // Config absent: returns DEFAULT
    expect(resolveMaxParallel()).toBe(DEFAULT_MAX_PARALLEL);
    expect(resolveMaxParallel({})).toBe(DEFAULT_MAX_PARALLEL);
    expect(resolveMaxParallel({ maxParallel: undefined })).toBe(
      DEFAULT_MAX_PARALLEL,
    );
  });
});

describe('MB-T-WIREFRAME-T10 WB1 RED — DEFAULT_MAX_PARALLEL constant', () => {
  it('Condition (4): exported as 16 (RATIFY T4 WB4 Sub-Q-T4-E=(i) wireframe-fixed default)', async () => {
    const mod = await import('../../src/max-parallel-aggregator.js');
    expect(
      (mod as { DEFAULT_MAX_PARALLEL: number }).DEFAULT_MAX_PARALLEL,
    ).toBe(16);
  });
});

describe('MB-T-WIREFRAME-T10 WB1 RED — purity invariants', () => {
  it('Condition (5): aggregateActiveSessionCount + resolveMaxParallel are pure (deterministic; repeated calls equal)', async () => {
    const mod = await import('../../src/max-parallel-aggregator.js');
    const agg = (
      mod as {
        aggregateActiveSessionCount: (s: ReadonlyArray<MockSession>) => number;
      }
    ).aggregateActiveSessionCount;
    const res = (
      mod as {
        resolveMaxParallel: (config?: { maxParallel?: number }) => number;
      }
    ).resolveMaxParallel;

    const sessions: MockSession[] = [
      { status: 'open' },
      { status: 'open' },
      { status: 'closed' },
    ];

    // 5 successive calls return identical results
    const aggResults = Array.from({ length: 5 }, () => agg(sessions));
    expect(new Set(aggResults).size).toBe(1);
    expect(aggResults[0]).toBe(2);

    const resResults = Array.from({ length: 5 }, () =>
      res({ maxParallel: 12 }),
    );
    expect(new Set(resResults).size).toBe(1);
    expect(resResults[0]).toBe(12);

    // Same args, different times: still equal
    expect(agg(sessions)).toBe(agg(sessions));
    expect(res()).toBe(res());
  });
});
