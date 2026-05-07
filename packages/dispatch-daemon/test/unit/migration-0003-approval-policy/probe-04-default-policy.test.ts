/**
 * MB-T13 WB2 — Probe 04: SQL DEFAULT 'medium' on session_policies.approval_policy.
 *
 * Per Q-MBT13-4=c (defense-in-depth): SQL-level DEFAULT 'medium' protects
 * INSERT-without-policy paths; workstation-side resolver fallback ALSO
 * defaults to 'medium' on no-row. This probe verifies the SQL layer.
 *
 * INSERT INTO session_policies (session_name) VALUES ('test-session')
 * — omitting approval_policy AND updated_at — should succeed via SQL
 * defaults. Resulting row should have approval_policy='medium' and
 * updated_at populated by datetime('now').
 *
 * RED at WB2: migration absent; INSERT throws "no such table".
 * GREEN at WB3: INSERT succeeds; SELECT returns 'medium'.
 */

import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../../../src/lifecycle/db.js';

describe('MB-T13 WB2 — probe-04 — SQL DEFAULT medium on approval_policy', () => {
  it('INSERT with only session_name uses default policy = medium', () => {
    const db = new Database(':memory:');
    runMigrations(db);

    db.prepare(
      `INSERT INTO session_policies (session_name) VALUES ('test-session')`,
    ).run();

    const row = db
      .prepare(
        `SELECT session_name, approval_policy, updated_at FROM session_policies
         WHERE session_name = 'test-session'`,
      )
      .get() as
      | { session_name: string; approval_policy: string; updated_at: string }
      | undefined;

    expect(row).toBeDefined();
    expect(row?.session_name).toBe('test-session');
    expect(row?.approval_policy).toBe('medium');
    expect(row?.updated_at).toBeTruthy();
    // SQLite datetime('now') returns ISO-like 'YYYY-MM-DD HH:MM:SS' shape
    expect(row?.updated_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);

    db.close();
  });
});
