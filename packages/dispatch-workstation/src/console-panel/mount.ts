import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { ConsolePanel } from './console-panel.js';
import {
  createXtermAdapter,
  type TerminalAdapter,
} from './terminal-adapter.js';
import type { ConsoleBridge } from '../main/console-bridge.js';

// CONSOLE-T03 mount.ts — auto-mounts the React ConsolePanel into #console-root
// when window.consoleBridge is present (preload.mts exposes it; CONSOLE-T02
// b138548 wired the contextBridge surface).
//
// Pattern mirrors src/coarchitect/mount.ts (COARCH-T02/T03 precedent): the
// renderer bundle is auto-loaded by workstation-shell.html (or a standalone
// console-panel.html for isolated dev), looks up the bridge, and mounts the
// React tree. If the bridge is absent (standalone dev preview without
// Electron), the file degrades to a one-time "no bridge" message rather than
// crashing — the operator path is always Electron + preload.

declare global {
  interface Window {
    consoleBridge?: ConsoleBridge;
  }
}

export interface ConsolePanelMountOptions {
  readonly rootElementId: string;
  readonly consoleBridge: ConsoleBridge;
  /** WB4 / WB11: the session this panel is bound to. ConsolePanel filters
   *  bridge events by `p.sessionName === targetSessionName`. */
  readonly targetSessionName: string;
  readonly createTerminal?: () => TerminalAdapter;
}

/** Mounts ConsolePanel into the DOM element identified by rootElementId. */
export function mountConsolePanel(opts: ConsolePanelMountOptions): () => void {
  const rootEl = document.getElementById(opts.rootElementId);
  if (!rootEl) throw new Error(`#${opts.rootElementId} not found`);
  const root = createRoot(rootEl);
  // The xterm adapter is async (lazy-imports @xterm/xterm). We wrap it in a
  // sync factory shim that returns a "pending" adapter and swaps in the real
  // one when the import resolves. Cluster 1 GREEN spec: createTerminal() is
  // sync; the cluster invariant is preserved by buffering writes through a
  // queue until the real adapter takes over.
  const createTerminal: () => TerminalAdapter =
    opts.createTerminal ?? defaultLazyAdapterFactory;
  root.render(
    createElement(ConsolePanel, {
      targetSessionName: opts.targetSessionName,
      consoleBridge: opts.consoleBridge,
      createTerminal,
    }),
  );
  return () => root.unmount();
}

function defaultLazyAdapterFactory(): TerminalAdapter {
  let real: TerminalAdapter | null = null;
  let containerHeld: HTMLElement | null = null;
  const queued: string[] = [];
  void createXtermAdapter().then((r) => {
    real = r;
    if (containerHeld) r.open(containerHeld);
    for (const data of queued) r.write(data);
    queued.length = 0;
  });
  return {
    open(container) {
      if (real) real.open(container);
      else containerHeld = container;
    },
    write(data) {
      if (real) real.write(data);
      else queued.push(data);
    },
    dispose() {
      if (real) real.dispose();
      real = null;
      containerHeld = null;
      queued.length = 0;
    },
  };
}

// MB-T12 WB4 deprecation + WB11 detached-window auto-mount.
//
// Pre-MB-T12 the console-panel renderer auto-mounted a single ConsolePanel
// into #console-root with no targetSessionName — multi-panel rendering
// was blocked (MB-F-CONSOLE-T03-MULTI-PANEL). Post-MB-T12 the tile-grid
// React tree (WB6) calls `mountConsolePanel(...)` programmatically, once
// per tile, passing a distinct `targetSessionName` per call.
//
// WB11 adds the detached-window path: when an operator clicks a tile's
// detach button, the main process opens a NEW BrowserWindow loading
// console-panel.html with `?session=<name>` query param. The auto-mount
// block reads the query param and mounts a single ConsolePanel bound to
// that session. The detached window's console:* events route via
// ConsoleIpcController.setSessionTarget (WB11 multi-target refactor).
//
// Standalone dev-preview path (loading console-panel.html in a non-Electron
// browser without query param): renders the "no bridge" placeholder.

export interface AutoMountOptions {
  /** Test seam — defaults to window.location.href. */
  readonly urlString?: string;
  /** Test seam — defaults to window.consoleBridge. Pass null to simulate
   *  a missing bridge (e.g., loading console-panel.html in a non-Electron
   *  browser preview). */
  readonly bridge?: ConsoleBridge | null;
  readonly createTerminal?: () => TerminalAdapter;
}

export type AutoMountResult =
  | { mounted: true; sessionName: string }
  | { mounted: false; reason: 'no-bridge' | 'no-session' | 'no-root' };

/**
 * WB11 — standalone-window auto-mount entry point. Reads `?session=<name>`
 * from the URL, looks up window.consoleBridge, and mounts a ConsolePanel
 * into #console-root if all preconditions are met. Exported for testability;
 * the bundle's load-time call below invokes this with no overrides.
 */
export function tryAutoMountStandalone(opts: AutoMountOptions = {}): AutoMountResult {
  const urlString = opts.urlString ?? window.location.href;
  const bridge = opts.bridge !== undefined ? opts.bridge : window.consoleBridge;
  const url = new URL(urlString);
  const sessionFromUrl = url.searchParams.get('session');
  const standalone = document.getElementById('console-root');

  if (!standalone) {
    return { mounted: false, reason: 'no-root' };
  }
  if (!bridge) {
    standalone.textContent =
      'window.consoleBridge not available — open via Workstation shell.';
    return { mounted: false, reason: 'no-bridge' };
  }
  if (!sessionFromUrl || sessionFromUrl.length === 0) {
    return { mounted: false, reason: 'no-session' };
  }
  mountConsolePanel({
    rootElementId: 'console-root',
    consoleBridge: bridge,
    targetSessionName: sessionFromUrl,
    createTerminal: opts.createTerminal,
  });
  return { mounted: true, sessionName: sessionFromUrl };
}

// Production auto-mount on bundle load. Tests skip this by importing the
// function directly and supplying their own AutoMountOptions.
tryAutoMountStandalone();
