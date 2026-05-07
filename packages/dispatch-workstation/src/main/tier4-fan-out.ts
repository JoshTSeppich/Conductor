// MB-T11 WB7 — Tier 4 fan-out helper (closes MB-F-T10-COARCHITECT-IPC-WIRE-TIER4).
//
// Per CONDUCTOR_V3_RESCOPE.md §3.5 + Q-MBT11-8=a:
//   1. Get the registered non-killed session names from /v2/sessions.
//   2. Fan out: GET /v3/sessions/:name/context-snapshot for each.
//   3. MERGE workstation autopilot state INTO each SessionContextSnapshot
//      (overwriting the daemon's hardcoded [] / null for pending_intents +
//      last_action_fired_at per Q-MBT11-8=a).
//   4. Pass the per-name fetchSnapshot callable to tier4-builder's
//      assembleTier4Payload, which handles graceful per-session degradation.
//
// Q-MBT11-8=a (workstation-merge) implementation note: the daemon's
// /v3/sessions/:name/context-snapshot route at
// packages/dispatch-daemon/src/routes/v3/context-snapshot.ts:167 hardcodes
// `pending_intents: []` and `last_action_fired_at: null` with the inline
// comment "populated by MB-T11". This module fulfills that comment by
// overwriting those two fields workstation-side after the daemon fetch —
// no daemon migration required.
//
// Import-path discipline (per MB-F-DISPATCH-CORE-DUAL-IMPORT-PATTERN-DRIFT):
// dispatch-core symbols ALWAYS imported from `dispatch-core/dist/...js`.

import type {
  SessionContextSnapshot,
  Tier4Payload,
} from 'dispatch-core/dist/v3/schema.js';
import { assembleTier4Payload } from '../coarchitect/tier4-builder.js';
import type { AutopilotLoop } from './autopilot-loop.js';
import type { SessionListResponse } from './session-cap.js';

/**
 * Filter: a session counts as "registered non-killed" if its state is
 * neither 'archived' nor 'killed'. Mirrors the inline filter at
 * session-cap.ts:101 without importing the private helper.
 */
function isActiveForTier4(state: string | undefined): boolean {
  return state !== 'archived' && state !== 'killed';
}

export interface Tier4FanOutDeps {
  /** Source of registered session names (typically HttpSessionListClient). */
  sessionListClient: { listSessions(): Promise<SessionListResponse> };
  /** Workstation-side autopilot state. */
  autopilot: AutopilotLoop;
  /** fetch implementation — pass globalThis.fetch in production. */
  fetchImpl: typeof fetch;
  /** Daemon URL base, e.g., http://localhost:7878. */
  daemonUrl: string;
  /** Daemon token from `~/.foxworks-dispatch/token` — null when absent. */
  daemonToken: string | null;
}

/**
 * Fetch one session's snapshot from the daemon and merge workstation
 * autopilot state into the result. Throws on HTTP error or missing token
 * — assembleTier4Payload's per-promise catch turns this into a stub
 * snapshot for the failing session per Q-MBT10-7=a.
 */
async function fetchAndMergeSnapshot(
  sessionName: string,
  deps: Tier4FanOutDeps,
): Promise<SessionContextSnapshot> {
  if (!deps.daemonToken) {
    throw new Error('daemon token unavailable for context-snapshot fetch');
  }
  const url = `${deps.daemonUrl}/v3/sessions/${encodeURIComponent(sessionName)}/context-snapshot`;
  const res = await deps.fetchImpl(url, {
    headers: { 'X-Conductor-Token': deps.daemonToken },
  });
  if (!res.ok) {
    throw new Error(`daemon /v3/sessions/${sessionName}/context-snapshot returned HTTP ${res.status}`);
  }
  const daemonSnap = (await res.json()) as SessionContextSnapshot;

  // Q-MBT11-8=a workstation-merge: overwrite the daemon's hardcoded
  // pending_intents / last_action_fired_at with workstation-authoritative
  // values from the autopilot store.
  return {
    ...daemonSnap,
    pending_intents: deps.autopilot.getPendingIntents(sessionName),
    last_action_fired_at: deps.autopilot.getLastActionFiredAt(sessionName),
  };
}

/**
 * Build the Tier4Payload by combining:
 *   - Session-name source from the daemon's /v2/sessions list
 *   - Per-session fan-out: daemon /v3/...context-snapshot + autopilot merge
 *   - Tier4-builder's pure assemble helper (handles per-session graceful
 *     degradation — failing fetches stub per Q-MBT10-7=a)
 *
 * Returns an empty `sessions_context` map (still wrapped in Tier4Payload
 * shape) when no active sessions exist OR the daemon list request fails;
 * the caller (coarchitect-ipc.ts) emits the Tier4 message regardless of
 * map cardinality per context-builder.ts:88.
 */
export async function buildTier4Payload(deps: Tier4FanOutDeps): Promise<Tier4Payload> {
  let sessionNames: string[] = [];
  try {
    const list = await deps.sessionListClient.listSessions();
    sessionNames = list.sessions
      .filter((s) => isActiveForTier4(s.state))
      .map((s) => s.name);
  } catch {
    // Daemon list failed — return empty Tier4Payload. Per
    // assembleTier4Payload contract, an empty sessionNames input
    // yields an empty sessions_context map. Caller emits the Tier4
    // message anyway; orchestrator sees "no spawned sessions".
    sessionNames = [];
  }

  return assembleTier4Payload({
    sessionNames,
    fetchSnapshot: (name: string) => fetchAndMergeSnapshot(name, deps),
  });
}
