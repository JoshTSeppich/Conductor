/**
 * DAEMON-T12 — WS /v2/events/stream integration tests.
 *
 * Covers the WS route + emit-wiring for existing routes
 * (T08 state_changed, T09 prompt_sent). T10 does NOT emit
 * per operator arbitration 1 on T12 pre-reg (§5.3 frozen
 * list has no "handoff_pulled"; watcher T13 owns
 * handoff_written).
 *
 * Wire-format contract (per arbitration 4 = Option A):
 *   4-field §5.2-verbatim shape: {type, timestamp, session, data}
 *   event_id stays server-side (ring + HTTP /v2/events). Wire
 *   strips it via toWireEvent projection.
 *
 * Probes (6 total):
 *   P1 Authorized client (?token=<ts.token>) connects → open fires
 *   P2 Missing/invalid token → 401 pre-upgrade (no handshake)
 *   P3 ts.emit(...) on connected client → client receives
 *      4-field JSON (no event_id on wire)
 *   P4 2 connected clients + emit → both receive, in order
 *   P5 PATCH /v2/sessions/:name/state armed→held → WS client
 *      receives {type: 'state_changed', data: {from, to,
 *      triggered_by: 'operator'}}
 *   P6 POST /v2/sessions/:name/prompts → WS client receives
 *      {type: 'prompt_sent', data: {archived_to, size_chars}}
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import { writeRegistryV2 } from '../../src/migration/schema-v2.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';
import type { TmuxOps } from '../../src/state/transitions.js';

describe('DAEMON-T12 — WS /v2/events/stream', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort */
      });
      ts = null;
    }
  });

  async function mkRegistryPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-t12-reg-'));
    return join(dir, 'sessions.json');
  }

  async function mkSessionWorkDir(): Promise<string> {
    return await mkdtemp(join(tmpdir(), 'fd-t12-cwd-'));
  }

  function mkSession(overrides: Partial<SessionV2> = {}): SessionV2 {
    return {
      cwd: '/tmp/test',
      tmux_target: 'sherpa:0.0',
      handoff_path: '/tmp/test/HANDOFF.md',
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
      ...overrides,
    };
  }

  function stubTmuxOps(): TmuxOps {
    return {
      async sendCtrlC(_target: string) {
        /* no-op: success path */
      },
      async killSession(_target: string) {
        /* no-op */
      },
      async sendKeys(_target: string, _text: string) {
        /* no-op: success path for prompt delivery */
      },
      async hasSession(_target: string): Promise<boolean> {
        return true;
      },
    };
  }

  function connectWs(ts: TestServer): Promise<WebSocket> {
    const url = `${ts.wsUrl}?token=${encodeURIComponent(ts.token ?? '')}`;
    const sock = new WebSocket(url);
    return new Promise((resolve, reject) => {
      sock.once('open', () => resolve(sock));
      sock.once('error', reject);
      sock.once('unexpected-response', (_req, res) =>
        reject(new Error(`upgrade rejected: ${res.statusCode}`)),
      );
    });
  }

  function nextMessage(sock: WebSocket): Promise<unknown> {
    return new Promise((resolve, reject) => {
      sock.once('message', (data) => {
        try {
          resolve(JSON.parse(data.toString()));
        } catch (err) {
          reject(err);
        }
      });
      sock.once('error', reject);
      sock.once('close', () =>
        reject(new Error('socket closed before message')),
      );
    });
  }

  it('P1 authorized client connects → upgrade accepted', async () => {
    ts = await spawnTestServer({});
    const sock = await connectWs(ts);
    expect(sock.readyState).toBe(WebSocket.OPEN);
    sock.close();
  });

  it('P2 missing/invalid token → 401 pre-upgrade', async () => {
    ts = await spawnTestServer({});
    // No token at all
    const badUrl = `${ts.wsUrl}`;
    const sock = new WebSocket(badUrl);
    const rejection = await new Promise<{ status: number }>(
      (resolve, reject) => {
        sock.once('unexpected-response', (_req, res) => {
          resolve({ status: res.statusCode ?? 0 });
        });
        sock.once('open', () =>
          reject(new Error('unexpectedly opened without token')),
        );
      },
    );
    expect(rejection.status).toBe(401);

    // Wrong token
    const wrongUrl = `${ts.wsUrl}?token=not-the-right-value`;
    const sock2 = new WebSocket(wrongUrl);
    const rejection2 = await new Promise<{ status: number }>(
      (resolve, reject) => {
        sock2.once('unexpected-response', (_req, res) => {
          resolve({ status: res.statusCode ?? 0 });
        });
        sock2.once('open', () =>
          reject(new Error('unexpectedly opened with wrong token')),
        );
      },
    );
    expect(rejection2.status).toBe(401);
  });

  it('P3 ts.emit on connected client → 4-field wire event (no event_id)', async () => {
    ts = await spawnTestServer({});
    const sock = await connectWs(ts);
    const msgP = nextMessage(sock);

    // Trigger emit via the test seam.
    ts.emit({
      session: 'sherpa',
      type: 'prompt_sent',
      data: { size_chars: 42 },
    });

    const msg = (await msgP) as Record<string, unknown>;
    expect(Object.keys(msg).sort()).toEqual(
      ['data', 'session', 'timestamp', 'type'].sort(),
    );
    // event_id MUST NOT be on the wire (per arbitration 4 Option A)
    expect('event_id' in msg).toBe(false);
    expect(msg.type).toBe('prompt_sent');
    expect(msg.session).toBe('sherpa');
    expect(msg.data).toEqual({ size_chars: 42 });
    expect(typeof msg.timestamp).toBe('string');
    sock.close();
  });

  it('P4 2 clients + emit → both receive, in order', async () => {
    ts = await spawnTestServer({});
    const a = await connectWs(ts);
    const b = await connectWs(ts);
    const msgsA: unknown[] = [];
    const msgsB: unknown[] = [];
    a.on('message', (d) => msgsA.push(JSON.parse(d.toString())));
    b.on('message', (d) => msgsB.push(JSON.parse(d.toString())));

    ts.emit({ session: 's', type: 'state_changed', data: { seq: 0 } });
    ts.emit({ session: 's', type: 'state_changed', data: { seq: 1 } });
    ts.emit({ session: 's', type: 'state_changed', data: { seq: 2 } });

    // Wait for both clients to receive 3 messages each
    await new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + 2000;
      const tick = setInterval(() => {
        if (msgsA.length === 3 && msgsB.length === 3) {
          clearInterval(tick);
          resolve();
        } else if (Date.now() > deadline) {
          clearInterval(tick);
          reject(
            new Error(
              `timeout: a=${msgsA.length} b=${msgsB.length} (expected 3 each)`,
            ),
          );
        }
      }, 10);
    });

    const seqsA = msgsA.map((m) => (m as { data: { seq: number } }).data.seq);
    const seqsB = msgsB.map((m) => (m as { data: { seq: number } }).data.seq);
    expect(seqsA).toEqual([0, 1, 2]);
    expect(seqsB).toEqual([0, 1, 2]);
    a.close();
    b.close();
  });

  it('P5 PATCH state armed→held → state_changed event on WS', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: mkSession() },
    });

    ts = await spawnTestServer({
      registryPath,
      tmuxOps: stubTmuxOps(),
    });
    const sock = await connectWs(ts);
    const msgP = nextMessage(sock);

    const r = await fetch(`${ts.url}/v2/sessions/sherpa/state`, {
      method: 'PATCH',
      headers: {
        'x-conductor-token': ts.token ?? '',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ state: 'held' }),
    });
    expect(r.status).toBe(200);

    const msg = (await msgP) as {
      type: string;
      session: string;
      data: { from: string; to: string; triggered_by: string };
    };
    expect(msg.type).toBe('state_changed');
    expect(msg.session).toBe('sherpa');
    expect(msg.data).toEqual({
      from: 'armed',
      to: 'held',
      triggered_by: 'operator',
    });
    sock.close();
  });

  it('P6 POST prompt → prompt_sent event on WS', async () => {
    const workDir = await mkSessionWorkDir();
    const handoffPath = join(workDir, 'HANDOFF.md');
    await writeFile(handoffPath, 'existing handoff\n', 'utf8');

    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({ cwd: workDir, handoff_path: handoffPath }),
      },
    });

    ts = await spawnTestServer({
      registryPath,
      tmuxOps: stubTmuxOps(),
    });
    const sock = await connectWs(ts);
    const msgP = nextMessage(sock);

    const r = await fetch(`${ts.url}/v2/sessions/sherpa/prompts`, {
      method: 'POST',
      headers: {
        'x-conductor-token': ts.token ?? '',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ body: 'test prompt body' }),
    });
    expect(r.status).toBe(200);

    const msg = (await msgP) as {
      type: string;
      session: string;
      data: { archived_to: string; size_chars: number };
    };
    expect(msg.type).toBe('prompt_sent');
    expect(msg.session).toBe('sherpa');
    expect(typeof msg.data.archived_to).toBe('string');
    expect(typeof msg.data.size_chars).toBe('number');
    expect(msg.data.size_chars).toBeGreaterThan(0);
    sock.close();
  });
});
