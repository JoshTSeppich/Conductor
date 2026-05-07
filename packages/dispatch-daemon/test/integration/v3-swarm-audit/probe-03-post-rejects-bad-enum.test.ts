/**
 * MB-T13 WB4 — Probe 03: POST rejects out-of-enum action_type at the
 * Zod boundary (NOT at the SQL CHECK boundary — see migration 0003 SQL
 * file: `action_type TEXT NOT NULL` has NO CHECK constraint, matching
 * the existing orchestrator_audit.output_type pattern; enum membership
 * is enforced at the route layer by ApprovalActionTypeEnum.parse).
 *
 * This probe confirms that Zod is the layer rejecting the bad enum,
 * surfacing as 422 (not 500 — a 500 would mean Zod missed it and the
 * SQL CHECK fired, which would indicate misconfiguration).
 *
 * RED at WB4 pre-route: 404.
 * GREEN at WB4 post-route: 422 (Zod rejects 'wrong' before reaching SQL).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB4 — probe-03 — POST rejects bad action_type at Zod', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  function authedJson(method: string, body?: unknown): RequestInit {
    return {
      method,
      headers: {
        'x-conductor-token': ts?.token ?? '',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };
  }

  it("POST with action_type='wrong' → 422 (Zod-layer reject; not 500 from SQL)", async () => {
    ts = await spawnTestServer();
    const r = await fetch(
      `${ts.url}/v3/audit/swarm-audit`,
      authedJson('POST', {
        ts: '2026-05-06T10:00:00.000Z',
        session_name: 'test-session',
        action_type: 'wrong',
        intent_id: null,
        step: null,
        total_steps: null,
        approval_required: false,
        approval_status: 'not-required',
        payload_hash: 'a'.repeat(64),
        result_status: 'fired',
        operator_loop_state: 'manual',
      }),
    );
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error: string };
    expect(body.error.toLowerCase()).toContain('action_type');
  });

  it('POST with each valid action_type succeeds', async () => {
    ts = await spawnTestServer();
    const validTypes = [
      'send',
      'spawn-new-session',
      'kill',
      'pull',
      'assign-task',
    ] as const;
    for (const action_type of validTypes) {
      const r = await fetch(
        `${ts.url}/v3/audit/swarm-audit`,
        authedJson('POST', {
          ts: '2026-05-06T10:00:00.000Z',
          session_name: `test-${action_type}`,
          action_type,
          intent_id: null,
          step: null,
          total_steps: null,
          approval_required: false,
          approval_status: 'not-required',
          payload_hash: 'a'.repeat(64),
          result_status: 'fired',
          operator_loop_state: 'manual',
        }),
      );
      expect(r.status).toBe(201);
    }
  });
});
