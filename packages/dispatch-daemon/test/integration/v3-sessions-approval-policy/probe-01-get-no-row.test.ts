/**
 * MB-T13 WB5 — Probe 01: GET on a session never PUT returns the
 * structural default ('medium') with updated_at: null.
 *
 * Per Q-MBT13-4=c (defense-in-depth): SQL DEFAULT 'medium' protects
 * INSERT-without-policy paths; workstation-side resolver fallback
 * defaults to 'medium' on no-row. The route ALSO returns 'medium'
 * with updated_at: null, so all three layers converge on the same
 * default semantic.
 *
 * RED at WB5 pre-route: 404 (route absent).
 * GREEN at WB5 post-route: 200 + {session_name, 'medium', null}.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB5 — probe-01 — GET on session never PUT', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  it('GET /v3/sessions/test-session/approval-policy → medium + null updated_at', async () => {
    ts = await spawnTestServer();
    const r = await fetch(
      `${ts.url}/v3/sessions/test-session/approval-policy`,
      { headers: { 'x-conductor-token': ts.token ?? '' } },
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      session_name: string;
      approval_policy: string;
      updated_at: string | null;
    };
    expect(body.session_name).toBe('test-session');
    expect(body.approval_policy).toBe('medium');
    expect(body.updated_at).toBeNull();
  });
});
