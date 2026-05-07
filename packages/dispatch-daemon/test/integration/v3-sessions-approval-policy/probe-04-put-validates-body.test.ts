/**
 * MB-T13 WB5 — Probe 04: PUT validates body via Zod (422 on bad enum).
 *
 * Per Q-MBT13-2=a (TEXT enum + CHECK constraint at SQL): defense-in-depth.
 * Zod is the FIRST line of validation at the route boundary; if Zod
 * fails to reject (e.g., due to misconfiguration), the SQL CHECK
 * constraint catches it as a fallback. This probe verifies Zod is the
 * actual rejecting layer (422, not 500).
 *
 * RED at WB5 pre-route: 404.
 * GREEN at WB5 post-route: 422 with parse-error message.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB5 — probe-04 — PUT validates body (Zod 422)', () => {
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

  it("PUT { approval_policy: 'wrong' } → 422 (Zod-layer reject)", async () => {
    ts = await spawnTestServer();
    const r = await fetch(
      `${ts.url}/v3/sessions/test-session/approval-policy`,
      authedJson('PUT', { approval_policy: 'wrong' }),
    );
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error: string };
    expect(body.error.toLowerCase()).toContain('approval_policy');
  });

  it('PUT empty body → 422', async () => {
    ts = await spawnTestServer();
    const r = await fetch(
      `${ts.url}/v3/sessions/test-session/approval-policy`,
      authedJson('PUT', {}),
    );
    expect(r.status).toBe(422);
  });
});
