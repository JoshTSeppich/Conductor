// MB-T12 WB11b probe-01 — DetachTileIpcController unit tests.
//
// Verifies the main-process detach flow with mocked BrowserWindow factory
// and ipcMain. Covers: open() args, session-target registration, event
// routing through the registered target, close-cleanup (clear target +
// notify mainWindow), idempotent re-detach, multi-session isolation,
// and the registerHandlers ipcMain.handle wiring.

import { describe, it, expect, vi } from 'vitest';
import {
  DetachTileIpcController,
  type DetachTileWindowFactory,
  type DetachedWindowHandle,
  type DetachTileIpcMain,
} from '../../../src/main/detach-tile-ipc.js';

interface FakeWindow {
  handle: DetachedWindowHandle;
  triggerClose: () => void;
  sentMessages: Array<{ channel: string; payload: unknown }>;
  destroyed: boolean;
}

function makeFakeWindow(): FakeWindow {
  let closeCb: (() => void) | null = null;
  const sentMessages: FakeWindow['sentMessages'] = [];
  const w: FakeWindow = {
    handle: {
      send: (channel, payload) => {
        if (w.destroyed) return;
        sentMessages.push({ channel, payload });
      },
      onClosed: (cb) => {
        closeCb = cb;
      },
      isDestroyed: () => w.destroyed,
    },
    triggerClose: () => {
      w.destroyed = true;
      if (closeCb) closeCb();
    },
    sentMessages,
    destroyed: false,
  };
  return w;
}

interface FakeFactory {
  factory: DetachTileWindowFactory;
  openCalls: Array<{
    sessionName: string;
    consolePanelHtmlPath: string;
    preloadPath: string;
  }>;
  windows: FakeWindow[];
}

function makeFakeFactory(): FakeFactory {
  const openCalls: FakeFactory['openCalls'] = [];
  const windows: FakeWindow[] = [];
  return {
    factory: {
      open: async (opts) => {
        openCalls.push(opts);
        const w = makeFakeWindow();
        windows.push(w);
        return w.handle;
      },
    },
    openCalls,
    windows,
  };
}

