// MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG — WB4 RED.
//
// Contract spec for `createCoarchitectRateLimitSource(deps): RateLimitSource`
// in NEW `packages/dispatch-workstation/src/main/coarchitect-rate-limit-source.ts`.
//
// Deps:
//   {
//     apiKey: string,
//     fetchFn?: typeof globalThis.fetch,         // default globalThis.fetch
//     setIntervalFn?: typeof globalThis.setInterval,
//     clearIntervalFn?: typeof globalThis.clearInterval,
//     pollIntervalMs?: number,                    // default 60000
//     endpointUrl?: string,                       // default 'https://api.anthropic.com/v1/models'
//     anthropicVersion?: string,                  // default '2023-06-01' (Anthropic API version header)
//   }
//
// Semantics per ticket body §3:
//   - start(): triggers immediate fetch + schedules interval (idempotent —
//     calling twice does NOT double-schedule).
//   - stop(): clears scheduled interval. start() can be called again afterwards.
//   - onState(cb): subscribe; returns dispose.
//   - On each fetch response:
//       OK (200) + rate-limit headers present → emit parsed RateLimitState
//       OK (200) + no rate-limit headers       → no emission (silent)
//       401 / 403 (auth-fail)                  → no emission (silent)
//       5xx                                    → no emission (silent)
//       network error (promise reject)         → no emission + NO THROW (silent)
//
// Sub-Q-T9PLUG-E=(i) silent-degradation: aggregator preserves last-good state
// across transient failures; consumer (PlanTimerText) sees no flicker.
//
// RED state: at HEAD post-9fb49ba, `coarchitect-rate-limit-source.ts` does
// NOT exist. Imports fail at module resolution.

import { describe, it, expect, vi } from 'vitest';
// @ts-expect-error WB4 RED: coarchitect-rate-limit-source module not yet authored until WB5 GREEN
import { createCoarchitectRateLimitSource } from '../../../src/main/coarchitect-rate-limit-source.js';
import type { RateLimitSource } from '../../../src/main/rate-limit-aggregator.js';
import type { RateLimitState } from '../../../src/chat-shell/ring-helpers.js';

