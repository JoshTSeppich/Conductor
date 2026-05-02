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

  async *streamMessage(content: string): AsyncIterable<string> {
    const stream = await this.client.messages.create({
      model: CHAT_MODEL,
      max_tokens: MAX_TOKENS,
      system: this.systemPrompt,
      messages: [{ role: 'user', content }],
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
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
