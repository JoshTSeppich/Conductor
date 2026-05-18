// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB4 (GREEN) — daemon
// poll seam for the OrchestratorSessionsSource interface declared at
// orchestrator-state-aggregator.ts (WB3, 4ec20c3).
//
// Mirrors session-status-source-poll.ts cadence + backoff pattern
// verbatim:
//   - DEFAULT_INTERVAL_MS = 3000
//   - BACKOFF_CAP_MS = 12000
//   - On consecutive listSessions failures, cadence doubles (3→6→12s)
//     up to the hard cap of 12000ms.
//   - On first successful poll after failures, cadence resets to
//     the configured default.
//
// Source-level dedup semantics:
//   - Cache previous (sessions-content-hash, daemonReachable) tuple.
//   - Emit only when sessions content changes OR daemonReachable flips.
//   - polledAt advances with each emit (wall-clock of last meaningful
//     change). Trade-off vs §6.6 "last successful poll" framing: keeps
//     aggregator-level dedup viable AND avoids 3-second renderer
//     thrash (R-B3 risk register).
//
// Subscriber semantics:
//   - onState(cb) supports multiple subscribers; returns dispose.
//   - dispose stops the timer + clears subscribers; subsequent polls
//     no-op.

import type { OrchestratorSessionLite } from './orchestrator-state-types.js';
import type { OrchestratorSessionsSource } from './orchestrator-state-aggregator.js';

/**
 * Narrowed daemon-client interface — workstation subset of the actual
 * GET /v2/sessions response. Structurally compatible with the
 * production HttpSessionListClient + mirrors StatusListClient at
 * session-status-source-poll.ts:47.
 */
export interface OrchestratorListClient {
  listSessions(): Promise<{
    sessions: ReadonlyArray<{
      name: string;
      state?: string;
      computed_status?: string;
    }>;
  }>;
}

export interface CreateOrchestratorSessionsSourceDeps {
  readonly listClient: OrchestratorListClient;
  /** Default cadence in ms. Defaults to 3000. Backoff doubles this up
   *  to BACKOFF_CAP_MS on consecutive failures. */
  readonly intervalMs?: number;
  /** Wall-clock provider — injectable for deterministic tests.
   *  Defaults to () => new Date().toISOString(). */
  readonly nowIso?: () => string;
}

const DEFAULT_INTERVAL_MS = 3000;
export const BACKOFF_CAP_MS = 12000;

/** Strict narrowing — guards the cast from daemon-string to the
 *  TypeScript enum subset declared on OrchestratorSessionLite. Mirrors
 *  session-status-source-poll.ts:79 pattern. */
function narrowState(
  s: string | undefined,
): 'armed' | 'paused' | 'held' | 'killed' | undefined {
  return s === 'armed' || s === 'paused' || s === 'held' || s === 'killed'
    ? s
    : undefined;
}
function narrowComputedStatus(
  s: string | undefined,
):
  | 'idle'
  | 'running'
  | 'awaiting_review'
  | 'stale'
  | undefined {
  return s === 'idle' ||
    s === 'running' ||
    s === 'awaiting_review' ||
    s === 'stale'
    ? s
    : undefined;
}

function projectLite(
  entry: Readonly<{
    name: string;
    state?: string;
    computed_status?: string;
  }>,
): OrchestratorSessionLite {
  const state = narrowState(entry.state);
  const computed_status = narrowComputedStatus(entry.computed_status);
  const out: { -readonly [K in keyof OrchestratorSessionLite]: OrchestratorSessionLite[K] } = {
    name: entry.name,
  };
  if (state !== undefined) out.state = state;
  if (computed_status !== undefined) out.computed_status = computed_status;
  return out;
}

/** Cheap content-equality on the projected lite-array — sessions
 *  array sizes capped at ~12 (per WORKSTATION_CONTRACT.md §8.4
 *  single-operator MVP), JSON.stringify is acceptable. */
function sessionsContentEqual(
  a: ReadonlyArray<OrchestratorSessionLite>,
  b: ReadonlyArray<OrchestratorSessionLite>,
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Construct an OrchestratorSessionsSource backed by a daemon-poll
 * loop. The source subscribes are local (in-process); production
 * wiring at WB9 hands the source to createOrchestratorState-
 * Aggregator via DI.
 */
export function createOrchestratorSessionsSourcePoll(
  deps: CreateOrchestratorSessionsSourceDeps,
): OrchestratorSessionsSource {
  const defaultInterval = deps.intervalMs ?? DEFAULT_INTERVAL_MS;
  const nowIso = deps.nowIso ?? (() => new Date().toISOString());

  let currentInterval = defaultInterval;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let started = false;
  const subscribers = new Set<
    (state: {
      readonly sessions: ReadonlyArray<OrchestratorSessionLite>;
      readonly polledAt: string;
      readonly daemonReachable: boolean;
    }) => void
  >();

  // Last-emitted state — used for source-level dedup. null until
  // first emit.
  let lastSessions: ReadonlyArray<OrchestratorSessionLite> | null = null;
  let lastDaemonReachable: boolean | null = null;

  function schedule(): void {
    if (disposed || !started) return;
    timer = setTimeout(() => {
      void poll();
    }, currentInterval);
  }

  function emit(
    sessions: ReadonlyArray<OrchestratorSessionLite>,
    daemonReachable: boolean,
  ): void {
    if (disposed) return;
    // Dedup: only emit when sessions content changes OR daemon-
    // reachable flips. Source-level dedup keeps the aggregator's
    // reference-equality fast-path viable per R-B3 risk register.
    const changed =
      lastSessions === null ||
      lastDaemonReachable !== daemonReachable ||
      !sessionsContentEqual(sessions, lastSessions);
    if (!changed) return;
    lastSessions = sessions;
    lastDaemonReachable = daemonReachable;
    const state = {
      sessions,
      polledAt: nowIso(),
      daemonReachable,
    } as const;
    subscribers.forEach((cb) => cb(state));
  }

  async function poll(): Promise<void> {
    if (disposed) return;
    try {
      const response = await deps.listClient.listSessions();
      if (disposed) return;
      const sessions = response.sessions.map(projectLite);
      emit(sessions, true);
      currentInterval = defaultInterval;
    } catch {
      if (disposed) return;
      // Failure: emit with daemonReachable=false but preserve last-
      // known sessions if any (otherwise empty array). Backoff doubles
      // up to cap.
      emit(lastSessions ?? [], false);
      currentInterval = Math.min(currentInterval * 2, BACKOFF_CAP_MS);
    }
    schedule();
  }

  return {
    start(): void {
      if (started) return;
      started = true;
      // Initial fire — kick off the first poll without waiting for the
      // first interval. Matches session-status-source-poll.ts:148.
      void poll();
    },
    stop(): void {
      disposed = true;
      started = false;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      subscribers.clear();
    },
    onState(cb): () => void {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
  };
}
