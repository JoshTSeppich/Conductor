/**
 * MB-T13 WB2 — Probe 03: migration 0003 creates two indexes per Q-MBT13-5=b.
 *
 * Per Q-MBT13-5=b (operator-arbitrated 2026-05-06): orchestrator_swarm_audit
 * needs two indexes:
 *   - idx_swarm_audit_ts on (ts DESC) — last-N-rows global query
 *   - idx_swarm_audit_session_ts on (session_name, ts DESC) — per-session
 *     forensics query
 *
 * Mirrors the orchestrator_audit precedent (idx_audit_timestamp +
 * idx_audit_build_doc) from migration 0001.
 *
 * RED at WB2: migration absent; indexes don't exist.
 * GREEN at WB3: both indexes present in sqlite_master.
 */

import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../../../src/lifecycle/db.js';

describe('MB-T13 WB2 — probe-03 — migration 0003 creates swarm-audit indexes', () => {
  it('idx_swarm_audit_ts and idx_swarm_audit_session_ts exist after runMigrations', () => {
    const db = new Database(':memory:');
    runMigrations(db);

    const indexes = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type='index' AND tbl_name='orchestrator_swarm_audit'`,
      )
      .all() as { name: string }[];
    const indexNames = indexes.map((i) => i.name);

    expect(indexNames).toContain('idx_swarm_audit_ts');
    expect(indexNames).toContain('idx_swarm_audit_session_ts');

    db.close();
  });
});
