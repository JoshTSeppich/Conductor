/**
 * COARCH-T01 sub-task A2 — error-handler 404 coverage for /v3/* paths.
 *
 * Per MB-S03 ADR §3.2 (and probe P8 evidence): the current setNotFoundHandler
 * at `lifecycle/error-handler.ts:62` falls through to SPA `index.html` for
 * any non-`/v2/*` GET when staticRoot is set. Today that means an unmatched
 * `/v3/*` GET (typo in the URL, route not yet registered, etc.) returns the
 * SPA bundle with HTTP 200 instead of `{"error": "Not found"}` JSON 404.
 *
 * The fix is to extend the SPA fall-through path-check so it also excludes
 * `/v3/*`. Both API surfaces share JSON 404 semantics per CONDUCTOR_API_CONTRACT.md
 * §10.4 outcome-classification model.
 *
 * Probes (3):
 *   P1  GET /v3/unmapped/path with valid token + staticRoot set →
 *       404 + JSON `{"error": "Not found"}`.
 *       (RED against current code: SPA fall-through fires → 200 + HTML.)
 *   P2  GET /v3/orchestrator/typo with valid token + staticRoot set →
 *       same 404 JSON shape (verifies the gate covers ALL /v3/* prefixes,
 *       not just /v3/<single-segment>).
 *       (RED against current code.)
 *   P3  GET / with staticRoot set → still serves index.html (regression
 *       guard: the patch must NOT break the SPA fall-through for non-API
 *       paths).
 *
 * Naming follows existing daemon convention `<feature>.test.ts`. Static
 * fixture pattern matches static-serve.test.ts.
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';

const FIXTURE_INDEX_HTML =
  '<!doctype html><html><head><title>Fixture Conductor</title></head><body>SPA</body></html>';

let staticRoot: string;

beforeAll(async () => {
  staticRoot = await mkdtemp(join(tmpdir(), 'fd-coarch-t01-a2-'));
  await mkdir(join(staticRoot, 'assets'), { recursive: true });
  await writeFile(join(staticRoot, 'index.html'), FIXTURE_INDEX_HTML);
});

afterAll(async () => {
  await rm(staticRoot, { recursive: true, force: true });
});

describe('COARCH-T01 A2 — 404 handler returns JSON for unmatched /v3/*', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort cleanup */
      });
      ts = null;
    }
  });

  it('P1 GET /v3/unmapped/path with token → 404 + JSON error (no SPA fall-through)', async () => {
    ts = await spawnTestServer({ staticRoot });
    const r = await fetch(`${ts.url}/v3/unmapped/path`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    expect(r.status).toBe(404);
    const ct = r.headers.get('content-type') ?? '';
    expect(ct).toMatch(/application\/json/);
    const body = (await r.json()) as { error?: unknown };
    expect(body.error).toBe('Not found');
  });

  it('P2 GET /v3/orchestrator/typo with token → 404 + JSON error', async () => {
    ts = await spawnTestServer({ staticRoot });
    const r = await fetch(`${ts.url}/v3/orchestrator/typo`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    expect(r.status).toBe(404);
    const ct = r.headers.get('content-type') ?? '';
    expect(ct).toMatch(/application\/json/);
    const body = (await r.json()) as { error?: unknown };
    expect(body.error).toBe('Not found');
  });

  it('P3 GET / still serves SPA index.html (regression guard)', async () => {
    ts = await spawnTestServer({ staticRoot });
    const r = await fetch(`${ts.url}/`);
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).toContain('SPA');
  });
});
