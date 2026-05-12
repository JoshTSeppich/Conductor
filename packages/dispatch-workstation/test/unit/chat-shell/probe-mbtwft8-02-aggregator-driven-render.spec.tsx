// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW WB4 —
// probe-mbtwft8-02-aggregator-driven-render: cross-package consumer-
// integration probe binding daemon-side `aggregateDailyCost` output
// to `BottomRailCostMeter` render.
//
// Round 11 §3.9 SPECULATIVE — operator-arbitrated (β) reshape 2026-05-12:
// T8 narrowed to daemon-side aggregator + bottom-rail consumer test.
// Under (β), this probe is T8's binding evidence that the aggregator
// pure-fn output shape (`number`) flows correctly through the
// consumer's bridge.onCostUpdate channel and produces the wireframe-
// exact `conductor api · $X.XX today` text.
//
// Encoded contract (3 conditions):
//   (1) `aggregateDailyCost` is importable from daemon via relative
//       path (cross-package precedent: workstation integration probe at
//       test/integration/approval-policy-semantic/probe-01-...:39 uses
//       relative import of dispatch-daemon/test/fixtures/server.js).
//   (2) aggregateDailyCost([3× MOCK_COST_INFO with usd_today=0.42])
//       equals 1.26 (validates daemon contract at WB3 GREEN).
//   (3) Driving aggregator output through BottomRailCostMeter bridge
//       produces wireframe-exact text `/conductor api · \$1\.26 today/`.
//
// Cairn ordering note: WB4 was authored AFTER WB3 GREEN (39c514b)
// shipped the aggregator module, so this probe is GREEN at authoring
// time. The conceptual RED state was load-bearing at WB2 RED (1ca2e15)
// where the daemon-side probe established aggregator-absence as a
// failure mode. WB4 documents the end-to-end binding that WB2+WB3
// together validate; deleting `dispatch-daemon/src/cost-aggregator.ts`
// re-flips this probe to RED via import failure.
//
// Anti-fabrication §2.1: cost_info fixture shape mirrors daemon
// MOCK_COST_INFO at packages/dispatch-daemon/src/routes/sessions.ts:64
// (KNOWN at HEAD 39c514b via direct-read).

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BottomRailCostMeter } from '../../../src/chat-shell/bottom-rail-cost-meter.js';

// Cross-package import via workspace-relative path; precedent at
// test/integration/approval-policy-semantic/probe-01-policy-resolver-
// semantic.test.ts:39 (workstation→daemon test fixture import).
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let aggregateDailyCost: any;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const mod = await import(
      /* @vite-ignore */ '../../../../dispatch-daemon/src/cost-aggregator.js'
    );
    aggregateDailyCost = (
      mod as { aggregateDailyCost?: unknown }
    ).aggregateDailyCost;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

const MOCK_COST_INFO = {
  usd_today: 0.42,
  usd_this_month: 8.17,
  token_count: 124_500,
} as const;

interface BridgeStub {
  readonly onCostUpdate: (cb: (totalUsd: number) => void) => () => void;
}

function makeBridge(): {
  bridge: BridgeStub;
  emit: (n: number) => void;
} {
  let captured: ((n: number) => void) | null = null;
  const bridge: BridgeStub = {
    onCostUpdate: (cb) => {
      captured = cb;
      return () => {
        captured = null;
      };
    },
  };
  return {
    bridge,
    emit: (n) => {
      if (captured) captured(n);
    },
  };
}

describe('MB-T-WIREFRAME-T8 WB4 — daemon aggregator → bottom-rail consumer integration', () => {
  describe('Condition (1): aggregateDailyCost importable from daemon', () => {
    it('cross-package relative import succeeds', () => {
      expect(
        importError,
        importError ? `import error: ${importError.message}` : undefined,
      ).toBeUndefined();
      expect(typeof aggregateDailyCost).toBe('function');
    });
  });

  describe('Condition (2): aggregator sums 3× MOCK_COST_INFO to 1.26', () => {
    it('mirrors daemon MOCK_COST_INFO real-aggregation contract', () => {
      const result = aggregateDailyCost([
        { cost_info: MOCK_COST_INFO },
        { cost_info: MOCK_COST_INFO },
        { cost_info: MOCK_COST_INFO },
      ]);
      expect(result).toBeCloseTo(1.26, 6);
    });
  });

  describe('Condition (3): aggregator output drives wireframe render', () => {
    it('emit(aggregateDailyCost(3× MOCK)) → /conductor api · \\$1\\.26 today/', async () => {
      const total = aggregateDailyCost([
        { cost_info: MOCK_COST_INFO },
        { cost_info: MOCK_COST_INFO },
        { cost_info: MOCK_COST_INFO },
      ]);

      const { bridge, emit } = makeBridge();
      render(<BottomRailCostMeter bridge={bridge} />);
      await act(async () => {
        emit(total);
      });

      const slot = screen.getByTestId('bottom-rail-cost-meter');
      expect(slot.textContent).toMatch(/conductor api · \$1\.26 today/);
    });
  });
});
