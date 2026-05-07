// MB-T12 WB11b — main-process IPC handler for the tile detach-to-window
// flow.
//
// Per Q-MBT12-4=a (operator-arbitrated 2026-05-07): detach opens a NEW
// BrowserWindow that loads `console-panel.html?session=<name>` reusing
// the same preload.cjs as the main window (so the detached window has
// access to consoleBridge). The mount.ts auto-mount path (WB11a) reads
// the URL query param and mounts a single ConsolePanel bound to that
// session. Console events for the detached session route via
// ConsoleIpcController.setSessionTarget (WB11a multi-target refactor)
// to the detached window's webContents.
//
// On window close: this controller clears the session target (events
// revert to mainWindow), removes the entry from its internal map, and
// notifies the main window via 'tile:detach-closed' so the renderer
// (TileGridApp) can flip status back to 'open' and re-mount ConsolePanel
// in the main grid.
//
// Dependency injection seam: the BrowserWindow factory + path helpers +
// callbacks (setSessionTarget, notifyMainWindow) are all injected via
// constructor options. Tests use a fake factory that returns a stub
// window handle; production uses createDefaultWindowFactory() which
// wraps Electron's BrowserWindow.

import type { BrowserWindow as BrowserWindowType } from 'electron';

export interface DetachedWindowHandle {
  /** Send an IPC message to this window's webContents. */
  send: (channel: string, payload: unknown) => void;
  /** Subscribe to the window's 'closed' event. Called once. */
  onClosed: (cb: () => void) => void;
  /** Returns true if the window has been destroyed (closed). */
  isDestroyed: () => boolean;
}

export interface DetachTileWindowFactory {
  /** Constructs a new BrowserWindow loading console-panel.html with the
   *  session injected via URL query param. Returns a handle that the
   *  controller uses to send events + register a close listener. */
  open(opts: {
    sessionName: string;
    consolePanelHtmlPath: string;
    preloadPath: string;
  }): Promise<DetachedWindowHandle>;
}

/** Minimal shape of Electron's ipcMain that we depend on. Tests inject a
 *  fake; production passes the real `ipcMain` singleton. */
export interface DetachTileIpcMain {
  handle: (
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown,
  ) => void;
}

export interface DetachTileIpcOptions {
  readonly windowFactory: DetachTileWindowFactory;
  readonly consolePanelHtmlPath: string;
  readonly preloadPath: string;
  /** Plumb-through to ConsoleIpcController.setSessionTarget (WB11a).
   *  Called with `(sessionName, target)` on detach() and `(sessionName, null)`
   *  on window close. */
  readonly setSessionTarget: (
    sessionName: string,
    target: ((channel: string, payload: unknown) => void) | null,
  ) => void;
  /** Send 'tile:detach-closed' to the main window's webContents so the
   *  renderer can re-mount the ConsolePanel for that session. */
  readonly notifyMainWindow: (sessionName: string) => void;
}

export class DetachTileIpcController {
  private readonly windows = new Map<string, DetachedWindowHandle>();
  private readonly opts: DetachTileIpcOptions;

  constructor(opts: DetachTileIpcOptions) {
    this.opts = opts;
  }

  /** Register the 'tile:detach' invoke handler on ipcMain. Call once
   *  during app startup (typically in main.ts after createWindow). */
  registerHandlers(ipcMain: DetachTileIpcMain): void {
    ipcMain.handle('tile:detach', async (_event, ...args) => {
      const payload = args[0];
      const sessionName =
        payload !== null && typeof payload === 'object'
          ? (payload as Record<string, unknown>)['sessionName']
          : undefined;
      if (typeof sessionName !== 'string' || sessionName.length === 0) {
        throw new Error(
          "tile:detach requires a payload of shape { sessionName: string }",
        );
      }
      return this.detach(sessionName);
    });
  }

  /** Open a detached window for `sessionName`. Idempotent: if already
   *  detached, returns ok=true without creating a second window. */
  async detach(sessionName: string): Promise<{ ok: true }> {
    if (this.windows.has(sessionName)) {
      return { ok: true };
    }
    const handle = await this.opts.windowFactory.open({
      sessionName,
      consolePanelHtmlPath: this.opts.consolePanelHtmlPath,
      preloadPath: this.opts.preloadPath,
    });
    this.windows.set(sessionName, handle);

    // Route this session's console events to the detached window.
    this.opts.setSessionTarget(sessionName, (channel, payload) => {
      if (!handle.isDestroyed()) {
        handle.send(channel, payload);
      }
    });

    // Cleanup on window close: clear the session target (so events
    // revert to mainWindow), drop from the internal map, and notify
    // the main window so the renderer can re-mount the tile.
    handle.onClosed(() => {
      this.windows.delete(sessionName);
      this.opts.setSessionTarget(sessionName, null);
      this.opts.notifyMainWindow(sessionName);
    });

    return { ok: true };
  }

  /** Diagnostics — number of currently detached windows. */
  detachedCount(): number {
    return this.windows.size;
  }

  /** Diagnostics — sessionNames of currently detached windows. */
  detachedSessions(): string[] {
    return [...this.windows.keys()];
  }
}

/** Production factory that wraps Electron's BrowserWindow. Pass the
 *  imported `BrowserWindow` constructor at app startup; main.ts owns
 *  the Electron import. */
export function createDefaultWindowFactory(
  BrowserWindow: typeof BrowserWindowType,
): DetachTileWindowFactory {
  return {
    open: async ({ sessionName, consolePanelHtmlPath, preloadPath }) => {
      const win = new BrowserWindow({
        width: 800,
        height: 600,
        title: `Console — ${sessionName}`,
        webPreferences: {
          preload: preloadPath,
          sandbox: true,
          contextIsolation: true,
        },
      });
      const url = `file://${consolePanelHtmlPath}?session=${encodeURIComponent(sessionName)}`;
      await win.loadURL(url);
      return {
        send: (channel, payload) => {
          if (!win.isDestroyed()) {
            win.webContents.send(channel, payload);
          }
        },
        onClosed: (cb) => {
          win.once('closed', cb);
        },
        isDestroyed: () => win.isDestroyed(),
      };
    },
  };
}
