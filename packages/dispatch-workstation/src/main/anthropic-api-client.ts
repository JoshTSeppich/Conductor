import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { RawMessageStreamEvent } from '@anthropic-ai/sdk/resources/messages';
import type { UsageInfo } from './anthropic-client.js';

// === BEGIN: MB-T34 Anthropic API client (low-level transport + headers) ===
//
// Operator-acked dispositions (HALT 0, 2026-05-08):
//   Q-MBT34-1=(c)   split from AnthropicChatClient; chat-client composes
//                   this low-level client.
//   Q-MBT34-2=(b)+(c)  expose RateLimitState via accessor +
//                      onRateLimit? callback.
//   Q-MBT34-3=(b)   loadApiKey: file-first ~/.foxworks-dispatch/api-key
//                   then env ANTHROPIC_API_KEY fallback.
//   Q-MBT34-4=(a)   exponential backoff w/ jitter, max 3 retries,
//                   respect retry-after header.
//   Q-MBT34-5=(a)   retry logic inside this client.
//   Q-MBT34-6=(b)   nested-bucket RateLimitState shape (durable contract,
//                   operator-approved as mechanical translation of frozen
//                   schema per §3.4).
//   Q-MBT34-9=defer cache-token enrichment of UsageInfo → MB-F-T26-CACHE-
//                   TOKEN-COST-ENRICHMENT (Tier 2 followup).
//   C-MBT34-1=(b mod) main-internal getRateLimitState accessor +
//                     new IPC channel coarchitect:rate-limit-update
//                     (wired in WB5 via coarchitect-ipc.ts MB-T34 zone).
//
// Header-capture seam: @anthropic-ai/sdk@0.92.0 APIPromise.withResponse()
// (api-promise.d.ts:39). [KNOWN] from Phase 1 live-API spike (commit
// c09bd09): 13 anthropic-ratelimit-* headers exposed on a streaming
// /v1/messages call when the APIPromise is captured BEFORE awaiting the
// inner Stream.
//
// WB1 STATE: RED scaffold. Implementations throw NotImplementedError or
// return null/0. Probes 01-07 in test/unit/anthropic-api-client/ assert
// the contract surface and fail against these stubs.

/** A single rate-limit dimension's bucket. ISO-8601 UTC reset. */
export interface RateLimitBucket {
  readonly remaining: number;
  readonly limit: number;
  readonly reset: string;
}

/**
 * Snapshot of all four rate-limit dimensions exposed by the Anthropic API.
 * Captured at response-open via Response.headers; this state is fixed for
 * the duration of one request and refreshed on the next.
 */
export interface RateLimitState {
  readonly requests: RateLimitBucket;
  readonly tokens: RateLimitBucket;
  readonly inputTokens: RateLimitBucket;
  readonly outputTokens: RateLimitBucket;
  readonly capturedAt: string;
}

/**
 * Callbacks observable from a single streamMessage call.
 *
 * onUsage: fires once at end-of-stream with token counts + model
 * (re-uses MB-T26's UsageInfo shape for non-regression of chat-flow).
 *
 * onRateLimit: fires once at response-open after RateLimitState is
 * extracted from headers. May be called BEFORE the stream begins yielding
 * events, since headers are available as soon as the response opens.
 */
export interface StreamCallbacks {
  readonly onUsage?: (usage: UsageInfo) => void;
  readonly onRateLimit?: (state: RateLimitState) => void;
}

