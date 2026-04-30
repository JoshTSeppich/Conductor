/**
 * COARCH-T01 sub-task A1 — auth hook coverage for /v3/* paths.
 *
 * Per MB-S03 ADR §3.1 (and probe P7 evidence): the current auth hook at
 * `lifecycle/auth.ts:88` bypasses any path that does NOT start with
 * `/v2/`. Today that means `/v3/*` traffic skips the X-Conductor-Token
 * header check entirely — a regression once `/v3/*` ships.
 *
 * The fix is to extend the bypass condition so it gates `/v3/*` exactly
 * the same way it gates `/v2/*`. Static-serve (Z-3) bypass remains for
 * non-API paths only.
 *
 * Probes (3):
 *   P1  /v3/* without X-Conductor-Token → 401 + JSON error body.
 *       (RED against pre-A1 code: bypass would let the route handler
 *       respond instead of the auth hook short-circuiting.)
 *   P2  /v3/* with WRONG token → 401.
 *       (RED against pre-A1 code: same reason — hook never fires.)
 *   P3  /v3/* with CORRECT token → route handler runs (200 with the
 *       real GET /v3/orchestrator/history shape on empty DB).
 *
 * Originally used a `beforeListen` stub route; once the real
 * GET /v3/orchestrator/history landed at B6 (commit 8f68572), the stub
 * collided with Fastify's "method already declared" guard. Test now
 * exercises the real route + auth hook composition, which is closer to
 * production reality anyway.
 *
 * Naming follows existing daemon convention `<feature>.test.ts`. Test
 * uses the same spawnTestServer fixture pattern as auth.test.ts.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';

describe('COARCH-T01 A1 — auth hook gates /v3/* paths', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort cleanup */
      });
      ts = null;
    }
  });

  async function mkTokenPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-coarch-t01-a1-'));
    return join(dir, 'token');
  }

  it('P1 /v3/orchestrator/history without X-Conductor-Token → 401 + JSON error', async () => {
    ts = await spawnTestServer({ tokenPath: await mkTokenPath() });
    const r = await fetch(`${ts.url}/v3/orchestrator/history`);
    expect(r.status).toBe(401);
    const body = (await r.json()) as { error?: unknown };
    expect(typeof body.error).toBe('string');
  });

  it('P2 /v3/orchestrator/history with WRONG token → 401', async () => {
    ts = await spawnTestServer({ tokenPath: await mkTokenPath() });
    const r = await fetch(`${ts.url}/v3/orchestrator/history`, {
      headers: { 'x-conductor-token': 'wrong-token-bogus' },
    });
    expect(r.status).toBe(401);
  });

  it('P3 /v3/orchestrator/history with CORRECT token → route runs (200)', async () => {
    ts = await spawnTestServer({ tokenPath: await mkTokenPath() });
    const r = await fetch(`${ts.url}/v3/orchestrator/history`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { messages: unknown[]; next_before_id: unknown };
    expect(body.messages).toEqual([]);
    expect(body.next_before_id).toBeNull();
  });
});
