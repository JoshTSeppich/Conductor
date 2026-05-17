// MB-F-CONSOLE-T02-RECONNECT-BACKOFF — WB1 RED.
//
// Asserts the pure exponential-backoff state machine in
// packages/dispatch-workstation/src/console-panel/reconnect-backoff.ts.
//
// Closure-target body (FOLLOWUPS.md:132): "exponential backoff (e.g.,
// 1s/2s/4s/8s capped at 30s) with a max-attempts ceiling that surfaces a
// terminal `console:error` after N failed reconnects."
//
// WB1 scope = pure delay function. WB2 covers controller integration +
// max-attempts ceiling + terminal-error surface.
import { describe, it, expect } from 'vitest';
import {
  BASE_DELAY_MS,
  MAX_DELAY_MS,
  MAX_RECONNECT_ATTEMPTS,
  computeBackoffDelay,
  shouldGiveUp,
} from '../../../src/console-panel/reconnect-backoff.js';

describe('MB-F-CONSOLE-T02-RECONNECT-BACKOFF — WB1 pure backoff state machine', () => {
  it('exposes the load-bearing constants', () => {
    expect(BASE_DELAY_MS).toBe(1_000);
    expect(MAX_DELAY_MS).toBe(30_000);
    expect(MAX_RECONNECT_ATTEMPTS).toBeGreaterThanOrEqual(3);
  });

  it('computeBackoffDelay doubles from 1s and caps at 30s', () => {
    // Attempt index = number of FAILED attempts so far. Attempt 0 = first
    // reconnect (delay 1s); doubles each subsequent attempt until the 30s
    // ceiling clamps the value.
    expect(computeBackoffDelay(0)).toBe(1_000);
    expect(computeBackoffDelay(1)).toBe(2_000);
    expect(computeBackoffDelay(2)).toBe(4_000);
    expect(computeBackoffDelay(3)).toBe(8_000);
    expect(computeBackoffDelay(4)).toBe(16_000);
    // 2^5 * 1000 = 32_000 → clamped to MAX_DELAY_MS (30_000).
    expect(computeBackoffDelay(5)).toBe(30_000);
    expect(computeBackoffDelay(6)).toBe(30_000);
    expect(computeBackoffDelay(20)).toBe(30_000);
  });

  it('computeBackoffDelay rejects negative attempt counts deterministically', () => {
    // Defensive clamp: a negative attempt is treated as attempt 0 (the
    // first reconnect delay) rather than producing an absurd value.
    expect(computeBackoffDelay(-1)).toBe(BASE_DELAY_MS);
    expect(computeBackoffDelay(-100)).toBe(BASE_DELAY_MS);
  });

  it('shouldGiveUp flips at MAX_RECONNECT_ATTEMPTS', () => {
    expect(shouldGiveUp(0)).toBe(false);
    expect(shouldGiveUp(MAX_RECONNECT_ATTEMPTS - 1)).toBe(false);
    expect(shouldGiveUp(MAX_RECONNECT_ATTEMPTS)).toBe(true);
    expect(shouldGiveUp(MAX_RECONNECT_ATTEMPTS + 10)).toBe(true);
  });
});
