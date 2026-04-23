/**
 * DAEMON-T04 — error handler + 404 default tests.
 *
 * Customizes Fastify's default error and not-found response shapes
 * to the contract-compliant `{"error": "<message>"}` JSON form per
 * DAEMON-S05 ADR. Stack traces stay in Pino logs only.
 *
 * Probes (6 total):
 *   P1  Unknown route → 404 + {"error": "Not found"}
 *   P2  Route throws Error with statusCode:422 → 422 + {"error": "<msg>"}
 *   P3  Route throws Error with no statusCode → 500 + {"error": "<msg>"}
 *   P4  Response body for thrown Error has NO stack / NO trace field;
 *       body keys equal exactly ['error']
 *   P5  Route throws non-Error (bare string) → 500 JSON, daemon
 *       does not crash
 *   P6  Every error response has Content-Type: application/json
 *
 * Green note (commit-body companion): registerErrorHandler is called
 * internally by startup(). Fastify 5 rejects setErrorHandler and
 * route registration after listen(), so throwing routes are
 * registered via the `beforeListen` opt on spawnTestServer, added
 * in DAEMON-T04 green as the pivot from the red's contingency
 * ("if Fastify rejects post-listen registration, extend startup
 * with beforeListen"). Pivot landed; tests now use the hook.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';

describe('DAEMON-T04 — error handler + 404 default', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort */
      });
      ts = null;
    }
  });

  async function mkTokenPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-t04-'));
    return join(dir, 'token');
  }

  function authHeaders(token: string | undefined): Record<string, string> {
    return { 'x-conductor-token': token ?? '' };
  }

  it('P1 unknown route → 404 + {"error": "Not found"}', async () => {
    ts = await spawnTestServer({ tokenPath: await mkTokenPath() });
    const r = await fetch(`${ts.url}/nowhere`, { headers: authHeaders(ts.token) });
    expect(r.status).toBe(404);
    const body = (await r.json()) as Record<string, unknown>;
    expect(body).toEqual({ error: 'Not found' });
  });

  it('P2 Error with statusCode:422 → 422 + {"error": "<msg>"}', async () => {
    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      beforeListen: (app) => {
        app.get('/throws-422', async () => {
          const err = new Error('bad input') as Error & { statusCode?: number };
          err.statusCode = 422;
          throw err;
        });
      },
    });
    const r = await fetch(`${ts.url}/throws-422`, { headers: authHeaders(ts.token) });
    expect(r.status).toBe(422);
    const body = (await r.json()) as Record<string, unknown>;
    expect(body).toEqual({ error: 'bad input' });
  });

  it('P3 Error without statusCode → 500 + {"error": "<msg>"}', async () => {
    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      beforeListen: (app) => {
        app.get('/throws-plain', async () => {
          throw new Error('unexpected failure');
        });
      },
    });
    const r = await fetch(`${ts.url}/throws-plain`, { headers: authHeaders(ts.token) });
    expect(r.status).toBe(500);
    const body = (await r.json()) as Record<string, unknown>;
    expect(body).toEqual({ error: 'unexpected failure' });
  });

  it('P4 stack trace NOT leaked; response body keys are exactly ["error"]', async () => {
    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      beforeListen: (app) => {
        app.get('/throws-stackful', async () => {
          throw new Error('with-stack');
        });
      },
    });
    const r = await fetch(`${ts.url}/throws-stackful`, { headers: authHeaders(ts.token) });
    const body = (await r.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['error']);
    expect(body).not.toHaveProperty('stack');
    expect(body).not.toHaveProperty('trace');
    expect(body).not.toHaveProperty('statusCode');
  });

  it('P5 non-Error throwable (bare string) → 500 JSON; daemon does not crash', async () => {
    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      beforeListen: (app) => {
        app.get('/throws-string', async () => {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw 'a bare string';
        });
      },
    });
    const r = await fetch(`${ts.url}/throws-string`, { headers: authHeaders(ts.token) });
    expect(r.status).toBe(500);
    expect(r.headers.get('content-type')).toMatch(/application\/json/);
    const body = (await r.json()) as Record<string, unknown>;
    expect(typeof body.error).toBe('string');
  });

  it('P6 error responses are Content-Type: application/json', async () => {
    ts = await spawnTestServer({ tokenPath: await mkTokenPath() });
    const r = await fetch(`${ts.url}/nowhere`, { headers: authHeaders(ts.token) });
    expect(r.headers.get('content-type')).toMatch(/application\/json/);
  });
});
