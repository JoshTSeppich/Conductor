// MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB2 (green) — daemon poll
// seam with cadence + backoff + dedup. Composes WB1
// session-status-source-derive.ts (eeb11f5) into a setTimeout-driven
// loop that emits per-session TileStatus changes to a subscriber
// callback.
//
// Ticket body anchor: CONDUCTOR_MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW
// _BUILD.md (commit 832c03b) §1.1 row 2 + §4 WB2.
//
// Daemon response shape [KNOWN per direct daemon source read at
// packages/dispatch-daemon/src/routes/sessions.ts:100-120]:
//   GET /v2/sessions → { sessions: Array<{name, ...session,
//                                          computed_status, cost_info}> }
// (Array, not record as Zod docstring at dispatch-core/src/v2/schema.ts
// :347 suggests; daemon's handler at routes/sessions.ts builds an array
// via Object.entries(registry.sessions).map). StatusListClient interface
// captures the SUBSET of fields this module consumes — structurally
// compatible with production HttpSessionListClient JSON.
//
// Cadence + backoff rule (per ticket §1.1 row 2):
//   - Default cadence 3000ms (configurable via PollDeps.intervalMs).
//   - On consecutive listSessions failures, cadence doubles (3→6→12s)
//     up to a hard cap of 12000ms.
//   - On first successful poll, cadence resets to the configured default.
//   - dispose() clears the pending timer + prevents subsequent
//     in-flight poll() from re-scheduling or emitting.
//
// Dedup rule:
//   - Per-session lastStatus map tracks the last emitted TileStatus.
//   - Subsequent polls only invoke onStatusChange when the derived
//     TileStatus differs from the prior value for that session.
//
// Daemon-unreachable propagation:
//   - On listSessions rejection, every session in the last-known
//     snapshot is re-derived with daemonReachable=false → TileStatus
//     'error', emitted via the same dedup pathway. Sessions never seen
//     produce no emit (nothing to mark error).

import type { TileStatus } from '../tile-grid/types.js';
import { deriveTileStatus } from './session-status-source-derive.js';

/** Narrowed daemon-client interface — workstation subset of the actual
 *  GET /v2/sessions response. Structurally compatible with
 *  HttpSessionListClient (session-cap.ts:159) at runtime; the type
 *  declaration adds the `computed_status` field that session-cap.ts's
 *  narrower SessionLite omits. */
export interface StatusListClient {
  listSessions(): Promise<{
    sessions: ReadonlyArray<{
      name: string;
      state?: string;
      computed_status?: string;
    }>;
  }>;
}

export interface PollDeps {
  readonly listClient: StatusListClient;
  /** Default cadence in ms. Defaults to 3000. Backoff doubles this up
   *  to BACKOFF_CAP_MS on consecutive failures. */
  readonly intervalMs?: number;
  /** Invoked exactly once per actual per-session TileStatus transition.
   *  NOT invoked when a subsequent poll returns the same derived
   *  status for a session (dedup). */
  readonly onStatusChange: (sessionName: string, status: TileStatus) => void;
}

export interface PollHandle {
  dispose(): void;
}

const DEFAULT_INTERVAL_MS = 3000;
const BACKOFF_CAP_MS = 12000;

/** Strict narrowing helpers — guard the cast from daemon-string to the
 *  TypeScript enum subset used by deriveTileStatus. Unknown values map
 *  to undefined, which deriveTileStatus handles as the
 *  no-computed_status branch (pre-poll grey fallback). */
function narrowState(
  s: string | undefined,
): 'armed' | 'paused' | 'held' | 'killed' | undefined {
  return s === 'armed' || s === 'paused' || s === 'held' || s === 'killed'
    ? s
    : undefined;
}
function narrowComputedStatus(
  s: string | undefined,
): 'idle' | 'running' | 'awaiting_review' | 'stale' | undefined {
  return s === 'idle' || s === 'running' || s === 'awaiting_review' || s === 'stale'
    ? s
    : undefined;
}

export function startStatusPoll(deps: PollDeps): PollHandle {
  const defaultInterval = deps.intervalMs ?? DEFAULT_INTERVAL_MS;
  let currentInterval = defaultInterval;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  const lastStatus = new Map<string, TileStatus>();

  function schedule(): void {
    if (disposed) return;
    timer = setTimeout(() => {
      void poll();
    }, currentInterval);
  }

  function emitIfChanged(name: string, next: TileStatus): void {
    if (disposed) return;
    if (lastStatus.get(name) !== next) {
      lastStatus.set(name, next);
      deps.onStatusChange(name, next);
    }
  }

  async function poll(): Promise<void> {
    if (disposed) return;
    try {
      const response = await deps.listClient.listSessions();
      if (disposed) return;
      // Success: derive + dedup-emit per session + reset cadence.
      for (const entry of response.sessions) {
        const status = deriveTileStatus({
          state: narrowState(entry.state),
          computed_status: narrowComputedStatus(entry.computed_status),
          daemonReachable: true,
          hasSpawnResult: true,
        });
        emitIfChanged(entry.name, status);
      }
      currentInterval = defaultInterval;
    } catch {
      // Failure: emit 'error' for every previously-known session +
      // double cadence up to cap. Sessions never seen produce no emit.
      if (!disposed) {
        for (const name of lastStatus.keys()) {
          emitIfChanged(name, 'error');
        }
      }
      currentInterval = Math.min(currentInterval * 2, BACKOFF_CAP_MS);
    }
    schedule();
  }

  // Initial fire — kick off the first poll without waiting for the
  // first interval. The .catch swallows here; poll() owns its own
  // try/catch + reschedule logic.
  void poll();

  return {
    dispose(): void {
      disposed = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
