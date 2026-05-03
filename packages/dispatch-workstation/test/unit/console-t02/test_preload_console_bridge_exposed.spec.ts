// CONSOLE-T02 Cluster 3 — Test 1/2: consoleBridge surface in webview context.
//
// Vision §10.7: webview gains a contextBridge surface for the five message
// types. Webview-receives types (open/close/stdout-chunk + auxiliary
// gap/error events) get on*-style listener registration; webview-sends
// types (send-stdin/signal) get invoke-style methods.
//
// Preload uses Electron's contextBridge to expose this surface as
// window.consoleBridge in the renderer. The shape factory is extracted to
// console-bridge.ts so it can be unit-tested without booting electron;
// preload.mts wires it into contextBridge.exposeInMainWorld.
//
// RED state: src/main/console-bridge.ts absent → import fails → FAIL.
import { describe, it, expect, vi } from 'vitest';
import { makeConsoleBridge, type ConsoleBridgeIpc } from '../../../src/main/console-bridge.js';

function makeFakeIpc(): {
  ipc: ConsoleBridgeIpc;
  invokeCalls: Array<{ channel: string; args: unknown[] }>;
  listeners: Map<string, Array<(event: unknown, ...args: unknown[]) => void>>;
  emit(channel: string, ...args: unknown[]): void;
} {
  const invokeCalls: Array<{ channel: string; args: unknown[] }> = [];
  const listeners = new Map<string, Array<(event: unknown, ...args: unknown[]) => void>>();

  const ipc: ConsoleBridgeIpc = {
    invoke: vi.fn(async (channel: string, ...args: unknown[]) => {
      invokeCalls.push({ channel, args });
      return { ok: true, channel };
    }),
    send: vi.fn((_channel: string, ..._args: unknown[]) => {
      /* no-op for tests */
    }),
    on: (channel, cb) => {
      const list = listeners.get(channel) ?? [];
      list.push(cb);
      listeners.set(channel, list);
    },
    removeListener: (channel, cb) => {
      const list = listeners.get(channel) ?? [];
      const idx = list.indexOf(cb);
      if (idx >= 0) list.splice(idx, 1);
      listeners.set(channel, list);
    },
  };

  return {
    ipc,
    invokeCalls,
    listeners,
    emit(channel, ...args) {
      const list = listeners.get(channel) ?? [];
      for (const cb of list.slice()) cb({}, ...args);
    },
  };
}

describe('CONSOLE-T02 cluster 3 — consoleBridge surface', () => {
  it('exposes required methods: sendStdin, signal, onConsoleOpen, onConsoleClose, onStdoutChunk, onGap, onError', () => {
    const { ipc } = makeFakeIpc();
    const bridge = makeConsoleBridge(ipc);

    expect(typeof bridge.sendStdin).toBe('function');
    expect(typeof bridge.signal).toBe('function');
    expect(typeof bridge.onConsoleOpen).toBe('function');
    expect(typeof bridge.onConsoleClose).toBe('function');
    expect(typeof bridge.onStdoutChunk).toBe('function');
    expect(typeof bridge.onGap).toBe('function');
    expect(typeof bridge.onError).toBe('function');
  });

  it('sendStdin invokes "console:send-stdin" with {sessionName, bytes, encoding}', async () => {
    const { ipc, invokeCalls } = makeFakeIpc();
    const bridge = makeConsoleBridge(ipc);

    await bridge.sendStdin('s1', 'hello', 'utf8');

    expect(invokeCalls).toEqual([
      { channel: 'console:send-stdin', args: [{ sessionName: 's1', bytes: 'hello', encoding: 'utf8' }] },
    ]);
  });

  it('sendStdin defaults encoding to utf8 when omitted', async () => {
    const { ipc, invokeCalls } = makeFakeIpc();
    const bridge = makeConsoleBridge(ipc);

    await bridge.sendStdin('s1', 'plain');

    expect(invokeCalls[0]?.args[0]).toEqual({ sessionName: 's1', bytes: 'plain', encoding: 'utf8' });
  });

  it('signal invokes "console:signal" with {sessionName, signal}', async () => {
    const { ipc, invokeCalls } = makeFakeIpc();
    const bridge = makeConsoleBridge(ipc);

    await bridge.signal('s1', 'SIGINT');

    expect(invokeCalls).toEqual([
      { channel: 'console:signal', args: [{ sessionName: 's1', signal: 'SIGINT' }] },
    ]);
  });

  it('onConsoleOpen handler fires when ipc.on("console:open") emits', () => {
    const fake = makeFakeIpc();
    const bridge = makeConsoleBridge(fake.ipc);
    const heard: Array<{ sessionName: string }> = [];

    bridge.onConsoleOpen((p) => heard.push(p));
    fake.emit('console:open', { sessionName: 's1' });

    expect(heard).toEqual([{ sessionName: 's1' }]);
  });

  it('onConsoleClose / onStdoutChunk / onGap / onError fire on their respective channels', () => {
    const fake = makeFakeIpc();
    const bridge = makeConsoleBridge(fake.ipc);
    const log: Array<[string, unknown]> = [];

    bridge.onConsoleClose((p) => log.push(['close', p]));
    bridge.onStdoutChunk((p) => log.push(['chunk', p]));
    bridge.onGap((p) => log.push(['gap', p]));
    bridge.onError((p) => log.push(['error', p]));

    fake.emit('console:close', { sessionName: 's1' });
    fake.emit('console:stdout-chunk', { sessionName: 's1', stdoutSeq: 1, bytes: 'b', encoding: 'utf8' });
    fake.emit('console:gap-detected', { sessionName: 's1', availableFromSeq: 5, currentSeq: 50 });
    fake.emit('console:error', { sessionName: 's1', message: 'boom' });

    expect(log.map((l) => l[0])).toEqual(['close', 'chunk', 'gap', 'error']);
  });
});
