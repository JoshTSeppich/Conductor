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
import { FrameShellHeader, type FrameMode } from './frame-shell-header.js';
import { mountFrameC } from '../frame-c/index.js';
import { createLazyXtermAdapter } from '../frame-c/lazy-xterm-adapter.js';
import {
  createXtermAdapter,
  type TerminalAdapter,
} from '../console-panel/terminal-adapter.js';
import type { ConsoleBridge } from '../main/console-bridge.js';
import type { StatusListClient } from '../main/session-status-source.js';

declare global {
  interface Window {
    /** Exposed by preload.mts contextBridge (workstationBridge + WB11b
     *  detachTile/onTileDetachClosed extensions + WB1
     *  MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP getDaemonToken). */
    workstationBridge?: WorkstationBridgeShape & Record<string, unknown>;
    /** §C.1′ — frame-mode persistence bridge (preload.mts §C.1′ zone). */
    frameModeBridge?: {
      getFrameMode: () => Promise<FrameMode>;
      setFrameMode: (mode: FrameMode) => Promise<FrameMode>;
    };
  }
}

export interface TileGridMountOptions {
  readonly rootElementId?: string;
  /** Test seam — defaults to window.workstationBridge. */
  readonly workstationBridge?: WorkstationBridgeShape | null;
  /** Test seam — defaults to window.consoleBridge. */
  readonly consoleBridge?: ConsoleBridge | null;
  readonly createTerminal?: () => TerminalAdapter;
  /** Test seam — defaults to the renderer-safe StatusListClient built
   *  from `window.workstationBridge.getDaemonToken` + fetch on
   *  `/v2/sessions` (MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP). */
  readonly statusListClient?: StatusListClient | null;
}

export type TileGridMountResult =
  | { mounted: true; dispose: () => void }
  | { mounted: false; reason: 'no-root' | 'no-workstation-bridge' | 'no-console-bridge' };

// === BEGIN: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP statusListClient ===
// Closes MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED
// (Tier 1; FOLLOWUPS.md:367). Per gen-6 OPT-β arbitration 2026-05-16
// (manifest EXPANSION-1 `735703f`).
//
// Builds a renderer-safe `StatusListClient` (interface at
// session-status-source-poll.ts:47-55) using the preload bridge
// `workstationBridge.getDaemonToken` (shipped at WB1 GREEN `2a93e00`) +
// native `fetch` on the daemon's `/v2/sessions` route
// (CONDUCTOR_API_CONTRACT.md §4.2). This replaces the structurally-
// impossible inline `new HttpSessionListClient(...)` path (session-cap.ts
// pulls node:fs/path/os into the browser-target tile-grid bundle;
// confirmed at amendment `4a9633c` Option A).
//
// Daemon URL fixed at `http://localhost:7878` to match
// `DEFAULT_DAEMON_URL` in session-cap.ts:143. The environment-override
// (`FOXWORKS_DAEMON_URL`) is not honored in the renderer because
// `process.env` is not contextBridged; documented divergence tracked
// at follow-up MB-F-PHASE5PW-RENDERER-DAEMON-URL-ENV-OVERRIDE-DIVERGENCE
// (Tier 2; proposed for WB-final filing).
//
// Auth pattern mirrors HttpSessionListClient: `X-Conductor-Token` header
// per cairn finding #92 + spawn-ipc.ts defaultRegisterSession (MB-T05).
// Token nullability follows daemon-token-bootstrap.ts contract: missing
// token → null → consumer skips StatusListClient instantiation (existing
// guard at tile-grid-app.tsx:357-358 — `if (!statusListClient) return
// undefined`).
//
// Failure surfacing: any fetch failure / non-200 throws Error that the
// caller (startStatusPoll, session-status-source-poll.ts:116-143) catches
// and translates to `error` status with backoff cadence. Token-fetch
// failure (rare; main.ts:466 catches all disk-read failures and returns
// null) is treated as "no client" — equivalent to pre-WB2 behavior.
async function buildRendererStatusListClient(): Promise<StatusListClient | null> {
  const bridge = window.workstationBridge;
  if (!bridge || typeof bridge['getDaemonToken'] !== 'function') return null;
  const token = (await (bridge['getDaemonToken'] as () => Promise<unknown>)()) as
    | string
    | null
    | undefined;
  if (typeof token !== 'string' || token.length === 0) return null;
  const daemonUrl = 'http://localhost:7878';
  return {
    async listSessions() {
      const res = await fetch(`${daemonUrl}/v2/sessions`, {
        headers: { 'X-Conductor-Token': token },
      });
      if (!res.ok) {
        throw new Error(`daemon returned HTTP ${res.status}`);
      }
      return (await res.json()) as Awaited<
        ReturnType<StatusListClient['listSessions']>
      >;
    },
  };
}
// === END: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP statusListClient ===

