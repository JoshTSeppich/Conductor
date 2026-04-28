/**
 * Mock daemon fixture for CLI-T06 integration tests.
 *
 * Per Arbitration 1A + 2A: node:http server + ws.WebSocketServer
 * bound to ephemeral port via listen(0). Tests configure
 * per-route responses via setters; observe CLI behavior via
 * getters.
 *
 * Endpoint coverage:
 *   GET  /v2/health           — health probe (toggleable via
 *                                setHealthOk)
 *   GET  /v2/sessions         — sessions list (configurable
 *                                via setSessionsList)
 *   PATCH /v2/sessions/:name/state — state transition
 *                                (configurable via
 *                                setStateResponse; calls
 *                                recorded via getStateCalls)
 *   WS   /v2/events/stream    — token-query auth at upgrade;
 *                                emit events via emitWsEvent;
 *                                close all via disconnectAllWs
 *
 * Cleanup: close() shuts down WS + HTTP servers cleanly.
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

export interface MockStateResponse {
  status: number;
  body: unknown;
}

export interface MockStateCall {
  path: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}

export interface MockWsConnection {
  tokenFromQuery: string | null;
  socket: WebSocket;
}

export interface MockSessionEntry {
  name: string;
  cwd: string;
  tmux_target: string;
  handoff_path: string;
  last_prompt_sent_at: string | null;
  last_handoff_pulled_at: string | null;
  state: string;
  last_commit_sha: string | null;
  last_status_json_at: string | null;
  computed_status: string;
}

export interface MockDaemonHandle {
  baseUrl: string;
  wsUrl: string;
  port: number;
  setHealthOk(ok: boolean): void;
  setStateResponse(response: MockStateResponse): void;
  setSessionsList(sessions: readonly MockSessionEntry[]): void;
  getStateCalls(): readonly MockStateCall[];
  getWsConnections(): readonly MockWsConnection[];
  emitWsEvent(event: {
    type: string;
    timestamp: string;
    session: string;
    data: unknown;
  }): void;
  disconnectAllWs(): void;
  close(): Promise<void>;
}

export async function spawnMockDaemon(): Promise<MockDaemonHandle> {
  let healthOk = true;
  let stateResponse: MockStateResponse = { status: 200, body: {} };
  let sessionsList: readonly MockSessionEntry[] = [];
  const stateCalls: MockStateCall[] = [];
  const wsConnections: MockWsConnection[] = [];

  const httpServer = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      const url = req.url ?? '';
      const pathOnly = url.split('?')[0];

      if (req.method === 'GET' && pathOnly === '/v2/health') {
        if (healthOk) {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'ok',
              version: 'mock',
              uptime_seconds: 0,
              notifications_available: false,
            }),
          );
        } else {
          res.writeHead(503);
          res.end();
        }
        return;
      }

      if (req.method === 'GET' && pathOnly === '/v2/sessions') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ sessions: sessionsList }));
        return;
      }

      if (
        req.method === 'PATCH' &&
        /^\/v2\/sessions\/[^/]+\/state$/.test(pathOnly)
      ) {
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const bodyStr = Buffer.concat(chunks).toString('utf8');
          let body: unknown = null;
          try {
            body = JSON.parse(bodyStr);
          } catch {
            /* leave null */
          }
          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers[k] = v;
          }
          stateCalls.push({ path: pathOnly, method: 'PATCH', body, headers });
          res.writeHead(stateResponse.status, {
            'content-type': 'application/json',
          });
          res.end(JSON.stringify(stateResponse.body));
        });
        return;
      }

      res.writeHead(404);
      res.end();
    },
  );

  const wss = new WebSocketServer({ noServer: true });
  httpServer.on('upgrade', (req, socket, head) => {
    const url = req.url ?? '';
    const pathOnly = url.split('?')[0];
    if (pathOnly !== '/v2/events/stream') {
      socket.destroy();
      return;
    }
    const u = new URL(url, 'http://localhost');
    const token = u.searchParams.get('token');
    wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wsConnections.push({ tokenFromQuery: token, socket: ws });
    });
  });

  await new Promise<void>((resolve) =>
    httpServer.listen(0, '127.0.0.1', () => resolve()),
  );
  const addr = httpServer.address();
  if (!addr || typeof addr === 'string') {
    throw new Error('mock daemon bind failed');
  }
  const port = addr.port;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}/v2/events/stream`,
    port,
    setHealthOk: (ok) => {
      healthOk = ok;
    },
    setStateResponse: (r) => {
      stateResponse = r;
    },
    setSessionsList: (s) => {
      sessionsList = s;
    },
    getStateCalls: () => [...stateCalls],
    getWsConnections: () => [...wsConnections],
    emitWsEvent: (event) => {
      const payload = JSON.stringify(event);
      for (const c of wsConnections) {
        if (c.socket.readyState === WebSocket.OPEN) c.socket.send(payload);
      }
    },
    disconnectAllWs: () => {
      for (const c of wsConnections) c.socket.close();
    },
    close: () =>
      new Promise<void>((resolve) => {
        wss.close(() => httpServer.close(() => resolve()));
      }),
  };
}