describe('MB-T12 WB11b — DetachTileIpcController.detach', () => {
  it('opens a window via the factory with sessionName + paths', async () => {
    const f = makeFakeFactory();
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: '/dist/console-panel/console-panel.html',
      preloadPath: '/dist/main/preload.cjs',
      setSessionTarget: vi.fn(),
      notifyMainWindow: vi.fn(),
    });
    const result = await ctl.detach('sess-x');
    expect(result).toEqual({ ok: true });
    expect(f.openCalls).toEqual([
      {
        sessionName: 'sess-x',
        consolePanelHtmlPath: '/dist/console-panel/console-panel.html',
        preloadPath: '/dist/main/preload.cjs',
      },
    ]);
  });

  it('registers the session target with setSessionTarget on detach', async () => {
    const f = makeFakeFactory();
    const setSessionTarget = vi.fn();
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget,
      notifyMainWindow: vi.fn(),
    });
    await ctl.detach('sess-y');
    expect(setSessionTarget).toHaveBeenCalledTimes(1);
    expect(setSessionTarget).toHaveBeenCalledWith('sess-y', expect.any(Function));
  });

  it('the registered target sends events to the detached window', async () => {
    const f = makeFakeFactory();
    let registeredTarget:
      | ((channel: string, payload: unknown) => void)
      | null = null;
    const setSessionTarget = vi.fn(
      (
        _name: string,
        t: ((channel: string, payload: unknown) => void) | null,
      ) => {
        if (t) registeredTarget = t;
      },
    );
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget,
      notifyMainWindow: vi.fn(),
    });
    await ctl.detach('streaming-sess');
    expect(registeredTarget).toBeInstanceOf(Function);
    registeredTarget!('console:open', { sessionName: 'streaming-sess' });
    registeredTarget!('console:stdout-chunk', {
      sessionName: 'streaming-sess',
      stdoutSeq: 1,
      bytes: 'hello',
      encoding: 'utf8',
    });
    expect(f.windows[0].sentMessages).toEqual([
      { channel: 'console:open', payload: { sessionName: 'streaming-sess' } },
      {
        channel: 'console:stdout-chunk',
        payload: {
          sessionName: 'streaming-sess',
          stdoutSeq: 1,
          bytes: 'hello',
          encoding: 'utf8',
        },
      },
    ]);
  });

  it('the registered target does NOT send if the window is destroyed', async () => {
    const f = makeFakeFactory();
    let registeredTarget:
      | ((channel: string, payload: unknown) => void)
      | null = null;
    const setSessionTarget = vi.fn(
      (
        _name: string,
        t: ((channel: string, payload: unknown) => void) | null,
      ) => {
        if (t) registeredTarget = t;
      },
    );
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget,
      notifyMainWindow: vi.fn(),
    });
    await ctl.detach('post-close');
    f.windows[0].triggerClose();
    // After close, attempted send is a no-op (no message recorded).
    registeredTarget!('console:open', { sessionName: 'post-close' });
    expect(f.windows[0].sentMessages).toEqual([]);
  });

  it('window close clears session target + notifies main window', async () => {
    const f = makeFakeFactory();
    const setSessionTarget = vi.fn();
    const notifyMainWindow = vi.fn();
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget,
      notifyMainWindow,
    });
    await ctl.detach('close-test');
    expect(setSessionTarget).toHaveBeenCalledTimes(1);

    f.windows[0].triggerClose();
    expect(setSessionTarget).toHaveBeenCalledTimes(2);
    expect(setSessionTarget).toHaveBeenLastCalledWith('close-test', null);
    expect(notifyMainWindow).toHaveBeenCalledWith('close-test');
  });

  it('after close, internal map is cleaned (detachedCount goes to 0)', async () => {
    const f = makeFakeFactory();
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget: vi.fn(),
      notifyMainWindow: vi.fn(),
    });
    expect(ctl.detachedCount()).toBe(0);
    await ctl.detach('foo');
    expect(ctl.detachedCount()).toBe(1);
    expect(ctl.detachedSessions()).toEqual(['foo']);
    f.windows[0].triggerClose();
    expect(ctl.detachedCount()).toBe(0);
    expect(ctl.detachedSessions()).toEqual([]);
  });

  it('duplicate detach for same session is idempotent (no second window)', async () => {
    const f = makeFakeFactory();
    const setSessionTarget = vi.fn();
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget,
      notifyMainWindow: vi.fn(),
    });
    const r1 = await ctl.detach('twice');
    const r2 = await ctl.detach('twice');
    expect(r1).toEqual({ ok: true });
    expect(r2).toEqual({ ok: true });
    expect(f.openCalls).toHaveLength(1);
    expect(setSessionTarget).toHaveBeenCalledTimes(1);
    expect(ctl.detachedCount()).toBe(1);
  });

  it('multiple sessions detach independently', async () => {
    const f = makeFakeFactory();
    const setSessionTarget = vi.fn();
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget,
      notifyMainWindow: vi.fn(),
    });
    await ctl.detach('s1');
    await ctl.detach('s2');
    await ctl.detach('s3');
    expect(ctl.detachedCount()).toBe(3);
    expect(ctl.detachedSessions().sort()).toEqual(['s1', 's2', 's3']);
    expect(f.openCalls.map((c) => c.sessionName).sort()).toEqual(['s1', 's2', 's3']);
    expect(setSessionTarget).toHaveBeenCalledTimes(3);
  });

  it('closing one detached window does NOT affect other sessions', async () => {
    const f = makeFakeFactory();
    const setSessionTarget = vi.fn();
    const notifyMainWindow = vi.fn();
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget,
      notifyMainWindow,
    });
    await ctl.detach('s1');
    await ctl.detach('s2');
    f.windows[0].triggerClose(); // close s1 only
    expect(ctl.detachedCount()).toBe(1);
    expect(ctl.detachedSessions()).toEqual(['s2']);
    expect(notifyMainWindow).toHaveBeenCalledTimes(1);
    expect(notifyMainWindow).toHaveBeenCalledWith('s1');
  });
});

