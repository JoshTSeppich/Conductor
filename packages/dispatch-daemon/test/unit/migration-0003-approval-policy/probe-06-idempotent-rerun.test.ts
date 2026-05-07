/**
 * MB-T13 WB2 — Probe 06: migration 0003 is idempotent on re-run.
 *
 * Per WORKSTATION_CONTRACT.md §8.1 additive-only migration model:
 * `runMigrations()` MUST be safe to call multiple times. CREATE TABLE
 * IF NOT EXISTS makes table creation a no-op on re-run; CREATE INDEX
 * IF NOT EXISTS does the same for indexes.
 *
 * Probe runs runMigrations twice and verifies:
 *   - second call does not throw
 *   - both new tables (session_policies + orchestrator_swarm_audit)
 *     remain present
 *   - applied list (returned by runMigrations) contains
 *     '0003-approval-policy-and-swarm-audit.sql'
 *
 * RED at WB2: migration absent; applied list does NOT contain the
 * filename (file doesn't exist in migrations/ dir).
 * GREEN at WB3: applied list contains '0003-...'; both tables persist
 * across re-runs without error.
 */

import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../../../src/lifecycle/db.js';

describe('MB-T13 WB2 — probe-06 — migration 0003 idempotent re-run', () => {
  it('runMigrations twice does not throw and 0003 lands in applied list', () => {
    const db = new Database(':memory:');
    const first = runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();

    expect(first.applied).toContain('0003-approval-policy-and-swarm-audit.sql');

    // Both new tables persist across re-run.
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('session_policies');
    expect(tableNames).toContain('orchestrator_swarm_audit');

    db.close();
  });
});
