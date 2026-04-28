/**
 * WS test fixture — promoted from
 * packages/dispatch-web/spikes/UI-S01-websocket-client/server.ts.
 *
 * Provides a real Node `ws` server + minimal HTTP server implementing
 * contract §4.1 (/v2/health) + §4.5 (/v2/events?since=) + §5.1 WS
 * shapes. Tests instantiate one fixture per suite; per-test state is
 * reset via fixture.reset(). Listens on a random port (OS-assigned)
 * so parallel test runs don't collide.
 *
 * Reason for promotion (UI-F18 context): MSW ws.link + happy-dom
 * WebSocket showed fidelity gap during WEB-T03 green — messages
 * emitted from MSW handlers did not reach happy-dom's WebSocket
 * clients. Spike fixture's real-ws approach bypasses the issue.
 */
import { createServer, IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';
import type { EventShape } from '../../src/daemon-client/event-shape.js';

export interface FixtureHandle {
  readonly port: number;
  readonly httpBase: string;
  readonly wsUrl: string;
  readonly validToken: string;

  stop: () => Promise<void>;

  /** Drops all WS connections, clears event log, restores initial valid token, clears onConnection hook. */
  reset: () => void;

  /**
   * Z-3 — simulate daemon restart. Closes all WS connections + the
   * HTTP server, awaits full teardown, then re-binds on the same port
   * with the SAME token + a CLEAN event log. Tests the UI-S01
   * reconnect cycle against a real socket close+rebind without
   * replacing the fixture handle. Caller awaits the returned
   * promise; subsequent fixture.* calls operate on the new binding.
   */
  restart: () => Promise<void>;

  /** Add an event to the log AND broadcast to currently-open WS clients. */
  emit: (event: EventShape) => void;

  /** Close all active WS connections; HTTP server stays up. */
  closeAllWs: (code?: number) => void;

  /** Change the token the fixture accepts. Pass null to reject all. */
  setValidToken: (token: string | null) => void;

  /** Toggle: when true, on every new WS connection the fixture replays the entire event log. */
  setReplayAllOnConnect: (on: boolean) => void;

  /** Hook invoked on each new WS connection with the 1-based connection index. */
  setOnConnection: (fn: ((connectionIndex: number) => void) | null) => void;

  getConnectionCount: () => number;
}

const INITIAL_VALID_TOKEN = 'test-valid-token';

export async function startFixture(): Promise<FixtureHandle> {
  const log: EventShape[] = [];
  const wsClients = new Set<WebSocket>();
  let validToken: string | null = INITIAL_VALID_TOKEN;
  let replayAll = false;
  let connectionIndex = 0;
  let onConnection: ((connectionIndex: number) => void) | null = null;

  const handler = (req: IncomingMessage, res: ServerResponse): void => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/v2/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: '0.0.0-fixture', uptime_seconds: 0 }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v2/events') {
      const token = req.headers['x-conductor-token'];
      if (validToken === null || token !== validToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_token' }));
        return;
      }
      const since = url.searchParams.get('since') ?? '';
      const sinceMs = since ? Date.parse(since) : 0;
      const filtered = log.filter((e) => Date.parse(e.timestamp) > sinceMs);
      const next_since =
        filtered.length > 0 ? filtered[filtered.length - 1].timestamp : since || new Date(0).toISOString();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ events: filtered, next_since }));
      return;
    }
    res.writeHead(404);
    res.end();
  };

  // Z-3 restart() helper requires httpServer + wss to be mutable so
  // they can be replaced in-place during a daemon-restart simulation.
  // Connection-handler attachment is extracted so the same logic
  // re-runs on the rebound wss instance after restart.
  let httpServer: HttpServer = createServer(handler);
  let wss = new WebSocketServer({ server: httpServer, path: '/v2/events/stream' });

  function attachWssHandlers(target: WebSocketServer): void {
    target.on('connection', (ws, req) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const token = url.searchParams.get('token');
      if (validToken === null || token !== validToken) {
        ws.close(1008, 'invalid_token');
        return;
      }
      wsClients.add(ws);
      ws.on('close', () => wsClients.delete(ws));
      if (replayAll) {
        for (const e of log) ws.send(JSON.stringify(e));
      }
      connectionIndex += 1;
      onConnection?.(connectionIndex);
    });
  }
  attachWssHandlers(wss);

  const port = await new Promise<number>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => {
      const addr = httpServer.address() as AddressInfo;
      resolve(addr.port);
    });
  });

  const httpBase = `http://127.0.0.1:${port}`;
  const wsUrl = `ws://127.0.0.1:${port}/v2/events/stream`;

  return {
    port,
    httpBase,
    wsUrl,
    validToken: INITIAL_VALID_TOKEN,

    async stop() {
      for (const c of [...wsClients]) c.terminate();
      wsClients.clear();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },

    reset() {
      for (const c of [...wsClients]) c.terminate();
      wsClients.clear();
      log.length = 0;
      validToken = INITIAL_VALID_TOKEN;
      replayAll = false;
      connectionIndex = 0;
      onConnection = null;
    },

    emit(event) {
      log.push(event);
      const payload = JSON.stringify(event);
      for (const c of wsClients) {
        if (c.readyState === WebSocket.OPEN) c.send(payload);
      }
    },

    closeAllWs(code = 1001) {
      for (const c of [...wsClients]) c.close(code);
    },

    setValidToken(t) {
      validToken = t;
    },

    setReplayAllOnConnect(on) {
      replayAll = on;
    },

    setOnConnection(fn) {
      onConnection = fn;
    },

    getConnectionCount() {
      return connectionIndex;
    },

    async restart() {
      // Z-3 simulate daemon restart: close all WS + HTTP, await full
      // teardown, recreate HTTP server + WSS bound to the SAME port,
      // re-attach connection handler. Token + log preserved across
      // restart (matches real-daemon: token survives in
      // ~/.foxworks-dispatch/token; event ring is in-memory but
      // typically carries forward via fresh re-fetch on reconnect).
      // Here we clear log to make pre/post-restart events
      // distinguishable in tests.
      for (const c of [...wsClients]) c.terminate();
      wsClients.clear();
      log.length = 0;
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      // Brief await tick to let any in-flight HTTP fetches see ECONNREFUSED
      // (simulates the daemon-down window operators observe).
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      httpServer = createServer(handler);
      wss = new WebSocketServer({ server: httpServer, path: '/v2/events/stream' });
      attachWssHandlers(wss);
      await new Promise<void>((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(port, '127.0.0.1', () => resolve());
      });
    },
  };
}
