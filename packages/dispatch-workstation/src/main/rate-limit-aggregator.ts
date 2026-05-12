// MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB4 (green) —
// rate-limit-aggregator: pluggable rate-limit-state aggregator for the
// bottom-rail PlanTimerText + PlanUsageRing consumers.
//
// Per decisions doc ADR-MBTWFT9-A (Sub-Q-T9-A=(f) skeleton-with-
// deferred-source). The module ships the ARCHITECTURAL SEAM that
// reauthors the post-WB14a-removed `broadcastRateLimitUpdate` /
// `latestRateLimitState` plumbing in shape, while leaving the
// actual data source pluggable. Production main.ts wires a
// `createNullRateLimitSource()` instance — the aggregator stays in
// `getLatestState() === null` until a real source is plugged via
// follow-on tickets:
//
//   - (a) workstation-direct Anthropic ping behind NEW
//         MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING (Tier 2).
//   - (b) daemon-side ping behind a future WORKSTATION_CONTRACT.md
//         §6.6 amendment (currently FORBIDDEN by phase4-t9-exec
//         manifest at e5c7c96).
//   - (c-monthly) opportunistic PTY-scrape of `/cost` interactive
//         output for monthly Max-subscription reset (DIFFERENT
//         semantics from the weekly/short-window RateLimitState.requests
//         the wireframe target consumes).
//
// Why (c)-continuous PTY-scrape is NOT viable here: per
// docs/spike-evidence/HSO-01/scenario-5-results.md (2026-05-08), the
// CC CLI PTY stream does not emit X-RateLimit-* equivalents
// continuously. The only continuously-broadcast status-bar line is
// the per-session token count (scraped by tile-token-scraper.ts at
// 13b7607) — which represents context-window usage, NOT rate-limit
// window reset timing.
//
// The aggregator surface (`createRateLimitAggregator`) is the
// MB-T-HSO-WIRE WB14a recovery point: it owns the "latest state" that
// `coarchitect:getRateLimitState` IPC handler returns (rewired at
// WB6) and fan-outs every source emission to subscribers (the
// renderer-side `coarchitect:rate-limit-update` broadcast, also at
// WB6, becomes one of those subscribers).

import type { RateLimitState } from '../chat-shell/ring-helpers.js';

/**
 * Pluggable rate-limit-state source dependency. A real implementation
 * fetches Anthropic API rate-limit headers (via direct ping, daemon
 * indirection, or future PTY-scrape) and fires `onState` callbacks
 * each time fresh data arrives. The null-source default
 * (`createNullRateLimitSource`) implements this interface as a no-op.
 */
export interface RateLimitSource {
  /** Begin source operation. Called by `aggregator.start()`. */
  start(): void;
  /** Stop source operation. Called by `aggregator.stop()`. */
  stop(): void;
  /**
   * Subscribe to source state emissions. Returns a dispose function
   * that deregisters the callback. The aggregator subscribes once at
   * construction time; downstream consumers subscribe to the
   * aggregator (not the source directly) via `onUpdate`.
   */
  onState(cb: (state: RateLimitState) => void): () => void;
}

export interface RateLimitAggregator {
  /**
   * Latest state observed from the source. Returns null until the
   * source fires its first emission. The IPC handler at
   * coarchitect-ipc.ts (WB6) returns this value from
   * `coarchitect:getRateLimitState`.
   */
  getLatestState(): RateLimitState | null;
  /** Start the source. Idempotent at the source-level — repeated calls forward to source.start(). */
  start(): void;
  /** Stop the source. */
  stop(): void;
  /**
   * Subscribe to aggregator state updates. Each source emission fires
   * all registered callbacks AFTER the aggregator's latest-state
   * cache is updated. Returns a dispose function that deregisters the
   * callback.
   */
  onUpdate(cb: (state: RateLimitState) => void): () => void;
}

export interface CreateRateLimitAggregatorDeps {
  readonly source: RateLimitSource;
}

/**
 * Construct a rate-limit aggregator wrapping the supplied source.
 * The aggregator subscribes to the source's `onState` channel at
 * construction time and caches each emission in its `latestState`
 * field, then fans out to all `onUpdate` subscribers.
 */
export function createRateLimitAggregator(
  deps: CreateRateLimitAggregatorDeps,
): RateLimitAggregator {
  const { source } = deps;
  let latestState: RateLimitState | null = null;
  const subscribers = new Set<(state: RateLimitState) => void>();

  source.onState((state) => {
    latestState = state;
    subscribers.forEach((cb) => cb(state));
  });

  return {
    getLatestState(): RateLimitState | null {
      return latestState;
    },
    start(): void {
      source.start();
    },
    stop(): void {
      source.stop();
    },
    onUpdate(cb): () => void {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  };
}

/**
 * Null-source: a `RateLimitSource` that never emits. Production
 * default per Sub-Q-T9-A=(f) decision in ADR-MBTWFT9-A — the
 * aggregator stays in null state, the bottom-rail PlanTimerText
 * renders honest "Max plan resets in —", and the architectural seam
 * is ready for a real source via follow-on ticket.
 */
export function createNullRateLimitSource(): RateLimitSource {
  return {
    start(): void {},
    stop(): void {},
    onState(): () => void {
      return () => {};
    },
  };
}
