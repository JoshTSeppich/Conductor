// CONSOLE-T02: Workstation IPC bridge for the CC-console panel surface.
//
// Vision §10.7 (frozen at eac381e): defines five IPC message types between
// the Electron main process (shell) and the embedded webview.
//
//   shell → webview:
//     console:open          — instruct webview to open a panel for a session.
//     console:close         — instruct webview to close a panel.
//     console:stdout-chunk  — forward a chunk of STDOUT bytes from daemon WS.
//
//   webview → shell:
//     console:send-stdin    — webview forwards typed prompt; shell calls daemon.
//     console:signal        — webview requests SIGINT/SIGTERM/SIGHUP for the CC.
//
// Auxiliary shell→webview events used by the controller (UI rendering of these
// belongs to CONSOLE-T03; the IPC propagation lives here):
//
//     console:gap-detected  — backfill_meta arrived with backfill_complete:false
//     console:error         — daemon stream errored (network failure, auth, etc.)
//
// CONDUCTOR_API_CONTRACT.md §4.7 (frozen at a7e8d4f / v2.2.0) defines the
// daemon-side contract this bridge consumes.
//
// The shell process owns the WebSocket connection per vision §10.7's
// rationale: webview-renders-WebSocket complicates auth and lifecycle
// management; centralizing in the shell process is simpler.
//
// CONSOLE-T03 wires the open-trigger (menu item, session-card button, etc.).
// This module exposes the IPC layer assuming open is triggered externally.
import { ipcMain, type IpcMain, type WebContents } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DAEMON_HTTP_URL = process.env['FOXWORKS_DAEMON_URL'] ?? 'http://localhost:7878';
const DAEMON_WS_URL = process.env['FOXWORKS_DAEMON_WS_URL'] ?? 'ws://localhost:7878';

// Vision §10.11 Q3 (ratified): default panel cap is 4. Configurable later via
// MB-T11/W-T19 settings UI; passed through ConsoleIpcOptions for tests.
export const DEFAULT_PANEL_CAP = 4;

// ── Public types ──────────────────────────────────────────────────────────

export interface StdinAck {
  accepted: boolean;
  stdin_seq: number;
}

export interface SignalAck {
  accepted: boolean;
  dispatch_method: string;
}

export type SignalName = 'SIGINT' | 'SIGTERM' | 'SIGHUP';
export type Encoding = 'utf8' | 'base64';

export interface ConsoleDaemonClient {
  sendStdin(name: string, bytes: string, encoding: Encoding): Promise<StdinAck>;
  sendSignal(name: string, signal: SignalName): Promise<SignalAck>;
  streamUrl(name: string): string;
}

export interface ConsoleWebSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: 'open', cb: () => void): void;
  on(event: 'message', cb: (data: string) => void): void;
  on(event: 'close', cb: (code: number, reason: string) => void): void;
  on(event: 'error', cb: (err: Error) => void): void;
}

export type ConsoleWebSocketFactory = (url: string) => ConsoleWebSocket;

export interface ConsoleIpcOptions {
  daemonClient: ConsoleDaemonClient;
  wsFactory: ConsoleWebSocketFactory;
  emitToWebview: (channel: string, payload: unknown) => void;
  panelCap?: number;
}

// ── WorkstationError discriminated union ──────────────────────────────────
// Vision §10's WorkstationError surface is referenced by CONDUCTOR_API_CONTRACT
// §4.7.1. Workstation-side errors are thrown so callers can branch on .type.

export type WorkstationErrorType =
  | 'PanelCapExceeded'
  | 'PanelAlreadyOpen'
  | 'PanelNotFound';

export class WorkstationError extends Error {
  readonly type: WorkstationErrorType;
  constructor(type: WorkstationErrorType, message: string) {
    super(message);
    this.type = type;
    this.name = 'WorkstationError';
  }
}

// ── Controller ────────────────────────────────────────────────────────────

interface PanelState {
  socket: ConsoleWebSocket | null;
  lastSeq: number;
  reconnectPending: boolean;
  closedByOperator: boolean;
}

// CONDUCTOR_API_CONTRACT.md §4.7.3 close-code semantics:
// 4404 (SessionNotFound) and 4422 (SessionNotRunning) are terminal — the
// session is structurally not available, so retrying the WS would loop.
// 1000 normal close is operator-initiated and should not retry. Anything
// else (1006 abnormal, 1011 internal error, network blips) is retried.
const TERMINAL_CLOSE_CODES = new Set<number>([1000, 4404, 4422]);

