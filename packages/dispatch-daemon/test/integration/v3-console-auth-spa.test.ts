/**
 * CONSOLE-T01 cluster 6 — auth + SPA exclusion guards for §4.7 surface.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7.1 (frozen at a7e8d4f) +
 * the precedents established by COARCH-T01 (8c286cd, d38c8b5, 6ae23ff):
 *   - All HTTP /v3/sessions/:name/console/* endpoints require
 *     X-Conductor-Token (mismatch → 401 with `{error: ...}` envelope).
 *   - WS /v3/sessions/:name/console/stream accepts ?token= query
 *     (browser WebSocket API limitation; mirrors /v2/events/stream).
 *   - Unmatched paths under /v3/sessions/:name/console/* return JSON
 *     404 (NOT the SPA HTML fall-through).
 *
 * GREEN expectation: auth hook + SPA exclusion already correct from
 * the cluster 3 ?token= addition (auth.ts) + the existing /v3/* SPA
 * exclusion in error-handler.ts. These tests are regression guards
 * — they pass on the production code as it stands at this commit.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { writeRegistryV2 } from '../../src/migration/schema-v2.js';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import { recordingConsoleOps } from '../fixtures/console-ops.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

async function mkRegistryPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'console-t01-c6-reg-'));
  return join(dir, 'sessions.json');
}

async function mkStaticRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'console-t01-c6-static-'));
  await mkdir(dir, { recursive: true });
  // SPA fall-through serves this index.html for unmatched non-/v2/*
  // and non-/v3/* paths. The §4.7 console endpoints MUST NOT fall
  // through to it — they must return JSON 404.
  await writeFile(join(dir, 'index.html'), '<!doctype html><html>SPA</html>');
  return dir;
}

function makeSession(overrides: Partial<SessionV2> = {}): SessionV2 {
  return {
    name: 'sherpa',
    cwd: '/tmp/repo',
    tmux_target: 'sherpa:0.0',
    handoff_path: '/tmp/repo/HANDOFF.md',
    state: 'armed',
    last_prompt_sent_at: null,
    last_handoff_pulled_at: null,
    last_commit_sha: null,
    last_status_json_at: null,
    ...overrides,
  };
}

describe('CONSOLE-T01 cluster 6 — auth + SPA exclusion guards', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  // ── Auth: HTTP endpoints require X-Conductor-Token ───────────────
  it('P1 POST /stdin without token → 401', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    ts = await spawnTestServer({ registryPath, consoleOps: recordingConsoleOps().ops });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/stdin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bytes: 'hi\n' }),
    });
    expect(r.status).toBe(401);
  });

  it('P2 POST /signal without token → 401', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: { sherpa: makeSession() } });
    ts = await spawnTestServer({ registryPath, consoleOps: recordingConsoleOps().ops });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/signal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ signal: 'SIGINT' }),
    });
    expect(r.status).toBe(401);
  });

  it('P3 GET /buffer without token → 401', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: { sherpa: makeSession() } });
    ts = await spawnTestServer({ registryPath, consoleOps: recordingConsoleOps().ops });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/buffer`);
    expect(r.status).toBe(401);
  });

  it('P4 GET /status without token → 401', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: { sherpa: makeSession() } });
    ts = await spawnTestServer({ registryPath, consoleOps: recordingConsoleOps().ops });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/status`);
    expect(r.status).toBe(401);
  });

  it('P5 POST /stdin with WRONG token → 401', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: { sherpa: makeSession() } });
    ts = await spawnTestServer({ registryPath, consoleOps: recordingConsoleOps().ops });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/stdin`, {
      method: 'POST',
      headers: { 'x-conductor-token': 'not-the-right-token', 'content-type': 'application/json' },
      body: JSON.stringify({ bytes: 'hi\n' }),
    });
    expect(r.status).toBe(401);
  });

  // ── Auth: WS /stream accepts ?token= ──────────────────────────────
  it('P6 WS /stream with valid ?token= → handshake succeeds', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: { sherpa: makeSession() } });
    ts = await spawnTestServer({ registryPath, consoleOps: recordingConsoleOps().ops });

    const ws = new WebSocket(
      `ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream?token=${encodeURIComponent(ts.token ?? '')}`,
    );
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', reject);
    });
    ws.close();
  });

  it('P7 WS /stream with INVALID ?token= → 401, no upgrade', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: { sherpa: makeSession() } });
    ts = await spawnTestServer({ registryPath, consoleOps: recordingConsoleOps().ops });

    const ws = new WebSocket(
      `ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream?token=wrong`,
    );
    await new Promise<void>((resolve) => {
      ws.once('open', () => {
        // Should not open; if it does, fail loudly.
        ws.close();
        throw new Error('WS should have been rejected with 401');
      });
      ws.once('error', () => resolve());
      // Safety: timeout after 1.5s in case neither event fires.
      setTimeout(resolve, 1500);
    });
    expect(ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING).toBe(true);
  });

  // ── SPA exclusion: unmatched /v3/sessions/.../console/* → JSON 404 ──
  it('P8 GET /v3/sessions/sherpa/console/unknown returns JSON 404 (NOT SPA HTML)', async () => {
    const registryPath = await mkRegistryPath();
    const staticRoot = await mkStaticRoot();
    await writeRegistryV2(registryPath, { version: 2, sessions: { sherpa: makeSession() } });
    ts = await spawnTestServer({
      registryPath,
      staticRoot,
      consoleOps: recordingConsoleOps().ops,
    });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/unknown`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    expect(r.status).toBe(404);
    const ct = r.headers.get('content-type') ?? '';
    expect(ct).toContain('application/json');
    const body = (await r.json()) as { error?: string };
    expect(typeof body.error).toBe('string');
    expect(body.error).not.toMatch(/<html|<!doctype/i);
  });

  it('P9 POST /v3/sessions/sherpa/console/unknown returns JSON 404', async () => {
    const registryPath = await mkRegistryPath();
    const staticRoot = await mkStaticRoot();
    await writeRegistryV2(registryPath, { version: 2, sessions: { sherpa: makeSession() } });
    ts = await spawnTestServer({
      registryPath,
      staticRoot,
      consoleOps: recordingConsoleOps().ops,
    });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/unknown`, {
      method: 'POST',
      headers: { 'x-conductor-token': ts.token ?? '', 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(404);
    const ct = r.headers.get('content-type') ?? '';
    expect(ct).toContain('application/json');
  });
});
