/**
 * Z-3 daemon-side static-serve integration test.
 *
 * Operator-arbitrated §3.4 mechanical-translation carve-out
 * (this turn): Session B authors daemon-side @fastify/static
 * registration. Authority chain (for green commit body):
 *   - Operator §3.4 arbitration this cycle (Path 1b)
 *   - T18 HealthResponse extension precedent (first §3.4 carve-
 *     out exercise in Round 2)
 *   - DAEMON-S04 ADR (LaunchAgent + plist; daemon owns static-
 *     serve scope)
 *   - Existing startup.ts opts pattern (tokenPath, registryPath,
 *     archiveRoot precedent)
 *
 * Tests cover (4 declared):
 *   T1  GET /              → index.html (SPA root)
 *   T2  GET /assets/test.js → static asset content
 *   T3  GET /v2/health      → auth-bypass remains intact (regression
 *                              guard against static-serve registration
 *                              accidentally swallowing /v2/* paths)
 *   T4  GET /unknown-spa    → index.html (SPA fall-through for
 *                              client-routed paths like #session=…)
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
import {
  spawnTestServer,
  type TestServer,
} from '../fixtures/server.js';

const FIXTURE_INDEX_HTML =
  '<!doctype html><html><head><title>Fixture Conductor</title></head><body><div id="root"></div><script src="/assets/test.js"></script></body></html>';
const FIXTURE_ASSET_JS = "console.log('fixture-asset-loaded');";

let staticRoot: string;

beforeAll(async () => {
  // Build a fixture dist directory: <tempdir>/dist/index.html +
  // <tempdir>/dist/assets/test.js. Stand-in for the real
  // packages/dispatch-web/dist that production startup will point at.
  staticRoot = await mkdtemp(join(tmpdir(), 'fd-static-serve-'));
  await mkdir(join(staticRoot, 'assets'), { recursive: true });
  await writeFile(join(staticRoot, 'index.html'), FIXTURE_INDEX_HTML);
  await writeFile(join(staticRoot, 'assets', 'test.js'), FIXTURE_ASSET_JS);
});

afterAll(async () => {
  await rm(staticRoot, { recursive: true, force: true });
});

describe('Z-3 static-serve integration', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort */
      });
      ts = null;
    }
  });

  it('T1 GET / serves dispatch-web/dist/index.html', async () => {
    // Cast: red-phase shim. SpawnTestServerOpts gains staticRoot
    // in green; StartupOpts gains it in green. Cast bridges the
    // type gap so red compiles + fails at runtime (no static-serve
    // registered yet).
    ts = await spawnTestServer({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      staticRoot,
    } as any);
    const r = await fetch(`${ts.url}/`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toMatch(/text\/html/);
    const body = await r.text();
    expect(body).toContain('Fixture Conductor');
    expect(body).toContain('id="root"');
  });

  it('T2 GET /assets/test.js serves static asset', async () => {
    ts = await spawnTestServer({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      staticRoot,
    } as any);
    const r = await fetch(`${ts.url}/assets/test.js`);
    expect(r.status).toBe(200);
    const body = await r.text();
    expect(body).toContain('fixture-asset-loaded');
  });

  it('T3 GET /v2/health still works (auth-bypass preserved; static-serve does not swallow /v2/* paths)', async () => {
    ts = await spawnTestServer({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      staticRoot,
    } as any);
    // /v2/health is auth-bypass per existing T16 + auth.ts behavior.
    // Static-serve registration must not break this.
    const r = await fetch(`${ts.url}/v2/health`);
    expect(r.status).toBe(200);
    const json = (await r.json()) as { status: string };
    expect(json.status).toBe('ok');
  });

  it('T4 GET /unknown-spa-path falls through to index.html (SPA client-routed paths)', async () => {
    ts = await spawnTestServer({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      staticRoot,
    } as any);
    // SPA client routes (e.g., the URL-fragment focus path
    // /#session=sherpa) are served by the same index.html. The
    // fragment is client-only; the daemon must serve index.html
    // for any non-/v2/* + non-/assets/* GET path.
    const r = await fetch(`${ts.url}/some/spa/route`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toMatch(/text\/html/);
    const body = await r.text();
    expect(body).toContain('Fixture Conductor');
  });
});
