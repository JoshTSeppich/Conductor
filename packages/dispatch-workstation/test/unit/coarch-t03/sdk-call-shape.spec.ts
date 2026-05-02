// COARCH-T03 Red criterion — Test 1: SDK call fires with correct request shape.
// Verifies: AnthropicChatClient.streamMessage() calls Anthropic messages.create with
// model=claude-sonnet-4-6, system prompt passed in, user message, max_tokens, stream:true.
//
// RED state: src/main/anthropic-client.ts absent → import fails → FAIL.
// GREEN state: AnthropicChatClient implemented with DI constructor → mock capture passes → PASS.
//
// Testing mechanism: vitest unit test with injected mock Anthropic client (DI pattern).
// No module-level vi.mock() needed — mock is the injected Anthropic instance.
// Per MB-S01 ADR KNOWN evidence: claude-sonnet-4-6 is the model string. MAX_TOKENS is
// MODELED at 4096 (avg output 438 tokens per spike run; 4096 provides headroom).
import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { AnthropicChatClient, CHAT_MODEL, MAX_TOKENS } from '../../../src/main/anthropic-client.js';

const TEST_SYSTEM_PROMPT = 'You are a test orchestrator.';

function makeMockStream(chunks: string[]): AsyncIterable<unknown> {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const text of chunks) {
        yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } };
      }
      yield { type: 'message_stop' };
    },
  };
}

describe('COARCH-T03: SDK call fires with correct request shape', () => {
  it('streamMessage calls messages.create with model, system, messages, max_tokens, stream:true', async () => {
    const mockCreate = vi.fn().mockResolvedValue(makeMockStream(['Hello', ' world']));
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic;

    const client = new AnthropicChatClient(mockClient, TEST_SYSTEM_PROMPT);

    const chunks: string[] = [];
    for await (const chunk of client.streamMessage('test user input')) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' world']);
    expect(mockCreate).toHaveBeenCalledOnce();
    const args = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(args['model']).toBe(CHAT_MODEL);
    expect(args['system']).toBe(TEST_SYSTEM_PROMPT);
    expect(args['messages']).toEqual([{ role: 'user', content: 'test user input' }]);
    expect(args['max_tokens']).toBe(MAX_TOKENS);
    expect(args['stream']).toBe(true);
  });

  it('streamMessage only yields text_delta chunks (skips message_stop etc.)', async () => {
    const mockCreate = vi.fn().mockResolvedValue(
      makeMockStream(['chunk-a', 'chunk-b']),
    );
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic;
    const client = new AnthropicChatClient(mockClient, TEST_SYSTEM_PROMPT);

    const out: string[] = [];
    for await (const c of client.streamMessage('anything')) out.push(c);

    expect(out).toEqual(['chunk-a', 'chunk-b']);
  });
});
