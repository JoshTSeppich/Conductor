/**
 * Throwaway fixture for UI-S01. NOT production code. Implements just
 * enough of CONDUCTOR_API_CONTRACT.md §4.1, §4.5, §5.1–5.3 to exercise
 * the web UI's preflight + gap-fill + reconnect behavior.
 *
 * Real daemon implementation is Session A's territory (DAEMON-T01+).
 * This fixture is Node-only, thrown away when the real daemon lands.
 */
import { createServer, IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';

export interface FixtureEvent {
  type: string;
  timestamp: string;
  session: string;
  data: Record<string, unknown>;
}

export interface FixtureHandle {
  port: number;
  stop: () => Promise<void>;
  emit: (event: FixtureEvent) => void;
  closeAllWs: (code?: number) => void;
  setValidToken: (token: string | null) => void;
  replayAllOnConnect: (on: boolean) => void;
  getLog: () => FixtureEvent[];
  getConnectionCount: () => number;
}

export async function startFixture(options?: {
  initialToken?: string;
  replayAllOnConnect?: boolean;
}): Promise<FixtureHandle> {
  const log: FixtureEvent[] = [];
  const wsClients = new Set<WebSocket>();
  let validToken: string | null = options?.initialToken ?? 'test-token';
  let replayAll = options?.replayAllOnConnect ?? false;

  const cors = (res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Conductor-Token');
  };

  const handler = (req: IncomingMessage, res: ServerResponse) => {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/v2/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: '0.0.0-spike', uptime_seconds: 0 }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v2/events') {
      const token = req.headers['x-conductor-token'];
      if (validToken === null || token !== validToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_token' }));
        return;
      }
      const since = url.searchParams.get('since');
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 500);
      const sinceMs = since && since !== '' ? Date.parse(since) : 0;
      const filtered = log.filter((e) => Date.parse(e.timestamp) > sinceMs).slice(0, limit);
      const nextSince =
        filtered.length > 0
          ? filtered[filtered.length - 1].timestamp
          : since ?? new Date(0).toISOString();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ events: filtered, next_since: nextSince }));
      return;
    }
    res.writeHead(404);
    res.end();
  };

  const httpServer: HttpServer = createServer(handler);
  const wss = new WebSocketServer({ server: httpServer, path: '/v2/events/stream' });

  wss.on('connection', (ws, req) => {
    // §5.1: token in query string. Reject on mismatch BEFORE the client
    // learns it's 401 — the browser will see a generic close either way,
    // which is the cross-session finding this spike exists to validate.
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
  });

  const port = await new Promise<number>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => {
      const addr = httpServer.address() as AddressInfo;
      resolve(addr.port);
    });
  });

  return {
    port,
    async stop() {
      for (const c of [...wsClients]) c.terminate();
      wsClients.clear();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
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
    replayAllOnConnect(on) {
      replayAll = on;
    },
    getLog() {
      return [...log];
    },
    getConnectionCount() {
      return wsClients.size;
    },
  };
}
