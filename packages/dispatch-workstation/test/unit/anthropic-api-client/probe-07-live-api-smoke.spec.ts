// MB-T34 WB6 — probe-07: end-to-end live-API smoke (gated).
//
// Q-MBT34-11=(a): gated under RUN_LIVE_API=1 (skipped by default).
// Operator runs with `RUN_LIVE_API=1 pnpm --filter dispatch-workstation
// exec vitest run test/unit/anthropic-api-client/probe-07-live-api-smoke
// .spec.ts` to confirm production path against real /v1/messages.
//
// Asserts the full production path:
//   1. createAnthropicAPIClient() reads key from ~/.foxworks-dispatch/api-key
//      (file-first per Q-MBT34-3=(b))
//   2. streamMessage yields RawMessageStreamEvent values from real SDK
//   3. onUsage fires with real token counts and resolved model
//   4. onRateLimit fires with real RateLimitState (4 buckets populated)
//   5. getRateLimitState() returns the captured state post-stream
//   6. text deltas project to a non-empty string response
//
// This test makes 1 live API call (~16 output tokens; cost negligible).
// Uses claude-haiku-4-5 (cheapest tier) to minimize cost.

import { describe, it, expect } from 'vitest';
import {
  createAnthropicAPIClient,
  type RateLimitState,
} from '../../../src/main/anthropic-api-client.js';
import type { UsageInfo } from '../../../src/main/anthropic-client.js';

const SHOULD_RUN = process.env['RUN_LIVE_API'] === '1';

describe.skipIf(!SHOULD_RUN)('MB-T34 WB6 — live-API smoke', () => {
  it('end-to-end: createAnthropicAPIClient → streamMessage → onUsage + onRateLimit', async () => {
    const client = await createAnthropicAPIClient();
    expect(client).not.toBeNull();

    let captured: UsageInfo | null = null;
    let rateLimit: RateLimitState | null = null;
    const textParts: string[] = [];

    for await (const event of client!.streamMessage(
      {
        model: 'claude-haiku-4-5',
        maxTokens: 16,
        messages: [{ role: 'user', content: 'hi' }],
      },
      {
        onUsage: (u) => {
          captured = u;
        },
        onRateLimit: (s) => {
          rateLimit = s;
        },
      },
    )) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        textParts.push(event.delta.text);
      }
    }

    // 1. onUsage fired with real token counts + resolved model
    expect(captured).not.toBeNull();
    expect(captured!.inputTokens).toBeGreaterThan(0);
    expect(captured!.outputTokens).toBeGreaterThan(0);
    expect(captured!.model).toMatch(/claude-haiku-4-5/);

    // 2. onRateLimit fired with real headers; all 4 buckets populated
    expect(rateLimit).not.toBeNull();
    expect(rateLimit!.requests.limit).toBeGreaterThan(0);
    expect(rateLimit!.requests.remaining).toBeGreaterThan(0);
    expect(rateLimit!.tokens.limit).toBeGreaterThan(0);
    expect(rateLimit!.inputTokens.limit).toBeGreaterThan(0);
    expect(rateLimit!.outputTokens.limit).toBeGreaterThan(0);
    expect(rateLimit!.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // 3. accessor returns the same state
    const accessed = client!.getRateLimitState();
    expect(accessed).not.toBeNull();
    expect(accessed!.tokens.remaining).toBe(rateLimit!.tokens.remaining);

    // 4. text response captured
    const text = textParts.join('');
    expect(text.length).toBeGreaterThan(0);
  }, 30_000);
});
