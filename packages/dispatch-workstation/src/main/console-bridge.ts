// CONSOLE-T02 Cluster 3 — pure factory for the consoleBridge surface
// exposed to the webview via Electron's contextBridge.
//
// Vision §10.7 (frozen at eac381e): five IPC message types between shell and
// webview. The shell→webview types (open, close, stdout-chunk + auxiliary
// gap/error events) are surfaced as on* listener registrations; the
// webview→shell types (send-stdin, signal) are surfaced as invoke methods
// so the renderer awaits the daemon ack.
//
// This module is a pure factory of the bridge object so the shape can be
// unit-tested without booting Electron. preload.mts calls
// `contextBridge.exposeInMainWorld('consoleBridge', makeConsoleBridge(ipcRenderer))`
// to wire it into the renderer's window.

export interface ConsoleBridgeIpc {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  send(channel: string, ...args: unknown[]): void;
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
}

export type Cleanup = () => void;
export type SignalName = 'SIGINT' | 'SIGTERM' | 'SIGHUP';
export type Encoding = 'utf8' | 'base64';

export interface StdinAck {
  accepted: boolean;
  stdin_seq: number;
}
export interface SignalAck {
  accepted: boolean;
  dispatch_method: string;
}

export interface OpenPayload {
  sessionName: string;
}
export interface ClosePayload {
  sessionName: string;
}
export interface StdoutChunkPayload {
  sessionName: string;
  stdoutSeq: number;
  bytes: string;
  encoding: Encoding;
}
export interface GapPayload {
  sessionName: string;
  availableFromSeq: number;
  currentSeq: number;
}
export interface ErrorPayload {
  sessionName: string;
  message: string;
  errorType?: string | null;
}

export interface ConsoleBridge {
  sendStdin(sessionName: string, bytes: string, encoding?: Encoding): Promise<StdinAck>;
  signal(sessionName: string, signal: SignalName): Promise<SignalAck>;
  /** Fix-C / cairn finding #82 — renderer-driven console-open path.
   * Invokes the existing 'console:open-panel' main-side IPC handler
   * (console-ipc.ts:429-432) which routes to
   * ConsoleIpcController.openConsolePanel(sessionName). Native menu
   * is the v3.0 primary trigger; this method is the optional
   * secondary surface (per-card buttons, future spawn-auto-mount). */
  openPanel(sessionName: string): Promise<void>;
  onConsoleOpen(handler: (p: OpenPayload) => void): Cleanup;
  onConsoleClose(handler: (p: ClosePayload) => void): Cleanup;
  onStdoutChunk(handler: (p: StdoutChunkPayload) => void): Cleanup;
  onGap(handler: (p: GapPayload) => void): Cleanup;
  onError(handler: (p: ErrorPayload) => void): Cleanup;
}

function listener<T>(
  ipc: ConsoleBridgeIpc,
  channel: string,
  handler: (payload: T) => void,
): Cleanup {
  const wrapped = (_event: unknown, payload: unknown): void => handler(payload as T);
  ipc.on(channel, wrapped);
  return () => ipc.removeListener(channel, wrapped);
}

export function makeConsoleBridge(ipc: ConsoleBridgeIpc): ConsoleBridge {
  return {
    sendStdin: (sessionName, bytes, encoding = 'utf8') =>
      ipc.invoke('console:send-stdin', { sessionName, bytes, encoding }) as Promise<StdinAck>,
    signal: (sessionName, signal) =>
      ipc.invoke('console:signal', { sessionName, signal }) as Promise<SignalAck>,
    openPanel: (sessionName) =>
      ipc.invoke('console:open-panel', { sessionName }) as Promise<void>,
    onConsoleOpen: (h) => listener<OpenPayload>(ipc, 'console:open', h),
    onConsoleClose: (h) => listener<ClosePayload>(ipc, 'console:close', h),
    onStdoutChunk: (h) => listener<StdoutChunkPayload>(ipc, 'console:stdout-chunk', h),
    onGap: (h) => listener<GapPayload>(ipc, 'console:gap-detected', h),
    onError: (h) => listener<ErrorPayload>(ipc, 'console:error', h),
  };
}
