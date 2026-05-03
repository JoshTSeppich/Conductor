// CONSOLE-T02 test helpers — mock WebSocket factory + emit-capture sink.
//
// Per vision §10.7: shell process owns the WS connection to the daemon stream
// endpoint. Tests inject a mock WebSocket that exposes simulate* methods so the
// shell-side controller can be exercised without a running daemon.
//
// The emit-capture sink mimics the Electron webContents.send signature so the
// controller can be tested without spawning a real renderer process.
import type {
  ConsoleDaemonClient,
  ConsoleWebSocket,
  ConsoleWebSocketFactory,
} from '../../../src/main/console-ipc.js';

export interface CapturedEmit {
  channel: string;
  payload: unknown;
}

export class EmitCaptureSink {
  readonly emits: CapturedEmit[] = [];

  emit = (channel: string, payload: unknown): void => {
    this.emits.push({ channel, payload });
  };

  byChannel(channel: string): CapturedEmit[] {
    return this.emits.filter((e) => e.channel === channel);
  }

  reset(): void {
    this.emits.length = 0;
  }
}

export interface MockSocket extends ConsoleWebSocket {
  url: string;
  sent: unknown[];
  closed: boolean;
  closeCode: number | null;
  // Test-only triggers:
  simulateOpen(): void;
  simulateMessage(obj: unknown): void;
  simulateClose(code?: number, reason?: string): void;
  simulateError(err: Error): void;
}

export interface MockSocketFactory {
  factory: ConsoleWebSocketFactory;
  sockets: MockSocket[];
  lastSocket(): MockSocket;
  socketFor(url: string): MockSocket | undefined;
}

export function makeMockSocketFactory(): MockSocketFactory {
  const sockets: MockSocket[] = [];

  const factory: ConsoleWebSocketFactory = (url: string) => {
    const listeners = {
      open: [] as Array<() => void>,
      message: [] as Array<(data: string) => void>,
      close: [] as Array<(code: number, reason: string) => void>,
      error: [] as Array<(err: Error) => void>,
    };

    const sock: MockSocket = {
      url,
      sent: [],
      closed: false,
      closeCode: null,
      send: (data: string): void => {
        sock.sent.push(JSON.parse(data));
      },
      close: (code = 1000): void => {
        if (sock.closed) return;
        sock.closed = true;
        sock.closeCode = code;
        for (const l of listeners.close) l(code, '');
      },
      on: (event, cb): void => {
        // Accept either 'message' callback signatures used in this codebase.
        if (event === 'open') listeners.open.push(cb as () => void);
        else if (event === 'message') listeners.message.push(cb as (d: string) => void);
        else if (event === 'close') listeners.close.push(cb as (c: number, r: string) => void);
        else if (event === 'error') listeners.error.push(cb as (e: Error) => void);
      },
      simulateOpen: (): void => {
        for (const l of listeners.open) l();
      },
      simulateMessage: (obj: unknown): void => {
        const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
        for (const l of listeners.message) l(s);
      },
      simulateClose: (code = 1006, reason = ''): void => {
        if (sock.closed) return;
        sock.closed = true;
        sock.closeCode = code;
        for (const l of listeners.close) l(code, reason);
      },
      simulateError: (err: Error): void => {
        for (const l of listeners.error) l(err);
      },
    };

    sockets.push(sock);
    return sock;
  };

  return {
    factory,
    sockets,
    lastSocket(): MockSocket {
      const last = sockets[sockets.length - 1];
      if (!last) throw new Error('no socket created yet');
      return last;
    },
    socketFor(url: string): MockSocket | undefined {
      return sockets.find((s) => s.url === url);
    },
  };
}

export class MockDaemonClient implements ConsoleDaemonClient {
  readonly stdinCalls: Array<{ name: string; bytes: string; encoding: 'utf8' | 'base64' }> = [];
  readonly signalCalls: Array<{ name: string; signal: 'SIGINT' | 'SIGTERM' | 'SIGHUP' }> = [];

  stdinResponse: { accepted: boolean; stdin_seq: number } = { accepted: true, stdin_seq: 1 };
  signalResponse: { accepted: boolean; dispatch_method: string } = {
    accepted: true,
    dispatch_method: 'pty_byte',
  };
  stdinError: Error | null = null;
  signalError: Error | null = null;

  async sendStdin(
    name: string,
    bytes: string,
    encoding: 'utf8' | 'base64',
  ): Promise<{ accepted: boolean; stdin_seq: number }> {
    this.stdinCalls.push({ name, bytes, encoding });
    if (this.stdinError) throw this.stdinError;
    return this.stdinResponse;
  }

  async sendSignal(
    name: string,
    signal: 'SIGINT' | 'SIGTERM' | 'SIGHUP',
  ): Promise<{ accepted: boolean; dispatch_method: string }> {
    this.signalCalls.push({ name, signal });
    if (this.signalError) throw this.signalError;
    return this.signalResponse;
  }

  streamUrl(name: string): string {
    return `ws://daemon.test/v3/sessions/${encodeURIComponent(name)}/console/stream?token=test-token`;
  }
}
