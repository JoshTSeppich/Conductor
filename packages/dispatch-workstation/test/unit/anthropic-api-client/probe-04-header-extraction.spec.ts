// MB-T34 WB1 RED — probe-04: extractRateLimitState pure function.
//
// Asserts:
//   1. Full header set → complete RateLimitState (4 buckets × 3 fields
//      each + capturedAt)
//   2. Missing any required header → null
//   3. Numeric fields are integers (parsed from string headers)
//   4. Reset values preserved as ISO strings (not converted to Date)
//   5. Header keys are case-insensitive (Headers.get convention)
//   6. capturedAt is passed through unchanged
//
// Header set verified [KNOWN] from Phase 1 spike (commit c09bd09):
//   anthropic-ratelimit-{requests,tokens,input-tokens,output-tokens}-
//     {limit,remaining,reset}
//
// WB1 RED: extractRateLimitState stub returns null. WB4 turns this
// probe GREEN.

import { describe, it, expect } from 'vitest';
import { extractRateLimitState } from '../../../src/main/anthropic-api-client.js';

const FULL_HEADERS: Record<string, string> = {
  'anthropic-ratelimit-requests-limit': '50',
  'anthropic-ratelimit-requests-remaining': '49',
  'anthropic-ratelimit-requests-reset': '2026-05-08T02:37:51Z',
  'anthropic-ratelimit-tokens-limit': '60000',
  'anthropic-ratelimit-tokens-remaining': '59500',
  'anthropic-ratelimit-tokens-reset': '2026-05-08T02:37:50Z',
  'anthropic-ratelimit-input-tokens-limit': '50000',
  'anthropic-ratelimit-input-tokens-remaining': '49920',
  'anthropic-ratelimit-input-tokens-reset': '2026-05-08T02:37:50Z',
  'anthropic-ratelimit-output-tokens-limit': '10000',
  'anthropic-ratelimit-output-tokens-remaining': '9984',
  'anthropic-ratelimit-output-tokens-reset': '2026-05-08T02:37:50Z',
};

const CAPTURED_AT = '2026-05-08T02:37:50.123Z';

describe('MB-T34 WB1 RED — extractRateLimitState', () => {
  it('returns full RateLimitState when all 12 headers present', () => {
    const headers = new Headers(FULL_HEADERS);
    const state = extractRateLimitState(headers, CAPTURED_AT);
    expect(state).not.toBeNull();
    expect(state!.requests).toEqual({
      limit: 50,
      remaining: 49,
      reset: '2026-05-08T02:37:51Z',
    });
    expect(state!.tokens).toEqual({
      limit: 60000,
      remaining: 59500,
      reset: '2026-05-08T02:37:50Z',
    });
    expect(state!.inputTokens).toEqual({
      limit: 50000,
      remaining: 49920,
      reset: '2026-05-08T02:37:50Z',
    });
    expect(state!.outputTokens).toEqual({
      limit: 10000,
      remaining: 9984,
      reset: '2026-05-08T02:37:50Z',
    });
    expect(state!.capturedAt).toBe(CAPTURED_AT);
  });

  it('returns null when any required header is missing', () => {
    const partial = { ...FULL_HEADERS };
    delete partial['anthropic-ratelimit-tokens-remaining'];
    const headers = new Headers(partial);
    const state = extractRateLimitState(headers, CAPTURED_AT);
    expect(state).toBeNull();
  });

  it('returns null when no rate-limit headers present', () => {
    const headers = new Headers({ 'content-type': 'text/event-stream' });
    expect(extractRateLimitState(headers, CAPTURED_AT)).toBeNull();
  });

  it('parses numeric fields as integers (not strings)', () => {
    const state = extractRateLimitState(new Headers(FULL_HEADERS), CAPTURED_AT)!;
    expect(typeof state.requests.limit).toBe('number');
    expect(typeof state.requests.remaining).toBe('number');
    expect(typeof state.tokens.limit).toBe('number');
    expect(typeof state.outputTokens.remaining).toBe('number');
  });

  it('reset values preserved as ISO strings (not Date objects)', () => {
    const state = extractRateLimitState(new Headers(FULL_HEADERS), CAPTURED_AT)!;
    expect(typeof state.requests.reset).toBe('string');
    expect(typeof state.tokens.reset).toBe('string');
    expect(state.requests.reset).toBe('2026-05-08T02:37:51Z');
  });

  it('passes capturedAt through unchanged', () => {
    const state = extractRateLimitState(
      new Headers(FULL_HEADERS),
      '2030-01-01T00:00:00.000Z',
    )!;
    expect(state.capturedAt).toBe('2030-01-01T00:00:00.000Z');
  });

  it('returns null when a required value fails Number parse', () => {
    const malformed = { ...FULL_HEADERS, 'anthropic-ratelimit-tokens-limit': 'NOT_A_NUMBER' };
    const state = extractRateLimitState(new Headers(malformed), CAPTURED_AT);
    expect(state).toBeNull();
  });
});
