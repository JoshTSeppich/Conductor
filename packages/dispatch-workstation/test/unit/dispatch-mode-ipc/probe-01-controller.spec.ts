// MB-T24 WB3 probe-01 — dispatch-mode-ipc controller spec table.
//
// Exercises DispatchModeIpcController: registers two channels
// ('dispatch-mode:get' + 'dispatch-mode:set'), payload validation on set,
// echo-back from set, deps-injection seam.
//
// Per Q-MBT24-6=c (NEW dispatchModeBridge — additive surface) +
// Q-MBT24-7=a (DispatchMode = 'auto' | 'ask') 2026-05-08.
//
// Test isolation: in-memory store closure (no fs) — validates IPC layer
// wiring over readDispatchMode/writeDispatchMode-shaped deps without
// touching the actual file. Mirrors test/unit/autopilot-ipc/probe-01
// pattern (in-memory store, fake ipcMain).

import { describe, it, expect } from 'vitest';
import {
  DispatchModeIpcController,
  createDefaultDispatchModeIpcController,
  type DispatchModeIpcMain,
} from '../../../src/main/dispatch-mode-ipc.js';
import type { DispatchMode } from '../../../src/main/dispatch-mode-store.js';

interface FakeIpcMain extends DispatchModeIpcMain {
  registered: Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  >;
}

function makeFakeIpcMain(): FakeIpcMain {
  const registered = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  >();
  return {
    registered,
    handle: (channel, fn) => {
      registered.set(channel, fn);
    },
  };
}

function makeFakeStore(initial: DispatchMode = 'ask'): {
  read: () => DispatchMode;
  write: (mode: DispatchMode) => void;
  current: () => DispatchMode;
} {
  let mode: DispatchMode = initial;
  return {
    read: () => mode,
    write: (m) => {
      mode = m;
    },
    current: () => mode,
  };
}

describe('MB-T24 WB3 — DispatchModeIpcController register + handle', () => {
  it('registers both channels on registerHandlers', () => {
    const store = makeFakeStore();
    const ctl = new DispatchModeIpcController(store);
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    expect(ipc.registered.has('dispatch-mode:get')).toBe(true);
    expect(ipc.registered.has('dispatch-mode:set')).toBe(true);
  });

  it("'dispatch-mode:get' returns the persisted mode", async () => {
    const store = makeFakeStore('ask');
    const ctl = new DispatchModeIpcController(store);
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const handler = ipc.registered.get('dispatch-mode:get')!;
    expect(await handler(null)).toBe('ask');

    store.write('auto');
    expect(await handler(null)).toBe('auto');
  });

  it("'dispatch-mode:set' persists payload + returns echoed value", async () => {
    const store = makeFakeStore('ask');
    const ctl = new DispatchModeIpcController(store);
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const handler = ipc.registered.get('dispatch-mode:set')!;
    const result = await handler(null, { mode: 'auto' });
    expect(result).toBe('auto');
    expect(store.current()).toBe('auto');
  });

  it("'dispatch-mode:set' supports flipping back to 'ask'", async () => {
    const store = makeFakeStore('auto');
    const ctl = new DispatchModeIpcController(store);
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const handler = ipc.registered.get('dispatch-mode:set')!;
    const result = await handler(null, { mode: 'ask' });
    expect(result).toBe('ask');
    expect(store.current()).toBe('ask');
  });
});

describe('MB-T24 WB3 — DispatchModeIpcController payload validation', () => {
  it("'dispatch-mode:set' throws on missing payload", async () => {
    const store = makeFakeStore();
    const ctl = new DispatchModeIpcController(store);
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const handler = ipc.registered.get('dispatch-mode:set')!;
    await expect(handler(null)).rejects.toThrow(/requires/i);
  });

  it("'dispatch-mode:set' throws on null payload", async () => {
    const store = makeFakeStore();
    const ctl = new DispatchModeIpcController(store);
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const handler = ipc.registered.get('dispatch-mode:set')!;
    await expect(handler(null, null)).rejects.toThrow(/requires/i);
  });

  it("'dispatch-mode:set' throws on invalid mode value", async () => {
    const store = makeFakeStore();
    const ctl = new DispatchModeIpcController(store);
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const handler = ipc.registered.get('dispatch-mode:set')!;
    await expect(handler(null, { mode: 'wat' })).rejects.toThrow(
      /invalid mode/i,
    );
  });

  it("'dispatch-mode:set' throws on missing mode field", async () => {
    const store = makeFakeStore();
    const ctl = new DispatchModeIpcController(store);
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const handler = ipc.registered.get('dispatch-mode:set')!;
    await expect(handler(null, {})).rejects.toThrow(/invalid mode/i);
  });

  it("'dispatch-mode:set' invalid payload does NOT mutate store", async () => {
    const store = makeFakeStore('ask');
    const ctl = new DispatchModeIpcController(store);
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const handler = ipc.registered.get('dispatch-mode:set')!;
    await expect(handler(null, { mode: 'wat' })).rejects.toThrow();
    expect(store.current()).toBe('ask');
  });
});

describe('MB-T24 WB3 — createDefaultDispatchModeIpcController factory', () => {
  it('returns a DispatchModeIpcController instance', () => {
    const ctl = createDefaultDispatchModeIpcController();
    expect(ctl).toBeInstanceOf(DispatchModeIpcController);
  });

  it('default factory wires both channels successfully', () => {
    const ctl = createDefaultDispatchModeIpcController();
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    expect(ipc.registered.size).toBe(2);
  });
});
