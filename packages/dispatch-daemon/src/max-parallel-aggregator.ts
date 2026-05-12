/**
 * MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW WB2 GREEN —
 * Pure-fn daemon-side max-parallel aggregator.
 *
 * Round 11 §3.9 SPECULATIVE — operator-arbitrated manifest at
 * phase4-t9-t10-exec.txt scopes T10 to daemon-side aggregator
 * (this module) + workstation max-parallel-counter.tsx component
 * (existing prop-driven seam at T4 WB4 `f8fc24d`) + chat-shell/
 * probe-mbtwft10-* + max-parallel/** test paths. Architectural
 * pattern mirrors:
 *   - T8 cost-aggregator (`155933f`) — daemon-side pure-fn under
 *     (β) reshape narrowing to daemon-aggregator + consumer test.
 *   - T9 rate-limit-aggregator (`3fef80d`) — workstation-side
 *     pluggable-source skeleton under expanded manifest
 *     (`e5c7c96`); T10 manifest does NOT expand, so the daemon-
 *     side pure-fn pattern applies instead.
 *
 * Wireframe target per full-build-mode dispatch §1 bottom-rail
 * bullet 5: `max-parallel · 16/16 counter`. Pure-fn semantics:
 *   N = aggregateActiveSessionCount(sessionList)
 *   M = resolveMaxParallel({ maxParallel: configValue })
 * Renderer-side `<MaxParallelCounter>` (T4 WB4 shipped) computes
 * its own N inline from a `sessions` prop and accepts M as a
 * required prop. The pure functions here CO-EXIST with the
 * inline filter — they ARE the canonical-named version that
 * future consumer plumbing (workstation main-process aggregator,
 * daemon HTTP endpoint, settings-file reader) can adopt without
 * touching the component or the chat-shell host. Manifest-bound
 * T10 ladder ships the canonical named pure-fns + the regression
 * shield; downstream consumer wiring is deferred to follow-on
 * tickets per MB-F-T10-MAX-PARALLEL-CONSUMER-WIRING (filed at
 * WB5 findings doc).
 *
 * Sub-Q-T10 resolutions taken under manifest-bound scope:
 *   A=(α) RATIFY sessions-stream filter (N computed by component)
 *   B=(α) RATIFY DEFAULT_MAX_PARALLEL=16 default (M source-of-
 *         truth deferred — config-source path requires workstation
 *         settings-file OR daemon HTTP endpoint, both out-of-
 *         manifest for this ticket)
 *   C=(i) prop-drilled (no IPC; renderer reads prop)
 *   D=(i) no persistence (process-singleton default)
 *   E=(α) synchronous per-render (no async source)
 *
 * Purity invariants:
 *   - no I/O, no Date.now(), no Math.random()
 *   - no closures over external state
 *   - structurally typed inputs; callers may pass any object
 *     shape that includes the documented fields
 *
 * Frozen-contract awareness: this module DOES NOT touch any frozen
 * surface (no schema.ts, no WORKSTATION_CONTRACT.md §6.6, no
 * CONDUCTOR_API_CONTRACT.md, no orchestrator.md). The constant
 * DEFAULT_MAX_PARALLEL=16 RATIFIES the existing T4 WB4 default;
 * not a new contract.
 */

/**
 * Wireframe-fixed default per T4 WB4 Sub-Q-T4-E=(i) (`f8fc24d`
 * §3.5). RATIFIES the existing renderer-internal const that lived
 * upstream of the component (e.g. chat-shell.tsx slot supplier).
 * Future operator-configured-source tickets may pass a different
 * value via `resolveMaxParallel({ maxParallel: N })` without
 * touching this default.
 */
export const DEFAULT_MAX_PARALLEL = 16;

/**
 * Structural session shape consumed by aggregateActiveSessionCount.
 * Mirrors `SessionEntryShape` at workstation chat-shell/max-parallel-
 * counter.tsx:29-32 — `status` is optional; sessions without status
 * contribute 0 to the active count (defensive against partial state
 * during transient spawn-in-flight / kill-pending states).
 */
export interface SessionWithStatus {
  readonly status?: string;
}

/**
 * Count sessions with `status === 'open'`. Pure; deterministic;
 * O(n) over the session list.
 *
 * Matches the inline filter at workstation `MaxParallelCounter`
 * (chat-shell/max-parallel-counter.tsx:49) verbatim — same
 * predicate, same return semantics. Workstation component
 * continues using its inline filter for now; this function
 * exists as the canonical named version for future cross-package
 * consumers (daemon HTTP endpoint, workstation main-process
 * aggregator) per MB-F-T10-MAX-PARALLEL-CONSUMER-WIRING follow-on.
 */
export function aggregateActiveSessionCount(
  sessions: ReadonlyArray<SessionWithStatus>,
): number {
  let count = 0;
  for (const session of sessions) {
    if (session.status === 'open') {
      count += 1;
    }
  }
  return count;
}

/**
 * Resolve max-parallel cap from an optional config. Returns
 * `config.maxParallel` when defined; otherwise returns
 * DEFAULT_MAX_PARALLEL. Pure; deterministic; O(1).
 *
 * Future ticket plug-points:
 *   - Workstation settings-file consumer reads `<userData>/max-
 *     parallel.json` `{ maxParallel: N }`, passes to this fn.
 *   - Daemon HTTP endpoint exposes config; workstation polls,
 *     passes parsed value.
 *   - BUILD.md preamble `max_parallel: N` (T5
 *     MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY closure path).
 * All paths funnel through this resolver; the consumer plumbing
 * choice is operator-arbitrated at the next T10 follow-on.
 */
export function resolveMaxParallel(config?: {
  readonly maxParallel?: number;
}): number {
  if (config && config.maxParallel !== undefined) {
    return config.maxParallel;
  }
  return DEFAULT_MAX_PARALLEL;
}
