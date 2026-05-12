// MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB3 (red) —
// probe-mbtwft9-02-aggregator-roundtrip: behavior probe for the
// rate-limit aggregator factory shipped at WB4 GREEN.
//
// Per ticket body 5a27f2f §4 WB3 + decisions doc ADR-MBTWFT9-A
// (Sub-Q-T9-A=(f) skeleton-with-deferred-source). The aggregator
// surface is the architectural seam: pluggable `RateLimitSource`
// dependency at construction time; null-source default at main.ts
// wiring; follow-on tickets plug a real source (workstation-direct
// Anthropic ping behind key-provisioning follow-on, OR daemon-side
// ping behind a future WORKSTATION_CONTRACT.md §6.6 amendment).
//
// Encoded contract (4 conditions, all RED at HEAD 3baa241):
//   (1) Module `src/main/rate-limit-aggregator.ts` exports
//       `createRateLimitAggregator` factory + `createNullRateLimitSource`
//       helper.
//   (2) Aggregator instantiated with a mock source has
//       `getLatestState() === null` before any source emission.
//   (3) Aggregator forwards source emissions: after the mock source
//       fires a RateLimitState, `getLatestState()` returns that state
//       AND any `onUpdate(cb)` subscribers receive the same state.
//   (4) `onUpdate(cb)` dispose function deregisters the subscriber:
//       after dispose(), a subsequent source emission does NOT fire
//       that callback again (but `getLatestState()` still updates).
//
// RED state at HEAD `3baa241`: module absent — import will throw
// ERR_MODULE_NOT_FOUND at top level; vitest reports the spec file
// as a load-time failure. WB4 GREEN authors the module + flips RED
// → GREEN.

import { describe, it, expect } from 'vitest';
import type { RateLimitState } from '../../../src/chat-shell/ring-helpers.js';
import {
  createRateLimitAggregator,
  createNullRateLimitSource,
  type RateLimitSource,
} from '../../../src/main/rate-limit-aggregator.js';

// ─── Fake source ─────────────────────────────────────────────────────────────
// Mirrors the RateLimitSource interface from rate-limit-aggregator.ts.
// Test-helper `emit(state)` fires the registered onState callback so the
// probe can drive aggregator transitions deterministically.

function makeFakeSource(): {
  source: RateLimitSource;
  emit: (state: RateLimitState) => void;
  startCount: () => number;
  stopCount: () => number;
} {
  const observers = new Set<(state: RateLimitState) => void>();
  let starts = 0;
  let stops = 0;
  return {
    source: {
      start(): void {
        starts += 1;
      },
      stop(): void {
        stops += 1;
      },
      onState(cb): () => void {
        observers.add(cb);
        return () => observers.delete(cb);
      },
    },
    emit(state: RateLimitState): void {
      observers.forEach((cb) => cb(state));
    },
    startCount: () => starts,
    stopCount: () => stops,
  };
}

// Sample state — populates `requests` dimension only (matches Sub-Q-T9-B=(i)
// primary-dimension default per ADR-MBTWFT9-B).
function sampleState(resetMs: number): RateLimitState {
  return {
    requests: { limit: 1000, remaining: 750, reset: resetMs },
    tokens: null,
    inputTokens: null,
    outputTokens: null,
  };
}

describe('MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB3 — aggregator round-trip', () => {
  describe('Condition (1): module exports', () => {
    it('exports `createRateLimitAggregator` factory and `createNullRateLimitSource` helper', () => {
      expect(typeof createRateLimitAggregator).toBe('function');
      expect(typeof createNullRateLimitSource).toBe('function');
    });
  });

  describe('Condition (2): initial state is null', () => {
    it('newly-constructed aggregator has `getLatestState() === null`', () => {
      const { source } = makeFakeSource();
      const agg = createRateLimitAggregator({ source });
      expect(agg.getLatestState()).toBeNull();
    });
  });

  describe('Condition (3): source emission flows through aggregator', () => {
    it('after source emits, `getLatestState()` returns the emitted state AND `onUpdate` subscribers receive it', () => {
      const { source, emit } = makeFakeSource();
      const agg = createRateLimitAggregator({ source });
      const seen: RateLimitState[] = [];
      agg.onUpdate((state) => seen.push(state));
      agg.start();
      const state = sampleState(Date.now() + 2 * 60 * 60 * 1000); // 2h
      emit(state);
      expect(agg.getLatestState()).toBe(state);
      expect(seen).toEqual([state]);
    });

    it('start() invokes the source\'s start(); stop() invokes the source\'s stop()', () => {
      const { source, startCount, stopCount } = makeFakeSource();
      const agg = createRateLimitAggregator({ source });
      expect(startCount()).toBe(0);
      agg.start();
      expect(startCount()).toBe(1);
      agg.stop();
      expect(stopCount()).toBe(1);
    });
  });

  describe('Condition (4): onUpdate dispose deregisters callback', () => {
    it('after dispose(), a subsequent emission does NOT fire the disposed callback', () => {
      const { source, emit } = makeFakeSource();
      const agg = createRateLimitAggregator({ source });
      const seen: RateLimitState[] = [];
      const dispose = agg.onUpdate((state) => seen.push(state));
      agg.start();
      const stateA = sampleState(Date.now() + 1 * 60 * 60 * 1000);
      emit(stateA);
      expect(seen).toHaveLength(1);
      dispose();
      const stateB = sampleState(Date.now() + 3 * 60 * 60 * 1000);
      emit(stateB);
      // Callback not fired again.
      expect(seen).toHaveLength(1);
      // But getLatestState() still tracks the latest emission.
      expect(agg.getLatestState()).toBe(stateB);
    });
  });

  describe('Bonus: null-source default per ADR-MBTWFT9-A (Sub-Q-T9-A=(f))', () => {
    it('createNullRateLimitSource() returns a source whose start()/stop() are no-ops and which never emits', () => {
      const nullSource = createNullRateLimitSource();
      const agg = createRateLimitAggregator({ source: nullSource });
      const seen: RateLimitState[] = [];
      agg.onUpdate((state) => seen.push(state));
      agg.start();
      expect(agg.getLatestState()).toBeNull();
      expect(seen).toEqual([]);
      agg.stop();
      // No throws; aggregator remains in null state.
      expect(agg.getLatestState()).toBeNull();
    });
  });
});
