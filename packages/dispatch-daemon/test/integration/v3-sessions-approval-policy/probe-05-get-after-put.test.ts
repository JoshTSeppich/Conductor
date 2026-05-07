/**
 * MB-T13 WB5 — Probe 05: GET after PUT returns the PUT value.
 *
 * Round-trip integration test — confirms PUT writes are observable to
 * subsequent GETs (transactional consistency at the better-sqlite3
 * layer; INSERT OR REPLACE is durable on commit).
 *
 * RED at WB5 pre-route: 404.
 * GREEN at WB5 post-route: GET surfaces the PUT-supplied policy.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB5 — probe-05 — GET after PUT round-trip', () => {
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

  it("PUT 'tight' then GET → returns 'tight' with the same updated_at", async () => {
    ts = await spawnTestServer();
    const r1 = await fetch(
      `${ts.url}/v3/sessions/test-session/approval-policy`,
      authedJson('PUT', { approval_policy: 'tight' }),
    );
    expect(r1.status).toBe(200);
    const putBody = (await r1.json()) as { updated_at: string };

    const r2 = await fetch(
      `${ts.url}/v3/sessions/test-session/approval-policy`,
      { headers: { 'x-conductor-token': ts.token ?? '' } },
    );
    expect(r2.status).toBe(200);
    const getBody = (await r2.json()) as {
      session_name: string;
      approval_policy: string;
      updated_at: string | null;
    };
    expect(getBody.session_name).toBe('test-session');
    expect(getBody.approval_policy).toBe('tight');
    expect(getBody.updated_at).toBe(putBody.updated_at);
  });

  it('multi-session: PUT on A then GET on B → B still default', async () => {
    ts = await spawnTestServer();
    await fetch(
      `${ts.url}/v3/sessions/session-A/approval-policy`,
      authedJson('PUT', { approval_policy: 'tight' }),
    );

    const rB = await fetch(
      `${ts.url}/v3/sessions/session-B/approval-policy`,
      { headers: { 'x-conductor-token': ts.token ?? '' } },
    );
    expect(rB.status).toBe(200);
    const bodyB = (await rB.json()) as {
      approval_policy: string;
      updated_at: string | null;
    };
    expect(bodyB.approval_policy).toBe('medium');
    expect(bodyB.updated_at).toBeNull();
  });
});
