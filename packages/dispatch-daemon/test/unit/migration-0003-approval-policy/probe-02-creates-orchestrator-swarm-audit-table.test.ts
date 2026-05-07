/**
 * MB-T13 WB2 — Probe 02: migration 0003 creates orchestrator_swarm_audit table.
 *
 * Verifies that after `runMigrations()`, the new `orchestrator_swarm_audit`
 * table exists with the full §3.8 field set per CONDUCTOR_V3_RESCOPE.md
 * verbatim — 12 columns total (id PK + 11 audit fields).
 *
 * Expected columns:
 *   - id TEXT PRIMARY KEY NOT NULL
 *   - ts TEXT NOT NULL
 *   - session_name TEXT NOT NULL
 *   - action_type TEXT NOT NULL
 *   - intent_id TEXT (nullable)
 *   - step INTEGER (nullable)
 *   - total_steps INTEGER (nullable)
 *   - approval_required INTEGER NOT NULL CHECK (0/1)
 *   - approval_status TEXT NOT NULL CHECK enum
 *   - payload_hash TEXT NOT NULL
 *   - result_status TEXT NOT NULL CHECK enum
 *   - operator_loop_state TEXT NOT NULL CHECK enum
 *
 * RED at WB2: migration file absent; table missing; assertions fail.
 * GREEN at WB3: migration ships; table exists with all 12 columns.
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

describe('MB-T13 WB2 — probe-02 — migration 0003 creates orchestrator_swarm_audit table', () => {
  it('orchestrator_swarm_audit table exists with 12 columns matching §3.8 schema', () => {
    const db = new Database(':memory:');
    runMigrations(db);

    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toContain('orchestrator_swarm_audit');

    const cols = db.pragma('table_info(orchestrator_swarm_audit)') as ColumnInfo[];
    const byName = new Map(cols.map((c) => [c.name, c]));

    // Required NOT NULL columns
    for (const required of [
      'id',
      'ts',
      'session_name',
      'action_type',
      'approval_required',
      'approval_status',
      'payload_hash',
      'result_status',
      'operator_loop_state',
    ]) {
      expect(byName.has(required)).toBe(true);
      expect(byName.get(required)?.notnull).toBe(1);
    }

    // Nullable columns (intent_id / step / total_steps for non-multi-step actions)
    for (const nullable of ['intent_id', 'step', 'total_steps']) {
      expect(byName.has(nullable)).toBe(true);
      expect(byName.get(nullable)?.notnull).toBe(0);
    }

    // PK on id
    expect(byName.get('id')?.pk).toBe(1);

    // Numeric columns
    expect(byName.get('step')?.type).toBe('INTEGER');
    expect(byName.get('total_steps')?.type).toBe('INTEGER');
    expect(byName.get('approval_required')?.type).toBe('INTEGER');

    // TEXT columns
    expect(byName.get('id')?.type).toBe('TEXT');
    expect(byName.get('ts')?.type).toBe('TEXT');
    expect(byName.get('session_name')?.type).toBe('TEXT');
    expect(byName.get('action_type')?.type).toBe('TEXT');
    expect(byName.get('intent_id')?.type).toBe('TEXT');
    expect(byName.get('approval_status')?.type).toBe('TEXT');
    expect(byName.get('payload_hash')?.type).toBe('TEXT');
    expect(byName.get('result_status')?.type).toBe('TEXT');
    expect(byName.get('operator_loop_state')?.type).toBe('TEXT');

    expect(cols).toHaveLength(12);

    db.close();
  });
});
