import Anthropic, {
  RateLimitError,
  AuthenticationError,
  APIConnectionError,
} from '@anthropic-ai/sdk';
import {
  AnthropicAPIClient,
  loadApiKey,
  type RateLimitState,
} from './anthropic-api-client.js';

export const CHAT_MODEL = 'claude-sonnet-4-6';

// MODELED: MB-S01 ADR measured avg 438 output tokens per orchestrator call.
// 4096 provides 9x headroom for complex multi-section responses and generic chat.
export const MAX_TOKENS = 4096;

export interface AnthropicErrorInfo {
  readonly code: string;
  readonly message: string;
}

// MB-T26 WB3 — UsageInfo emitted to onUsage callback after each stream
// completes. Q-MBT26-3=c (onUsage callback in AnthropicChatClient signature)
// operator-confirmed 2026-05-07.
//
// Field provenance ([KNOWN] from @anthropic-ai/sdk@0.92.0 .d.ts:
//   resources/messages/messages.d.ts):
//   - inputTokens: from RawMessageStartEvent.message.usage.input_tokens
//     (Message.usage: Usage; Usage.input_tokens: number, line 690)
//   - outputTokens: from RawMessageDeltaEvent.usage.output_tokens (cumulative
//     across delta events; latest wins; MessageDeltaUsage.output_tokens:
//     number, line 675)
//   - model: from RawMessageStartEvent.message.model (Message.model: Model,
//     line 53)
export interface UsageInfo {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly model: string;
}

/**
 * Thin chat-flow wrapper composing AnthropicAPIClient (MB-T34 WB5,
 * Q-MBT34-1=(c) operator-acked HALT 0 2026-05-08).
 *
 * Public API surface unchanged for MB-T26 non-regression:
 *   - streamMessage(content, onUsage?, onRateLimit?) → AsyncIterable<string>
 *   - streamMessages(sys, msgs, onUsage?, onRateLimit?) → AsyncIterable<string>
 *
 * onRateLimit is the WB5 additive parameter (operator C-MBT34-1=(b mod)
 * ack); chat-flow consumers may pass it to receive RateLimitState updates
 * mirroring the cost-flow onUsage pattern. Existing callers that pass
 * only onUsage continue to work unchanged.
 *
 * All SDK calls happen in the Electron main process — this module must
 * not be imported from the renderer bundle.
 */
export class AnthropicChatClient {
  private readonly apiClient: AnthropicAPIClient;

  constructor(
    client: Pick<Anthropic, 'messages'>,
    private readonly systemPrompt: string,
  ) {
    this.apiClient = new AnthropicAPIClient(client);
  }

  async *streamMessage(
    content: string,
    onUsage?: (usage: UsageInfo) => void,
    onRateLimit?: (state: RateLimitState) => void,
  ): AsyncIterable<string> {
    yield* this.streamMessages(
      this.systemPrompt,
      [{ role: 'user', content }],
      onUsage,
      onRateLimit,
    );
  }

  async *streamMessages(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onUsage?: (usage: UsageInfo) => void,
    onRateLimit?: (state: RateLimitState) => void,
  ): AsyncIterable<string> {
    // Compose the low-level API client. It owns transport + retry +
    // header-capture; we just project text deltas out of the stream.
    const callbacks = {
      ...(onUsage ? { onUsage } : {}),
      ...(onRateLimit ? { onRateLimit } : {}),
    };

    for await (const event of this.apiClient.streamMessage(
      {
        model: CHAT_MODEL,
        maxTokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      },
      callbacks,
    )) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
      // message_start, message_delta, message_stop, content_block_start,
      // content_block_stop ignored at chat-flow projection layer —
      // their usage data flows through the apiClient's onUsage / onRateLimit
      // callbacks, not through the text iterator.
    }
  }

  /** Underlying API client for non-chat-flow callers (e.g. MB-T35 reasoning loop). */
  get api(): AnthropicAPIClient {
    return this.apiClient;
  }
}

/**
 * Classify an Anthropic SDK error into a structured error info object.
 * Used by coarchitect-ipc.ts to send typed errors to the renderer.
 * Exported for unit-testing without Electron.
 */
export function classifyAnthropicError(error: unknown): AnthropicErrorInfo {
  if (error instanceof RateLimitError) {
    return {
      code: 'rate_limit',
      message: 'Rate limit exceeded. Please wait a moment and try again.',
    };
  }
  if (error instanceof AuthenticationError) {
    return {
      code: 'auth_error',
      message: 'Invalid API key. Check the ANTHROPIC_API_KEY environment variable.',
    };
  }
  if (error instanceof APIConnectionError) {
    return {
      code: 'network_error',
      message: 'Network error. Check your internet connection.',
    };
  }
  if (error instanceof Error) {
    return { code: 'api_error', message: error.message };
  }
  return { code: 'unknown_error', message: 'An unexpected error occurred.' };
}

/**
 * Factory: construct a real AnthropicChatClient from env + system prompt string.
 * Returns null if ANTHROPIC_API_KEY is absent.
 */
export function createAnthropicClient(
  systemPrompt: string,
): AnthropicChatClient | null {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  return new AnthropicChatClient(client, systemPrompt);
}