export interface StreamMessageParams {
  readonly model: string;
  readonly maxTokens: number;
  readonly system?: string;
  readonly messages: ReadonlyArray<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

/** Thrown by createAnthropicAPIClient when no key is configured anywhere. */
export class ApiKeyNotConfiguredError extends Error {
  override readonly name = 'ApiKeyNotConfiguredError';
  constructor() {
    super(
      'Anthropic API key not configured. Create ~/.foxworks-dispatch/api-key ' +
        '(single line, no trailing newline) or set ANTHROPIC_API_KEY env var.',
    );
  }
}

/** RED-stub marker. WB2-WB5 replace each call site with real impl. */
export class NotImplementedError extends Error {
  override readonly name = 'NotImplementedError';
  constructor(what: string) {
    super(`MB-T34 WB1 RED: ${what} not implemented`);
  }
}

export const API_KEY_FILE_PATH = path.join(
  os.homedir(),
  '.foxworks-dispatch',
  'api-key',
);

export const DEFAULT_MAX_RETRIES = 3;

/**
 * Optional injection points for loadApiKey() (testability per CLAUDE.md
 * §3.6). Production callers omit; tests pass a tmpdir filePath + custom
 * env to verify file-first / fallback behavior independent of operator's
 * real ~/.foxworks-dispatch/api-key.
 */
export interface LoadApiKeyOptions {
  /** Override file path (default: API_KEY_FILE_PATH) */
  readonly filePath?: string;
  /** Override env var name (default: 'ANTHROPIC_API_KEY') */
  readonly envKey?: string;
  /** Override process.env (default: process.env) */
  readonly env?: NodeJS.ProcessEnv;
}

/**
 * Load the Anthropic API key. File-first per Q-MBT34-3=(b).
 *
 * 1. Try ~/.foxworks-dispatch/api-key (operator-managed, 0600). Trim
 *    trailing whitespace; empty/whitespace-only file treated as missing.
 * 2. Fall back to process.env['ANTHROPIC_API_KEY'] if file unreadable
 *    or empty.
 * 3. Return null if neither source provides a key.
 *
 * Never echoes the key to logs/console/stdout.
 */
export async function loadApiKey(
  opts?: LoadApiKeyOptions,
): Promise<string | null> {
  // RED stub. WB5 implements file-first + env fallback.
  void fs;
  void API_KEY_FILE_PATH;
  void opts;
  return null;
}

/**
 * Extract a RateLimitState from fetch Response headers.
 *
 * Reads the 4 dimensions × 3 fields = 12 anthropic-ratelimit-* headers
 * captured by Phase 1 spike. Returns null if any required header missing
 * or if any limit/remaining value fails Number parse.
 *
 * @param headers Response.headers (Headers instance)
 * @param capturedAt ISO-8601 UTC timestamp of capture
 */
export function extractRateLimitState(
  headers: Headers,
  capturedAt: string,
): RateLimitState | null {
  // RED stub. WB4 implements parse of:
  //   anthropic-ratelimit-{requests,tokens,input-tokens,output-tokens}-
  //     {limit,remaining,reset}
  void headers;
  void capturedAt;
  return null;
}

/**
 * Compute retry delay (ms) for the Nth attempt using jittered exponential
 * backoff. Honors retry-after header if present.
 *
 * Q-MBT34-4=(a): base 1s, multiplier 2, +/-25% jitter, capped at 30s.
 * If retryAfterSeconds is provided (non-null, non-negative), return that
 * value × 1000 with no further backoff (server is authoritative).
 *
 * @param attempt 0-indexed retry attempt (0 = first retry, 1 = second, ...)
 * @param retryAfterSeconds Retry-After header value or null
 * @returns delay in milliseconds (>= 0)
 */
export function computeRetryDelayMs(
  attempt: number,
  retryAfterSeconds: number | null,
): number {
  // RED stub. WB3 implements jittered exp backoff + retry-after honor.
  void attempt;
  void retryAfterSeconds;
  return 0;
}

/**
 * Low-level Anthropic API client.
 *
 * Q-MBT34-1=(c): owns transport + retry + header capture. Thin chat-flow
 * wrapper (AnthropicChatClient in anthropic-client.ts) composes this client
 * to preserve MB-T26 onUsage signature. The MB-T35 reasoning loop will
 * consume this client directly without going through chat-flow.
 *
 * Header-capture seam: client.messages.create returns APIPromise; we call
 * .withResponse() BEFORE awaiting the inner Stream so we have access to the
 * raw fetch Response (Response.headers carries the rate-limit data).
 */
export class AnthropicAPIClient {
  private _lastRateLimitState: RateLimitState | null = null;

  constructor(private readonly client: Pick<Anthropic, 'messages'>) {}

  /**
   * Stream a single /v1/messages call, yielding raw RawMessageStreamEvent
   * values. Captures rate-limit headers at response-open, fires
   * onRateLimit, then iterates and accumulates token usage, firing onUsage
   * at end-of-stream.
   *
   * Outer retry policy: pre-stream errors (HTTP 429, 5xx before any
   * stream byte) are retried per Q-MBT34-4=(a). Stream-mid errors
   * propagate to caller (R-MBT34-3 — re-emitting an in-flight stream
   * would double-count tokens).
   */
  async *streamMessage(
    params: StreamMessageParams,
    callbacks?: StreamCallbacks,
  ): AsyncIterable<RawMessageStreamEvent> {
    // RED stub. WB2 implements stream-event parsing; WB3 wraps with
    // retry; WB4 wires header capture via withResponse() into
    // _lastRateLimitState + onRateLimit.
    void this.client;
    void params;
    void callbacks;
    void this._lastRateLimitState;
    throw new NotImplementedError('AnthropicAPIClient.streamMessage');
  }

  /**
   * Returns the most recent RateLimitState observation, or null if no
   * successful request has completed yet.
   *
   * Synchronous main-process accessor per C-MBT34-1=(b mod). The IPC
   * channel coarchitect:rate-limit-update (wired in WB5) pushes this
   * state to renderers via coarchitectBridge.onRateLimitUpdate.
   */
  getRateLimitState(): RateLimitState | null {
    return this._lastRateLimitState;
  }
}

/**
 * Factory: construct AnthropicAPIClient via loadApiKey().
 *
 * Returns null if no API key source provides a key (treat as
 * "API integration not configured" rather than a hard error; existing
 * createAnthropicClient env-var-null path is precedent).
 */
export async function createAnthropicAPIClient(): Promise<AnthropicAPIClient | null> {
  const apiKey = await loadApiKey();
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  return new AnthropicAPIClient(client);
}

// === END: MB-T34 Anthropic API client ===
