// CONSOLE-T02 Cluster 3 — Test 2/2: listener cleanup pattern.
//
// Pattern follows the existing coarchitectBridge in preload.mts (COARCH-T03):
// each on* method returns a cleanup function. Calling cleanup must remove the
// underlying ipcRenderer listener so multiple subscribe/unsubscribe cycles do
// not leak handlers.
//
// React panel components in CONSOLE-T03 will register/cleanup in useEffect
// returns; leaking handlers would cause duplicate render calls and a memory
// leak as panels open/close.
import { describe, it, expect, vi } from 'vitest';
import { makeConsoleBridge, type ConsoleBridgeIpc } from '../../../src/main/console-bridge.js';

function makeFakeIpcWithCounts(): {
  ipc: ConsoleBridgeIpc;
  countFor(channel: string): number;
} {
  const listeners = new Map<string, Set<unknown>>();

  const ipc: ConsoleBridgeIpc = {
    invoke: vi.fn(),
    send: vi.fn(),
    on: (channel, cb) => {
      const set = listeners.get(channel) ?? new Set();
      set.add(cb);
      listeners.set(channel, set);
    },
    removeListener: (channel, cb) => {
      const set = listeners.get(channel);
      if (set) set.delete(cb);
    },
  };

  return {
    ipc,
    countFor(channel) {
      return listeners.get(channel)?.size ?? 0;
    },
  };
}

describe('CONSOLE-T02 cluster 3 — listener cleanup', () => {
  it('onConsoleOpen returns a cleanup function that removes the listener', () => {
    const fake = makeFakeIpcWithCounts();
    const bridge = makeConsoleBridge(fake.ipc);

    const cleanup = bridge.onConsoleOpen(() => {});
    expect(fake.countFor('console:open')).toBe(1);
    expect(typeof cleanup).toBe('function');

    cleanup();
    expect(fake.countFor('console:open')).toBe(0);
  });

  it('every on* method returns a cleanup function', () => {
    const fake = makeFakeIpcWithCounts();
    const bridge = makeConsoleBridge(fake.ipc);

    const cleanups = [
      bridge.onConsoleOpen(() => {}),
      bridge.onConsoleClose(() => {}),
      bridge.onStdoutChunk(() => {}),
      bridge.onGap(() => {}),
      bridge.onError(() => {}),
    ];

    expect(fake.countFor('console:open')).toBe(1);
    expect(fake.countFor('console:close')).toBe(1);
    expect(fake.countFor('console:stdout-chunk')).toBe(1);
    expect(fake.countFor('console:gap-detected')).toBe(1);
    expect(fake.countFor('console:error')).toBe(1);

    for (const c of cleanups) c();

    expect(fake.countFor('console:open')).toBe(0);
    expect(fake.countFor('console:close')).toBe(0);
    expect(fake.countFor('console:stdout-chunk')).toBe(0);
    expect(fake.countFor('console:gap-detected')).toBe(0);
    expect(fake.countFor('console:error')).toBe(0);
  });

  it('repeated subscribe/cleanup cycles do not leak handlers', () => {
    const fake = makeFakeIpcWithCounts();
    const bridge = makeConsoleBridge(fake.ipc);

    for (let i = 0; i < 50; i++) {
      const cleanup = bridge.onStdoutChunk(() => {});
      cleanup();
    }

    expect(fake.countFor('console:stdout-chunk')).toBe(0);
  });
});
