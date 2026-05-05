// test-batch-1 Session B — console-ipc.ts coverage gap closure (Tier 1).
//
// Per operator scope decision §4: in scope IPC handler wiring + happy-path
// flow assertions. registerConsoleIpcHandlers wires four ipc.handle channels
// to ConsoleIpcController methods; this spec verifies the wiring contract.
//
// KNOWN: existing console-t02 specs cover the controller's open/close/
// stdout-chunk semantics directly. This spec covers the THIN wiring layer
// that connects ipcMain.handle to controller methods — uncovered in the
// pre-state because no existing spec touched registerConsoleIpcHandlers.
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  registerConsoleIpcHandlers,
  type ConsoleIpcController,
} from '../../../src/main/console-ipc.js';

interface FakeIpcMain {
  handle: ReturnType<typeof vi.fn>;
  handlers: Map<
    string,
    (event: unknown, ...args: unknown[]) => unknown | Promise<unknown>
  >;
}

function makeFakeIpc(): FakeIpcMain {
  const handlers = new Map<
    string,
    (event: unknown, ...args: unknown[]) => unknown | Promise<unknown>
  >();
  const handle = vi.fn(
    (
      channel: string,
      fn: (event: unknown, ...args: unknown[]) => unknown | Promise<unknown>,
    ) => {
      handlers.set(channel, fn);
    },
  );
  return { handle, handlers } as FakeIpcMain;
}

function makeFakeController(): {
  controller: ConsoleIpcController;
  spies: {
    handleSendStdin: ReturnType<typeof vi.fn>;
    handleSignal: ReturnType<typeof vi.fn>;
    openConsolePanel: ReturnType<typeof vi.fn>;
    closeConsolePanel: ReturnType<typeof vi.fn>;
  };
} {
  const handleSendStdin = vi
    .fn()
    .mockResolvedValue({ accepted: true, stdin_seq: 1 });
  const handleSignal = vi
    .fn()
    .mockResolvedValue({ accepted: true, dispatch_method: 'pty' });
  const openConsolePanel = vi.fn().mockResolvedValue(undefined);
  const closeConsolePanel = vi.fn().mockResolvedValue(undefined);
  return {
    controller: {
      handleSendStdin,
      handleSignal,
      openConsolePanel,
      closeConsolePanel,
    } as unknown as ConsoleIpcController,
    spies: {
      handleSendStdin,
      handleSignal,
      openConsolePanel,
      closeConsolePanel,
    },
  };
}

let fakeIpc: FakeIpcMain;
let controllerKit: ReturnType<typeof makeFakeController>;
const getWebContents = vi.fn().mockReturnValue(null);

beforeEach(() => {
  vi.clearAllMocks();
  fakeIpc = makeFakeIpc();
  controllerKit = makeFakeController();
  registerConsoleIpcHandlers({
    ipcMain: fakeIpc as never,
    getWebContents,
    controller: controllerKit.controller,
  });
});

describe('registerConsoleIpcHandlers — wiring contract', () => {
  it('registers exactly the four documented IPC channels', () => {
    // KNOWN: channel names match the renderer-side preload contract
    // (preload.mts). Renaming any of them is a renderer-coupled
    // breaking change.
    expect(Array.from(fakeIpc.handlers.keys()).sort()).toEqual([
      'console:close-panel',
      'console:open-panel',
      'console:send-stdin',
      'console:signal',
    ]);
  });

  it('returns the same controller instance that was passed in', () => {
    // Re-register with a captured controller and verify it's the
    // returned controller (not a freshly constructed one).
    const localIpc = makeFakeIpc();
    const localCtrl = makeFakeController();
    const ret = registerConsoleIpcHandlers({
      ipcMain: localIpc as never,
      getWebContents,
      controller: localCtrl.controller,
    });
    expect(ret).toBe(localCtrl.controller);
  });
});

describe('registerConsoleIpcHandlers — handler delegation (happy path)', () => {
  it('console:send-stdin handler forwards (sessionName, bytes, encoding) to controller', async () => {
    const fn = fakeIpc.handlers.get('console:send-stdin')!;
    const result = await fn(
      {},
      { sessionName: 'alpha', bytes: 'hi', encoding: 'utf8' },
    );
    expect(controllerKit.spies.handleSendStdin).toHaveBeenCalledWith(
      'alpha',
      'hi',
      'utf8',
    );
    expect(result).toEqual({ accepted: true, stdin_seq: 1 });
  });

  it('console:send-stdin defaults encoding to undefined (controller defaults to utf8 internally)', async () => {
    // KNOWN: console-ipc.ts:421 passes p.encoding as-is. When renderer
    // omits encoding, controller.handleSendStdin's default = 'utf8'
    // applies. Asserting undefined-passthrough confirms wiring is not
    // pre-defaulting encoding.
    const fn = fakeIpc.handlers.get('console:send-stdin')!;
    await fn({}, { sessionName: 'alpha', bytes: 'hi' });
    expect(controllerKit.spies.handleSendStdin).toHaveBeenCalledWith(
      'alpha',
      'hi',
      undefined,
    );
  });

  it('console:signal handler forwards (sessionName, signal) to controller', async () => {
    const fn = fakeIpc.handlers.get('console:signal')!;
    const result = await fn(
      {},
      { sessionName: 'alpha', signal: 'SIGINT' },
    );
    expect(controllerKit.spies.handleSignal).toHaveBeenCalledWith(
      'alpha',
      'SIGINT',
    );
    expect(result).toEqual({ accepted: true, dispatch_method: 'pty' });
  });

  it('console:open-panel handler forwards sessionName to controller.openConsolePanel', async () => {
    const fn = fakeIpc.handlers.get('console:open-panel')!;
    await fn({}, { sessionName: 'alpha' });
    expect(controllerKit.spies.openConsolePanel).toHaveBeenCalledWith('alpha');
  });

  it('console:close-panel handler forwards sessionName to controller.closeConsolePanel', async () => {
    const fn = fakeIpc.handlers.get('console:close-panel')!;
    await fn({}, { sessionName: 'alpha' });
    expect(controllerKit.spies.closeConsolePanel).toHaveBeenCalledWith('alpha');
  });
});

describe('registerConsoleIpcHandlers — handler error propagation', () => {
  it('console:open-panel surfaces controller errors (e.g., PanelCapExceeded)', async () => {
    // KNOWN: PanelCapExceeded is the panel-cap ship-gate. operator-
    // experiential path: clicking "open" when at cap must surface a
    // typed error to the renderer for toast display. The IPC handler
    // must not swallow the error.
    controllerKit.spies.openConsolePanel.mockRejectedValueOnce(
      new Error('PanelCapExceeded'),
    );
    const fn = fakeIpc.handlers.get('console:open-panel')!;
    await expect(fn({}, { sessionName: 'alpha' })).rejects.toThrow(
      /PanelCapExceeded/,
    );
  });

  it('console:send-stdin surfaces controller errors (e.g., daemon non-ok)', async () => {
    controllerKit.spies.handleSendStdin.mockRejectedValueOnce(
      new Error('POST /console/stdin failed: HTTP 422'),
    );
    const fn = fakeIpc.handlers.get('console:send-stdin')!;
    await expect(
      fn({}, { sessionName: 'alpha', bytes: 'hi', encoding: 'utf8' }),
    ).rejects.toThrow(/HTTP 422/);
  });
});
