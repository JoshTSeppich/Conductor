/**
 * CONSOLE-T01 cluster 1 — cc_console_buffer SQLite migration.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7.1 (Ring buffer storage): per-session
 * daemon-side ring buffer for STDOUT lines, default 50,000 lines. Backed
 * by the cc_console_buffer SQLite table; DDL ships in CONSOLE-T01 per
 * §4.7.7. Eviction is FIFO; eviction-window gaps surface to subscribers
 * via the WS backfill protocol (§4.7.3).
 *
 * RED state pre-cluster-1: the migration file
 * `migrations/0002-cc-console-buffer.sql` does not exist yet; runMigrations
 * applies only `0001-orchestrator-tables.sql` so cc_console_buffer is
 * absent from sqlite_master. Probes P1 + P2 fail as expected; P3 fails
 * because the prune helper module hasn't been written.
 */

import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/lifecycle/db.js';
import { pruneToCapacity } from '../../src/console/buffer.js';

describe('CONSOLE-T01 cluster 1 — cc_console_buffer migration', () => {
  it('P1 fresh :memory: DB + runMigrations() creates cc_console_buffer with the §4.7 column set', () => {
    const db = new Database(':memory:');
    runMigrations(db);

    // Migration list now contains the new file.
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
      .all() as { name: string }[];
    const userTables = tables.map((t) => t.name).filter((n) => !n.startsWith('sqlite_'));
    expect(userTables).toContain('cc_console_buffer');

    // Column shape per operator-specified test spec:
    // {session_name TEXT, stdout_seq INTEGER, bytes BLOB, encoding TEXT, ts INTEGER}.
    type ColInfo = { name: string; type: string; pk: number };
    const columns = db
      .prepare(`PRAGMA table_info(cc_console_buffer)`)
      .all() as ColInfo[];
    const byName: Record<string, ColInfo> = {};
    for (const c of columns) byName[c.name] = c;

    expect(byName.session_name?.type).toBe('TEXT');
    expect(byName.stdout_seq?.type).toBe('INTEGER');
    expect(byName.bytes?.type).toBe('BLOB');
    expect(byName.encoding?.type).toBe('TEXT');
    expect(byName.ts?.type).toBe('INTEGER');

    // PRIMARY KEY is the (session_name, stdout_seq) composite per §4.7.1
    // sequence-number space + ring-buffer storage. SQLite reports pk
    // ordinal 1+2 for composite PK columns.
    expect(byName.session_name?.pk).toBeGreaterThan(0);
    expect(byName.stdout_seq?.pk).toBeGreaterThan(0);

    // Auto-index on the PK satisfies the operator's "indexed on
    // (session_name, stdout_seq)" requirement; assert the index list
    // contains an entry covering both columns.
    type IndexInfo = { name: string };
    const indexes = db
      .prepare(`PRAGMA index_list(cc_console_buffer)`)
      .all() as IndexInfo[];
    expect(indexes.length).toBeGreaterThan(0);
    // At least one index covers the composite (session_name, stdout_seq)
    // — either the PK auto-index or the explicit idx_cc_console_buffer_*.
    const indexCoversComposite = indexes.some((idx) => {
      const cols = db
        .prepare(`PRAGMA index_info(${idx.name})`)
        .all() as { name: string }[];
      const colNames = cols.map((c) => c.name);
      return colNames.includes('session_name') && colNames.includes('stdout_seq');
    });
    expect(indexCoversComposite).toBe(true);

    db.close();
  });

  it('P2 re-running runMigrations() is idempotent (CREATE TABLE IF NOT EXISTS)', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
    const userTables = (
      db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
        .all() as { name: string }[]
    )
      .map((t) => t.name)
      .filter((n) => !n.startsWith('sqlite_'));
    // Migrations are additive (db.ts §8.1), so later migrations add tables.
    // Assert the floor this test cares about, as migration-orchestrator.test.ts does.
    expect(userTables.length).toBeGreaterThanOrEqual(4);
    expect(userTables).toContain('cc_console_buffer');
    db.close();
  });

  it('P3 ring eviction: insert 600 rows, prune to capacity 500 → oldest 100 evicted, FIFO preserved', () => {
    const db = new Database(':memory:');
    runMigrations(db);

    const insert = db.prepare(
      `INSERT INTO cc_console_buffer (session_name, stdout_seq, bytes, encoding, ts)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const now = Date.now();
    for (let i = 1; i <= 600; i++) {
      insert.run('test-session', i, Buffer.from(`line_${i}`, 'utf8'), 'utf8', now + i);
    }

    const pre = db
      .prepare(`SELECT COUNT(*) as c FROM cc_console_buffer WHERE session_name = ?`)
      .get('test-session') as { c: number };
    expect(pre.c).toBe(600);

    const evicted = pruneToCapacity(db, 'test-session', 500);
    expect(evicted).toBe(100);

    const post = db
      .prepare(`SELECT COUNT(*) as c FROM cc_console_buffer WHERE session_name = ?`)
      .get('test-session') as { c: number };
    expect(post.c).toBe(500);

    // FIFO: lowest-stdout_seq rows evicted. Newest 500 (seqs 101..600) kept.
    const range = db
      .prepare(
        `SELECT MIN(stdout_seq) as mn, MAX(stdout_seq) as mx
         FROM cc_console_buffer WHERE session_name = ?`,
      )
      .get('test-session') as { mn: number; mx: number };
    expect(range.mn).toBe(101);
    expect(range.mx).toBe(600);

    db.close();
  });

  it('P4 ring eviction is per-session: pruning session A does not touch session B', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const insert = db.prepare(
      `INSERT INTO cc_console_buffer (session_name, stdout_seq, bytes, encoding, ts)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const now = Date.now();
    for (let i = 1; i <= 200; i++) {
      insert.run('a', i, Buffer.from(`a_${i}`), 'utf8', now + i);
      insert.run('b', i, Buffer.from(`b_${i}`), 'utf8', now + i);
    }

    pruneToCapacity(db, 'a', 50);

    const aCount = (
      db.prepare(`SELECT COUNT(*) as c FROM cc_console_buffer WHERE session_name = 'a'`)
        .get() as { c: number }
    ).c;
    const bCount = (
      db.prepare(`SELECT COUNT(*) as c FROM cc_console_buffer WHERE session_name = 'b'`)
        .get() as { c: number }
    ).c;
    expect(aCount).toBe(50);
    expect(bCount).toBe(200);

    db.close();
  });
});
