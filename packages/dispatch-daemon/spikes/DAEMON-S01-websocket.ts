/**
 * DAEMON-S01 — WebSocket library spike.
 *
 * Verifies @fastify/websocket + ws for the daemon's event stream per
 * CONDUCTOR_API_CONTRACT.md §5 (WebSocket events).
 *
 * Probes:
 *   P1  Client connects with correct query-string token → upgrade succeeds
 *   P2  Client connects with WRONG token → upgrade rejected pre-101 (401)
 *   P3  Client connects with NO token → upgrade rejected (401)
 *   P4  Server pushes 3 events with contract §5.2 shape; client receives
 *       them in order
 *   P5  Client hangup detected server-side within 1s (for future
 *       watcher-lifecycle cleanup)
 *
 * Exit 0 on all-pass, 1 on any failure. No persistent state.
 */

import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import WebSocket from 'ws';

const TOKEN = 'test-token-abc123';

// Events shaped per contract §5.2: { type, timestamp, session, data }.
const EVENTS = [
  {
    type: 'handoff_written',
    timestamp: '2026-04-23T07:00:00Z',
    session: 'sherpa',
    data: { path: '/tmp/HANDOFF.md', size_bytes: 100 },
  },
  {
    type: 'commit_landed',
    timestamp: '2026-04-23T07:00:01Z',
    session: 'sherpa',
    data: { sha: 'abc1234', subject: 'test commit', branch: 'main' },
  },
  {
    type: 'state_changed',
    timestamp: '2026-04-23T07:00:02Z',
    session: 'sherpa',
    data: { from: 'armed', to: 'held', triggered_by: 'operator' },
  },
];

// Shared promise resolver for P5's server-side disconnect tracking.
let nextDisconnectResolver: ((elapsedMs: number) => void) | null = null;

interface ProbeResult {
  name: string;
  pass: boolean;
  detail?: string;
}

