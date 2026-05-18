// @vitest-environment happy-dom
//
// MB-T-MVP-W1-EXPANSION-2 WB5 probe-05 — OrchestratorStrip rate + ETA stats.
//
// Asserts throughput rate + ETA derivation per design-handoff
// orchestrator-strip.jsx:70-89:
//
//   - data-testid="ostrip-stat-rate" present in stats grid
//     - Default "0.0/min" when no history accumulated
//     - Computed via rolling 30s window: rate = (delta_done / delta_secs) * 60
//   - data-testid="ostrip-stat-eta" present conditionally:
//     - Hidden when throughput=0 OR queuedCount=0 (design line 87-89)
//     - Shown as mm:ss when both throughput>0 and queuedCount>0
//   - data-testid="ostrip-stat-failed" present conditionally:
//     - Hidden when erroredCount=0 OR undefined (design line 109)
//     - Shown verbatim when erroredCount>0
//
// To make rate+ETA testable, the component MUST accept a `nowMs` prop
// for deterministic time injection (mirrors W1 focus-pane-header.tsx
// nowMs pattern at focus-pane-header.tsx:38) AND a `historyMs` prop
// for the rolling window (default 30_000 per design line 76).
//
// Pure-fn `computeThroughputAndEta` helper lives at module top so the
// test can exercise the math directly without React lifecycle.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  OrchestratorStrip,
  computeThroughputAndEta,
} from '../../../src/orchestrator-strip/orchestrator-strip.js';

describe('MB-T-MVP-W1-EXPANSION-2 WB5 — OrchestratorStrip rate + ETA', () => {
  describe('computeThroughputAndEta pure-fn helper', () => {
    it('returns rate=0 + eta=null with empty history', () => {
      const r = computeThroughputAndEta({
        history: [],
        queued: 0,
        windowMs: 30_000,
      });
      expect(r.ratePerMin).toBe(0);
      expect(r.etaSeconds).toBe(null);
    });

    it('returns rate=0 + eta=null with single sample (need 2 for delta)', () => {
      const r = computeThroughputAndEta({
        history: [{ t: 1000, done: 0 }],
        queued: 5,
        windowMs: 30_000,
      });
      expect(r.ratePerMin).toBe(0);
      expect(r.etaSeconds).toBe(null);
    });

    it('computes rate = (delta_done / delta_secs) * 60 over rolling window', () => {
      // 2 samples: t=0 done=0, t=30000 done=15. delta=15 over 30s → 30/min.
      const r = computeThroughputAndEta({
        history: [
          { t: 0, done: 0 },
          { t: 30_000, done: 15 },
        ],
        queued: 0,
        windowMs: 30_000,
      });
      expect(r.ratePerMin).toBeCloseTo(30, 5);
    });

    it('ETA = queue / (rate/60) when both throughput>0 and queuedCount>0', () => {
      const r = computeThroughputAndEta({
        history: [
          { t: 0, done: 0 },
          { t: 60_000, done: 10 }, // 10 per 60s → 10/min → 1/6 per sec
        ],
        queued: 10, // 10 / (10/60) = 60 sec
        windowMs: 60_000,
      });
      expect(r.ratePerMin).toBeCloseTo(10, 5);
      expect(r.etaSeconds).toBeCloseTo(60, 1);
    });

    it('ETA = null when queued=0 even if rate>0 (design line 87-89 guard)', () => {
      const r = computeThroughputAndEta({
        history: [
          { t: 0, done: 0 },
          { t: 30_000, done: 5 },
        ],
        queued: 0,
        windowMs: 30_000,
      });
      expect(r.etaSeconds).toBe(null);
    });

    it('ETA = null when rate=0 even if queued>0', () => {
      const r = computeThroughputAndEta({
        history: [
          { t: 0, done: 5 },
          { t: 30_000, done: 5 },
        ],
        queued: 10,
        windowMs: 30_000,
      });
      expect(r.ratePerMin).toBe(0);
      expect(r.etaSeconds).toBe(null);
    });

    it('rolling window filters history older than windowMs from latest sample', () => {
      // At t=60000, windowMs=30000 → drops samples with t < 30000.
      // Remaining: {t:30000, done:5}, {t:60000, done:15}. delta=10/30s → 20/min.
      const r = computeThroughputAndEta({
        history: [
          { t: 0, done: 0 },
          { t: 30_000, done: 5 },
          { t: 60_000, done: 15 },
        ],
        queued: 0,
        windowMs: 30_000,
      });
      expect(r.ratePerMin).toBeCloseTo(20, 5);
    });
  });

  describe('OrchestratorStrip renders rate + ETA stats', () => {
    it('exposes ostrip-stat-rate with default "0.0/min" when no history seeded', () => {
      render(<OrchestratorStrip />);
      const rate = screen.getByTestId('ostrip-stat-rate');
      expect(rate.textContent).toBe('0.0/min');
    });

    it('exposes ostrip-stat-rate with formatted "{n.n}/min" when ratePerMin prop set', () => {
      render(<OrchestratorStrip ratePerMin={4.7} />);
      expect(screen.getByTestId('ostrip-stat-rate').textContent).toBe('4.7/min');
    });

    it('does NOT render ostrip-stat-eta when etaSeconds prop unset/null', () => {
      render(<OrchestratorStrip />);
      expect(screen.queryByTestId('ostrip-stat-eta')).toBeNull();
    });

    it('renders ostrip-stat-eta formatted mm:ss when etaSeconds prop set', () => {
      render(<OrchestratorStrip etaSeconds={125} />);
      expect(screen.getByTestId('ostrip-stat-eta').textContent).toBe('02:05');
    });

    it('renders ostrip-stat-eta with 00:00 floor on zero seconds', () => {
      render(<OrchestratorStrip etaSeconds={0} />);
      // 0 seconds is a valid finite ETA; renders as 00:00.
      expect(screen.getByTestId('ostrip-stat-eta').textContent).toBe('00:00');
    });

    it('renders ostrip-stat-eta with em-dash on negative/non-finite ETA', () => {
      render(<OrchestratorStrip etaSeconds={Number.POSITIVE_INFINITY} />);
      expect(screen.getByTestId('ostrip-stat-eta').textContent).toBe('—');
    });

    it('does NOT render ostrip-stat-failed when erroredCount unset/0', () => {
      render(<OrchestratorStrip />);
      expect(screen.queryByTestId('ostrip-stat-failed')).toBeNull();
      render(<OrchestratorStrip erroredCount={0} />);
      expect(screen.queryByTestId('ostrip-stat-failed')).toBeNull();
    });

    it('renders ostrip-stat-failed when erroredCount>0 (design line 109)', () => {
      render(<OrchestratorStrip erroredCount={2} />);
      expect(screen.getByTestId('ostrip-stat-failed').textContent).toBe('2');
    });
  });
});