export class ConsoleIpcController {
  private readonly daemonClient: ConsoleDaemonClient;
  private readonly wsFactory: ConsoleWebSocketFactory;
  /** WB11: original injected dep, used as the default fallback when no
   *  per-session target is registered. The class-internal `emit()` method
   *  routes per-session via sessionTargets first; falls back to defaultEmit. */
  private readonly defaultEmit: (channel: string, payload: unknown) => void;
  private readonly panelCap: number;
  private readonly panels = new Map<string, PanelState>();
  /** WB11: per-session event target registry. When set for a sessionName,
   *  console:* events with that sessionName route to the registered target
   *  (typically a detached BrowserWindow's webContents.send) instead of
   *  the default emit (mainWindow). */
  private readonly sessionTargets = new Map<
    string,
    (channel: string, payload: unknown) => void
  >();

  constructor(opts: ConsoleIpcOptions) {
    this.daemonClient = opts.daemonClient;
    this.wsFactory = opts.wsFactory;
    this.defaultEmit = opts.emitToWebview;
    this.panelCap = opts.panelCap ?? DEFAULT_PANEL_CAP;
  }

  /**
   * WB11: register a per-session event target. When set for `sessionName`,
   * subsequent console:* events whose payload contains
   * `{sessionName: '<sessionName>', ...}` route to `target(channel, payload)`
   * instead of the default emitToWebview. Pass null to remove the
   * registration (events fall back to default).
   */
  setSessionTarget(
    sessionName: string,
    target: ((channel: string, payload: unknown) => void) | null,
  ): void {
    if (target === null) {
      this.sessionTargets.delete(sessionName);
    } else {
      this.sessionTargets.set(sessionName, target);
    }
  }

  /** WB11: internal multi-target emit. Inspects payload for sessionName,
   *  routes to a per-session target if registered, else falls back to default. */
  private emitToWebview(channel: string, payload: unknown): void {
    if (payload !== null && typeof payload === 'object') {
      const sn = (payload as Record<string, unknown>)['sessionName'];
      if (typeof sn === 'string') {
        const target = this.sessionTargets.get(sn);
        if (target !== undefined) {
          target(channel, payload);
          return;
        }
      }
    }
    this.defaultEmit(channel, payload);
  }

  panelCount(): number {
    return this.panels.size;
  }

  async openConsolePanel(sessionName: string): Promise<void> {
    if (this.panels.has(sessionName)) {
      throw new WorkstationError(
        'PanelAlreadyOpen',
        `console panel already open for session "${sessionName}"`,
      );
    }
    if (this.panels.size >= this.panelCap) {
      throw new WorkstationError(
        'PanelCapExceeded',
        `console panel cap (${this.panelCap}) reached; close a panel before opening another`,
      );
    }

    const state: PanelState = {
      socket: null,
      lastSeq: 0,
      reconnectPending: false,
      closedByOperator: false,
    };
    this.panels.set(sessionName, state);

    this.emitToWebview('console:open', { sessionName });

    this.connectSocket(sessionName, state);
  }

  async closeConsolePanel(sessionName: string): Promise<void> {
    const state = this.panels.get(sessionName);
    if (!state) return;

    state.closedByOperator = true;
    if (state.socket) {
      try {
        state.socket.close(1000, 'panel-closed');
      } catch {
        // ignore — socket may already be closed
      }
    }
    this.panels.delete(sessionName);
    this.emitToWebview('console:close', { sessionName });
  }

  /** Test seam: synchronously fire a pending reconnect (cluster 2 RED). */
  testReconnectNow(sessionName: string): void {
    const state = this.panels.get(sessionName);
    if (!state || !state.reconnectPending) return;
    state.reconnectPending = false;
    this.connectSocket(sessionName, state);
  }

  private connectSocket(sessionName: string, state: PanelState): void {
    const url = this.daemonClient.streamUrl(sessionName);
    const sock = this.wsFactory(url);
    state.socket = sock;
    this.wireSocket(sessionName, sock, state);
  }

  async handleSendStdin(
    sessionName: string,
    bytes: string,
    encoding: Encoding = 'utf8',
  ): Promise<StdinAck> {
    return this.daemonClient.sendStdin(sessionName, bytes, encoding);
  }