/** Mounts <TileGridApp> into the DOM element identified by `rootElementId`
 *  (default: 'tile-grid-root'). Returns either {mounted:true, dispose} for
 *  programmatic cleanup or {mounted:false, reason} when preconditions
 *  aren't met.
 *
 *  MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP: synchronously mounts
 *  the React tree (no statusListClient prop at first render); resolves
 *  the renderer-safe StatusListClient asynchronously and re-renders with
 *  it once available. Synchronous-first preserves the existing mount
 *  ordering (tile-grid renders immediately on bundle load) and the
 *  asynchronous re-render upgrades the status indicator path-after the
 *  token fetch resolves. */
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

  function render(statusListClient: StatusListClient | null): void {
    reactRoot.render(
      createElement(TileGridApp, {
        workstationBridge: workstationBridge as WorkstationBridgeShape,
        consoleBridge: consoleBridge as ConsoleBridge,
        createTerminal,
        ...(statusListClient !== null ? { statusListClient } : {}),
      }),
    );
  }

  // First render: no statusListClient. The tile-grid mounts immediately
  // so the operator sees the surface without waiting on token IPC.
  // The existing fallback chain (tile-grid-app.tsx:509 `statusSnapshot
  // .get(s.name) ?? s.status ?? 'idle'`) handles undefined statusListClient
  // by reading seeded `s.status` from spawn-result envelopes.
  const seededStatusClient =
    opts.statusListClient !== undefined ? opts.statusListClient : null;
  render(seededStatusClient);

  if (opts.statusListClient === undefined) {
    // Production path: asynchronously build the renderer-safe
    // StatusListClient and re-render with it. Test injection (opts
    // .statusListClient explicitly null or a stub) bypasses this branch.
    void buildRendererStatusListClient().then((client) => {
      if (client !== null) render(client);
    });
  }

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

// §C.1′ — apply frame mode to the shell DOM so CSS shows/hides regions.
function applyFrameMode(mode: FrameMode): void {
  const shell = document.getElementById('shell');
  if (shell) shell.setAttribute('data-frame-mode', mode);
}

// §C.1′ — mount FrameShellHeader into #header-indicators-root with initial
// frame mode read from frameModeBridge. Falls back to 'C' when bridge is
// unavailable (test environments without preload).
async function tryAutoMountFrameShellHeader(): Promise<void> {
  const root = document.getElementById('header-indicators-root');
  if (!root) return;

  const bridge = window.frameModeBridge ?? null;
  const initialMode: FrameMode = bridge
    ? await bridge.getFrameMode().catch(() => 'C' as const)
    : 'C';

  applyFrameMode(initialMode);

  const coarchitectBridge =
    (window as Record<string, unknown>)['coarchitectBridge'] as
      | Parameters<typeof FrameShellHeader>[0]['coarchitectBridge']
      | undefined ?? null;

  const workstationBridge = window.workstationBridge ?? null;

  createRoot(root).render(
    createElement(FrameShellHeader, {
      initialMode,
      workstationBridge,
      coarchitectBridge,
      onModeChange: (mode) => {
        applyFrameMode(mode);
        void bridge?.setFrameMode(mode).catch(() => undefined);
      },
    }),
  );
}

// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB10 — auto-mount Frame C into
// the #frame-c-root region shipped at workstation-shell.html:270
// (§C.1′ ticket #1 stub: `<div id="frame-c-root" data-testid="frame-c-
// root">`). Per Sub-Q-MBTWBFCS-A=α renderer-only selection state and
// Sub-Q-MBTWBFCS-B=i swarm-state.md detail source.
//
// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB4 (green) — sessions-stream
// integration: pass `window.workstationBridge` through to mountFrameC's
// `workstationBridge` prop per Sub-Q-T1-A=(α) operator-acked binding
// (independent subscription pattern mirroring tile-grid-app.tsx:159-185;
// implementation landed at WB3 GREEN `4414ef9`). Frame C SessionList
// now populates from the same live spawn-result stream that TileGridApp
// consumes — duplicate-name dedup per :173 guard prevents collisions.
//
// CLOSES MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION (Tier 2,
// FOLLOWUPS.md:327, filed at e2688fa).
//
// Tests skip this function by importing the mountFrameC factory
// directly and supplying their own container + props.
function tryAutoMountFrameC(): void {
  const root = document.getElementById('frame-c-root');
  if (!root) return;
  const workstationBridge = window.workstationBridge;
  // MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB12 — thread
  // consoleBridge + createTerminal (lazy xterm shim) into the FrameCRoot
  // mount so DetailPane can render the HYBRID Live tab with the
  // embedded TerminalStream (Sub-Q-MBTWFT2-A=ii operator-acked 2026-05-
  // 12). consoleBridge sourced from window.consoleBridge (CONSOLE-T02
  // preload contextBridge `eac381e`). createTerminal sourced from
  // frame-c/lazy-xterm-adapter.ts createLazyXtermAdapter (sync shim
  // wrapping the async createXtermAdapter import; mirrors console-
  // panel/mount.ts:58-84 pattern). When consoleBridge is absent
  // (non-Electron preview env), DetailPane falls back to Summary-only
  // mode (Wave B WB8 behavior preserved).
  //
  // ZONE-EXTENSION NOTE: this extension lives in Wave B's
  // `MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE` auto-mount zone per
  // operator-acked at HALT-WB12-PRE-COMMIT 2026-05-12 (mirrors T1's
  // earlier extension of the same zone for `workstationBridge`
  // propagation at WB4 GREEN `4414ef9`). CLAUDE.md §3.3 zone-scope
  // discipline preserved: scope of the Wave B zone is "auto-mount
  // Frame C with the right props"; adding bridge/factory props as
  // Frame C requirements grow is naturally within zone scope.
  // When workstationBridge is absent (non-Electron envs, smoke
  // harness pre-preload-attach window), mountFrameC starts with empty
  // internal sessions and renders honest empty-state. Frame C remains
  // visually mounted; SessionList shows no rows until the bridge
  // attaches.
  const consoleBridge = window.consoleBridge;
  mountFrameC(root, {
    ...(workstationBridge !== undefined ? { workstationBridge } : {}),
    ...(consoleBridge !== undefined
      ? { consoleBridge, createTerminal: createLazyXtermAdapter }
      : {}),
  });
}

// Production auto-mount on bundle load. Tests skip this by importing the
// function directly and supplying their own TileGridMountOptions.
tryAutoMountTileGrid();
void tryAutoMountFrameShellHeader();
tryAutoMountFrameC();
