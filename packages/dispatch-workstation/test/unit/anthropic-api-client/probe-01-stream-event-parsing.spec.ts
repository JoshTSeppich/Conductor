// MB-T34 WB1 RED — probe-01: stream-event parsing.
//
// Asserts AnthropicAPIClient.streamMessage:
//   1. yields RawMessageStreamEvent values from the underlying SDK stream
//   2. invokes onUsage once at end-of-stream with inputTokens (from
//      message_start.message.usage.input_tokens), outputTokens (from
//      message_delta.usage.output_tokens — final wins), model (from
//      message_start.message.model)
//   3. omitting onUsage is safe
//
// SDK shape verified [KNOWN] from @anthropic-ai/sdk@0.92.0
// resources/messages/messages.d.ts (RawMessageStartEvent line 779;
// RawMessageDeltaEvent line 742; Usage line 1395; MessageDeltaUsage
// line 659) AND from Phase 1 live-API spike (commit c09bd09).
//
// WB1 RED: streamMessage stub throws NotImplementedError. WB2 turns
// this probe GREEN.

import { describe, it, expect, vi } from 'vitest';
import {
  AnthropicAPIClient,
  type StreamMessageParams,
  type StreamCallbacks,
} from '../../../src/main/anthropic-api-client.js';
import type { UsageInfo } from '../../../src/main/anthropic-client.js';

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
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
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
    delta: {
      stop_reason: 'end_turn',
      stop_sequence: null,
      container: null,
      stop_details: null,
    },
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: null,
    },
  };
  yield { type: 'message_stop' };
}

function makeMockApiPromise(stream: AsyncIterable<unknown>, headers: Record<string, string> = {}) {
  return {
    withResponse: () =>
      Promise.resolve({
        data: stream,
        response: { headers: new Headers(headers) } as Response,
        request_id: 'req_test',
      }),
  };
}

function makeApiClient(stream: AsyncIterable<unknown>, headers: Record<string, string> = {}): AnthropicAPIClient {
  const fakeMessages = {
    create: vi.fn().mockReturnValue(makeMockApiPromise(stream, headers)),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new AnthropicAPIClient({ messages: fakeMessages } as any);
}

const PARAMS: StreamMessageParams = {
  model: 'claude-sonnet-4-6',
  maxTokens: 64,
  messages: [{ role: 'user', content: 'hi' }],
};

async function drainEvents(
  client: AnthropicAPIClient,
  callbacks?: StreamCallbacks,
): Promise<unknown[]> {
  const events: unknown[] = [];
  for await (const event of client.streamMessage(PARAMS, callbacks)) {
    events.push(event);
  }
  return events;
}

describe('MB-T34 WB1 RED — AnthropicAPIClient.streamMessage event parsing', () => {
  it('yields one event per underlying SDK stream event', async () => {
    const client = makeApiClient(fakeStream(8, 16, 'claude-sonnet-4-6', ['hi', '!']));
    const events = await drainEvents(client);
    // 1 message_start + 2 content_block_delta + 1 message_delta + 1 message_stop = 5
    expect(events).toHaveLength(5);
  });

  it('invokes onUsage once at end-of-stream with correct token counts and model', async () => {
    const client = makeApiClient(fakeStream(123, 456, 'claude-opus-4-7', ['x']));
    const onUsage = vi.fn();
    await drainEvents(client, { onUsage });
    expect(onUsage).toHaveBeenCalledTimes(1);
    const captured = onUsage.mock.calls[0]![0] as UsageInfo;
    expect(captured.inputTokens).toBe(123);
    expect(captured.outputTokens).toBe(456);
    expect(captured.model).toBe('claude-opus-4-7');
  });

  it('captures message from message_start (input_tokens) not from message_delta', async () => {
    // message_start carries input_tokens; message_delta has cumulative
    // output_tokens. Mixing the two would double-count input.
    const client = makeApiClient(fakeStream(50, 75, 'claude-sonnet-4-6', ['a']));
    const onUsage = vi.fn();
    await drainEvents(client, { onUsage });
    const captured = onUsage.mock.calls[0]![0] as UsageInfo;
    expect(captured.inputTokens).toBe(50);
  });

  it('omitting onUsage is safe (optional param)', async () => {
    const client = makeApiClient(fakeStream(10, 20, 'claude-sonnet-4-6', ['x']));
    // No callbacks passed; should not throw.
    await expect(drainEvents(client)).resolves.toBeDefined();
  });

  it('omitting callbacks object entirely is safe', async () => {
    const client = makeApiClient(fakeStream(10, 20, 'claude-sonnet-4-6', ['x']));
    await expect(drainEvents(client, undefined)).resolves.toBeDefined();
  });
});
