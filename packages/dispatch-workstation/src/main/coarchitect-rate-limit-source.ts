// MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG — WB5 GREEN.
//
// Production `RateLimitSource` implementation closing T9 ADR-MBTWFT9-A
// `(f) skeleton-with-deferred-source` per the source-side wiring authored
// in this c5-ticket-wb1 (Wave 5) cycle. Per ticket body §2.2: the
// 1-line plug at `coarchitect-ipc.ts:95` (out of c5 territory) replaces
// `createNullRateLimitSource()` with `createCoarchitectRateLimitSource(...)`
// and adds a `rateLimitAggregator.start()` call at app-ready time.
//
// Behavior (Sub-Q-T9PLUG defaults — see ticket body §3):
//   - (A) workstation-direct Anthropic API ping (fetch GET to /v1/models)
//   - (B) endpoint default https://api.anthropic.com/v1/models;
//         `endpointUrl` deps override allows flip to (α) POST /v1/messages
//         without code change.
//   - (C) apiKey supplied at construction (operator's ANTHROPIC_API_KEY
//         env at plug-time; persistence UI deferred to
//         MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING Tier 2).
//   - (D) poll cadence 60s default; `pollIntervalMs` deps override.
//   - (E) silent-degradation on auth-fail / network failure / non-OK
//         response / no-rate-limit-headers response — no emission, no
//         throw. Aggregator preserves last-good cached state.
//
// All I/O surfaces (fetch, setInterval, clearInterval) accept deps-
// injection per CLAUDE.md §2.8 spike-required external-API discipline.
// Tests substitute fakes (no real network); production wires native
// globals.

import { parseAnthropicRateLimitHeaders } from './rate-limit-source.js';
import type { RateLimitSource } from './rate-limit-aggregator.js';
import type { RateLimitState } from '../chat-shell/ring-helpers.js';

export interface CoarchitectRateLimitSourceDeps {
  readonly apiKey: string;
  readonly fetchFn?: typeof globalThis.fetch;
  readonly setIntervalFn?: typeof globalThis.setInterval;
  readonly clearIntervalFn?: typeof globalThis.clearInterval;
  readonly pollIntervalMs?: number;
  readonly endpointUrl?: string;
  readonly anthropicVersion?: string;
}

const DEFAULT_ENDPOINT = 'https://api.anthropic.com/v1/models';
const DEFAULT_POLL_MS = 60000;
const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';

export function createCoarchitectRateLimitSource(
  deps: CoarchitectRateLimitSourceDeps,
): RateLimitSource {
  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const setIntervalFn = deps.setIntervalFn ?? globalThis.setInterval;
  const clearIntervalFn = deps.clearIntervalFn ?? globalThis.clearInterval;
  const pollIntervalMs = deps.pollIntervalMs ?? DEFAULT_POLL_MS;
  const endpointUrl = deps.endpointUrl ?? DEFAULT_ENDPOINT;
  const anthropicVersion = deps.anthropicVersion ?? DEFAULT_ANTHROPIC_VERSION;

  const subscribers = new Set<(state: RateLimitState) => void>();
  let intervalHandle: ReturnType<typeof setInterval> | null = null;

  async function tick(): Promise<void> {
    try {
      const response = await fetchFn(endpointUrl, {
        method: 'GET',
        headers: {
          'x-api-key': deps.apiKey,
          'anthropic-version': anthropicVersion,
        },
      });
      if (!response.ok) return;
      const state = parseAnthropicRateLimitHeaders(response.headers);
      if (state === null) return;
      for (const cb of subscribers) cb(state);
    } catch {
      // Silent-degradation per Sub-Q-T9PLUG-E=(i): network failures,
      // auth misconfiguration, and quota-exceeded conditions all
      // leave the aggregator's cached state untouched. Operator
      // observability is via electron devtools network panel +
      // `coarchitect:getRateLimitState` IPC return value (null pre-
      // first-success, non-null afterwards).
    }
  }

  return {
    start(): void {
      if (intervalHandle !== null) return;
      void tick();
      intervalHandle = setIntervalFn(() => {
        void tick();
      }, pollIntervalMs);
    },
    stop(): void {
      if (intervalHandle === null) return;
      clearIntervalFn(intervalHandle);
      intervalHandle = null;
    },
    onState(cb: (state: RateLimitState) => void): () => void {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
  };
}