  async handleSignal(sessionName: string, signal: SignalName): Promise<SignalAck> {
    return this.daemonClient.sendSignal(sessionName, signal);
  }

  // ── WS lifecycle ────────────────────────────────────────────────────────
  // On open: send subscribe with last_seq so the daemon either backfills from
  // the gap-checkable position or reports an eviction-window gap via
  // backfill_complete:false. On message: parse, route by type. On close: the
  // socket is removed; reconnection is left to the caller (cluster 2 will add
  // automatic reconnection per §4.7.3 reconnection semantics).

  private wireSocket(sessionName: string, sock: ConsoleWebSocket, state: PanelState): void {
    sock.on('open', () => {
      sock.send(JSON.stringify({ type: 'subscribe', last_seq: state.lastSeq }));
    });

    sock.on('message', (raw: string) => {
      this.handleWsMessage(sessionName, raw, state);
    });

    sock.on('error', (err: Error) => {
      this.emitToWebview('console:error', {
        sessionName,
        message: err.message,
      });
    });

    sock.on('close', (code: number) => {
      const stillOpen = this.panels.get(sessionName);
      if (!stillOpen) return;
      stillOpen.socket = null;
      if (stillOpen.closedByOperator) return;
      // Per §4.7.3 reconnection semantics: only retry on non-terminal codes.
      // Production reconnect uses a small backoff (cluster 2 GREEN ships
      // 1s fixed; production may revisit). Tests fire reconnects via
      // testReconnectNow().
      if (TERMINAL_CLOSE_CODES.has(code)) return;
      this.scheduleReconnect(sessionName, stillOpen);
    });
  }

  private scheduleReconnect(sessionName: string, state: PanelState): void {
    if (state.reconnectPending) return;
    state.reconnectPending = true;
    // Production timer; ignored in tests (testReconnectNow drives synchronously).
    setTimeout(() => {
      // Re-check at fire time: panel may have been closed in the interim.
      const live = this.panels.get(sessionName);
      if (!live || !live.reconnectPending) return;
      live.reconnectPending = false;
      this.connectSocket(sessionName, live);
    }, 1_000).unref?.();
  }

  private handleWsMessage(sessionName: string, raw: string, state: PanelState): void {
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    const m = msg as Record<string, unknown>;
    const type = m['type'];

    if (type === 'backfill_meta') {
      const backfillComplete = m['backfill_complete'] === true;
      if (!backfillComplete) {
        this.emitToWebview('console:gap-detected', {
          sessionName,
          availableFromSeq: typeof m['available_from_seq'] === 'number' ? m['available_from_seq'] : 0,
          currentSeq: typeof m['current_seq'] === 'number' ? m['current_seq'] : 0,
        });
      }
      return;
    }

    if (type === 'line') {
      const stdoutSeq = typeof m['stdout_seq'] === 'number' ? m['stdout_seq'] : 0;
      const bytes = typeof m['bytes'] === 'string' ? m['bytes'] : '';
      const encoding: Encoding = m['encoding'] === 'base64' ? 'base64' : 'utf8';
      if (stdoutSeq > state.lastSeq) state.lastSeq = stdoutSeq;
      this.emitToWebview('console:stdout-chunk', {
        sessionName,
        stdoutSeq,
        bytes,
        encoding,
      });
      return;
    }

    if (type === 'error') {
      this.emitToWebview('console:error', {
        sessionName,
        message: typeof m['error'] === 'string' ? m['error'] : 'unknown daemon stream error',
        errorType: typeof m['error_type'] === 'string' ? m['error_type'] : null,
      });
    }
  }
}

// ── HTTP daemon client implementation ─────────────────────────────────────
// Mirrors the http-daemon-client.ts COARCH-T03 pattern: read token from
// ~/.foxworks-dispatch/token; fail gracefully if unreachable.

function readDaemonToken(): string | null {
  try {
    return readFileSync(join(homedir(), '.foxworks-dispatch', 'token'), 'utf8').trim();
  } catch {
    return null;
  }
}

export class HttpConsoleDaemonClient implements ConsoleDaemonClient {
  private readonly token: string | null;
  private readonly httpUrl: string;
  private readonly wsUrl: string;

