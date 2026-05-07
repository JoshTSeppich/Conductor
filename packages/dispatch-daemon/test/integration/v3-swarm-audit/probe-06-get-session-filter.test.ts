/**
 * MB-T13 WB4 — Probe 06: GET ?session_name=X filters to one session.
 *
 * Per Q-MBT13-5=b — idx_swarm_audit_session_ts on (session_name, ts DESC)
 * supports per-session forensics (operator wants to inspect action
 * history for a specific session that misbehaved).
 *
 * RED at WB4 pre-route: 404.
 * GREEN at WB4 post-route: filter returns only matching session rows.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB4 — probe-06 — GET ?session_name= filter', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  it('insert 5 rows across 2 sessions; GET ?session_name=A → only A rows', async () => {
    ts = await spawnTestServer();

    const insert = ts.db.prepare(
      `INSERT INTO orchestrator_swarm_audit
         (id, ts, session_name, action_type, intent_id, step, total_steps,
          approval_required, approval_status, payload_hash, result_status,
          operator_loop_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const rows = [
      ['2026-05-06T10:00:00.000Z', 'session-A'],
      ['2026-05-06T10:01:00.000Z', 'session-B'],
      ['2026-05-06T10:02:00.000Z', 'session-A'],
      ['2026-05-06T10:03:00.000Z', 'session-B'],
      ['2026-05-06T10:04:00.000Z', 'session-A'],
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

    const r = await fetch(
      `${ts.url}/v3/audit/swarm-audit?session_name=session-A`,
      { headers: { 'x-conductor-token': ts.token ?? '' } },
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      rows: Array<{ session_name: string }>;
      total: number;
    };
    expect(body.total).toBe(3);
    expect(body.rows.every((r) => r.session_name === 'session-A')).toBe(true);
  });
});
