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

// ── Fix-C / cairn finding #82 — operator-trigger menu subscription ──────
//
// Closes MB-F-CONSOLE-T03-MENU-SUBSCRIPTION + finding #82 by hybrid-pattern
// wiring the native menu's "CC Console" submenu to live daemon state.
// Operator-arbitrated 2026-05-04: hybrid (WS /v2/events/stream as a
// "something changed → refetch" trigger + REST GET /v2/sessions for the
// session list) because the daemon does not emit session_created /
// session_removed events on the bus (filed as cairn finding #88).
//
// Refinements baked in per operator arbitration:
//  (a) Bootstrap-only fallback. If WS connection fails entirely, the
//      bootstrap GET /v2/sessions still ran and the menu has its initial
//      state. No timer-based polling.
//  (b) Refetch debounce. A burst of WS events collapses into a single
//      refetch after a quiet window (default 150ms).
//
// State filter mirrors dispatch-cli session-cap.ts isActiveSession:
// 'killed' and 'archived' sessions are excluded from the menu list. All
// other states (armed, held, paused, etc.) are operator-actionable
// candidates for opening a console panel.

export interface ConsoleMountWebSocket {
  on(event: 'open', cb: () => void): void;
  on(event: 'message', cb: (data: string) => void): void;
  on(event: 'close', cb: (code: number, reason: string) => void): void;
  on(event: 'error', cb: (err: Error) => void): void;
  close(code?: number, reason?: string): void;
}

export type ConsoleMountWebSocketFactory = (url: string) => ConsoleMountWebSocket;

interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type ConsoleMountFetch = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<FetchResponseLike>;

export interface SubscribeConsoleMenuDeps {
  httpUrl: string;
  wsUrl: string;
  /** Conductor daemon token. Empty string disables auth (fetch will likely 401). */
  token: string;
  fetchImpl: ConsoleMountFetch;
  wsFactory: ConsoleMountWebSocketFactory;
  /** Called on bootstrap and after each debounced refetch. */
  refreshMenu(sessions: readonly string[]): void;
  /** Quiet-window length for batching WS-event-driven refetches. Default 150. */
  debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 150;
const SESSION_INACTIVE_STATES = new Set<string>(['killed', 'archived']);

interface SessionLike {
  name?: unknown;
  state?: unknown;
}

function pickActiveSessionNames(rawBody: unknown): string[] {
  if (!rawBody || typeof rawBody !== 'object') return [];
  const sessions = (rawBody as { sessions?: unknown }).sessions;
  if (!Array.isArray(sessions)) return [];
  const out: string[] = [];
  for (const entry of sessions as SessionLike[]) {
    if (!entry || typeof entry !== 'object') continue;
    const name = entry.name;
    const state = entry.state;
    if (typeof name !== 'string' || name === '') continue;
    if (typeof state === 'string' && SESSION_INACTIVE_STATES.has(state)) continue;
    out.push(name);
  }
  return out;
}

export function subscribeConsoleMenuToDaemon(
  deps: SubscribeConsoleMenuDeps,
): () => void {
  const debounceMs = deps.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let disposed = false;
  let socket: ConsoleMountWebSocket | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function refetchAndRefresh(): Promise<void> {
    if (disposed) return;
    try {
      const res = await deps.fetchImpl(`${deps.httpUrl}/v2/sessions`, {
        headers: { 'X-Conductor-Token': deps.token },
      });
      if (disposed) return;
      if (!res.ok) return;
      const body = await res.json();
      if (disposed) return;
      deps.refreshMenu(pickActiveSessionNames(body));
    } catch {
      // Daemon unreachable / malformed response. Menu retains last known
      // state; no escalation per refinement (a).
    }
  }

  function scheduleRefetch(): void {
    if (disposed) return;
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void refetchAndRefresh();
    }, debounceMs);
  }

  function openSocket(): void {
    if (disposed) return;
    let sock: ConsoleMountWebSocket;
    try {
      const url = `${deps.wsUrl}/v2/events/stream?token=${encodeURIComponent(deps.token)}`;
      sock = deps.wsFactory(url);
    } catch {
      // Refinement (a): bootstrap fetch already ran; menu has initial
      // state. Don't retry — operator restarts workstation if WS is
      // permanently broken.
      return;
    }
    socket = sock;
    sock.on('message', () => {
      // Any event is a "something changed" signal — debounced refetch.
      scheduleRefetch();
    });
    sock.on('close', () => {
      socket = null;
      // Same rationale as wsFactory throw: don't loop. Bootstrap state
      // remains visible; the next workstation launch reconnects.
    });
    sock.on('error', () => {
      // 'close' will follow; no separate handling needed.
    });
  }

  // Bootstrap: fetch + populate menu before opening the WS so the menu is
  // never blank during the WS connect window.
  void refetchAndRefresh();
  openSocket();

  return function dispose(): void {
    if (disposed) return;
    disposed = true;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (socket) {
      try {
        socket.close(1000, 'fix-c-dispose');
      } catch {
        // best-effort
      }
      socket = null;
    }
  };
}