  constructor(opts?: { httpUrl?: string; wsUrl?: string; token?: string | null }) {
    this.httpUrl = opts?.httpUrl ?? DAEMON_HTTP_URL;
    this.wsUrl = opts?.wsUrl ?? DAEMON_WS_URL;
    this.token = opts?.token !== undefined ? opts.token : readDaemonToken();
  }

  async sendStdin(name: string, bytes: string, encoding: Encoding): Promise<StdinAck> {
    const res = await fetch(
      `${this.httpUrl}/v3/sessions/${encodeURIComponent(name)}/console/stdin`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { 'X-Conductor-Token': this.token } : {}),
        },
        body: JSON.stringify({ bytes, encoding }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`POST /console/stdin failed: HTTP ${res.status} ${text}`);
    }
    return (await res.json()) as StdinAck;
  }

  async sendSignal(name: string, signal: SignalName): Promise<SignalAck> {
    const res = await fetch(
      `${this.httpUrl}/v3/sessions/${encodeURIComponent(name)}/console/signal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { 'X-Conductor-Token': this.token } : {}),
        },
        body: JSON.stringify({ signal }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`POST /console/signal failed: HTTP ${res.status} ${text}`);
    }
    return (await res.json()) as SignalAck;
  }

  streamUrl(name: string): string {
    const t = this.token ? `?token=${encodeURIComponent(this.token)}` : '';
    return `${this.wsUrl}/v3/sessions/${encodeURIComponent(name)}/console/stream${t}`;
  }
}

// ── Default WS factory ────────────────────────────────────────────────────
// Uses the global WebSocket built into Node 22 / Electron 41. Wraps it in the
// 'on'-style adapter the controller expects (the global WebSocket is
// EventTarget-based; the controller's EventEmitter-style `on` simplifies
// testing by matching the `ws` library shape used elsewhere in this monorepo).

export function defaultWebSocketFactory(url: string): ConsoleWebSocket {
  const ws = new WebSocket(url);
  return {
    send: (data: string) => ws.send(data),
    close: (code?: number, reason?: string) => ws.close(code, reason),
    on: (event: 'open' | 'message' | 'close' | 'error', cb: (...args: never[]) => void) => {
      if (event === 'open') {
        ws.addEventListener('open', () => (cb as () => void)());
      } else if (event === 'message') {
        ws.addEventListener('message', (ev: MessageEvent) => {
          const data = typeof ev.data === 'string' ? ev.data : String(ev.data);
          (cb as (d: string) => void)(data);
        });
      } else if (event === 'close') {
        ws.addEventListener('close', (ev: CloseEvent) => {
          (cb as (c: number, r: string) => void)(ev.code, ev.reason);
        });
      } else if (event === 'error') {
        ws.addEventListener('error', () => (cb as (e: Error) => void)(new Error('websocket error')));
      }
    },
  };
}

// ── Electron registration ─────────────────────────────────────────────────

export interface RegisterConsoleIpcOpts {
  ipcMain?: IpcMain;
  getWebContents: () => WebContents | null;
  controller?: ConsoleIpcController;
}

export function registerConsoleIpcHandlers(opts: RegisterConsoleIpcOpts): ConsoleIpcController {
  const ipc = opts.ipcMain ?? ipcMain;
  const controller =
    opts.controller ??
    new ConsoleIpcController({
      daemonClient: new HttpConsoleDaemonClient(),
      wsFactory: defaultWebSocketFactory,
      emitToWebview: (channel, payload) => {
        const wc = opts.getWebContents();
        if (wc && !wc.isDestroyed()) wc.send(channel, payload);
      },
    });

  ipc.handle('console:send-stdin', async (_event, payload: unknown) => {
    const p = payload as { sessionName: string; bytes: string; encoding?: Encoding };
    return controller.handleSendStdin(p.sessionName, p.bytes, p.encoding);
  });

  ipc.handle('console:signal', async (_event, payload: unknown) => {
    const p = payload as { sessionName: string; signal: SignalName };
    return controller.handleSignal(p.sessionName, p.signal);
  });

  ipc.handle('console:open-panel', async (_event, payload: unknown) => {
    const p = payload as { sessionName: string };
    await controller.openConsolePanel(p.sessionName);
  });

  ipc.handle('console:close-panel', async (_event, payload: unknown) => {
    const p = payload as { sessionName: string };
    await controller.closeConsolePanel(p.sessionName);
  });

  return controller;
}
