import { describe, it, expect } from 'vitest';
import {
  computeBackoff,
  DEFAULT_BACKOFF,
} from '../src/daemon-client/backoff.js';

describe('WEB-T03 computeBackoff', () => {
  it('produces samples within ±25% jitter across 8 attempt levels', () => {
    const samplesPerAttempt = 1000;
    for (let attempt = 0; attempt < 8; attempt++) {
      const target = Math.min(
        DEFAULT_BACKOFF.baseMs * Math.pow(DEFAULT_BACKOFF.multiplier, attempt),
        DEFAULT_BACKOFF.capMs,
      );
      const lo = target * (1 - DEFAULT_BACKOFF.jitter);
      const hi = target * (1 + DEFAULT_BACKOFF.jitter);
      for (let i = 0; i < samplesPerAttempt; i++) {
        const v = computeBackoff(attempt, DEFAULT_BACKOFF);
        expect(v).toBeGreaterThanOrEqual(lo - 1);
        expect(v).toBeLessThanOrEqual(hi + 1);
      }
    }
  });
});
