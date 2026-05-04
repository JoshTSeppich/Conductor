// MB-F-CONSOLE-T03-SHELL-INTEGRATION — main-process wiring helper for the
// console-panel-in-shell mount.
//
// Problem this closes (vision §10.10 ship-gate, FOLLOWUPS.md
// MB-F-CONSOLE-T03-SHELL-INTEGRATION):
//   dist/console-panel/ produces a standalone renderer (console-panel.html
//   + renderer.js + xterm.css). The running workstation-shell.html does
//   not yet load this renderer. Clicking "CC Console > [session]" in the
//   native menu calls controller.openConsolePanel(name) which fires the
//   shell→webview console:open event — but the shell HTML has no
//   #console-root and no <script src=…/console-panel/renderer.js>.
//
// Wiring:
//   1. workstation-shell.html ships a #console-tile-region (initially
//      display:none) containing #console-tile-grid → #console-root,
//      plus <script src="../console-panel/renderer.js"> so console-panel
//      /mount.ts auto-mounts on shell-load against window.consoleBridge.
//   2. The renderer's auto-mount fires immediately (not lazily) but the
//      tile region stays hidden until the shell receives a
//      console-tile:show signal from the main process.
//   3. mountConsoleTileGrid (this module) subscribes to ConsoleIpcController
//      panel-open / panel-close events and emits console-tile:show /
//      console-tile:hide messages to the shell, which the shell's inline
//      script translates into display:none ↔ display:block toggles on
//      #console-tile-region.
//
// Scope: SINGLE-PANEL-IN-SHELL only. Multi-panel tiling (multiple
// consoles side-by-side) is MB-T12 in re-scope. The dep shape here
// reflects single-panel scope: onPanelOpen receives a session name,
// onPanelClose receives a session name; aggregating panel state across
// multiple opens is the MB-T12 territory.
//
// Test isolation: deps are injected so unit tests run in node env without
// booting Electron. Production wires the deps against
// ConsoleIpcController + mainWindow.webContents — the wiring lives
// inside the sentinel-marked Console mount region in main.ts.

export interface ConsoleMountDeps {
  /** Subscribe to panel-open events. Returns a cleanup. */
  onPanelOpen(handler: (sessionName: string) => void): () => void;
  /** Subscribe to panel-close events. Returns a cleanup. */
  onPanelClose(handler: (sessionName: string) => void): () => void;
  /**
   * Send a control message to the shell renderer. Production wires this
   * to mainWindow.webContents.send(channel, payload). Tests record calls.
   */
  sendToShell(channel: string, payload: unknown): void;
  /**
   * Emit a stdout sentinel for the smoke harness. Production wires this
   * to process.stdout.write(s + '\n') guarded by MB_TEST_HOOKS=1; tests
   * record calls.
   */
  emitTestSentinel(sentinel: string): void;
}

/**
 * Wires panel-open / panel-close events to shell visibility toggles.
 * Returns a dispose() that releases both subscriptions; safe to call
 * multiple times (idempotent).
 */
export function mountConsoleTileGrid(deps: ConsoleMountDeps): () => void {
  const cleanupOpen = deps.onPanelOpen((sessionName) => {
    deps.sendToShell('console-tile:show', { sessionName });
  });
  const cleanupClose = deps.onPanelClose((sessionName) => {
    deps.sendToShell('console-tile:hide', { sessionName });
  });

  deps.emitTestSentinel('CONSOLE_TILE_GRID_MOUNTED');

  let disposed = false;
  return function dispose(): void {
    if (disposed) return;
    disposed = true;
    cleanupOpen();
    cleanupClose();
  };
}
