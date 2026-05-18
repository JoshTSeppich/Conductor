// MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE WB7 — Renderer auto-mount entry.
//
// Per arbitration Q-MVP-W1-6=(c) (overlay strategy) + Q-MVP-W1-7=(a) (shared
// window via auto-mount) operator ack 17:55 MDT: this bundle attaches to the
// renderer DOM via a body-level fixed-position overlay container that we
// create ourselves — workstation-shell.html is READ-ONLY per manifest and
// does not provide an `#orchestrator-focus-pane-root` element.
//
// Lifecycle:
//   1. On bundle load (DOMContentLoaded fires synchronously if already
//      complete), invoke tryAutoMountOrchestratorFocusPane().
//   2. The helper either reuses an existing root div (e.g., when the operator
//      eventually amends shell.html to host a real anchor) or appends a NEW
//      fixed-position div to document.body and renders into it.
//   3. The renderer wires the PtyChunkBridge to the existing
//      coarchitect:ptyChunk broadcast (Q-MVP-W1-1=(a)) and lets FocusPane
//      stream into its xterm-backed TerminalAdapter.

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createXtermAdapter, type TerminalAdapter } from '../console-panel/terminal-adapter.js';
import { FocusPane } from './focus-pane.js';
import { consumePtyChunkStream, getDefaultPtyChunkBridge } from './focus-pane-ipc.js';

export interface FocusPaneMountOptions {
  /**
   * ID of an existing root element to mount into. If absent, a new body-
   * level `<div id="orchestrator-focus-pane-mount-root">` is created and
   * appended (overlay strategy per Q-MVP-W1-6=(c)).
   */
  rootElementId?: string;
  /**
   * Optional TerminalAdapter factory injection for tests. Production
   * defaults to a lazy xterm.js adapter that buffers writes until the
   * Canvas-capable Terminal initializes.
   */
  createTerminal?: () => TerminalAdapter;
  /**
   * Optional explicit spawnedAtMs for the orchestrator session. When the
   * existing __orchestrator_active spawn-time observer lands (Tier-2
   * followup), this becomes prop-driven from main-process state. Until
   * then, undefined → header uptime renders em-dash placeholder.
   */
  spawnedAtMs?: number;
}

export type FocusPaneMountResult =
  | { mounted: true; dispose: () => void }
  | { mounted: false; reason: 'no-document' };

const DEFAULT_AUTO_MOUNT_ROOT_ID = 'orchestrator-focus-pane-mount-root';

function defaultLazyTerminalAdapter(): TerminalAdapter {
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

export function tryAutoMountOrchestratorFocusPane(
  opts: FocusPaneMountOptions = {},
): FocusPaneMountResult {
  if (typeof document === 'undefined') return { mounted: false, reason: 'no-document' };

  const rootId = opts.rootElementId ?? DEFAULT_AUTO_MOUNT_ROOT_ID;
  let root = document.getElementById(rootId);
  if (!root) {
    root = document.createElement('div');
    root.id = rootId;
    document.body.appendChild(root);
  }

  const createTerminal: () => TerminalAdapter =
    opts.createTerminal ?? defaultLazyTerminalAdapter;

  const reactRoot = createRoot(root);
  const adapter = createTerminal();
  let consumerDispose: (() => void) | null = null;

  // Single TerminalAdapter shared between FocusPane (which calls open/dispose)
  // and the chunk-consumer (which calls write). Pass a passthrough factory so
  // FocusPane's useEffect receives the SAME adapter we already wired to the
  // bridge below.
  const passthrough: () => TerminalAdapter = () => adapter;

  reactRoot.render(
    React.createElement(FocusPane, {
      createTerminal: passthrough,
      spawnedAtMs: opts.spawnedAtMs,
    }),
  );

  const bridge = getDefaultPtyChunkBridge();
  if (bridge !== null) {
    consumerDispose = consumePtyChunkStream(bridge, adapter);
  }

  return {
    mounted: true,
    dispose: () => {
      if (consumerDispose) consumerDispose();
      reactRoot.unmount();
    },
  };
}

// Bundle entry — production renderer invokes auto-mount on DOM ready.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tryAutoMountOrchestratorFocusPane();
    });
  } else {
    tryAutoMountOrchestratorFocusPane();
  }
}
