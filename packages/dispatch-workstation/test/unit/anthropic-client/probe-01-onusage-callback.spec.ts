// MB-T26 WB3 — probe-01: AnthropicChatClient onUsage callback.
//
// Operator-confirmed Q-MBT26-3=c (onUsage callback in AnthropicChatClient
// signature) 2026-05-07.
//
// Asserts:
//   1. onUsage fires once after stream completes
//   2. inputTokens captured from message_start.message.usage.input_tokens
//   3. outputTokens captured from message_delta.usage.output_tokens
//      (cumulative; final delta wins)
//   4. model captured from message_start.message.model
//   5. yielded text deltas unaffected (existing public-API contract held)
//
// SDK event shape verified [KNOWN] from @anthropic-ai/sdk@0.92.0
// .d.ts inspection in messages.d.ts (RawMessageStartEvent line 779;
// RawMessageDeltaEvent line 742; Message.usage line 652; Usage.input_tokens
// line 690; MessageDeltaUsage.output_tokens line 675).

import { describe, it, expect, vi } from 'vitest';
import {
  AnthropicChatClient,
  type UsageInfo,
} from '../../../src/main/anthropic-client.js';

// Synthetic SDK stream — yields the same event types the real SDK does:
// message_start (with usage + model) → content_block_delta (text) →
// message_delta (with cumulative output_tokens) → message_stop.
async function* fakeStream(
  inputTokens: number,
  outputTokens: number,
  model: string,
  textChunks: string[],
): AsyncIterable<unknown> {
  yield {
    type: 'message_start',
    message: {
      id: 'msg_test',
      model,
      role: 'assistant',
      content: [],
      stop_reason: null,
      stop_sequence: null,
      type: 'message',
      usage: {
        input_tokens: inputTokens,
        output_tokens: 0,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
      },
    },
  };
  for (const chunk of textChunks) {
    yield {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: chunk },
    };
  }
  yield {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn', stop_sequence: null, container: null, stop_details: null },
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      server_tool_use: null,
    },
  };
  yield { type: 'message_stop' };
}

function makeClient(stream: AsyncIterable<unknown>): AnthropicChatClient {
  // MB-T34 WB5 mock-update: AnthropicChatClient now composes
  // AnthropicAPIClient, which uses APIPromise.withResponse() for header
  // capture. The mock therefore returns a thenable with .withResponse
  // (not a plain Promise<stream>). Empty Headers gives a null
  // RateLimitState capture, which is safe — these tests assert onUsage
  // semantics, not onRateLimit.
  const fakeMessages = {
    create: vi.fn().mockReturnValue({
      withResponse: () =>
        Promise.resolve({
          data: stream,
          response: { headers: new Headers() } as Response,
          request_id: 'req_test',
        }),
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new AnthropicChatClient({ messages: fakeMessages } as any, 'sys');
}

async function drainStream(stream: AsyncIterable<string>): Promise<string[]> {
  const chunks: string[] = [];
  for await (const c of stream) chunks.push(c);
  return chunks;
}

describe('MB-T26 WB3 — AnthropicChatClient.streamMessages onUsage', () => {
  it('invokes onUsage once after stream completes', async () => {
    const stream = fakeStream(100, 50, 'claude-sonnet-4-6', ['hello', ' world']);
    const client = makeClient(stream);
    const onUsage = vi.fn();
    await drainStream(client.streamMessages('sys', [{ role: 'user', content: 'hi' }], onUsage));
    expect(onUsage).toHaveBeenCalledTimes(1);
  });

  it('captures inputTokens from message_start.message.usage', async () => {
    const stream = fakeStream(123, 45, 'claude-sonnet-4-6', ['x']);
    const client = makeClient(stream);
    let captured: UsageInfo | null = null;
    await drainStream(
      client.streamMessages('sys', [{ role: 'user', content: 'hi' }], (u) => {
        captured = u;
      }),
    );
    expect(captured).not.toBeNull();
    expect(captured!.inputTokens).toBe(123);
  });

  it('captures outputTokens from message_delta.usage (final delta wins)', async () => {
    const stream = fakeStream(10, 999, 'claude-sonnet-4-6', ['x', 'y', 'z']);
    const client = makeClient(stream);
    let captured: UsageInfo | null = null;
    await drainStream(
      client.streamMessages('sys', [{ role: 'user', content: 'hi' }], (u) => {
        captured = u;
      }),
    );
    expect(captured!.outputTokens).toBe(999);
  });

  it('captures model from message_start.message.model', async () => {
    const stream = fakeStream(10, 20, 'claude-opus-4-7', ['x']);
    const client = makeClient(stream);
    let captured: UsageInfo | null = null;
    await drainStream(
      client.streamMessages('sys', [{ role: 'user', content: 'hi' }], (u) => {
        captured = u;
      }),
    );
    expect(captured!.model).toBe('claude-opus-4-7');
  });

  it('yields text deltas unaffected (public-API contract preserved)', async () => {
    const stream = fakeStream(10, 20, 'claude-sonnet-4-6', ['hello', ' ', 'world']);
    const client = makeClient(stream);
    const chunks = await drainStream(
      client.streamMessages('sys', [{ role: 'user', content: 'hi' }]),
    );
    expect(chunks).toEqual(['hello', ' ', 'world']);
  });

  it('omitting onUsage is safe (optional param)', async () => {
    const stream = fakeStream(10, 20, 'claude-sonnet-4-6', ['hi']);
    const client = makeClient(stream);
    // No onUsage passed; should not throw.
    const chunks = await drainStream(
      client.streamMessages('sys', [{ role: 'user', content: 'hi' }]),
    );
    expect(chunks).toEqual(['hi']);
  });
});
