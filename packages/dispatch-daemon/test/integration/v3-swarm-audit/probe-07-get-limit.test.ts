/**
 * MB-T13 WB4 — Probe 07: GET respects ?limit param within bounds.
 *
 * Per Q-MBT13-9=a (LIMIT 100 default at v3.0): caller may pass a smaller
 * limit; route returns exactly that many rows. Caller may also omit the
 * limit, in which case the default 100 applies.
 *
 * RED at WB4 pre-route: 404.
 * GREEN at WB4 post-route: ?limit=10 → 10 rows; default → 100 rows.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB4 — probe-07 — GET ?limit honored within bounds', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  function seed150Rows(): void {
    if (!ts) throw new Error('ts not initialized');
    const insert = ts.db.prepare(
      `INSERT INTO orchestrator_swarm_audit
         (id, ts, session_name, action_type, intent_id, step, total_steps,
          approval_required, approval_status, payload_hash, result_status,
          operator_loop_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    // Seed 150 rows with monotonically increasing ts (1-second spacing).
    for (let i = 0; i < 150; i++) {
      const ms = i * 1000;
      const tsVal = new Date(Date.UTC(2026, 4, 6, 10, 0, ms / 1000)).toISOString();
      insert.run(
        randomUUID(),
        tsVal,
        'test-session',
        'send',
        null,
        null,
        null,
        0,
        'not-required',
        'a'.repeat(64),
        'fired',
        'manual',
      );
    }
  }

  it('150 rows seeded; GET (no limit) → 100 rows (default)', async () => {
    ts = await spawnTestServer();
    seed150Rows();

    const r = await fetch(`${ts.url}/v3/audit/swarm-audit`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { rows: unknown[]; total: number };
    expect(body.total).toBe(100);
    expect(body.rows).toHaveLength(100);
  });

  it('150 rows seeded; GET ?limit=10 → 10 rows', async () => {
    ts = await spawnTestServer();
    seed150Rows();

    const r = await fetch(`${ts.url}/v3/audit/swarm-audit?limit=10`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { rows: unknown[]; total: number };
    expect(body.total).toBe(10);
    expect(body.rows).toHaveLength(10);
  });
});