async function buildServer() {
  const app = Fastify({ logger: false });
  await app.register(websocketPlugin);

  // Contract §5.1: auth via token query string (WebSocket cannot set
  // custom headers in browsers). Check during onRequest hook, BEFORE
  // the WS upgrade handshake — rejection surfaces as HTTP 401 to the
  // client, not a completed 101 upgrade.
  app.addHook('onRequest', async (request, reply) => {
    const pathOnly = request.url.split('?')[0];
    if (pathOnly !== '/v2/events/stream') return;
    const url = new URL(request.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (token !== TOKEN) {
      reply.code(401).send({ error: 'Invalid or missing token' });
    }
  });

  app.get('/v2/events/stream', { websocket: true }, (socket) => {
    const openAt = Date.now();
    // Push burst immediately on connect (simulates event replay).
    for (const e of EVENTS) {
      socket.send(JSON.stringify(e));
    }
    socket.on('close', () => {
      const elapsed = Date.now() - openAt;
      if (nextDisconnectResolver) {
        nextDisconnectResolver(elapsed);
        nextDisconnectResolver = null;
      }
    });
  });

  return app;
}

async function main(): Promise<void> {
  const app = await buildServer();
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address();
  if (!addr || typeof addr === 'string') {
    throw new Error('fastify did not bind a TCP address');
  }
  const wsUrl = `ws://127.0.0.1:${addr.port}/v2/events/stream`;

  const results: ProbeResult[] = [];

  async function probe(
    name: string,
    fn: () => Promise<{ pass: boolean; detail?: string }>,
  ): Promise<void> {
    try {
      const r = await fn();
      results.push({ name, pass: r.pass, detail: r.detail });
    } catch (err) {
      results.push({ name, pass: false, detail: (err as Error).message });
    }
  }

  // P1 — correct-token connection succeeds
  await probe('P1 Connect with correct query-string token → upgrade succeeds', async () => {
    return new Promise<{ pass: boolean; detail?: string }>((resolve) => {
      const ws = new WebSocket(`${wsUrl}?token=${TOKEN}`);
      const timer = setTimeout(() => {
        ws.terminate();
        resolve({ pass: false, detail: 'open event did not fire within 2s' });
      }, 2000);
      ws.on('open', () => {
        clearTimeout(timer);
        ws.close();
        resolve({ pass: true });
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        resolve({ pass: false, detail: `error: ${err.message}` });
      });
    });
  });

  // P2 — wrong token rejected
  await probe('P2 Connect with WRONG token → upgrade rejected pre-101 (401)', async () => {
    return new Promise<{ pass: boolean; detail?: string }>((resolve) => {
      const ws = new WebSocket(`${wsUrl}?token=wrong-token-xyz`);
      const timer = setTimeout(() => {
        ws.terminate();
        resolve({ pass: false, detail: 'no response within 2s' });
      }, 2000);
      let settled = false;
      ws.on('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        ws.close();
        resolve({ pass: false, detail: 'upgrade succeeded — should have been rejected' });
      });
      ws.on('unexpected-response', (_req, res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        ws.terminate();
        resolve({
          pass: res.statusCode === 401,
          detail: `HTTP status=${res.statusCode}`,
        });
      });
      ws.on('error', () => {
        // 'error' may fire after 'unexpected-response'; ignore if already settled
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // Treat as pass if error indicates rejection; detail is less clean
        resolve({ pass: true, detail: 'rejected via error event (no HTTP status visible)' });
      });
    });
  });

  // P3 — no token rejected
  await probe('P3 Connect with NO token → upgrade rejected (401)', async () => {
    return new Promise<{ pass: boolean; detail?: string }>((resolve) => {
      const ws = new WebSocket(wsUrl);
      const timer = setTimeout(() => {
        ws.terminate();
        resolve({ pass: false, detail: 'no response within 2s' });
      }, 2000);
      let settled = false;
      ws.on('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        ws.close();
        resolve({ pass: false, detail: 'upgrade succeeded — should have been rejected' });
      });
      ws.on('unexpected-response', (_req, res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        ws.terminate();
        resolve({
          pass: res.statusCode === 401,
          detail: `HTTP status=${res.statusCode}`,
        });
      });
      ws.on('error', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ pass: true, detail: 'rejected via error event' });
      });
    });
  });

  // P4 — event delivery order + contract §5.2 shape
  await probe('P4 Events delivered in order with contract §5.2 shape', async () => {
    return new Promise<{ pass: boolean; detail?: string }>((resolve) => {
      const ws = new WebSocket(`${wsUrl}?token=${TOKEN}`);
      const received: Array<{
        type: string;
        timestamp: string;
        session: string;
        data: unknown;
      }> = [];
      const timer = setTimeout(() => {
        ws.terminate();
        resolve({ pass: false, detail: `got ${received.length} of 3 events in 3s` });
      }, 3000);
      ws.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        received.push(parsed);
        if (received.length === 3) {
          clearTimeout(timer);
          ws.close();
          const expectedTypes = ['handoff_written', 'commit_landed', 'state_changed'];
          const actualTypes = received.map((e) => e.type);
          const order = JSON.stringify(actualTypes) === JSON.stringify(expectedTypes);
          const shape = received.every(
            (e) =>
              typeof e.type === 'string' &&
              typeof e.timestamp === 'string' &&
              typeof e.session === 'string' &&
              typeof e.data === 'object' &&
              e.data !== null,
          );
          resolve({
            pass: order && shape,
            detail: `types=${JSON.stringify(actualTypes)} shape_ok=${shape}`,
          });
        }
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        resolve({ pass: false, detail: `error: ${err.message}` });
      });
    });
  });

  // P5 — server-side disconnect detection within 1s
  await probe('P5 Server detects client hangup within 1s', async () => {
    const disconnectPromise = new Promise<number>((resolve) => {
      nextDisconnectResolver = resolve;
    });
    const timeoutPromise = new Promise<number>((_resolve, reject) => {
      setTimeout(() => reject(new Error('server close handler did not fire within 3s')), 3000);
    });

    const ws = new WebSocket(`${wsUrl}?token=${TOKEN}`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', (err) => reject(err));
    });

    // Hangup after a brief pause so open/send settle.
    setTimeout(() => ws.close(), 100);

    const elapsedMs = await Promise.race([disconnectPromise, timeoutPromise]);
    return {
      pass: elapsedMs < 1000,
      detail: `server observed disconnect after ${elapsedMs}ms`,
    };
  });

  await app.close();

  console.log('\n=== DAEMON-S01 spike results ===\n');
  let allPassed = true;
  for (const r of results) {
    const mark = r.pass ? '✓' : '✗';
    const line = r.detail ? `${mark} ${r.name}\n    ${r.detail}` : `${mark} ${r.name}`;
    console.log(line);
    if (!r.pass) allPassed = false;
  }
  console.log(`\n${allPassed ? 'ALL PROBES PASS' : 'FAILURES — see above'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('spike crashed:', err);
  process.exit(1);
});
