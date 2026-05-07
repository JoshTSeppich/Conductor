// MB-T12 WB12 — tile-grid renderer entry point.
//
// Replaces the WB1 placeholder. Auto-mounts <TileGridApp> (WB9) into
// `#tile-grid-root` with bridges from window.workstationBridge +
// window.consoleBridge. Uses `createElement` (not JSX literal syntax) so
// this file can stay .ts and remain in tsc's typecheck scope, mirroring
// the src/console-panel/mount.ts pattern.
//
// Loaded by workstation-shell.html (after WB12 wires the
// `<script src="../tile-grid/renderer.js">` tag).
//
// WB12 ships in-memory session state. Persistence callbacks (write to
// tile-grid-state.json via main-process IPC) are deferred to a follow-up
// (MB-F-T12-RENDERER-PERSISTENCE-WIRING, Tier 2, filed at WB14). The
// renderer-side TileGridApp accepts `onPersistSessions` /
// `onPersistGridOverride` callback props that the follow-up will wire
// to ipcRenderer.invoke('tile-grid-state:write-*', ...) handlers
// (handlers also part of the follow-up).

import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from './tile-grid-app.js';
import {
  createXtermAdapter,
  type TerminalAdapter,
} from '../console-panel/terminal-adapter.js';
import type { ConsoleBridge } from '../main/console-bridge.js';

declare global {
  interface Window {
    /** Exposed by preload.mts contextBridge (workstationBridge + WB11b
     *  detachTile/onTileDetachClosed extensions). */
    workstationBridge?: WorkstationBridgeShape & Record<string, unknown>;
  }
}

export interface TileGridMountOptions {
  readonly rootElementId?: string;
  /** Test seam — defaults to window.workstationBridge. */
  readonly workstationBridge?: WorkstationBridgeShape | null;
  /** Test seam — defaults to window.consoleBridge. */
  readonly consoleBridge?: ConsoleBridge | null;
  readonly createTerminal?: () => TerminalAdapter;
}

export type TileGridMountResult =
  | { mounted: true; dispose: () => void }
  | { mounted: false; reason: 'no-root' | 'no-workstation-bridge' | 'no-console-bridge' };

/** Mounts <TileGridApp> into the DOM element identified by `rootElementId`
 *  (default: 'tile-grid-root'). Returns either {mounted:true, dispose} for
 *  programmatic cleanup or {mounted:false, reason} when preconditions
 *  aren't met. */
export function tryAutoMountTileGrid(
  opts: TileGridMountOptions = {},
): TileGridMountResult {
  const rootId = opts.rootElementId ?? 'tile-grid-root';
  const workstationBridge =
    opts.workstationBridge !== undefined
      ? opts.workstationBridge
      : window.workstationBridge ?? null;
  const consoleBridge =
    opts.consoleBridge !== undefined
      ? opts.consoleBridge
      : window.consoleBridge ?? null;
  const root = document.getElementById(rootId);

  if (!root) return { mounted: false, reason: 'no-root' };
  if (!workstationBridge) return { mounted: false, reason: 'no-workstation-bridge' };
  if (!consoleBridge) return { mounted: false, reason: 'no-console-bridge' };

  const reactRoot = createRoot(root);
  const createTerminal: () => TerminalAdapter =
    opts.createTerminal ?? defaultLazyAdapterFactory;
  reactRoot.render(
    createElement(TileGridApp, {
      workstationBridge,
      consoleBridge,
      createTerminal,
    }),
  );
  return { mounted: true, dispose: () => reactRoot.unmount() };
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

// Production auto-mount on bundle load. Tests skip this by importing the
// function directly and supplying their own TileGridMountOptions.
tryAutoMountTileGrid();
