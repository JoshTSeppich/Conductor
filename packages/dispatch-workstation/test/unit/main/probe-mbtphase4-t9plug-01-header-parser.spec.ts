// MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG — WB2 RED.
//
// Contract spec for `parseAnthropicRateLimitHeaders(headers): RateLimitState | null`
// in NEW `packages/dispatch-workstation/src/main/rate-limit-source.ts`.
//
// Per Anthropic API documentation (referenced [MODELED] per ticket body
// §3 Sub-Q-T9PLUG-B), responses carry per-dimension headers:
//   anthropic-ratelimit-requests-limit
//   anthropic-ratelimit-requests-remaining
//   anthropic-ratelimit-requests-reset          (ISO 8601 datetime)
//   anthropic-ratelimit-tokens-limit
//   anthropic-ratelimit-tokens-remaining
//   anthropic-ratelimit-tokens-reset
//   anthropic-ratelimit-input-tokens-limit
//   anthropic-ratelimit-input-tokens-remaining
//   anthropic-ratelimit-input-tokens-reset
//   anthropic-ratelimit-output-tokens-limit
//   anthropic-ratelimit-output-tokens-remaining
//   anthropic-ratelimit-output-tokens-reset
//
// These map to RateLimitState (chat-shell/ring-helpers.ts:38-43):
//   { requests, tokens, inputTokens, outputTokens }  each null | RateLimitDimension
//
// where RateLimitDimension = { limit: number, remaining: number, reset: string | number }.
//
// Semantics:
//   - A dimension is populated IFF all THREE of its headers (limit + remaining
//     + reset) are present AND limit + remaining parse as finite numbers.
//   - reset is left as the raw header string (ISO 8601 per Anthropic). Consumers
//     downstream (chat-shell ring-helpers formatResetCountdown) accept string|number.
//   - If ALL four dimensions are null, the parser returns null (signals "no rate-limit
//     data in this response"). Otherwise returns a RateLimitState with missing
//     dimensions left null.
//
// RED state: at HEAD post-0068a7e, `rate-limit-source.ts` does NOT exist. Imports
// fail at module resolution.
//
// Closure anchor: ticket body §4 WB2; T9 findings §VII row 1 closure target.

import { describe, it, expect } from 'vitest';
import { parseAnthropicRateLimitHeaders } from '../../../src/main/rate-limit-source.js';
import type { RateLimitState } from '../../../src/chat-shell/ring-helpers.js';

function makeHeaders(entries: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(entries)) h.set(k, v);
  return h;
}

const FULL_HEADERS = {
  'anthropic-ratelimit-requests-limit': '50',
  'anthropic-ratelimit-requests-remaining': '49',
  'anthropic-ratelimit-requests-reset': '2026-05-13T18:00:00.000Z',
  'anthropic-ratelimit-tokens-limit': '20000',
  'anthropic-ratelimit-tokens-remaining': '19500',
  'anthropic-ratelimit-tokens-reset': '2026-05-13T18:00:00.000Z',
  'anthropic-ratelimit-input-tokens-limit': '10000',
  'anthropic-ratelimit-input-tokens-remaining': '9800',
  'anthropic-ratelimit-input-tokens-reset': '2026-05-13T18:00:00.000Z',
  'anthropic-ratelimit-output-tokens-limit': '10000',
  'anthropic-ratelimit-output-tokens-remaining': '9700',
  'anthropic-ratelimit-output-tokens-reset': '2026-05-13T18:00:00.000Z',
};

