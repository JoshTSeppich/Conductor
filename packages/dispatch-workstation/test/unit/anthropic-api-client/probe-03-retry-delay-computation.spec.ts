// MB-T34 WB1 RED — probe-03: computeRetryDelayMs (jittered exp backoff
// + retry-after honor).
//
// Asserts:
//   1. attempt=0 returns ~1000ms (base) +/- 25% jitter, retry-after null
//   2. attempt=1 returns ~2000ms (1000 * 2^1) +/- 25% jitter
//   3. attempt=2 returns ~4000ms (1000 * 2^2) +/- 25% jitter
//   4. retryAfterSeconds non-null overrides backoff (server is authoritative)
//   5. delay is capped at 30s (1000 * 2^N grows beyond cap at N>=5)
//   6. delay is always >= 0
//
// Q-MBT34-4=(a) operator-acked HALT 0 2026-05-08.
//
// WB1 RED: computeRetryDelayMs stub returns 0. WB3 turns this probe GREEN.

import { describe, it, expect } from 'vitest';
import { computeRetryDelayMs } from '../../../src/main/anthropic-api-client.js';

const BASE_MS = 1000;
const MAX_CAP_MS = 30_000;
const JITTER_FRACTION = 0.25;

function expectInJitterRange(actual: number, expectedBase: number): void {
  const lo = expectedBase * (1 - JITTER_FRACTION);
  const hi = expectedBase * (1 + JITTER_FRACTION);
  expect(actual).toBeGreaterThanOrEqual(Math.floor(lo));
  expect(actual).toBeLessThanOrEqual(Math.ceil(hi));
}

describe('MB-T34 WB1 RED — computeRetryDelayMs', () => {
  it('attempt=0 returns base ~1000ms +/- 25% jitter', () => {
    // Sample several times to account for jitter randomness.
    for (let i = 0; i < 20; i += 1) {
      const delay = computeRetryDelayMs(0, null);
      expectInJitterRange(delay, BASE_MS);
    }
  });

  it('attempt=1 returns 2*base ~2000ms +/- 25% jitter', () => {
    for (let i = 0; i < 20; i += 1) {
      const delay = computeRetryDelayMs(1, null);
      expectInJitterRange(delay, 2 * BASE_MS);
    }
  });

  it('attempt=2 returns 4*base ~4000ms +/- 25% jitter', () => {
    for (let i = 0; i < 20; i += 1) {
      const delay = computeRetryDelayMs(2, null);
      expectInJitterRange(delay, 4 * BASE_MS);
    }
  });

  it('retry-after seconds (e.g. 5) overrides backoff and returns 5000ms', () => {
    const delay = computeRetryDelayMs(0, 5);
    expect(delay).toBe(5000);
  });

  it('retry-after seconds takes priority over the attempt-derived backoff', () => {
    const delay = computeRetryDelayMs(3, 7);
    expect(delay).toBe(7000);
  });

  it('delay is capped at MAX_CAP_MS (30s) for large attempts', () => {
    for (let attempt = 5; attempt < 10; attempt += 1) {
      const delay = computeRetryDelayMs(attempt, null);
      expect(delay).toBeLessThanOrEqual(MAX_CAP_MS);
    }
  });

  it('delay is always >= 0', () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const delay = computeRetryDelayMs(attempt, null);
      expect(delay).toBeGreaterThanOrEqual(0);
    }
  });

  it('retry-after = 0 returns 0ms (immediate retry)', () => {
    expect(computeRetryDelayMs(0, 0)).toBe(0);
  });
});
