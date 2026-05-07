/**
 * MB-T13 WB4 — Probe 04: GET on empty audit table returns
 * { rows: [], total: 0 }.
 *
 * RED at WB4 pre-route: 404.
 * GREEN at WB4 post-route: 200 + empty result-set shape.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

describe('MB-T13 WB4 — probe-04 — GET empty audit table', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  it('GET /v3/audit/swarm-audit on empty table → { rows: [], total: 0 }', async () => {
    ts = await spawnTestServer();
    const r = await fetch(`${ts.url}/v3/audit/swarm-audit`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { rows: unknown[]; total: number };
    expect(body.rows).toEqual([]);
    expect(body.total).toBe(0);
  });
});
