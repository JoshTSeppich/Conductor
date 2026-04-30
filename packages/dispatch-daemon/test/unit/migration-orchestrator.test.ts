/**
 * COARCH-T01 sub-task B1+B2 — orchestrator SQLite migration runner.
 *
 * Per WORKSTATION_CONTRACT.md §8.1 (amended at 7fd48e4): three new tables
 * ship via CREATE TABLE IF NOT EXISTS — `orchestrator_messages`,
 * `orchestrator_audit`, `orchestrator_ticket_state`. The runner is wired
 * into daemon startup at lifecycle/startup.ts and exercised by the
 * production data.db at `~/.foxworks-dispatch/data.db`.
 *
 * Probes (4):
 *   P1  Fresh :memory: DB + runMigrations() creates the three tables.
 *   P2  Re-running runMigrations() on the same DB is a no-op (the
 *       additive-only model in §8.1 — CREATE TABLE IF NOT EXISTS).
 *   P3  orchestrator_ticket_state PRIMARY KEY (ticket_id, build_doc_id)
 *       enforces uniqueness; INSERT OR REPLACE upsert collapses repeated
 *       writes for the same (ticket_id, build_doc_id) pair while
 *       preserving distinct pairs (per ratified MB-S03 §6).
 *   P4  Migration list reports the actual filenames applied (so future
 *       additions show up in audit/log without code changes).
 *
 * RED state: the runner module at `src/lifecycle/db.ts` does not yet
 * exist; vitest reports "Cannot find module" at import resolution. B2's
 * green commit lands the runner + the migration SQL at
 * `migrations/0001-orchestrator-tables.sql`.
 */

import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/lifecycle/db.js';

describe('COARCH-T01 B1+B2 — orchestrator SQLite migration runner', () => {
  it('P1 fresh :memory: DB + runMigrations() creates the three tables', () => {
    const db = new Database(':memory:');
    const result = runMigrations(db);

    expect(result.applied).toContain('0001-orchestrator-tables.sql');

    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
      )
      .all() as { name: string }[];
    const userTables = tables
      .map((t) => t.name)
      .filter((n) => !n.startsWith('sqlite_'));
    expect(userTables).toEqual([
      'orchestrator_audit',
      'orchestrator_messages',
      'orchestrator_ticket_state',
    ]);
    db.close();
  });

  it('P2 re-running runMigrations() is idempotent (CREATE TABLE IF NOT EXISTS)', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
    const userTables = (
      db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
        )
        .all() as { name: string }[]
    )
      .map((t) => t.name)
      .filter((n) => !n.startsWith('sqlite_'));
    expect(userTables.length).toBe(3);
    db.close();
  });

  it('P3 orchestrator_ticket_state composite PK + INSERT OR REPLACE upsert', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO orchestrator_ticket_state
        (ticket_id, build_doc_id, state, state_updated_at, superseded_by_ticket_id)
       VALUES (?, ?, ?, ?, ?)`,
    );
    stmt.run('MB-T05', 'b1', 'pending', '2026-04-30T00:00:00Z', null);
    stmt.run('MB-T05', 'b1', 'in-progress', '2026-04-30T00:01:00Z', null);
    stmt.run('MB-T05', 'b1', 'complete', '2026-04-30T00:02:00Z', null);
    stmt.run('MB-T05', 'b2', 'pending', '2026-04-30T00:03:00Z', null);

    const rows = db
      .prepare(
        `SELECT ticket_id, build_doc_id, state FROM orchestrator_ticket_state
         ORDER BY build_doc_id`,
      )
      .all() as { ticket_id: string; build_doc_id: string; state: string }[];

    expect(rows).toHaveLength(2);
    expect(rows[0].state).toBe('complete');
    expect(rows[0].build_doc_id).toBe('b1');
    expect(rows[1].build_doc_id).toBe('b2');
    expect(rows[1].state).toBe('pending');
    db.close();
  });

  it('P4 result.applied lists migration filenames in alpha order', () => {
    const db = new Database(':memory:');
    const result = runMigrations(db);
    expect(Array.isArray(result.applied)).toBe(true);
    const sorted = [...result.applied].sort();
    expect(result.applied).toEqual(sorted);
    expect(result.applied[0]).toMatch(/^0001-/);
    db.close();
  });
});
