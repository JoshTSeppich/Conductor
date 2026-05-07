/**
 * MB-T13 WB5 — Probe 03: PUT updates an existing row (INSERT OR REPLACE).
 *
 * Per CONDUCTOR_V3_RESCOPE.md §3.2 ("Changes apply immediately"): operator
 * can flip a session's policy mid-flight. PUT 'tight' followed by PUT
 * 'loose' should leave the row at 'loose' with a fresh updated_at
 * timestamp (advanced relative to the first PUT).
 *
 * RED at WB5 pre-route: 404.
 * GREEN at WB5 post-route: row reflects last-PUT value + advanced
 * timestamp.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB5 — probe-03 — PUT updates existing row', () => {
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

  it("PUT 'tight' then PUT 'loose' → row holds 'loose' + advanced updated_at", async () => {
    ts = await spawnTestServer();
    const r1 = await fetch(
      `${ts.url}/v3/sessions/test-session/approval-policy`,
      authedJson('PUT', { approval_policy: 'tight' }),
    );
    expect(r1.status).toBe(200);
    const body1 = (await r1.json()) as { updated_at: string };

    // Tiny delay to ensure ISO timestamp advances by at least 1ms; ms-
    // resolution Date.now() ticks reliably above 1ms in vitest.
    await new Promise((resolve) => setTimeout(resolve, 5));

    const r2 = await fetch(
      `${ts.url}/v3/sessions/test-session/approval-policy`,
      authedJson('PUT', { approval_policy: 'loose' }),
    );
    expect(r2.status).toBe(200);
    const body2 = (await r2.json()) as {
      session_name: string;
      approval_policy: string;
      updated_at: string;
    };
    expect(body2.approval_policy).toBe('loose');
    expect(body2.updated_at > body1.updated_at).toBe(true);

    // Single row only (INSERT OR REPLACE preserves the PK).
    const count = (ts.db
      .prepare(`SELECT COUNT(*) as c FROM session_policies`)
      .get() as { c: number }).c;
    expect(count).toBe(1);
  });
});
