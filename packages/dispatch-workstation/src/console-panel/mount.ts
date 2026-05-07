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

// MB-T12 WB4 deprecation: the auto-mount-into-#console-root path is
// removed. Pre-MB-T12 the console-panel renderer auto-mounted a single
// ConsolePanel into #console-root — multi-panel rendering was blocked
// (MB-F-CONSOLE-T03-MULTI-PANEL). Post-MB-T12 the tile-grid React tree
// (WB6) calls `mountConsolePanel(...)` programmatically, once per tile,
// passing a distinct `targetSessionName` per call. WB12 wires the
// tile-grid bundle into workstation-shell.html and removes the
// `<script src="../console-panel/renderer.js">` tag (or repurposes it).
//
// During WB4-WB11 the workstation has no console-panel rendered in the
// shell (the tile-grid bundle isn't wired yet); this is intentional and
// reflects the in-flight nature of the ladder. The standalone
// console-panel.html dev-preview path requires the bridge AND a
// `targetSessionName` to render usefully — operators load via the
// Workstation shell once WB12 is complete.

const bridge = window.consoleBridge;
const standalone = document.getElementById('console-root');
if (!bridge && standalone) {
  standalone.textContent =
    'window.consoleBridge not available — open via Workstation shell.';
}
