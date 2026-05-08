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

const RETRY_BASE_MS = 1000;
const RETRY_MAX_CAP_MS = 30_000;
const RETRY_JITTER_FRACTION = 0.25;

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
  // Server is authoritative when retry-after is present.
  if (retryAfterSeconds !== null && retryAfterSeconds >= 0) {
    return retryAfterSeconds * 1000;
  }
  const exp = RETRY_BASE_MS * Math.pow(2, Math.max(0, attempt));
  const jitterDelta = exp * RETRY_JITTER_FRACTION * (Math.random() * 2 - 1);
  const withJitter = Math.round(exp + jitterDelta);
  return Math.max(0, Math.min(RETRY_MAX_CAP_MS, withJitter));
}

/**
 * True if the error indicates a retryable pre-stream failure (429 or 5xx).
 * 4xx other than 429 are NOT retryable (client errors, retry won't help).
 */
function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = (err as { status?: unknown }).status;
  if (typeof status !== 'number') return false;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

/**
 * Extract retry-after seconds from an error's headers if present.
 * @anthropic-ai/sdk attaches the original Response headers to error
 * instances on rate-limit / server errors.
 */
function extractRetryAfterFromError(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const headers = (err as { headers?: unknown }).headers;
  if (!headers || typeof headers !== 'object') return null;
  // Headers may be a plain object (axios-style) or a Headers instance.
  let raw: string | null = null;
  if (typeof (headers as Headers).get === 'function') {
    raw = (headers as Headers).get('retry-after');
  } else {
    const h = headers as Record<string, unknown>;
    const v = h['retry-after'] ?? h['Retry-After'];
    if (typeof v === 'string') raw = v;
  }
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function delayMs(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    // WB2: stream-event parsing + onUsage end-of-stream.
    // WB3: outer retry loop on PRE-stream 429/5xx (R-MBT34-3 — stream-mid
    //      errors propagate; re-emitting in-flight stream would double
    //      count tokens).
    // WB4 will wire .response.headers → extractRateLimitState →
    //     _lastRateLimitState + callbacks?.onRateLimit at response-open.
    //
    // Header-capture seam: APIPromise.withResponse() returns the inner
    // Stream alongside the raw fetch Response. APIPromise must NOT be
    // awaited first — the type system enforces this because Stream has
    // no withResponse member.

    let attempt = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let stream: AsyncIterable<RawMessageStreamEvent> | null = null;

    while (stream === null) {
      try {
        const apiPromise = this.client.messages.create({
          model: params.model,
          max_tokens: params.maxTokens,
          ...(params.system !== undefined ? { system: params.system } : {}),
          messages: params.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        });
        const withResp = await apiPromise.withResponse();
        stream = withResp.data as AsyncIterable<RawMessageStreamEvent>;
      } catch (err) {
        if (!isRetryableError(err) || attempt >= DEFAULT_MAX_RETRIES) {
          throw err;
        }
        const retryAfter = extractRetryAfterFromError(err);
        await delayMs(computeRetryDelayMs(attempt, retryAfter));
        attempt += 1;
      }
    }

    let inputTokens = 0;
    let outputTokens = 0;
    let model = params.model;

    for await (const event of stream) {
      if (event.type === 'message_start') {
        // [KNOWN] Phase 1 spike: message_start fires once at stream open
        // with initial usage + model.
        inputTokens = event.message.usage.input_tokens;
        model = event.message.model;
      } else if (event.type === 'message_delta') {
        // [KNOWN] Phase 1 spike: message_delta.usage.output_tokens is
        // cumulative across deltas; final delta wins.
        outputTokens = event.usage.output_tokens;
      }
      yield event;
    }

    callbacks?.onUsage?.({ inputTokens, outputTokens, model });
    void callbacks?.onRateLimit; // wired in WB4
    void this._lastRateLimitState; // wired in WB4
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