const FULL_RATE_LIMIT_HEADERS: Record<string, string> = {
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

const EXPECTED_FULL_STATE: RateLimitState = {
  requests: { limit: 50, remaining: 49, reset: '2026-05-13T18:00:00.000Z' },
  tokens: { limit: 20000, remaining: 19500, reset: '2026-05-13T18:00:00.000Z' },
  inputTokens: { limit: 10000, remaining: 9800, reset: '2026-05-13T18:00:00.000Z' },
  outputTokens: { limit: 10000, remaining: 9700, reset: '2026-05-13T18:00:00.000Z' },
};

interface SchedulerFakes {
  readonly setIntervalFn: ReturnType<typeof vi.fn>;
  readonly clearIntervalFn: ReturnType<typeof vi.fn>;
  fireTick(): void;
}

function makeSchedulerFakes(): SchedulerFakes {
  let scheduledCallback: (() => void) | null = null;
  let scheduledHandle: unknown = null;
  const setIntervalFn = vi.fn((cb: () => void, _ms: number) => {
    scheduledCallback = cb;
    scheduledHandle = Symbol('handle');
    return scheduledHandle as ReturnType<typeof setInterval>;
  });
  const clearIntervalFn = vi.fn((_handle: unknown) => {
    scheduledCallback = null;
    scheduledHandle = null;
  });
  return {
    setIntervalFn,
    clearIntervalFn,
    fireTick() {
      if (scheduledCallback) scheduledCallback();
    },
  };
}

function makeOkResponse(headers: Record<string, string>): Response {
  return new Response(null, { status: 200, headers });
}

function makeErrorResponse(status: number): Response {
  return new Response(null, { status });
}

describe('MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG — createCoarchitectRateLimitSource', () => {
  it('exports createCoarchitectRateLimitSource as a function', () => {
    expect(typeof createCoarchitectRateLimitSource).toBe('function');
  });

  it('returned source implements RateLimitSource interface (start/stop/onState)', () => {
    const source: RateLimitSource = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn: vi.fn().mockResolvedValue(makeOkResponse({})),
      ...makeSchedulerFakes(),
    });
    expect(typeof source.start).toBe('function');
    expect(typeof source.stop).toBe('function');
    expect(typeof source.onState).toBe('function');
  });

  it('start() triggers an immediate fetch with x-api-key + anthropic-version headers + GET method', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeOkResponse(FULL_RATE_LIMIT_HEADERS));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'sk-ant-test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    source.start();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://api.anthropic.com/v1/models');
    expect(opts).toBeDefined();
    expect(opts.method ?? 'GET').toBe('GET');
    const reqHeaders = new Headers(opts.headers ?? {});
    expect(reqHeaders.get('x-api-key')).toBe('sk-ant-test-key');
    expect(reqHeaders.get('anthropic-version')).toBe('2023-06-01');
  });

  it('successful fetch with rate-limit headers emits parsed RateLimitState via onState', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeOkResponse(FULL_RATE_LIMIT_HEADERS));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    const cb = vi.fn();
    source.onState(cb);
    source.start();
    await vi.waitFor(() => expect(cb).toHaveBeenCalled());
    expect(cb).toHaveBeenCalledWith(EXPECTED_FULL_STATE);
  });

  it('401 auth-fail response does NOT emit (silent-degradation)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeErrorResponse(401));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'bad-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    const cb = vi.fn();
    source.onState(cb);
    source.start();
    // Allow fetch promise + any internal awaits to settle.
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(cb).not.toHaveBeenCalled();
  });

  it('500 server-error response does NOT emit (silent-degradation)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeErrorResponse(500));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    const cb = vi.fn();
    source.onState(cb);
    source.start();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(cb).not.toHaveBeenCalled();
  });

  it('network error (fetch rejection) does NOT emit and does NOT throw', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('ENETUNREACH'));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    const cb = vi.fn();
    source.onState(cb);
    // start() must NOT throw synchronously even though fetch rejects.
    expect(() => source.start()).not.toThrow();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(cb).not.toHaveBeenCalled();
  });

  it('OK response with no rate-limit headers does NOT emit (parser returns null)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      makeOkResponse({ 'content-type': 'application/json' }),
    );
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    const cb = vi.fn();
    source.onState(cb);
    source.start();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(cb).not.toHaveBeenCalled();
  });

  it('start() is idempotent — calling twice does NOT schedule two intervals', () => {
    const fetchFn = vi.fn().mockResolvedValue(makeOkResponse({}));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    source.start();
    source.start();
    expect(sched.setIntervalFn).toHaveBeenCalledTimes(1);
  });

  it('start() schedules interval with default 60000 ms', () => {
    const fetchFn = vi.fn().mockResolvedValue(makeOkResponse({}));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    source.start();
    const [, ms] = sched.setIntervalFn.mock.calls[0]!;
    expect(ms).toBe(60000);
  });

  it('pollIntervalMs deps override is honored', () => {
    const fetchFn = vi.fn().mockResolvedValue(makeOkResponse({}));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      pollIntervalMs: 30000,
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    source.start();
    const [, ms] = sched.setIntervalFn.mock.calls[0]!;
    expect(ms).toBe(30000);
  });

  it('endpointUrl deps override is honored', () => {
    const fetchFn = vi.fn().mockResolvedValue(makeOkResponse({}));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      endpointUrl: 'https://example.invalid/rate-limit-probe',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    source.start();
    const [url] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://example.invalid/rate-limit-probe');
  });

  it('stop() clears the scheduled interval', () => {
    const fetchFn = vi.fn().mockResolvedValue(makeOkResponse({}));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    source.start();
    source.stop();
    expect(sched.clearIntervalFn).toHaveBeenCalledTimes(1);
  });

  it('stop() before start() is a no-op (no throw)', () => {
    const fetchFn = vi.fn().mockResolvedValue(makeOkResponse({}));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    expect(() => source.stop()).not.toThrow();
    expect(sched.clearIntervalFn).not.toHaveBeenCalled();
  });

  it('after stop(), start() can re-arm the source', () => {
    const fetchFn = vi.fn().mockResolvedValue(makeOkResponse({}));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    source.start();
    source.stop();
    source.start();
    expect(sched.setIntervalFn).toHaveBeenCalledTimes(2);
  });

  it('multiple onState subscribers all receive emissions; dispose removes only one', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeOkResponse(FULL_RATE_LIMIT_HEADERS));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const dispose1 = source.onState(cb1);
    source.onState(cb2);
    source.start();
    await vi.waitFor(() => {
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });
    dispose1();
    // Second tick (fire the scheduled interval callback)
    fetchFn.mockResolvedValueOnce(makeOkResponse(FULL_RATE_LIMIT_HEADERS));
    sched.fireTick();
    await vi.waitFor(() => expect(cb2).toHaveBeenCalledTimes(2));
    expect(cb1).toHaveBeenCalledTimes(1);
  });

  it('scheduled tick refetches and re-emits when state arrives', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(makeOkResponse(FULL_RATE_LIMIT_HEADERS))
      .mockResolvedValueOnce(makeOkResponse({
        ...FULL_RATE_LIMIT_HEADERS,
        'anthropic-ratelimit-requests-remaining': '48',
      }));
    const sched = makeSchedulerFakes();
    const source = createCoarchitectRateLimitSource({
      apiKey: 'test-key',
      fetchFn,
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn,
    });
    const cb = vi.fn();
    source.onState(cb);
    source.start();
    await vi.waitFor(() => expect(cb).toHaveBeenCalledTimes(1));
    expect(cb).toHaveBeenLastCalledWith(EXPECTED_FULL_STATE);
    sched.fireTick();
    await vi.waitFor(() => expect(cb).toHaveBeenCalledTimes(2));
    expect(cb.mock.calls[1]![0].requests.remaining).toBe(48);
  });
});
