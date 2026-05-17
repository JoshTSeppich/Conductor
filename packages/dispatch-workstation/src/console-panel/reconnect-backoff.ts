// MB-F-CONSOLE-T02-RECONNECT-BACKOFF — pure exponential-backoff state machine.
//
// Replaces the fixed 1s reconnect delay shipped at CONSOLE-T02 cluster 2 GREEN
// (FOLLOWUPS.md:132). The state machine is pure-functional — `computeBackoffDelay`
// is keyed only on the failed-attempt counter, and `shouldGiveUp` is the
// terminal predicate. The caller (ConsoleIpcController in src/main/console-ipc.ts)
// owns the counter, increments it on each reconnect schedule, and resets it on
// successful socket open.
//
// Constants are exported so unit probes can pin the contract and so the
// controller integration cites the same source of truth.

/** First reconnect delay, in milliseconds. */
export const BASE_DELAY_MS = 1_000;

/** Ceiling on per-attempt delay; steady-state interval once doubling exceeds. */
export const MAX_DELAY_MS = 30_000;

/**
 * Number of failed reconnect attempts after which the state machine surfaces
 * a terminal error and stops scheduling further reconnects.
 *
 * Choice rationale: 5 attempts yields a cumulative back-off of
 * ~1+2+4+8+16=31s before the ceiling fires, which is short enough that
 * operator-facing feedback is timely and long enough that transient
 * network/daemon flaps don't immediately surface a fatal banner.
 */
export const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Returns the delay (ms) before the Nth reconnect attempt, where `attempt`
 * is the count of FAILED attempts so far (0 = first reconnect after the
 * initial socket loss). The sequence is 1s, 2s, 4s, 8s, 16s, then clamped
 * to MAX_DELAY_MS for all higher attempts.
 *
 * Negative inputs defensively clamp to BASE_DELAY_MS so a counter
 * underflow cannot produce an absurd Math.pow result.
 */
export function computeBackoffDelay(attempt: number): number {
  const safe = attempt < 0 ? 0 : attempt;
  const doubled = BASE_DELAY_MS * Math.pow(2, safe);
  return Math.min(doubled, MAX_DELAY_MS);
}

/**
 * Terminal predicate: returns true once `attempt` has reached
 * MAX_RECONNECT_ATTEMPTS, signalling the controller to emit a terminal
 * console:error event with errorType:'reconnect-exhausted' and stop
 * scheduling further reconnects.
 */
export function shouldGiveUp(attempt: number): boolean {
  return attempt >= MAX_RECONNECT_ATTEMPTS;
}
