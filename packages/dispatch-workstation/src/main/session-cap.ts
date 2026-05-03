// MB-T06 — concurrent-session-cap module.
//
// Per V3_TICKETS.md MB-T06 + WORKSTATION_CONTRACT.md §8.1: the spawn
// pipeline performs a workstation-side cap check against the daemon's
// session list before invoking buildSpawnEnv / tmux new-session. Daemon-
// side cap enforcement is out of scope for v3.0 (would require contract
// amendment per MB-S02 ADR §6.5; deferred as MB-F-FM5-cap).
//
// Cap value default = 5. Authority: vision §10.11 Q3 ("4-5 sustained
// active session ceiling"); MB-T06 ticket-prompt fallback selected 5.
// Configurable via MB-T11/W-T19 settings UI later (see
// MB-F-MB-T06-CAP-SETTINGS followup).
//
// Two surfaces:
//   - isAtCap(activeCount, cap)        — pure predicate (cluster 1)
//   - checkSpawnCapacity(client, cap)  — daemon-fetch wrapper (cluster 2)

/**
 * Vision §10.11 Q3 ratifies a 4-5 sustained-active session ceiling for
 * v3.0. MB-T06 ticket-prompt selects 5 as the default; MB-T11 settings
 * UI will expose this for operator override.
 */
export const DEFAULT_SESSION_CAP = 5;

/**
 * Pure predicate. Returns true if active >= cap.
 *
 * `>=` rather than `===` so a workstation that comes online into an
 * already-over-cap state (e.g., daemon registered sessions via CLI
 * outside the workstation's view) still refuses new spawns until the
 * count drops back below cap.
 */
export function isAtCap(activeCount: number, cap: number): boolean {
  return activeCount >= cap;
}

/**
 * Subset of the GET /v2/sessions response shape this module consumes.
 * Per CONDUCTOR_API_CONTRACT.md §4.2:
 *   { "sessions": [{ "name": "...", "state": "armed" | ..., ... }] }
 *
 * `state` is the v2 daemon's lifecycle state (armed/paused/held/killed).
 * Sessions in terminal/archived states do NOT count toward the cap; see
 * isActiveSession below for the filter.
 */
export interface SessionLite {
  name: string;
  state?: string;
}

export interface SessionListResponse {
  sessions: SessionLite[];
}

/**
 * Workstation-side daemon-client surface for the cap check. Distinct
 * from coarchitect/daemon-client.ts (which is orchestrator-message
 * specific). The production wiring is in spawn-ipc.ts; tests inject a
 * recording stub directly.
 */
export interface SessionListClient {
  listSessions(): Promise<SessionListResponse>;
}

/**
 * Workstation-side cap-check error envelope. Mirrors console-ipc.ts
 * WorkstationError pattern (PanelCapExceeded shape). Not the same class
 * because spawn-handler.ts already exports its own WorkstationSpawnError
 * union; the new types layer onto that union via spawn-handler.ts.
 *
 * Carrying activeCount + cap as fields enables renderer-side display
 * ("Session cap (5) reached. 5 sessions active. Close one to spawn.")
 * without re-fetching.
 */
export class SessionCapExceededError extends Error {
  readonly error_type = 'SessionCapExceeded' as const;
  readonly activeCount: number;
  readonly cap: number;
  constructor(activeCount: number, cap: number) {
    super(
      `Session cap (${cap}) reached. Close an existing session before spawning another.`,
    );
    this.activeCount = activeCount;
    this.cap = cap;
    this.name = 'SessionCapExceededError';
  }
}

/**
 * Active-session predicate. Sessions that are 'archived' or 'killed'
 * (terminal in the §6 state machine) do not count toward the cap.
 *
 * NOTE: V3_TICKETS.md MB-T06 specifies "RUNNING + IDLE count toward
 * cap; AWAITING REVIEW, STALE, KILLED, archived do not" — that finer
 * filter requires the daemon's state↔computed_status mapping to be
 * stable and exposed via /v2/sessions. The current GET response carries
 * `state` (armed/paused/held/killed) and `computed_status`. This first
 * pass filters on `state` only; the precision refinement is filed as
 * MB-F-MB-T06-CAP-STATE-FILTER-PRECISION.
 */
function isActiveSession(s: SessionLite): boolean {
  const state = s.state ?? '';
  return state !== 'archived' && state !== 'killed';
}

/**
 * Higher-level cap check: fetch active session count from daemon and
 * apply isAtCap. Throws SessionCapExceededError if at-cap; otherwise
 * returns silently. Daemon-unreachable failures propagate as-is to the
 * caller (spawn-handler) which wraps them as DaemonUnreachable per
 * WORKSTATION_CONTRACT.md §6.5 fail-closed semantics — under daemon
 * failure we do NOT silently allow the spawn.
 */
export async function checkSpawnCapacity(
  client: SessionListClient,
  cap: number = DEFAULT_SESSION_CAP,
): Promise<void> {
  const response = await client.listSessions();
  const activeCount = response.sessions.filter(isActiveSession).length;
  if (isAtCap(activeCount, cap)) {
    throw new SessionCapExceededError(activeCount, cap);
  }
}