describe('MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG — parseAnthropicRateLimitHeaders', () => {
  it('returns a fully-populated RateLimitState when all 12 headers present', () => {
    const headers = makeHeaders(FULL_HEADERS);
    const state = parseAnthropicRateLimitHeaders(headers);
    expect(state).not.toBeNull();
    expect(state).toEqual({
      requests: {
        limit: 50,
        remaining: 49,
        reset: '2026-05-13T18:00:00.000Z',
      },
      tokens: {
        limit: 20000,
        remaining: 19500,
        reset: '2026-05-13T18:00:00.000Z',
      },
      inputTokens: {
        limit: 10000,
        remaining: 9800,
        reset: '2026-05-13T18:00:00.000Z',
      },
      outputTokens: {
        limit: 10000,
        remaining: 9700,
        reset: '2026-05-13T18:00:00.000Z',
      },
    } satisfies RateLimitState);
  });

  it('returns null when no anthropic-ratelimit-* headers present', () => {
    const headers = makeHeaders({
      'content-type': 'application/json',
      'x-request-id': 'req_abc123',
    });
    const state = parseAnthropicRateLimitHeaders(headers);
    expect(state).toBeNull();
  });

  it('returns null when headers are completely empty', () => {
    const state = parseAnthropicRateLimitHeaders(new Headers());
    expect(state).toBeNull();
  });

  it('populates only the requests dimension when only requests headers present', () => {
    const headers = makeHeaders({
      'anthropic-ratelimit-requests-limit': '50',
      'anthropic-ratelimit-requests-remaining': '49',
      'anthropic-ratelimit-requests-reset': '2026-05-13T18:00:00.000Z',
    });
    const state = parseAnthropicRateLimitHeaders(headers);
    expect(state).toEqual({
      requests: { limit: 50, remaining: 49, reset: '2026-05-13T18:00:00.000Z' },
      tokens: null,
      inputTokens: null,
      outputTokens: null,
    } satisfies RateLimitState);
  });

  it('populates only tokens dimension when only tokens headers present', () => {
    const headers = makeHeaders({
      'anthropic-ratelimit-tokens-limit': '20000',
      'anthropic-ratelimit-tokens-remaining': '19500',
      'anthropic-ratelimit-tokens-reset': '2026-05-13T18:00:00.000Z',
    });
    const state = parseAnthropicRateLimitHeaders(headers);
    expect(state).toEqual({
      requests: null,
      tokens: { limit: 20000, remaining: 19500, reset: '2026-05-13T18:00:00.000Z' },
      inputTokens: null,
      outputTokens: null,
    } satisfies RateLimitState);
  });

  it('populates only inputTokens dimension when only inputTokens headers present', () => {
    const headers = makeHeaders({
      'anthropic-ratelimit-input-tokens-limit': '10000',
      'anthropic-ratelimit-input-tokens-remaining': '9800',
      'anthropic-ratelimit-input-tokens-reset': '2026-05-13T18:00:00.000Z',
    });
    const state = parseAnthropicRateLimitHeaders(headers);
    expect(state).toEqual({
      requests: null,
      tokens: null,
      inputTokens: { limit: 10000, remaining: 9800, reset: '2026-05-13T18:00:00.000Z' },
      outputTokens: null,
    } satisfies RateLimitState);
  });

  it('populates only outputTokens dimension when only outputTokens headers present', () => {
    const headers = makeHeaders({
      'anthropic-ratelimit-output-tokens-limit': '10000',
      'anthropic-ratelimit-output-tokens-remaining': '9700',
      'anthropic-ratelimit-output-tokens-reset': '2026-05-13T18:00:00.000Z',
    });
    const state = parseAnthropicRateLimitHeaders(headers);
    expect(state).toEqual({
      requests: null,
      tokens: null,
      inputTokens: null,
      outputTokens: { limit: 10000, remaining: 9700, reset: '2026-05-13T18:00:00.000Z' },
    } satisfies RateLimitState);
  });

  it('leaves a dimension null when limit+remaining present but reset missing', () => {
    // Partial-dimension case: the reset value is load-bearing for the
    // PlanTimerText countdown; without it the dimension cannot serve
    // the consumer surface, so report as null rather than half-populated.
    const headers = makeHeaders({
      'anthropic-ratelimit-requests-limit': '50',
      'anthropic-ratelimit-requests-remaining': '49',
      // no reset
    });
    const state = parseAnthropicRateLimitHeaders(headers);
    expect(state).toBeNull();
  });

  it('leaves a dimension null when limit is not a finite number', () => {
    const headers = makeHeaders({
      'anthropic-ratelimit-requests-limit': 'not-a-number',
      'anthropic-ratelimit-requests-remaining': '49',
      'anthropic-ratelimit-requests-reset': '2026-05-13T18:00:00.000Z',
    });
    const state = parseAnthropicRateLimitHeaders(headers);
    expect(state).toBeNull();
  });

  it('leaves a dimension null when remaining is not a finite number', () => {
    const headers = makeHeaders({
      'anthropic-ratelimit-requests-limit': '50',
      'anthropic-ratelimit-requests-remaining': 'NaN',
      'anthropic-ratelimit-requests-reset': '2026-05-13T18:00:00.000Z',
    });
    const state = parseAnthropicRateLimitHeaders(headers);
    expect(state).toBeNull();
  });

  it('accepts limit=0 and remaining=0 (valid zero-quota boundary)', () => {
    // Edge case: operator quota fully exhausted. Display surface must
    // distinguish "no data" (null) from "zero remaining" (0). The
    // parser preserves zero values rather than coercing to null.
    const headers = makeHeaders({
      'anthropic-ratelimit-requests-limit': '0',
      'anthropic-ratelimit-requests-remaining': '0',
      'anthropic-ratelimit-requests-reset': '2026-05-13T18:00:00.000Z',
    });
    const state = parseAnthropicRateLimitHeaders(headers);
    expect(state?.requests).toEqual({
      limit: 0,
      remaining: 0,
      reset: '2026-05-13T18:00:00.000Z',
    });
  });

  it('handles partial-population — requests + tokens present, *Tokens dimensions absent', () => {
    // Realistic mid-quota response: server returns the two coarsest
    // dimensions (requests + combined tokens) only; per-direction
    // input/output dimensions omitted.
    const headers = makeHeaders({
      'anthropic-ratelimit-requests-limit': '50',
      'anthropic-ratelimit-requests-remaining': '49',
      'anthropic-ratelimit-requests-reset': '2026-05-13T18:00:00.000Z',
      'anthropic-ratelimit-tokens-limit': '20000',
      'anthropic-ratelimit-tokens-remaining': '19500',
      'anthropic-ratelimit-tokens-reset': '2026-05-13T18:00:00.000Z',
    });
    const state = parseAnthropicRateLimitHeaders(headers);
    expect(state).toEqual({
      requests: { limit: 50, remaining: 49, reset: '2026-05-13T18:00:00.000Z' },
      tokens: { limit: 20000, remaining: 19500, reset: '2026-05-13T18:00:00.000Z' },
      inputTokens: null,
      outputTokens: null,
    } satisfies RateLimitState);
  });

  it('header lookup is case-insensitive (Headers API contract)', () => {
    // The Web Headers API normalizes header names to lower-case
    // internally; parser must read via the standard get() which is
    // case-insensitive. Constructing with mixed case verifies that
    // the parser does not rely on case-sensitive string matches.
    const h = new Headers();
    h.set('Anthropic-RateLimit-Requests-Limit', '50');
    h.set('ANTHROPIC-RATELIMIT-REQUESTS-REMAINING', '49');
    h.set('anthropic-ratelimit-requests-reset', '2026-05-13T18:00:00.000Z');
    const state = parseAnthropicRateLimitHeaders(h);
    expect(state?.requests).toEqual({
      limit: 50,
      remaining: 49,
      reset: '2026-05-13T18:00:00.000Z',
    });
  });
});