describe('MB-T12 WB11b — DetachTileIpcController.registerHandlers', () => {
  it('wires tile:detach handler to ipcMain.handle', async () => {
    const f = makeFakeFactory();
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget: vi.fn(),
      notifyMainWindow: vi.fn(),
    });
    const handle = vi.fn();
    const fakeIpcMain: DetachTileIpcMain = { handle };
    ctl.registerHandlers(fakeIpcMain);
    expect(handle).toHaveBeenCalledWith('tile:detach', expect.any(Function));
  });

  it('tile:detach handler delegates to detach() with the payload sessionName', async () => {
    const f = makeFakeFactory();
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget: vi.fn(),
      notifyMainWindow: vi.fn(),
    });

    let registeredHandler:
      | ((event: unknown, ...args: unknown[]) => Promise<unknown> | unknown)
      | null = null;
    const fakeIpcMain: DetachTileIpcMain = {
      handle: (channel, fn) => {
        if (channel === 'tile:detach') registeredHandler = fn;
      },
    };
    ctl.registerHandlers(fakeIpcMain);
    expect(registeredHandler).not.toBeNull();
    const result = await registeredHandler!({}, { sessionName: 'via-ipc' });
    expect(result).toEqual({ ok: true });
    expect(ctl.detachedCount()).toBe(1);
    expect(ctl.detachedSessions()).toEqual(['via-ipc']);
  });

  it('tile:detach handler rejects on missing sessionName', async () => {
    const f = makeFakeFactory();
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget: vi.fn(),
      notifyMainWindow: vi.fn(),
    });
    let registeredHandler:
      | ((event: unknown, ...args: unknown[]) => Promise<unknown> | unknown)
      | null = null;
    const fakeIpcMain: DetachTileIpcMain = {
      handle: (channel, fn) => {
        if (channel === 'tile:detach') registeredHandler = fn;
      },
    };
    ctl.registerHandlers(fakeIpcMain);
    await expect(registeredHandler!({}, {})).rejects.toThrow(/sessionName/);
    await expect(
      registeredHandler!({}, { sessionName: '' }),
    ).rejects.toThrow(/sessionName/);
    await expect(
      registeredHandler!({}, { sessionName: null }),
    ).rejects.toThrow(/sessionName/);
    await expect(registeredHandler!({}, undefined)).rejects.toThrow(/sessionName/);
  });
});

describe('MB-T12 WB11b — full detach → close integration sequence', () => {
  it('detach + send events + close: produces complete side-effect sequence', async () => {
    const f = makeFakeFactory();
    const setSessionTargetCalls: Array<[string, unknown]> = [];
    const notifyCalls: string[] = [];
    let registeredTarget:
      | ((channel: string, payload: unknown) => void)
      | null = null;
    const ctl = new DetachTileIpcController({
      windowFactory: f.factory,
      consolePanelHtmlPath: 'a',
      preloadPath: 'b',
      setSessionTarget: (name, t) => {
        setSessionTargetCalls.push([name, t === null ? null : 'fn']);
        if (t) registeredTarget = t;
      },
      notifyMainWindow: (name) => {
        notifyCalls.push(name);
      },
    });

    // Phase 1: detach
    await ctl.detach('e2e-sess');
    expect(setSessionTargetCalls).toEqual([['e2e-sess', 'fn']]);
    expect(f.windows).toHaveLength(1);

    // Phase 2: simulate a console event routing through the target
    registeredTarget!('console:stdout-chunk', {
      sessionName: 'e2e-sess',
      stdoutSeq: 5,
      bytes: 'live-data',
      encoding: 'utf8',
    });
    expect(f.windows[0].sentMessages).toHaveLength(1);
    expect(f.windows[0].sentMessages[0].channel).toBe('console:stdout-chunk');

    // Phase 3: operator closes the detached window
    f.windows[0].triggerClose();
    expect(setSessionTargetCalls).toEqual([
      ['e2e-sess', 'fn'],
      ['e2e-sess', null],
    ]);
    expect(notifyCalls).toEqual(['e2e-sess']);
    expect(ctl.detachedCount()).toBe(0);

    // Phase 4: re-detach is allowed (idempotent in absence; opens new window)
    await ctl.detach('e2e-sess');
    expect(ctl.detachedCount()).toBe(1);
    expect(f.windows).toHaveLength(2);
  });
});
