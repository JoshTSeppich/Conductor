/**
 * MB-T13 WB5 — Probe 02: PUT creates a session_policies row.
 *
 * Verifies that PUT with a valid body creates a row with the specified
 * approval_policy + a server-assigned updated_at (ISO-8601 with
 * milliseconds + Z suffix; matches z.string().datetime() at the
 * GET response schema).
 *
 * RED at WB5 pre-route: 404.
 * GREEN at WB5 post-route: 200 + persisted row + DB row exists.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB5 — probe-02 — PUT creates row', () => {
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

  it("PUT 'tight' on a fresh session creates a row with that policy", async () => {
    ts = await spawnTestServer();
    const r = await fetch(
      `${ts.url}/v3/sessions/test-session/approval-policy`,
      authedJson('PUT', { approval_policy: 'tight' }),
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      session_name: string;
      approval_policy: string;
      updated_at: string;
    };
    expect(body.session_name).toBe('test-session');
    expect(body.approval_policy).toBe('tight');
    // ISO-8601 with milliseconds + Z (matches z.string().datetime())
    expect(body.updated_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );

    // Direct DB inspection confirms the upsert landed.
    const row = ts.db
      .prepare(
        `SELECT session_name, approval_policy, updated_at FROM session_policies
         WHERE session_name = ?`,
      )
      .get('test-session') as
      | { session_name: string; approval_policy: string; updated_at: string }
      | undefined;
    expect(row).toBeDefined();
    expect(row?.approval_policy).toBe('tight');
    expect(row?.updated_at).toBe(body.updated_at);
  });
});
