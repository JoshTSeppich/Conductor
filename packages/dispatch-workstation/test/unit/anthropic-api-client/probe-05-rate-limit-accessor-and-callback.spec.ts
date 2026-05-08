// MB-T34 WB1 RED — probe-05: getRateLimitState() accessor + onRateLimit
// callback.
//
// Asserts AnthropicAPIClient:
//   1. getRateLimitState() returns null before any request
//   2. After successful streamMessage, getRateLimitState() returns the
//      captured RateLimitState
//   3. onRateLimit callback fires once per request, at response-open
//   4. The same state object is delivered to onRateLimit and visible
//      via getRateLimitState()
//   5. Subsequent requests update both the accessor and fire onRateLimit
//      again
//   6. onRateLimit not invoked if headers fail to parse (extractRateLimitState
//      returns null)
//
// Q-MBT34-2=(b)+(c) operator-acked HALT 0 2026-05-08.
//
// WB1 RED: streamMessage stub throws; getRateLimitState returns null.
// WB4 turns this probe GREEN.

import { describe, it, expect, vi } from 'vitest';
import {
  AnthropicAPIClient,
  type StreamMessageParams,
  type RateLimitState,
} from '../../../src/main/anthropic-api-client.js';

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

async function* miniStream(): AsyncIterable<unknown> {
  yield {
    type: 'message_start',
    message: {
      id: 'msg_test',
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

function makeApiClient(headers: Record<string, string>): AnthropicAPIClient {
  const create = vi.fn().mockImplementation(() => ({
    withResponse: () =>
      Promise.resolve({
        data: miniStream(),
        response: { headers: new Headers(headers) } as Response,
        request_id: 'req_test',
      }),
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new AnthropicAPIClient({ messages: { create } } as any);
}

const PARAMS: StreamMessageParams = {
  model: 'claude-sonnet-4-6',
  maxTokens: 16,
  messages: [{ role: 'user', content: 'hi' }],
};

async function drain(
  client: AnthropicAPIClient,
  opts?: { onRateLimit?: (s: RateLimitState) => void },
): Promise<void> {
  for await (const _ of client.streamMessage(PARAMS, opts)) {
    // drain
  }
}

describe('MB-T34 WB1 RED — getRateLimitState + onRateLimit', () => {
  it('getRateLimitState() returns null before any request', () => {
    const client = makeApiClient(FULL_HEADERS);
    expect(client.getRateLimitState()).toBeNull();
  });

  it('after successful streamMessage, accessor returns captured state', async () => {
    const client = makeApiClient(FULL_HEADERS);
    await drain(client);
    const state = client.getRateLimitState();
    expect(state).not.toBeNull();
    expect(state!.tokens.remaining).toBe(59500);
    expect(state!.requests.limit).toBe(50);
  });

  it('onRateLimit callback fires once per request', async () => {
    const onRateLimit = vi.fn();
    const client = makeApiClient(FULL_HEADERS);
    await drain(client, { onRateLimit });
    expect(onRateLimit).toHaveBeenCalledTimes(1);
  });

  it('state delivered to onRateLimit equals state visible via accessor', async () => {
    let pushed: RateLimitState | null = null;
    const client = makeApiClient(FULL_HEADERS);
    await drain(client, {
      onRateLimit: (s) => {
        pushed = s;
      },
    });
    const accessed = client.getRateLimitState();
    expect(pushed).not.toBeNull();
    expect(accessed).not.toBeNull();
    expect(pushed!.tokens.remaining).toBe(accessed!.tokens.remaining);
    expect(pushed!.capturedAt).toBe(accessed!.capturedAt);
  });

  it('subsequent requests update accessor and fire callback again', async () => {
    const onRateLimit = vi.fn();
    const client = makeApiClient(FULL_HEADERS);
    await drain(client, { onRateLimit });
    await drain(client, { onRateLimit });
    expect(onRateLimit).toHaveBeenCalledTimes(2);
  });

  it('onRateLimit NOT invoked if headers fail to parse (returns null)', async () => {
    const onRateLimit = vi.fn();
    const client = makeApiClient({ 'content-type': 'text/event-stream' });
    await drain(client, { onRateLimit });
    expect(onRateLimit).not.toHaveBeenCalled();
    expect(client.getRateLimitState()).toBeNull();
  });
});
