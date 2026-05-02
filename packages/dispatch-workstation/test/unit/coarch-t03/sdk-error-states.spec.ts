// COARCH-T03 Red criterion — Test 3: SDK errors classify correctly.
// Verifies: classifyAnthropicError() maps RateLimitError→rate_limit, AuthenticationError→auth_error,
// APIConnectionError→network_error; and streamMessage() propagates errors from the SDK.
//
// RED state: src/main/anthropic-client.ts absent → import fails → FAIL.
// GREEN state: classifyAnthropicError implemented + streamMessage propagates → PASS.
//
// Testing mechanism: vitest unit test. Error instances constructed directly; no network call.
// Per WORKSTATION_CONTRACT.md §9.2 error-handling spec (system-prompt.md §"Error handling"):
//   5xx/network/429 → retry then escape; 400/401/403 → immediate escape.
import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { RateLimitError, AuthenticationError, APIConnectionError } from '@anthropic-ai/sdk';
import {
  AnthropicChatClient,
  classifyAnthropicError,
} from '../../../src/main/anthropic-client.js';

const SYSTEM = 'system prompt';

describe('COARCH-T03: error classification', () => {
  it('RateLimitError (429) classifies as rate_limit', () => {
    const err = new RateLimitError(
      429,
      { type: 'rate_limit_error', message: 'rate limit exceeded' },
      'rate limit exceeded',
      null as never,
    );
    const result = classifyAnthropicError(err);
    expect(result.code).toBe('rate_limit');
    expect(result.message).toContain('rate limit');
  });

  it('AuthenticationError (401) classifies as auth_error', () => {
    const err = new AuthenticationError(
      401,
      { type: 'authentication_error', message: 'invalid api key' },
      'invalid api key',
      null as never,
    );
    const result = classifyAnthropicError(err);
    expect(result.code).toBe('auth_error');
    expect(result.message).toContain('API key');
  });

  it('APIConnectionError classifies as network_error', () => {
    const err = new APIConnectionError({ message: 'ECONNREFUSED connection refused' });
    const result = classifyAnthropicError(err);
    expect(result.code).toBe('network_error');
  });

  it('unknown error classifies as api_error', () => {
    const err = new Error('something unexpected happened');
    const result = classifyAnthropicError(err);
    expect(result.code).toBe('api_error');
    expect(result.message).toBe('something unexpected happened');
  });

  it('streamMessage propagates RateLimitError from SDK', async () => {
    const err = new RateLimitError(
      429,
      { type: 'rate_limit_error' },
      'rate limit',
      null as never,
    );
    const mockCreate = vi.fn().mockRejectedValue(err);
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic;
    const client = new AnthropicChatClient(mockClient, SYSTEM);

    await expect(async () => {
      for await (const _chunk of client.streamMessage('hello')) { /* consume */ }
    }).rejects.toThrow();
  });
});
