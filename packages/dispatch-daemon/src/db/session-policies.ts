/**
 * MB-F-T13-SESSION-POLICY-CLEANUP-ON-KILL — DELETE helper for the
 * `session_policies` table (migration 0003-approval-policy-and-swarm-
 * audit.sql §session_policies).
 *
 * Closes FOLLOWUPS.md:170 (Tier 2; Q-MBT13-1=a side-effect). The row
 * body specifies wiring `DELETE FROM session_policies WHERE
 * session_name = ?` at the daemon's PATCH /v2/sessions/:name/state
 * handler when the new state is `killed`, so a stale row cannot be
 * picked up by a tidy session re-spawn under the same name.
 *
 * Coexistence-without-sync per WORKSTATION_CONTRACT.md §8.1: the v3
 * SQLite layer is independent of the v2 sessions.json registry. This
 * cleanup is best-effort terminal-state housekeeping; a PUT racing
 * with a kill transition would re-create a row whose effective binding
 * is operator-acceptable (the killed session cannot consume it).
 *
 * Idempotency: SQLite DELETE against a zero-row pattern returns
 * `changes = 0` and does not throw. Callers may invoke repeatedly with
 * no side effect when the row is already absent.
 *
 * Sibling pattern reference: `packages/dispatch-daemon/src/routes/v3/
 * sessions/approval-policy.ts:58-66` (prepared SELECT + INSERT OR
 * REPLACE for the same table). The DELETE helper lives here per
 * r12-cw2-t13-session-policy-cleanup territory manifest.
 */

import type Database from 'better-sqlite3';

/**
 * Delete the policy row for the given session name. Returns the
 * better-sqlite3 RunResult so callers can observe `changes` (0 when
 * no row matched, 1 when the row was deleted) without re-querying.
 */
export function deleteSessionPolicy(
  db: Database.Database,
  sessionName: string,
): Database.RunResult {
  const stmt = db.prepare(
    `DELETE FROM session_policies WHERE session_name = ?`,
  );
  return stmt.run(sessionName);
}
