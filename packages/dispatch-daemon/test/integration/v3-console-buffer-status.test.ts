/**
 * CONSOLE-T01 cluster 5 — GET /v3/sessions/:name/console/buffer +
 *                         GET /v3/sessions/:name/console/status.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7.5 + §4.7.6 (frozen at a7e8d4f).
 *
 * /buffer:
 *   - query params: before_seq (optional int), max_lines (default 100,
 *     max 5000)
 *   - response 200: {lines: Array<{stdout_seq, bytes, encoding}>,
 *     earliest_in_buffer_seq, latest_in_buffer_seq}
 *   - errors: SessionNotFound (404), ConsoleBufferUnavailable (422)
 *
 * /status:
 *   - response 200: {session_name, buffer_enabled, buffer_line_count,
 *     earliest_in_buffer_seq, latest_in_buffer_seq, current_subscribers,
 *     last_stdout_activity_at, last_stdin_activity_at}
 *   - errors: SessionNotFound (404)
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeRegistryV2 } from '../../src/migration/schema-v2.js';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import { recordingConsoleOps } from '../fixtures/console-ops.js';
import { WebSocket } from 'ws';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

async function mkRegistryPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'console-t01-c5-reg-'));
  return join(dir, 'sessions.json');
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

async function openWsAndSubscribe(url: string, token: string, port: number): Promise<WebSocket> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/v3/sessions/sherpa/console/stream?token=${encodeURIComponent(token)}`);
  await new Promise<void>((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  ws.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));
  await new Promise((r) => setTimeout(r, 80));
  return ws;
}

describe('CONSOLE-T01 cluster 5 — GET /buffer + GET /status', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  function authedHeaders(): RequestInit {
    return { headers: { 'x-conductor-token': ts?.token ?? '' } };
  }

  // ── /buffer ──────────────────────────────────────────────────────
  it('P1 GET /buffer returns lines paginated by before_seq + max_lines', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    // Subscribe + push 100 lines so the ring has data.
    const ws = await openWsAndSubscribe(ts.url, ts.token ?? '', ts.port);
    for (let i = 1; i <= 100; i++) {
      await ts.triggerConsoleLine('sherpa', Buffer.from(`L${i}\n`, 'utf8'));
    }
    await new Promise((r) => setTimeout(r, 80));
    ws.close();

    // Default max_lines=100; no before_seq → returns up to 100 most recent.
    const r1 = await fetch(`${ts.url}/v3/sessions/sherpa/console/buffer`, authedHeaders());
    expect(r1.status).toBe(200);
    const b1 = (await r1.json()) as {
      lines: Array<{ stdout_seq: number; bytes: string; encoding: string }>;
      earliest_in_buffer_seq: number;
      latest_in_buffer_seq: number;
    };
    expect(b1.lines.length).toBe(100);
    expect(b1.earliest_in_buffer_seq).toBe(1);
    expect(b1.latest_in_buffer_seq).toBe(100);
    // Lines should arrive descending (most-recent first per scrollback semantics).
    expect(b1.lines[0].stdout_seq).toBe(100);
    expect(b1.lines[99].stdout_seq).toBe(1);

    // before_seq=50 + max_lines=10 → returns seqs 49..40 (most recent below 50).
    const r2 = await fetch(`${ts.url}/v3/sessions/sherpa/console/buffer?before_seq=50&max_lines=10`, authedHeaders());
    expect(r2.status).toBe(200);
    const b2 = (await r2.json()) as { lines: Array<{ stdout_seq: number }> };
    expect(b2.lines.length).toBe(10);
    expect(b2.lines[0].stdout_seq).toBe(49);
    expect(b2.lines[9].stdout_seq).toBe(40);
  });

  it('P2 GET /buffer SessionNotFound when :name unknown → 404', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const r = await fetch(`${ts.url}/v3/sessions/no-such/console/buffer`, authedHeaders());
    expect(r.status).toBe(404);
    const body = (await r.json()) as { error: string; type?: string };
    expect(body.type).toBe('SessionNotFound');
  });

  // ── /status ──────────────────────────────────────────────────────
  it('P3 GET /status returns all required fields when session present', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    // Subscribe + push 5 lines.
    const ws = await openWsAndSubscribe(ts.url, ts.token ?? '', ts.port);
    for (let i = 1; i <= 5; i++) {
      await ts.triggerConsoleLine('sherpa', Buffer.from(`L${i}\n`, 'utf8'));
    }
    await new Promise((r) => setTimeout(r, 80));

    // Also do a stdin write so last_stdin_activity_at is populated.
    await fetch(`${ts.url}/v3/sessions/sherpa/console/stdin`, {
      method: 'POST',
      headers: { 'x-conductor-token': ts.token ?? '', 'content-type': 'application/json' },
      body: JSON.stringify({ bytes: 'hi\n' }),
    });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/status`, authedHeaders());
    expect(r.status).toBe(200);
    const body = (await r.json()) as Record<string, unknown>;

    expect(body.session_name).toBe('sherpa');
    expect(body.buffer_enabled).toBe(true);
    expect(body.buffer_line_count).toBe(5);
    expect(body.earliest_in_buffer_seq).toBe(1);
    expect(body.latest_in_buffer_seq).toBe(5);
    expect(body.current_subscribers).toBe(1);
    expect(typeof body.last_stdout_activity_at).toBe('string');
    expect(typeof body.last_stdin_activity_at).toBe('string');

    ws.close();
  });

  it('P4 GET /status SessionNotFound → 404', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const r = await fetch(`${ts.url}/v3/sessions/no-such/console/status`, authedHeaders());
    expect(r.status).toBe(404);
    const body = (await r.json()) as { error: string; type?: string };
    expect(body.type).toBe('SessionNotFound');
  });

  it('P5 GET /status zero state when no activity yet', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/status`, authedHeaders());
    expect(r.status).toBe(200);
    const body = (await r.json()) as Record<string, unknown>;
    expect(body.buffer_line_count).toBe(0);
    expect(body.earliest_in_buffer_seq).toBe(null);
    expect(body.latest_in_buffer_seq).toBe(null);
    expect(body.current_subscribers).toBe(0);
    expect(body.last_stdin_activity_at).toBe(null);
    expect(body.last_stdout_activity_at).toBe(null);
  });
});
