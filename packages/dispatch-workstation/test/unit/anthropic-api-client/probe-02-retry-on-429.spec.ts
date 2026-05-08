// MB-T34 WB1 RED — probe-02: retry on 429 + 5xx pre-stream errors.
//
// Asserts AnthropicAPIClient.streamMessage:
//   1. retries on 429 errors up to DEFAULT_MAX_RETRIES (Q-MBT34-4=(a))
//   2. retries on 5xx pre-stream errors
//   3. does NOT retry on 4xx (other than 429)
//   4. propagates the final error after retries exhausted
//   5. on success after retry, stream completes normally
//
// R-MBT34-3: only PRE-stream errors are retried; stream-mid errors
// propagate (re-emitting an in-flight stream would double-count tokens).
//
// WB1 RED: streamMessage stub throws NotImplementedError. WB3 turns
// this probe GREEN.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AnthropicAPIClient,
  type StreamMessageParams,
} from '../../../src/main/anthropic-api-client.js';

class FakeRateLimitError extends Error {
  override readonly name = 'RateLimitError';
  readonly status = 429;
  constructor(message = 'rate limited') {
    super(message);
  }
}

class FakeServerError extends Error {
  override readonly name = 'APIServerError';
  readonly status = 503;
  constructor() {
    super('service unavailable');
  }
}

class FakeBadRequestError extends Error {
  override readonly name = 'BadRequestError';
  readonly status = 400;
  constructor() {
    super('bad request');
  }
}

async function* singleEventStream(): AsyncIterable<unknown> {
  yield {
    type: 'message_start',
    message: {
      id: 'm',
      model: 'claude-sonnet-4-6',
      role: 'assistant',
      content: [],
      stop_reason: null,
      stop_sequence: null,
      type: 'message',
      usage: {
        input_tokens: 1,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
  };
  yield {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn', stop_sequence: null, container: null, stop_details: null },
    usage: {
      input_tokens: 1,
      output_tokens: 1,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: null,
    },
  };
  yield { type: 'message_stop' };
}

function mockApiPromiseSuccess(stream: AsyncIterable<unknown>) {
  return {
    withResponse: () =>
      Promise.resolve({
        data: stream,
        response: { headers: new Headers() } as Response,
        request_id: 'req_test',
      }),
  };
}

const PARAMS: StreamMessageParams = {
  model: 'claude-sonnet-4-6',
  maxTokens: 16,
  messages: [{ role: 'user', content: 'hi' }],
};

async function drain(client: AnthropicAPIClient): Promise<number> {
  let count = 0;
  for await (const _ of client.streamMessage(PARAMS)) count += 1;
  return count;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MB-T34 WB1 RED — AnthropicAPIClient retry on 429 + 5xx', () => {
  it('retries on 429 and succeeds when subsequent attempt resolves', async () => {
    const create = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new FakeRateLimitError();
      })
      .mockImplementationOnce(() => mockApiPromiseSuccess(singleEventStream()));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = new AnthropicAPIClient({ messages: { create } } as any);
    const drainPromise = drain(client);
    await vi.runAllTimersAsync();
    const count = await drainPromise;
    expect(count).toBeGreaterThan(0);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('retries on 5xx and succeeds when subsequent attempt resolves', async () => {
    const create = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new FakeServerError();
      })
      .mockImplementationOnce(() => mockApiPromiseSuccess(singleEventStream()));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = new AnthropicAPIClient({ messages: { create } } as any);
    const drainPromise = drain(client);
    await vi.runAllTimersAsync();
    const count = await drainPromise;
    expect(count).toBeGreaterThan(0);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 4xx (other than 429)', async () => {
    const create = vi.fn().mockImplementation(() => {
      throw new FakeBadRequestError();
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = new AnthropicAPIClient({ messages: { create } } as any);
    await expect(drain(client)).rejects.toThrow();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('propagates final error after retries exhausted', async () => {
    const create = vi.fn().mockImplementation(() => {
      throw new FakeRateLimitError();
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = new AnthropicAPIClient({ messages: { create } } as any);
    const drainPromise = drain(client);
    // Attach a no-op catch immediately to prevent unhandled-rejection
    // warnings during the timer-advance window before
    // expect.rejects.toThrow() attaches its handler.
    drainPromise.catch(() => undefined);
    await vi.runAllTimersAsync().catch(() => undefined);
    await expect(drainPromise).rejects.toThrow();
    // 1 initial + DEFAULT_MAX_RETRIES retries = 4 total attempts
    expect(create).toHaveBeenCalledTimes(4);
  });
});
