/**
 * MB-T13 WB4 — Probe 02: POST validates body via Zod (422 on missing field).
 *
 * Verifies the route returns 422 when a required field is missing from
 * the POST body. Zod safeParse failure → reply.code(422).send({error}).
 *
 * RED at WB4 pre-route: 404 (route absent).
 * GREEN at WB4 post-route: 422 with parse-error message.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB4 — probe-02 — POST validates body (Zod 422)', () => {
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

  it('POST with missing session_name field → 422', async () => {
    ts = await spawnTestServer();
    const malformed = {
      ts: '2026-05-06T10:00:00.000Z',
      // session_name omitted on purpose
      action_type: 'send',
      intent_id: null,
      step: null,
      total_steps: null,
      approval_required: false,
      approval_status: 'not-required',
      payload_hash: 'a'.repeat(64),
      result_status: 'fired',
      operator_loop_state: 'manual',
    };
    const r = await fetch(
      `${ts.url}/v3/audit/swarm-audit`,
      authedJson('POST', malformed),
    );
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error: string };
    expect(body.error).toBeTruthy();
    expect(body.error.toLowerCase()).toContain('session_name');
  });

  it('POST with empty body → 422', async () => {
    ts = await spawnTestServer();
    const r = await fetch(
      `${ts.url}/v3/audit/swarm-audit`,
      authedJson('POST', {}),
    );
    expect(r.status).toBe(422);
  });

  it('POST with malformed payload_hash (not 64-char hex) → 422', async () => {
    ts = await spawnTestServer();
    const malformed = {
      ts: '2026-05-06T10:00:00.000Z',
      session_name: 'test-session',
      action_type: 'send',
      intent_id: null,
      step: null,
      total_steps: null,
      approval_required: false,
      approval_status: 'not-required',
      payload_hash: 'not-a-real-hash',
      result_status: 'fired',
      operator_loop_state: 'manual',
    };
    const r = await fetch(
      `${ts.url}/v3/audit/swarm-audit`,
      authedJson('POST', malformed),
    );
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error: string };
    expect(body.error.toLowerCase()).toContain('payload_hash');
  });
});
