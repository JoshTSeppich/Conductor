// MB-T25 WB1 — probe-01 RED: ring-helpers pure-fn assertions.
//
// Asserts the WB2 GREEN contract:
//   1. arcPath returns valid SVG path string for 0/50/100 percentage
//   2. tintForPercentage threshold mapping (<70 green, 70-85 yellow, >=85 red)
//   3. formatResetCountdown returns "Hh MMm" with past-clamp + zero-pad
//   4. computePercentageUsed returns 0-100 + clamps + zero-limit guard
//   5. selectPrimaryDimension returns the operator-arbitrated primary
//      dimension (Q-MBT25-7 disposition; recommended 'tokens')
//
// At WB1 (RED), every assertion FAILS because the WB1 ring-helpers.ts
// scaffold throws "not implemented" on every call. WB2 GREEN replaces
// each stub.
//
// Confidence on threshold values: [KNOWN] from operator's prompt §3
// Acceptance: "Color tinting matches wireframe (green/yellow/red at
// thresholds)". Threshold values from prompt In-scope: "green (<70%),
// yellow (70-85%), red (>85%)".

import { describe, it, expect } from 'vitest';
import {
  arcPath,
  tintForPercentage,
  formatResetCountdown,
  computePercentageUsed,
  selectPrimaryDimension,
  type RateLimitState,
} from '../../../src/chat-shell/ring-helpers.js';

describe('MB-T25 WB1 — arcPath SVG path generation', () => {
  it('returns a non-empty string for 0% (degenerate arc, still valid SVG path)', () => {
    const path = arcPath(0, 50, 4);
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns a path containing arc commands for 50%', () => {
    const path = arcPath(50, 50, 4);
    // SVG arc command is "A" (or "a" for relative). Real impl
    // produces "M ... A rx ry ..." path.
    expect(path).toMatch(/[Aa]/);
  });

  it('returns a path representing a full circle for 100%', () => {
    const path = arcPath(100, 50, 4);
    // Full circle in SVG cannot be one arc command; real impl
    // produces 2 arc commands or M+A+A. Either way contains arc.
    expect(path).toMatch(/[Aa]/);
    expect(path.length).toBeGreaterThan(arcPath(0, 50, 4).length);
  });
});

describe('MB-T25 WB1 — tintForPercentage threshold mapping', () => {
  it('returns green for 0%', () => {
    expect(tintForPercentage(0)).toBe('green');
  });

  it('returns green for 50% (mid-low band)', () => {
    expect(tintForPercentage(50)).toBe('green');
  });

  it('returns green for 69% (just under yellow threshold)', () => {
    expect(tintForPercentage(69)).toBe('green');
  });

  it('returns yellow at exactly 70% (yellow threshold)', () => {
    expect(tintForPercentage(70)).toBe('yellow');
  });

  it('returns yellow at 80% (mid-yellow band)', () => {
    expect(tintForPercentage(80)).toBe('yellow');
  });

  it('returns yellow at 84% (just under red threshold)', () => {
    expect(tintForPercentage(84)).toBe('yellow');
  });

  it('returns red at exactly 85% (red threshold)', () => {
    expect(tintForPercentage(85)).toBe('red');
  });

  it('returns red at 100%', () => {
    expect(tintForPercentage(100)).toBe('red');
  });
});

describe('MB-T25 WB1 — formatResetCountdown "Hh MMm" formatting', () => {
  const NOW = 1_700_000_000_000; // arbitrary fixed reference time for determinism

  it('formats a 5-hour-30-minute future reset as "5h 30m"', () => {
    const reset = NOW + (5 * 60 + 30) * 60 * 1000;
    expect(formatResetCountdown(reset, NOW)).toBe('5h 30m');
  });

  it('zero-pads single-digit minutes', () => {
    const reset = NOW + (4 * 60 + 5) * 60 * 1000;
    expect(formatResetCountdown(reset, NOW)).toBe('4h 05m');
  });

  it('formats zero hours with double-digit minutes as "0h 45m"', () => {
    const reset = NOW + 45 * 60 * 1000;
    expect(formatResetCountdown(reset, NOW)).toBe('0h 45m');
  });

  it('clamps past reset to "0h 00m"', () => {
    const reset = NOW - 1000;
    expect(formatResetCountdown(reset, NOW)).toBe('0h 00m');
  });

  it('clamps zero-delta reset to "0h 00m"', () => {
    expect(formatResetCountdown(NOW, NOW)).toBe('0h 00m');
  });

  it('accepts ISO 8601 string for resetMsOrIso', () => {
    const resetIso = new Date(NOW + 2 * 60 * 60 * 1000).toISOString();
    expect(formatResetCountdown(resetIso, NOW)).toBe('2h 00m');
  });
});

describe('MB-T25 WB1 — computePercentageUsed', () => {
  it('returns 0 when used=0', () => {
    expect(computePercentageUsed(0, 100)).toBe(0);
  });

  it('returns 50 for used=50, limit=100', () => {
    expect(computePercentageUsed(50, 100)).toBe(50);
  });

  it('returns 100 when used=limit', () => {
    expect(computePercentageUsed(100, 100)).toBe(100);
  });

  it('clamps to 100 when used > limit (defensive)', () => {
    expect(computePercentageUsed(150, 100)).toBe(100);
  });

  it('returns 0 when limit=0 (defensive zero-divisor guard)', () => {
    expect(computePercentageUsed(0, 0)).toBe(0);
    expect(computePercentageUsed(50, 0)).toBe(0);
  });

  it('clamps to 0 for negative used (defensive)', () => {
    expect(computePercentageUsed(-10, 100)).toBe(0);
  });
});

describe('MB-T25 WB1 — selectPrimaryDimension', () => {
  // Q-MBT25-7 surfaced for operator arbitration at WB1 ack;
  // recommended (a): 'tokens' as primary. These tests assert
  // the recommended (a) disposition. If operator disposes
  // otherwise at WB1 ack, WB2 GREEN updates these tests.
  const dim = (limit: number, remaining: number) => ({
    limit,
    remaining,
    reset: 1_700_000_000_000,
  });

  it('returns the tokens dimension when present', () => {
    const state: RateLimitState = {
      requests: dim(1000, 900),
      tokens: dim(2_000_000, 1_500_000),
      inputTokens: dim(1_000_000, 750_000),
      outputTokens: dim(500_000, 400_000),
    };
    expect(selectPrimaryDimension(state)).toEqual(dim(2_000_000, 1_500_000));
  });

  it('returns null when all dimensions are null (placeholder state)', () => {
    const state: RateLimitState = {
      requests: null,
      tokens: null,
      inputTokens: null,
      outputTokens: null,
    };
    expect(selectPrimaryDimension(state)).toBeNull();
  });

  it('returns null when tokens is null even if other dims present (recommended-a strict)', () => {
    // [MODELED] — if operator disposes (b) max-of-all-4 at WB1 ack,
    // this test changes. Recommended-a strict says: tokens or null.
    const state: RateLimitState = {
      requests: dim(1000, 900),
      tokens: null,
      inputTokens: dim(1_000_000, 750_000),
      outputTokens: dim(500_000, 400_000),
    };
    expect(selectPrimaryDimension(state)).toBeNull();
  });
});
