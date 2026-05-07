/**
 * MB-T13 WB2 — Probe 01: migration 0003 creates session_policies table.
 *
 * Verifies that after `runMigrations()` against a fresh :memory: DB, the
 * new `session_policies` table exists with the expected column shape per
 * Q-MBT13-1=a (new SQLite table; coexists with sessions.json) +
 * Q-MBT13-2=a (TEXT enum + CHECK constraint) + Q-MBT13-4=c (SQL DEFAULT).
 *
 * Expected columns:
 *   - session_name TEXT PRIMARY KEY NOT NULL
 *   - approval_policy TEXT NOT NULL DEFAULT 'medium' CHECK enum
 *   - updated_at TEXT NOT NULL DEFAULT datetime('now')
 *
 * RED at WB2: migrations/0003-approval-policy-and-swarm-audit.sql does
 * not yet exist; runMigrations applies only 0001 + 0002, so
 * session_policies table is absent. sqlite_master query returns no row;
 * column-shape assertions fail.
 *
 * GREEN at WB3: migration file ships; table exists with correct shape.
 */

import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../../../src/lifecycle/db.js';

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

describe('MB-T13 WB2 — probe-01 — migration 0003 creates session_policies table', () => {
  it('session_policies table exists after runMigrations with PK + columns + DEFAULT', () => {
    const db = new Database(':memory:');
    runMigrations(db);

    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('session_policies');

    const cols = db.pragma('table_info(session_policies)') as ColumnInfo[];
    const byName = new Map(cols.map((c) => [c.name, c]));

    expect(byName.has('session_name')).toBe(true);
    expect(byName.get('session_name')?.type).toBe('TEXT');
    expect(byName.get('session_name')?.pk).toBe(1);
    expect(byName.get('session_name')?.notnull).toBe(1);

    expect(byName.has('approval_policy')).toBe(true);
    expect(byName.get('approval_policy')?.type).toBe('TEXT');
    expect(byName.get('approval_policy')?.notnull).toBe(1);
    expect(byName.get('approval_policy')?.dflt_value).toMatch(/'medium'/);

    expect(byName.has('updated_at')).toBe(true);
    expect(byName.get('updated_at')?.type).toBe('TEXT');
    expect(byName.get('updated_at')?.notnull).toBe(1);

    db.close();
  });
});
