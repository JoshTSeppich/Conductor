/**
 * MB-T13 WB4 — Probe 05: GET returns rows ORDER BY ts DESC.
 *
 * Per Q-MBT13-9=a (LIMIT 100 ORDER BY ts DESC at v3.0): newest-first
 * is the canonical order for the "Show recent orchestrator actions"
 * modal. This probe inserts 3 rows with distinct timestamps and
 * verifies the response order matches descending ts.
 *
 * RED at WB4 pre-route: 404.
 * GREEN at WB4 post-route: 3 rows returned, newest-first.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB4 — probe-05 — GET returns rows ORDER BY ts DESC', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  it('insert 3 rows; GET → 3 rows, newest-ts first', async () => {
    ts = await spawnTestServer();

    // Direct DB-handle insert is faster than 3 HTTP POSTs and exercises
    // the same persistence layer the route reads from.
    const insert = ts.db.prepare(
      `INSERT INTO orchestrator_swarm_audit
         (id, ts, session_name, action_type, intent_id, step, total_steps,
          approval_required, approval_status, payload_hash, result_status,
          operator_loop_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const rows = [
      ['2026-05-06T10:00:00.000Z', 'session-A'],
      ['2026-05-06T11:00:00.000Z', 'session-A'],
      ['2026-05-06T09:00:00.000Z', 'session-A'],
    ] as const;
    for (const [tsVal, sessionName] of rows) {
      insert.run(
        randomUUID(),
        tsVal,
        sessionName,
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

    const r = await fetch(`${ts.url}/v3/audit/swarm-audit`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      rows: Array<{ ts: string; session_name: string; approval_required: boolean }>;
      total: number;
    };
    expect(body.total).toBe(3);
    expect(body.rows.map((r) => r.ts)).toEqual([
      '2026-05-06T11:00:00.000Z',
      '2026-05-06T10:00:00.000Z',
      '2026-05-06T09:00:00.000Z',
    ]);
    // INTEGER 0 in SQLite decoded back to boolean false at the wire
    expect(body.rows[0].approval_required).toBe(false);
  });
});
