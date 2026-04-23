/**
 * DAEMON-T02 — token auth onRequest hook + POST /v2/auth/rotate tests.
 *
 * Probes (8 total):
 *   P1  Fresh start creates token file with mode 0600 + 256-bit base64
 *   P2  Existing token file is read, not overwritten
 *   P3  Auth-gated path without X-Conductor-Token → 401 + JSON error
 *   P4  Auth-gated path with WRONG token → 401
 *   P5  Auth-gated path with CORRECT token → Fastify default 404
 *       (hook passes through; /v2/sessions route lands at T06)
 *   P6  /v2/health bypasses auth → Fastify default 404 without token
 *       (/v2/health route lands at T03)
 *   P7  POST /v2/auth/rotate with correct token → 200 + new token in
 *       body; file on disk updated to match
 *   P8  After rotate: OLD token → 401; NEW token falls through (404)
 *
 * NOTE — WebSocket query-string auth (contract §5.1 for
 * /v2/events/stream?token=) is implemented by T02's auth hook via
 * path-based branching BUT is NOT exercised in this test file.
 * @fastify/websocket registers in DAEMON-T12; its integration test
 * covers the WS handshake auth end-to-end against the same hook.
 *
 * All probes use mkdtemp-isolated token paths so the operator's real
 * ~/.foxworks-dispatch/token is never touched.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { chmod, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';

describe('DAEMON-T02 — token auth onRequest hook + rotate endpoint', () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'fd-t02-'));
    return join(dir, 'token');
  }

  it('P1 fresh start creates token file with mode 0600 + 32 random bytes (base64)', async () => {
    const tokenPath = await mkTokenPath();
    ts = await spawnTestServer({ tokenPath });
    const content = await readFile(tokenPath, 'utf8');
    const st = await stat(tokenPath);
    expect(st.mode & 0o777).toBe(0o600);
    const bytes = Buffer.from(content.trim(), 'base64');
    expect(bytes.length).toBe(32);
    expect(ts.token).toBe(content.trim());
  });

  it('P2 existing token file is read, not overwritten', async () => {
    const tokenPath = await mkTokenPath();
    const preExisting = 'pre-existing-token-fixture';
    await writeFile(tokenPath, preExisting, 'utf8');
    await chmod(tokenPath, 0o600);
    ts = await spawnTestServer({ tokenPath });
    const content = await readFile(tokenPath, 'utf8');
    expect(content.trim()).toBe(preExisting);
    expect(ts.token).toBe(preExisting);
  });

  it('P3 auth-gated path without X-Conductor-Token → 401 + JSON error body', async () => {
    ts = await spawnTestServer({ tokenPath: await mkTokenPath() });
    const r = await fetch(`${ts.url}/v2/sessions`);
    expect(r.status).toBe(401);
    const body = (await r.json()) as { error?: unknown };
    expect(typeof body.error).toBe('string');
  });

  it('P4 auth-gated path with WRONG token → 401', async () => {
    ts = await spawnTestServer({ tokenPath: await mkTokenPath() });
    const r = await fetch(`${ts.url}/v2/sessions`, {
      headers: { 'x-conductor-token': 'wrong-token-bogus' },
    });
    expect(r.status).toBe(401);
  });

  it('P5 auth-gated path with CORRECT token → Fastify default 404 (hook passes through)', async () => {
    ts = await spawnTestServer({ tokenPath: await mkTokenPath() });
    const r = await fetch(`${ts.url}/v2/sessions`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    expect(r.status).toBe(404);
  });

  it('P6 /v2/health bypasses auth → Fastify default 404 without any token header', async () => {
    ts = await spawnTestServer({ tokenPath: await mkTokenPath() });
    const r = await fetch(`${ts.url}/v2/health`);
    expect(r.status).toBe(404);
  });

  it('P7 POST /v2/auth/rotate with correct token → 200 + new token; file updated', async () => {
    const tokenPath = await mkTokenPath();
    ts = await spawnTestServer({ tokenPath });
    const oldToken = ts.token;
    const r = await fetch(`${ts.url}/v2/auth/rotate`, {
      method: 'POST',
      headers: { 'x-conductor-token': oldToken ?? '' },
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { token?: string };
    expect(typeof body.token).toBe('string');
    expect(body.token).not.toBe(oldToken);
    const onDisk = await readFile(tokenPath, 'utf8');
    expect(onDisk.trim()).toBe(body.token);
  });

  it('P8 after rotate: OLD token → 401; NEW token falls through (404)', async () => {
    ts = await spawnTestServer({ tokenPath: await mkTokenPath() });
    const oldToken = ts.token ?? '';
    const rotateR = await fetch(`${ts.url}/v2/auth/rotate`, {
      method: 'POST',
      headers: { 'x-conductor-token': oldToken },
    });
    const { token: newToken } = (await rotateR.json()) as { token: string };

    const oldR = await fetch(`${ts.url}/v2/sessions`, {
      headers: { 'x-conductor-token': oldToken },
    });
    expect(oldR.status).toBe(401);

    const newR = await fetch(`${ts.url}/v2/sessions`, {
      headers: { 'x-conductor-token': newToken },
    });
    expect(newR.status).toBe(404);
  });
});
