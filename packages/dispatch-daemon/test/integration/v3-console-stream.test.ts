/**
 * CONSOLE-T01 cluster 3 — WS /v3/sessions/:name/console/stream.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7.3 (frozen at a7e8d4f, v2.2.0).
 * Subscribe → backfill_meta → replay → live. Validates:
 *   - subscribe handshake response shape
 *   - backfill replay (pre-populated buffer, last_seq=0)
 *   - reconnect with no gap (ring still holds missed lines)
 *   - reconnect with eviction gap (ring evicted past last_seq)
 *   - multi-subscriber fan-out (single shared pipe-pane reader)
 *
 * Test-stream injection: fixture exposes `triggerConsoleLine(name, line)`
 * which simulates a tmux pipe-pane delivery for `name`. The recording
 * ConsoleOps stub captures the route handler's attachStream callback
 * so triggerConsoleLine can invoke it directly — no real tmux spawned.
 *
 * RED state pre-cluster-3: route handler is not registered for the
 * stream path; WS upgrade fails. ConsoleOps interface only exposes
 * pasteRawBytes. spawnTestServer has no triggerConsoleLine helper.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { writeRegistryV2 } from '../../src/migration/schema-v2.js';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import { recordingConsoleOps } from '../fixtures/console-ops.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

async function mkRegistryPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'console-t01-c3-reg-'));
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

interface WsLineMsg {
  type: 'line';
  stdout_seq: number;
  bytes: string;
  encoding: 'utf8' | 'base64';
}

interface WsBackfillMetaMsg {
  type: 'backfill_meta';
  current_seq: number;
  available_from_seq: number;
  backfill_complete: boolean;
}

type WsMsg = WsLineMsg | WsBackfillMetaMsg;

async function openWs(url: string, token: string): Promise<WebSocket> {
  const ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
  return ws;
}

function collectMessages(ws: WebSocket): { msgs: WsMsg[] } {
  const msgs: WsMsg[] = [];
  ws.on('message', (raw) => {
    msgs.push(JSON.parse(raw.toString('utf8')) as WsMsg);
  });
  return { msgs };
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`waitFor: predicate not met within ${timeoutMs}ms`);
}

describe('CONSOLE-T01 cluster 3 — WS /v3/sessions/:name/console/stream', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  it('P1 subscribe handshake → backfill_meta with current_seq, available_from_seq, backfill_complete', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const ws = await openWs(`ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream`, ts.token ?? '');
    const { msgs } = collectMessages(ws);
    ws.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));

    await waitFor(() => msgs.length >= 1);
    expect(msgs[0].type).toBe('backfill_meta');
    const meta = msgs[0] as WsBackfillMetaMsg;
    expect(typeof meta.current_seq).toBe('number');
    expect(typeof meta.available_from_seq).toBe('number');
    expect(typeof meta.backfill_complete).toBe('boolean');
    // Empty buffer at this point: current_seq=0, backfill_complete=true.
    expect(meta.current_seq).toBe(0);
    expect(meta.backfill_complete).toBe(true);

    ws.close();
  });

  it('P2 backfill replay: pre-populate 50 lines, last_seq=0 → 50 line msgs in order, then live', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    // Pre-populate the ring before any client connects. We have to
    // first cause the route to attach a stream (which happens on first
    // WS subscribe). So instead: open ws, subscribe with last_seq=0,
    // then fire 50 lines and then expect them all.
    const ws = await openWs(`ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream`, ts.token ?? '');
    const { msgs } = collectMessages(ws);
    ws.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));
    await waitFor(() => msgs.length >= 1); // backfill_meta

    // Fire 50 lines via the recording stub (simulates pipe-pane delivery).
    for (let i = 1; i <= 50; i++) {
      await ts.triggerConsoleLine('sherpa', Buffer.from(`LINE_${i}\n`, 'utf8'));
    }

    await waitFor(() => msgs.filter((m) => m.type === 'line').length >= 50, 5000);
    const lineMsgs = msgs.filter((m) => m.type === 'line') as WsLineMsg[];
    expect(lineMsgs.length).toBe(50);
    // Ordering: stdout_seq monotonic, content matches.
    for (let i = 0; i < 50; i++) {
      expect(lineMsgs[i].stdout_seq).toBe(i + 1);
      expect(lineMsgs[i].bytes).toContain(`LINE_${i + 1}`);
    }

    ws.close();
  });

  it('P3 reconnect, no gap: 30 lines, disconnect, +20 lines, reconnect last_seq=30 → 20 backfilled', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const ws1 = await openWs(`ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream`, ts.token ?? '');
    const c1 = collectMessages(ws1);
    ws1.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));
    await waitFor(() => c1.msgs.length >= 1);

    for (let i = 1; i <= 30; i++) {
      await ts.triggerConsoleLine('sherpa', Buffer.from(`A_${i}\n`, 'utf8'));
    }
    await waitFor(() => c1.msgs.filter((m) => m.type === 'line').length >= 30, 5000);
    const lastSeq = (c1.msgs.filter((m) => m.type === 'line').slice(-1)[0] as WsLineMsg).stdout_seq;
    expect(lastSeq).toBe(30);
    ws1.close();
    await new Promise((r) => setTimeout(r, 50));

    // Daemon receives more lines while no client.
    for (let i = 31; i <= 50; i++) {
      await ts.triggerConsoleLine('sherpa', Buffer.from(`A_${i}\n`, 'utf8'));
    }

    const ws2 = await openWs(`ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream`, ts.token ?? '');
    const c2 = collectMessages(ws2);
    ws2.send(JSON.stringify({ type: 'subscribe', last_seq: lastSeq }));
    await waitFor(() => c2.msgs.length >= 1);
    const meta = c2.msgs[0] as WsBackfillMetaMsg;
    expect(meta.backfill_complete).toBe(true);
    expect(meta.current_seq).toBe(50);

    await waitFor(() => c2.msgs.filter((m) => m.type === 'line').length >= 20, 3000);
    const lineMsgs = c2.msgs.filter((m) => m.type === 'line') as WsLineMsg[];
    expect(lineMsgs.length).toBe(20);
    expect(lineMsgs[0].stdout_seq).toBe(31);
    expect(lineMsgs[19].stdout_seq).toBe(50);

    ws2.close();
  });

  it('P4 reconnect with eviction gap: 10 lines, disconnect, exceed buffer cap, reconnect → backfill_complete:false', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    // Tiny buffer cap so we can overrun without producing thousands of lines.
    ts = await spawnTestServer({
      registryPath,
      consoleOps: recorded.ops,
      consoleBufferCap: 50,
    });

    const ws1 = await openWs(`ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream`, ts.token ?? '');
    const c1 = collectMessages(ws1);
    ws1.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));
    await waitFor(() => c1.msgs.length >= 1);
    for (let i = 1; i <= 10; i++) {
      await ts.triggerConsoleLine('sherpa', Buffer.from(`L${i}\n`, 'utf8'));
    }
    await waitFor(() => c1.msgs.filter((m) => m.type === 'line').length >= 10, 3000);
    ws1.close();
    await new Promise((r) => setTimeout(r, 50));

    // Daemon receives 100 more lines while client gone — well past the
    // cap of 50. Earliest seqs (1..60) should now be evicted; ring
    // holds 61..110.
    for (let i = 11; i <= 110; i++) {
      await ts.triggerConsoleLine('sherpa', Buffer.from(`L${i}\n`, 'utf8'));
    }

    const ws2 = await openWs(`ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream`, ts.token ?? '');
    const c2 = collectMessages(ws2);
    ws2.send(JSON.stringify({ type: 'subscribe', last_seq: 10 }));
    await waitFor(() => c2.msgs.length >= 1);
    const meta = c2.msgs[0] as WsBackfillMetaMsg;
    // last_seq=10 + 1 = 11; available_from_seq > 11 because we evicted
    // → backfill_complete=false.
    expect(meta.backfill_complete).toBe(false);
    expect(meta.available_from_seq).toBeGreaterThan(11);

    ws2.close();
  });

  it('P5 multi-subscriber fan-out: two subscribers receive identical lines; close-one does not affect other', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const wsA = await openWs(`ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream`, ts.token ?? '');
    const wsB = await openWs(`ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream`, ts.token ?? '');
    const cA = collectMessages(wsA);
    const cB = collectMessages(wsB);
    wsA.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));
    wsB.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));
    await waitFor(() => cA.msgs.length >= 1 && cB.msgs.length >= 1);

    for (let i = 1; i <= 20; i++) {
      await ts.triggerConsoleLine('sherpa', Buffer.from(`SHARED_${i}\n`, 'utf8'));
    }
    await waitFor(() => cA.msgs.filter((m) => m.type === 'line').length >= 20, 3000);
    await waitFor(() => cB.msgs.filter((m) => m.type === 'line').length >= 20, 3000);

    const aLines = cA.msgs.filter((m) => m.type === 'line') as WsLineMsg[];
    const bLines = cB.msgs.filter((m) => m.type === 'line') as WsLineMsg[];
    expect(aLines.length).toBe(20);
    expect(bLines.length).toBe(20);
    // Bytes equal across subscribers.
    for (let i = 0; i < 20; i++) {
      expect(aLines[i].stdout_seq).toBe(bLines[i].stdout_seq);
      expect(aLines[i].bytes).toBe(bLines[i].bytes);
    }

    // Close A, fire 5 more, B keeps receiving.
    wsA.close();
    await new Promise((r) => setTimeout(r, 50));
    const aLineCountAtClose = (cA.msgs.filter((m) => m.type === 'line') as WsLineMsg[]).length;

    for (let i = 21; i <= 25; i++) {
      await ts.triggerConsoleLine('sherpa', Buffer.from(`AFTER_${i}\n`, 'utf8'));
    }
    await waitFor(() => cB.msgs.filter((m) => m.type === 'line').length >= 25, 3000);
    expect((cA.msgs.filter((m) => m.type === 'line') as WsLineMsg[]).length).toBe(aLineCountAtClose);

    wsB.close();
  });

  it('P6 single shared pipe-pane reader: only one attachStream call across N subscribers', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const wsA = await openWs(`ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream`, ts.token ?? '');
    const wsB = await openWs(`ws://127.0.0.1:${ts.port}/v3/sessions/sherpa/console/stream`, ts.token ?? '');
    wsA.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));
    wsB.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));
    await new Promise((r) => setTimeout(r, 200));
    // §4.7.1 invariant: PTY reader sharing — exactly one attachStream
    // call per session, regardless of subscriber count.
    expect(recorded.attachCount('sherpa:0.0')).toBe(1);

    wsA.close();
    wsB.close();
  });
});
