import Anthropic, {
  RateLimitError,
  AuthenticationError,
  APIConnectionError,
} from '@anthropic-ai/sdk';

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
 * Thin wrapper around @anthropic-ai/sdk for streaming chat messages.
 * Accepts an injected Anthropic client for testability (DI pattern).
 * All SDK calls happen in the Electron main process — this module must not
 * be imported from the renderer bundle.
 */
export class AnthropicChatClient {
  constructor(
    private readonly client: Pick<Anthropic, 'messages'>,
    private readonly systemPrompt: string,
  ) {}

  async *streamMessage(
    content: string,
    onUsage?: (usage: UsageInfo) => void,
  ): AsyncIterable<string> {
    yield* this.streamMessages(
      this.systemPrompt,
      [{ role: 'user', content }],
      onUsage,
    );
  }

  async *streamMessages(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onUsage?: (usage: UsageInfo) => void,
  ): AsyncIterable<string> {
    const stream = await this.client.messages.create({
      model: CHAT_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
      stream: true,
    });

    let inputTokens = 0;
    let outputTokens = 0;
    let modelObserved: string = CHAT_MODEL;

    for await (const event of stream) {
      if (event.type === 'message_start') {
        // [KNOWN] message_start fires once at stream open with initial usage.
        inputTokens = event.message.usage.input_tokens;
        modelObserved = event.message.model;
      } else if (event.type === 'message_delta') {
        // [KNOWN] message_delta.usage.output_tokens is cumulative across
        // deltas. Latest value wins; final delta has the total.
        outputTokens = event.usage.output_tokens;
      } else if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
      // message_stop, content_block_start, content_block_stop ignored —
      // not load-bearing for cost capture.
    }

    if (onUsage) {
      // Best-effort callback; consumer-side errors must not crash the
      // streaming handler. Wrapped at the call site (coarchitect-ipc.ts
      // MB-T26 sentinel zone).
      onUsage({ inputTokens, outputTokens, model: modelObserved });
    }
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
