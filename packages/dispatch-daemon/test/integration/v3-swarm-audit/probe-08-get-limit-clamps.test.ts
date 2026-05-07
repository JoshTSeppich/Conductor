/**
 * MB-T13 WB4 — Probe 08: GET ?limit=999 clamps to HARD_LIMIT (100).
 *
 * Per Phase 2 brief WB4 probe-coverage block: caller passes limit=999
 * → route returns 100 rows (clamped to max). Implemented as
 * Math.min(parsed.limit, HARD_LIMIT) at the route layer, NOT as a Zod
 * .max(100) constraint (which would 422 the request instead of
 * clamping). Defense-in-depth: caller cannot DoS the daemon with
 * `LIMIT N` for arbitrarily large N.
 *
 * RED at WB4 pre-route: 404.
 * GREEN at WB4 post-route: 200 + 100 rows when limit=999 with 150
 * rows in the table.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB4 — probe-08 — GET ?limit clamps to 100 max', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  it('150 rows seeded; GET ?limit=999 → 100 rows (clamped)', async () => {
    ts = await spawnTestServer();

    const insert = ts.db.prepare(
      `INSERT INTO orchestrator_swarm_audit
         (id, ts, session_name, action_type, intent_id, step, total_steps,
          approval_required, approval_status, payload_hash, result_status,
          operator_loop_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (let i = 0; i < 150; i++) {
      const tsVal = new Date(Date.UTC(2026, 4, 6, 10, 0, i)).toISOString();
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

    const r = await fetch(`${ts.url}/v3/audit/swarm-audit?limit=999`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { rows: unknown[]; total: number };
    expect(body.total).toBe(100);
    expect(body.rows).toHaveLength(100);
  });
});
