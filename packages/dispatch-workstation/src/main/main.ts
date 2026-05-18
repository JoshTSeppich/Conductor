// Foxworks Workstation Electron entry — wired by Zipper-1 (B+C) + Zipper-2 (D).
//
// Zipper-1 (68e6528): wired B's webview-loader + C's menu/window-lifecycle.
// Zipper-2: refactored to load wrapper page (workstation-shell.html) that hosts
// both dispatch-web kanban (top, <webview>) and COARCH-T02 chat panel (bottom).
// loadDispatchWeb() removed from this call site per Amendment 2026-04-30 (b);
// WEB_UI_URL forwarded to the wrapper via loadFile query param.
import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { WEB_UI_URL } from './webview-loader.js';
import { registerApplicationMenu, rebuildApplicationMenu } from './menu.js';
import { createManagedWindow, registerLifecycleHooks } from './window-lifecycle.js';
import { registerIpcHandlers, wirePtyRelay } from './coarchitect-ipc.js';
import { registerSpawnIpcHandlers } from './spawn-ipc.js';
import { registerSessionSendPromptIpcHandlers } from './session-send-prompt-ipc.js';
import { registerSessionKillIpcHandlers } from './session-kill-ipc.js';
import { registerAuditModalIpcHandlers } from './audit-modal-ipc.js';
import {
  registerConsoleIpcHandlers,
  DEFAULT_PANEL_CAP,
  type ConsoleIpcController,
} from './console-ipc.js';
import { writeSplitterPosition } from './splitter-state.js';
import {
  isFirstLaunch,
  markOnboardingComplete,
} from '../onboarding/first-launch-detector.js';
import { saveApiKey } from '../onboarding/api-key-storage.js';
// === Onboarding mount imports (Session C / Batch 6 / wiring-mounts) ===
import {
  checkFirstLaunch,
  electronOnboardingDeps,
  runOnboardingIfNeeded,
} from './onboarding-mount.js';
// === end Onboarding mount imports ===
// === BEGIN: MB-T12 tile-grid mount imports (do not modify outside this block) ===
// WB12 — DetachTileIpcController (WB11b) + window factory for the detach
// flow. The renderer-side mount happens via the tile-grid renderer bundle
// loaded by workstation-shell.html; this main-process module sets up the
// IPC plumbing.
import {
  DetachTileIpcController,
  createDefaultWindowFactory,
} from './detach-tile-ipc.js';
// === END: MB-T12 tile-grid mount imports ===
// === BEGIN: MB-T16 approval-policy IPC imports (do not modify outside this block) ===
// WB4 — ApprovalPolicyIpcController + production factory for the
// per-session approval-policy GET/PUT bridge consumed by
// TileApprovalPicker. Mirrors the MB-T12 detach-tile-ipc + sess-mbt13
// audit-modal-ipc registration patterns.
import { createDefaultApprovalPolicyIpcController } from './approval-policy-ipc.js';
// === END: MB-T16 approval-policy IPC imports ===
// === BEGIN: MB-T17 autopilot IPC imports (do not modify outside this block) ===
// WB4 — AutopilotIpcController + production factory for the per-session
// autopilot toggle consumed by TileAutopilotToggle. Significant deviation
// from MB-T16 pattern: NO daemon route — autopilot state is workstation-
// side only via AutopilotLoop (autopilot-loop.ts:102 endorses parallel
// AutopilotLoop instances).
import { createDefaultAutopilotIpcController } from './autopilot-ipc.js';
// === END: MB-T17 autopilot IPC imports ===
// === BEGIN: §C.1′ frame-mode imports (do not modify outside this block) ===
import { readFrameMode, writeFrameMode } from './frame-mode-state.js';
// === END: §C.1′ frame-mode imports ===
// === BEGIN: §C.5 tile token scraper imports (do not modify outside this block) ===
import { registerTileTokenScraper } from './tile-token-scraper.js';
// === END: §C.5 tile token scraper imports ===
// === BEGIN: MB-T24 dispatch-mode IPC imports (do not modify outside this block) ===
// WB3 — DispatchModeIpcController + production factory for the workstation-
// wide Auto/Ask dispatch-mode toggle consumed by DispatchModeToggle (chat-
// shell header-bar slot, FAR-LEFT per Q-MBT24-4=a). Q-MBT24-6=c (NEW
// dispatchModeBridge — additive surface, mirrors commitsBridge precedent)
// + Q-MBT24-1=a (file-JSON persistence per splitter-state.ts pattern, no
// daemon — workstation-internal only) + Q-MBT24-7=a (DispatchMode =
// 'auto' | 'ask') operator-confirmed 2026-05-08 HALT 0.
import { createDefaultDispatchModeIpcController } from './dispatch-mode-ipc.js';
// === END: MB-T24 dispatch-mode IPC imports ===
// === BEGIN: MB-T20 chat panel (do not modify outside this block) ===
// Reserved zone for any future main-process wiring related to the
// Conductor chat panel shell (src/chat-shell/). At WB4 the chat-shell
// renderer mounts entirely renderer-side via workstation-shell.html
// line 555 script-tag swap (Q-MBT20-4=a single renderer per region;
// Q-MBT20-5=a coarchitectBridge reuse — preload.mts unchanged).
// Zone reserved per Q-MBT20-8=a CLAUDE.md §3.3 sentinel discipline.
// === END: MB-T20 chat panel ===
// === BEGIN: MB-T22 commits-ipc imports (do not modify outside this block) ===
// WB3 — registerCommitsIpc wires the renderer-side window.commitsBridge
// .listCommits → main-process commits-reader.readCommits pipeline.
// Q-MBT22-1=a (workstation child_process; no daemon route) +
// Q-MBT22-7=a (static window.commitsBridge mirroring coarchitectBridge
// shape; preload.mts additive `=== BEGIN: MB-T22 commits bridge ===`
// zone). Decisions doc 2026-05-07.
import { registerCommitsIpc } from './commits-ipc.js';
// === END: MB-T22 commits-ipc imports ===
// === BEGIN: Fix-A api-key bootstrap (do not modify outside this block) ===
import { bootstrapApiKey } from './api-key-bootstrap.js';
// === END: Fix-A ===
// === BEGIN: Fix-C console trigger imports (cairn finding #82, do not modify outside this block) ===
import { readFileSync as fixCReadFileSync } from 'node:fs';
import { homedir as fixCHomedir } from 'node:os';
import { join as fixCJoin } from 'node:path';
import {
  subscribeConsoleMenuToDaemon,
  type ConsoleMountWebSocket,
} from './console-mount.js';
// === END: Fix-C ===
// === BEGIN: Fix-92 webview token bootstrap (cairn finding #92, do not modify outside this block) ===
import { readDaemonTokenForBootstrap } from './daemon-token-bootstrap.js';
// === END: Fix-92 ===
// === BEGIN: Probe-92 obs-infra (probe-92/fix-verification, do not modify outside this block) ===
// Observability infrastructure for the Fix-92 verification probe suite
// (test/integration/fix-92-verification/). Operator-arbitrated 2026-05-05.
// All additions are MB_TEST_HOOKS=1 gated; production builds see zero
// behavior change. Defense-in-depth gating helpers in test-hooks-env.ts
// (unit-tested in test/unit/probe-92-test-hooks-env/).
import {
  getDaemonTokenPathOverride,
  getUserDataDirOverride,
} from './test-hooks-env.js';
// === END: Probe-92 obs-infra ===
// === BEGIN: MB-T-HSO-WIRE shared-emitter-and-writer imports ===
// WB3 — EventEmitter (shared dispatch-event bus) + SwarmStateWriter
// (MB-T38 ship fc15a26; class at src/coarchitect/swarm-state-writer.ts:125).
// Writer subscribes 7 listeners to the emitter via its constructor
// (swarm-state-writer.ts:205-211). Future WBs (WB5 harvester, WB7 parser
// observer) consume the same shared emitter from the same lexical scope.
// WB5 — PeerSummaryHarvester (MB-T39 ship bb2698f + multi-chunk fix
// bb4c47c; class at src/coarchitect/peer-summary-harvester.ts:117) +
// SessionSendPromptIpcController (MB-T09; class at session-send-prompt-
// ipc.ts:35) wraps the IPromptInjector dep so the harvester can fire the
// §7 summary prompt via the same tmux send-keys path the renderer uses.
// WB11 — OrchestratorPoolManager (MB-T37 ship 38b1a03; class at src/
// coarchitect/hso-pool.ts:100) + TileGridRegistryAdapter (same file) +
// dedicated SpawnIpcController for pool-driven spawns (separate instance
// from the renderer-IPC-handler's controller; both reuse the same
// defaultSpawnHandlerDeps factory). readDispatchMode supplies the pool's
// dispatchModeReader dep; hasSession from dispatch-core wraps the pool's
// runTmuxHasSession crash-detection dep.
import { EventEmitter } from 'node:events';
import { SwarmStateWriter } from '../coarchitect/swarm-state-writer.js';
import { PeerSummaryHarvester } from '../coarchitect/peer-summary-harvester.js';
import {
  SessionSendPromptIpcController,
  defaultSessionSendPromptDeps,
} from './session-send-prompt-ipc.js';
import {
  OrchestratorPoolManager,
  DefaultDaemonSessionsClient,
  TileGridRegistryAdapter,
} from '../coarchitect/hso-pool.js';
import { SpawnIpcController, defaultSpawnHandlerDeps } from './spawn-ipc.js';
import { readDispatchMode } from './dispatch-mode-store.js';
import { hasSession as coreHasSession } from 'dispatch-core/dist/transport/tmux.js';
// WB7 — action-marker-router (3c9629b WB1 spike binding §V: Pattern B
// accumulator + strip-and-re-parse). Independent observer subscription
// from MB-T40 pty-stream-relay; same broadcaster fan-out per MB-T37.
import { registerActionMarkerRouter } from './action-marker-router.js';
import { dispatchActionVariant } from './action-variant-ipc.js';
// WB9 — resolveApprovalShim (MB-F-T11-T13-RESOLVER-STUB closure thin shim;
// at approval-policy-resolver-shim.ts:137). Fetches per-session policy via
// daemon HTTP GET /v3/sessions/:name/approval-policy + delegates to pure
// resolveApproval. MBT11ActionType type-import for the value-safe cast at
// the call site (action-variant-ipc.ts:137 deps surface uses string; shim
// wants MBT11ActionType — identical 5-member literal sets per shim
// docblock §2-line 9). Retired by MB-F-T11-T13-ACTION-TYPE-ENUM-DEDUP.
import { resolveApprovalShim } from './approval-policy-resolver-shim.js';
import type { MBT11ActionType } from './orchestrator-action-types.js';
// === END: MB-T-HSO-WIRE shared-emitter-and-writer imports ===
// === BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE swarm-state-read imports (do not modify outside this block) ===
// WB8 — DetailPane (renderer) reads docs/swarm-state.md content via the
// `workstation:read-swarm-state` IPC handler below. Path resolution
// mirrors the SwarmStateWriter init at the MB-T-HSO-WIRE zone
// (swarmStatePath at line ~557). Aliased to swarmStateReadFileSync to
// avoid collision with the Fix-C alias at line 99.
import { readFileSync as swarmStateReadFileSync } from 'node:fs';
// === END: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE swarm-state-read imports ===
// === BEGIN: MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS-ipc imports (do not modify outside this block) ===
// WB4-followup — Frame C detail-pane ActionBar IPC controller wiring.
// Three channels (`frame-c:diff`, `frame-c:merge`, `frame-c:focus`)
// landed in consolidated §6 amendment `0f0e762`. Controller class +
// types ship at WB4 (`48032cf` src/main/frame-c-ipc.ts); renderer-side
// `window.frameCBridge` exposure shipped at same commit (preload.mts).
// This zone wires the registration call site at app.whenReady() —
// previously blocked on Wave B WB10 GREEN landing per dispatch
// serialization rule (now unblocked at `ea11bc7`).
import { createDefaultFrameCIpcController } from './frame-c-ipc.js';
// === END: MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS-ipc imports ===

// === BEGIN: MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH imports (do not modify outside this block) ===
// WB4 — workstation BUILD.md driver imports. Controller class +
// registerBuildMdIpcHandlers factory at src/main/build-md-ipc.ts. Service
// module at src/build-md/service.ts (WB2 GREEN `0e86966`). Default path
// resolves to repo-root BUILD.md per Sub-Q-MBTWFT5-A=(i) operator
// arbitration 2026-05-12; mirrors SwarmStateWriter path pattern at
// main.ts:557.
import {
  BuildMdIpcController,
  registerBuildMdIpcHandlers,
} from './build-md-ipc.js';
import {
  BuildMdDispatchTriggerController,
  registerBuildMdDispatchTriggerHandlers,
} from './build-md-dispatch-trigger-ipc.js';
// === END: MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH imports ===

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRELOAD_PATH = resolve(__dirname, 'preload.cjs');
const SHELL_PATH = resolve(__dirname, 'workstation-shell.html');
// MB-T13 WB8: bundled audit-modal HTML lives in dist/audit-modal/ per
// scripts/build-audit-modal.mjs. From dist/main/main.js the relative
// path is `../audit-modal/audit-modal.html`.
const AUDIT_MODAL_PATH = resolve(__dirname, '..', 'audit-modal', 'audit-modal.html');
// MB-T12 WB12 + WB11b: the standalone console-panel.html is loaded by
// detached BrowserWindows opened via DetachTileIpcController. From
// dist/main/main.js the relative path is `../console-panel/console-panel.html`.
const CONSOLE_PANEL_HTML_PATH = resolve(__dirname, '..', 'console-panel', 'console-panel.html');

// === BEGIN: Probe-92 obs-infra — userData isolation (do not modify outside this block) ===
// Redirect Electron's userData directory (where Local Storage / leveldb
// lives) to a tmpdir per-test-run when MB_TEST_HOOKS=1 + MB_USER_DATA_DIR
// are both set. Defense-in-depth gating in test-hooks-env.ts. Must run
// at module load time, BEFORE app.whenReady() — Electron caches the
// resolved userData path on first access. Production: helper returns
// undefined → branch is skipped → platform default applies.
{
  const userDataOverride = getUserDataDirOverride(process.env);
  if (userDataOverride) app.setPath('userData', userDataOverride);
}
// === END: Probe-92 obs-infra — userData isolation ===
// === Onboarding mount path (Session C / Batch 6 / wiring-mounts) ===
const ONBOARDING_PRELOAD_PATH = resolve(__dirname, 'preload-onboarding.cjs');
// === end Onboarding mount path ===

let mainWindow: BrowserWindow | null = null;

// === BEGIN: Probe-92 obs-infra — kanban webview handle (do not modify outside this block) ===
// Captured in did-attach-webview (registered inside createWindow) so the
// KANBAN_EVAL stdin handler can call .executeJavaScript on the embedded
// webview's webContents. MB_TEST_HOOKS=1 gated end-to-end: the capture
// listener only registers under MB_TEST_HOOKS=1, AND the stdin handler
// only fires under MB_TEST_HOOKS=1. Production: handle stays null,
// stdin handler unreachable.
let kanbanWebContents: Electron.WebContents | null = null;
// === END: Probe-92 obs-infra — kanban webview handle ===

async function createWindow(): Promise<void> {
  mainWindow = createManagedWindow({
    width: 1024,
    height: 768,
    show: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // webviewTag required for the kanban <webview> region in workstation-shell.html.
      webviewTag: true,
    },
  });

  // Register WINDOW_READY sentinel before loadFile so the listener exists when
  // the wrapper page's did-finish-load fires (did-finish-load timing discipline).
  mainWindow.webContents.on('did-finish-load', () => {
    process.stdout.write('WINDOW_READY\n');
  });

  // MB_TEST_HOOKS: forward renderer console-message events to stdout so vitest tests
  // can observe SHELL_READY, SPLITTER_LOADED, and RENDER_OK sentinels.
  // MB-S05 ADR K6 (CRITICAL): event-object form (event.message) — positional args
  // deprecated in Electron 41.
  if (process.env.MB_TEST_HOOKS === '1') {
    mainWindow.webContents.on('console-message', (event) => {
      const msg = (event as { message: string }).message;
      if (
        msg === 'SHELL_READY' ||
        msg === 'RENDER_OK' ||
        msg === 'SPAWN_MODAL_OPENED' ||
        msg === 'STREAM_START' ||
        msg.startsWith('SPLITTER_LOADED ') ||
        msg.startsWith('MESSAGE_SENT ') ||
        msg.startsWith('STREAM_DONE ') ||
        msg.startsWith('STREAM_ERROR ')
      ) {
        process.stdout.write(msg + '\n');
      }
      // Diagnostic: forward console.error to stderr for test diagnostics.
      if ((event as unknown as { level?: string }).level === 'error') {
        process.stderr.write('[renderer-error] ' + msg + '\n');
      }
    });
  }

  // === BEGIN: Probe-92 obs-infra — webview console forwarder (do not modify outside this block) ===
  // The kanban <webview> in workstation-shell.html:237 is a separate
  // webContents from mainWindow.webContents (where the existing
  // SHELL_READY/RENDER_OK forwarder lives). Console messages from
  // card-bridge-preload.mts (the Fix-92 BOOTSTRAP_TOKEN_WRITTEN
  // sentinel) therefore never reach stdout via the existing handler.
  // This forwarder captures the kanban webview's handle on attach and
  // forwards its allowlisted console messages to stdout under
  // MB_TEST_HOOKS=1. It also exposes the handle to the KANBAN_EVAL
  // stdin handler (below) for probes 5-9. Production: branch skipped.
  if (process.env.MB_TEST_HOOKS === '1') {
    mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
      kanbanWebContents = webContents;
      webContents.on('console-message', (event) => {
        const msg = (event as { message: string }).message;
        if (msg.startsWith('BOOTSTRAP_TOKEN_WRITTEN ')) {
          process.stdout.write(msg + '\n');
        }
        if ((event as unknown as { level?: string }).level === 'error') {
          process.stderr.write('[kanban-webview-error] ' + msg + '\n');
        }
      });
    });
  }
  // === END: Probe-92 obs-infra — webview console forwarder ===

  // === BEGIN: Fix-B spawn-result subscription (do not modify outside this block) ===
  // MB-F-#83 closer. The renderer (workstation-shell.html) emits
  //   SPAWN_RESULT_OK <sessionName>
  //   SPAWN_RESULT_ERROR <error_type> <message>
  // console.log sentinels from window.workstationBridge.onSpawnResult.
  // Forwarding lives in its own console-message listener so the existing
  // test-hooks forwarder above stays untouched (sentinel-region discipline
  // from coordination scaffold §1). Closes the smoke-harness followup
  // MB-F-MB-T08-SPAWN-RESULT-SENTINEL by providing the sentinels the harness
  // needs to wait on; smoke-harness.ts itself is a follow-on consumer.
  if (process.env.MB_TEST_HOOKS === '1') {
    mainWindow.webContents.on('console-message', (event) => {
      const msg = (event as { message: string }).message;
      if (
        msg.startsWith('SPAWN_RESULT_OK ') ||
        msg.startsWith('SPAWN_RESULT_ERROR ')
      ) {
        process.stdout.write(msg + '\n');
      }
    });
  }
  // === END: Fix-B ===

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load the wrapper page. WEB_UI_URL passed as query param; the shell HTML reads
  // it via URLSearchParams and sets the kanban <webview> src attribute.
  await mainWindow.loadFile(SHELL_PATH, { query: { webUiUrl: WEB_UI_URL } });
}

let consoleController: ConsoleIpcController | null = null;

/** Refresh the "CC Console" native menu with current daemon sessions +
 * controller panel count. Daemon-session-list subscription (so the menu
 * tracks /v2/sessions changes automatically) is a CONSOLE-T03 followup —
 * see FOLLOWUPS.md MB-F-CONSOLE-T03-MENU-SUBSCRIPTION. For v3.0 ship the
 * caller invokes refreshConsoleMenu() with whatever session list it has;
 * default empty list at app start is the safe fallback. */
function refreshConsoleMenu(sessions: readonly string[] = []): void {
  rebuildApplicationMenu({
    consoleMenu: {
      sessions,
      panelCount: consoleController?.panelCount() ?? 0,
      panelCap: DEFAULT_PANEL_CAP,
      onOpen: (sessionName) => {
        void consoleController?.openConsolePanel(sessionName).catch(() => {
          /* Swallow PanelCapExceeded / PanelAlreadyOpen here — the menu UI
           * disables items at cap. Surfacing a dialog is a future UX pass. */
        });
        // Refresh after attempting open so the cap-status item updates.
        refreshConsoleMenu(sessions);
      },
    },
    // MB-T13 WB8: thread the audit-modal opener through every menu
    // rebuild so the View > Show recent orchestrator actions item
    // persists across CC Console submenu refreshes.
    onShowAuditModal: openAuditModalWindow,
  });
}

/**
 * MB-T13 WB8: open the audit-modal BrowserWindow.
 *
 * Loads dist/audit-modal/audit-modal.html with the main preload.cjs
 * (reused per WB8 minimum-scope design — least-privilege audit-modal
 * preload deferred as future-work; the modal renderer only calls
 * window.workstationBridge.fetchAuditModal which is already exposed).
 */
function openAuditModalWindow(): void {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Recent orchestrator actions',
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void win.loadFile(AUDIT_MODAL_PATH);
}

// MB-T08 — first-launch onboarding hook. The renderer-side React modal
// mount in workstation-shell.html is tracked as MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT;
// the main-process side ships here so the smoke harness, IPC contract,
// and config persistence are all live for v3.0 ship-gate validation.
function configDir(): string {
  return process.env.MB_ONBOARDING_STATE_DIR ?? app.getPath('userData');
}

function registerOnboardingIpc(): void {
  // Renderer → main: operator typed the API key on step 2.
  ipcMain.handle(
    'workstation:onboarding-save-api-key',
    async (_event, plaintextKey: unknown) => {
      if (typeof plaintextKey !== 'string' || plaintextKey.trim() === '') {
        throw new Error('onboarding-save-api-key: empty plaintext');
      }
      saveApiKey(plaintextKey, { configDir: configDir(), safeStorage });
    },
  );

  // Renderer → main: operator clicked Done on step 3.
  ipcMain.handle('workstation:onboarding-complete', async () => {
    markOnboardingComplete({ configDir: configDir() });
    if (process.env.MB_TEST_HOOKS === '1') {
      process.stdout.write('ONBOARDING_COMPLETE\n');
    }
  });
}

app.whenReady().then(async () => {
  // MB-T13 WB8: pass onShowAuditModal so the initial menu (before
  // CC Console subscription kicks in via refreshConsoleMenu) already
  // has the View > Show recent orchestrator actions item.
  registerApplicationMenu({ onShowAuditModal: openAuditModalWindow });
  // === BEGIN: Fix-A api-key bootstrap (do not modify outside this block) ===
  // Cairn #84 Defect A: load safeStorage-persisted ANTHROPIC_API_KEY into
  // process.env so the chat client (anthropic-client.ts createAnthropicClient,
  // invoked from coarchitect-ipc.ts) sees it on first request. Must run before
  // registerIpcHandlers() so the chat IPC handler is set up against a
  // populated env.
  bootstrapApiKey({ configDir: configDir(), safeStorage });
  // === END: Fix-A ===
  // === BEGIN: Fix-92 webview token bootstrap (cairn finding #92, do not modify outside this block) ===
  // Cairn #92: register the IPC channel the kanban webview's preload
  // (card-bridge-preload.mts, attached via workstation-shell.html:237)
  // invokes at preload-load time to bootstrap localStorage['x-conductor-
  // token']. Must register before createWindow() so the handler is live
  // when the webview attaches and its preload fires ipcRenderer.invoke.
  // Returns the trimmed file contents from ~/.foxworks-dispatch/token, or
  // null if absent / unreadable. Failure case leaves the webview's
  // localStorage untouched and TokenPrompt remains the fallback.
  //
  // Probe-92 obs-infra extension (operator-acked 2026-05-05): when
  // MB_TEST_HOOKS=1 + MB_TEST_HOOKS_DAEMON_TOKEN_PATH are both set, the
  // override path is forwarded to readDaemonTokenForBootstrap. Defense-
  // in-depth gating in test-hooks-env.ts; production: helper returns
  // undefined → handler reads the default ~/.foxworks-dispatch/token
  // (unchanged behavior).
  ipcMain.handle('workstation:get-daemon-token', () => {
    const tokenPath = getDaemonTokenPathOverride(process.env);
    return readDaemonTokenForBootstrap(tokenPath ? { tokenPath } : {});
  });
  // === END: Fix-92 ===
  registerIpcHandlers();
  registerSpawnIpcHandlers();
  // === BEGIN: MB-T24 dispatch-mode IPC (registered BEFORE createWindow) ===
  // WB4b runtime-smoke finding: DispatchModeToggle component invokes
  // getDispatchMode at mount (chat-shell renderer auto-mount). Renderer
  // mounts during createWindow() at line below; therefore the IPC
  // handler MUST register BEFORE createWindow or the initial fetch
  // races and rejects with "No handler registered for 'dispatch-mode:get'".
  // (MB-T16/T17 controllers can register post-createWindow because their
  // bridge methods are only invoked on operator interaction with tile
  // dropdowns/toggles AFTER startup; MB-T24 differs because the toggle
  // fetches state at mount.)
  //
  // Companion sentinel zone with the actual controller construction
  // remains in the post-createWindow region for symmetry with MB-T16/T17;
  // this register call here is the load-bearing one. The renderer-side
  // .catch fallback is a defense-in-depth (defaults to 'ask') but the
  // ordering fix here eliminates the noisy error log + the brief flicker
  // before the persisted value is fetched.
  const dispatchModeControllerEarly = createDefaultDispatchModeIpcController();
  dispatchModeControllerEarly.registerHandlers(ipcMain);
  if (process.env['MB_TEST_HOOKS'] === '1') {
    process.stdout.write('DISPATCH_MODE_IPC_MOUNTED\n');
  }
  // === END: MB-T24 ===
  // === BEGIN: §C.1′ frame-mode IPC ===
  // Registered before createWindow so mount.ts can call frame-mode:get
  // at auto-mount time without racing (same pattern as dispatch-mode).
  ipcMain.handle('frame-mode:get', () => readFrameMode());
  ipcMain.handle('frame-mode:set', (_evt, { mode }: { mode: unknown }) => {
    if (mode === 'A' || mode === 'C') writeFrameMode(mode);
    return readFrameMode();
  });
  // === END: §C.1′ frame-mode IPC ===
  // === BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE swarm-state-read IPC ===
  // WB8 — Renderer-side DetailPane queries docs/swarm-state.md via this
  // narrow IPC channel. Per ticket body a1f7a03 §4 WB8 + Sub-Q-MBTWBFCS-B=i
  // operator-pre-arbitrated 2026-05-11. swarmStatePath mirrors the
  // MB-T-HSO-WIRE SwarmStateWriter resolution below (line ~557):
  // `resolve(app.getAppPath(), '..', '..', 'docs/swarm-state.md')`.
  //
  // Resilience: ENOENT (HSO has not yet emitted any action, so the
  // writer has not created the file) returns empty string. DetailPane
  // surfaces "no swarm-state section found" placeholder copy honestly.
  // Other errors propagate to the renderer caller as an ipcRenderer
  // rejection — DetailPane catch-block surfaces error text.
  //
  // WORKSTATION_CONTRACT.md §6 amendment territory per CLAUDE.md §2.4:
  // this commit ADDS a new IPC channel name; HALT-WB8-PRE-COMMIT
  // surfaces the diff for operator review BEFORE landing per dispatch
  // §C conditional-HALT clause.
  ipcMain.handle('workstation:read-swarm-state', () => {
    const swarmStatePath = resolve(
      app.getAppPath(),
      '..',
      '..',
      'docs/swarm-state.md',
    );
    try {
      return swarmStateReadFileSync(swarmStatePath, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return '';
      throw e;
    }
  });
  // === END: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE swarm-state-read IPC ===
  // === BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE wiring ===
  // WB10 — Frame C renderer surface is auto-mounted RENDERER-SIDE via
  // `tile-grid/mount.ts:tryAutoMountFrameC()` at the same bottom-of-file
  // auto-mount block where `tryAutoMountFrameShellHeader()` lives
  // (tile-grid/mount.ts:165 precedent). main.ts has NO additional main-
  // process IPC to register for Frame C beyond the WB8 swarm-state-read
  // IPC zone above — Sub-Q-MBTWBFCS-A=α (operator-pre-arbitrated 2026-
  // 05-11) keeps selection state renderer-only (no persistence IPC).
  //
  // This sentinel zone exists to document the cross-process wiring
  // boundary per CLAUDE.md §3.3 sentinel-zone discipline: the auto-
  // mount call site is renderer-side (tile-grid renderer bundle, which
  // imports `mountFrameC` from `../frame-c/index.js`); main.ts's
  // responsibility for Frame C is limited to the `workstation:read-
  // swarm-state` IPC (above zone) which feeds DetailPane.
  //
  // See `tile-grid/mount.ts:tryAutoMountFrameC()` for the actual mount
  // invocation, and `workstation-shell.html:270` for the `#frame-c-root`
  // DOM region (shipped at §C.1′ ticket #1) that hosts the React tree.
  // === END: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE wiring ===
  // === BEGIN: MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS-ipc ===
  // WB4-followup — register `frame-c:{diff,merge,focus}` IPC handlers per
  // consolidated `WORKSTATION_CONTRACT.md §6` amendment `0f0e762`. Three
  // channels back the detail-pane ActionBar's per-session action callbacks
  // (renderer-side `window.frameCBridge.*` exposure landed at WB4
  // `48032cf` preload.mts).
  //
  // Action semantics per Sub-Q-MBTWBDPFA-B operator arbitration (coord
  // note `9fe6358` §3):
  // - diff:  `git diff main...<branch>` via child_process
  // - merge: `git merge --no-commit --no-ff <branch>` via child_process
  // - focus: writeFrameMode('A') + scroll-to-session event emit
  //
  // DEP WIRING POSTURE (current ship):
  // - lookupSession: STUB returning null (handlers respond
  //   `error_type='SessionNotFound'` for every invocation). The
  //   production lookup requires a TileGridApp ↔ main bridge that
  //   doesn't exist today; will be filed as Tier 2 followup at WB7
  //   docs. Same posture as `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-
  //   GAP-2026-05-11` (component contract shipped; integration deferred
  //   to a downstream commit). Operator visibility: clicking any action
  //   button under a real session surfaces a failure-state inline
  //   banner (Sub-Q-C=α; WB6 banner UX at `cdf05db`) reading
  //   "SessionNotFound — session 'X' not registered with workstation".
  //   Operator can still verify the IPC roundtrip + banner rendering;
  //   real session-data wiring is the next ticket-scope step.
  // - emitScroll: fan-out via mainWindow.webContents.send.
  // - writeFrameMode: imported helper from frame-mode-state.ts (Frame
  //   Router `44764fd` shipped contract).
  // - runGit: omitted → uses defaultRunGit (child_process.spawn-based)
  //   in frame-c-ipc.ts.
  createDefaultFrameCIpcController({
    // STUB lookup — Tier 2 followup MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB
    // filed at WB7 docs. Production wiring depends on TileGridApp ↔
    // main session-shape exposure (cwd + branchName per session).
    lookupSession: () => null,
    emitScroll: (payload) => {
      mainWindow?.webContents.send('frame-c:scroll-to-session', payload);
    },
    writeFrameMode,
  }).registerHandlers(ipcMain);
  // === END: MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS-ipc ===
  // === BEGIN: MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH wiring ===
  // WB4 — register `workstation:read-build-md` IPC handler per ticket
  // body c92f750 §1.1 + Sub-Q-MBTWFT5-A=(i) operator arbitration
  // 2026-05-12 (default path = repo-root BUILD.md).
  //
  // Default path resolves to repo-root: `app.getAppPath()` returns
  // `<repo>/packages/dispatch-workstation`; `../..` walks to
  // `<repo>/`; `BUILD.md` is the file. Same pattern as SwarmStateWriter
  // init at main.ts:557 (`docs/swarm-state.md`).
  //
  // BUILD.md may not exist at repo root in v1 (verified
  // `ls BUILD.md` 2026-05-12: NotFound). Handler returns
  // `{ok: false, error_type: 'NotFound', message}` honestly; renderer-
  // side BuildMdStatusLine (WB6) renders empty-state placeholder.
  registerBuildMdIpcHandlers(
    ipcMain,
    new BuildMdIpcController({
      defaultBuildMdPath: () =>
        resolve(app.getAppPath(), '..', '..', 'BUILD.md'),
    }),
  );
  // WB10 — register `workstation:build-md-dispatch-trigger` per ticket
  // body c92f750 §4 WB10 + Sub-Q-MBTWFT5-B=(ii) operator-click +
  // Sub-Q-MBTWFT5-C=(i) orchestrator-fire-spawn DI.
  //
  // DEP WIRING POSTURE (current ship — same shape as Wave C #3 frame-c-
  // ipc stub posture per `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11`):
  // - getCompletedTaskIds: STUB returning empty set (production wiring
  //   requires spawn-result-listener completion tracking that is its
  //   own follow-on cycle; Tier 2 followup MB-F-T5-COMPLETED-TASK-IDS-
  //   PRODUCTION-WIRING filed at WB12). Operator-visible behavior pre-
  //   closure: every trigger fires ALL ready tasks regardless of prior
  //   completion (idempotent against the source DAG; each tick re-reads
  //   BUILD.md). Acceptable for v1 ship since operator can clear by
  //   re-launching workstation.
  // - getMaxParallel: STUB returning 4 (conservative default; T4 max-
  //   parallel-store integration filed as MB-F-T5-MAX-PARALLEL-T4-
  //   DEPENDENCY Tier 3 at WB12 — Sub-Q-MBTWFT5-D=(ii) source TBD).
  // - fireSpawn: STUB returning `{declined: true}` for every request
  //   (operator-visible behavior pre-closure: clicking Spawn renders 0
  //   spawned + N declined; UI verifies the IPC roundtrip without
  //   actually firing spawns). Production wiring wraps
  //   orchestratorFireSpawn from orchestrator-fire-spawn.ts (Sub-Q-C=(i));
  //   needs OrchestratorFireSpawnDeps composition + dispatch-mode reader;
  //   filed as MB-F-T5-FIRESPAWN-ORCHESTRATOR-FIRE-SPAWN-WIRING Tier 2
  //   at WB12.
  registerBuildMdDispatchTriggerHandlers(
    ipcMain,
    new BuildMdDispatchTriggerController({
      defaultBuildMdPath: () =>
        resolve(app.getAppPath(), '..', '..', 'BUILD.md'),
      // STUB completed-set — Tier 2 followup MB-F-T5-COMPLETED-TASK-IDS-
      // PRODUCTION-WIRING at WB12 docs.
      getCompletedTaskIds: () => new Set<string>(),
      // STUB max-parallel — Tier 3 followup MB-F-T5-MAX-PARALLEL-T4-
      // DEPENDENCY at WB12 docs.
      getMaxParallel: () => 4,
      // STUB fireSpawn — Tier 2 followup MB-F-T5-FIRESPAWN-ORCHESTRATOR-
      // FIRE-SPAWN-WIRING at WB12 docs (production wraps
      // orchestrator-fire-spawn.ts orchestratorFireSpawn per Sub-Q-C=(i)).
      // Returns declined for every task pre-closure; operator can verify
      // IPC roundtrip + UI without firing real spawns.
      fireSpawn: async () => ({ declined: true }),
    }),
  );
  // === END: MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH wiring ===
  // === MB-T09 session-send-prompt IPC ===
  // Per CONDUCTOR_V3_RESCOPE.md §3.4 + §4 — orchestrator (MB-T11) and
  // tile footer (MB-T12) consume this surface. Default deps wire to
  // canonical sendKeys (dispatch-core/src/transport/tmux.ts).
  registerSessionSendPromptIpcHandlers();
  // === end MB-T09 session-send-prompt IPC ===
  // === MB-T11 WB3 session-kill IPC ===
  // Per CONDUCTOR_V3_RESCOPE.md §3.6 + Q-MBT11-3=a — orchestrator-callable
  // kill (v3.5 dispatchActionVariant's fireKill dep fires this via the
  // action-marker-router path; the v3.0 orchestrator-action-handler was
  // removed in MB-T-HSO-WIRE WB14a). Two-step: tmux kill-session + PATCH
  // /v2/sessions/:name/state.
  registerSessionKillIpcHandlers();
  // === end MB-T11 WB3 session-kill IPC ===
  // === MB-T13 audit-modal-fetch IPC ===
  // Per CONDUCTOR_V3_RESCOPE.md §3.8 + Phase 2 brief WB7 — operator
  // menu item ("Show recent orchestrator actions") fires this IPC,
  // controller fetches last-100 swarm-audit rows from daemon GET
  // /v3/audit/swarm-audit?limit=100. Default deps wire production
  // fetch + token reader.
  registerAuditModalIpcHandlers();
  // === end MB-T13 audit-modal-fetch IPC ===
  // === BEGIN: MB-T22 commits-ipc registration ===
  // WB3 — wires `commits:list` IPC handler. Reads BuildDocConfig.repoRoot
  // via readBuildDocConfig() and delegates to commits-reader.readCommits
  // (workstation-side execFile git log per Q-MBT22-1=a). No daemon
  // round-trip; preserves WORKSTATION_CONTRACT.md §6 frozen surface.
  // Default deps wire to production readBuildDocConfig + readCommits.
  registerCommitsIpc();
  // === END: MB-T22 commits-ipc registration ===
  // CONSOLE-T02 IPC layer; CONSOLE-T03 wires the open-trigger menu below.
  consoleController = registerConsoleIpcHandlers({
    getWebContents: () => mainWindow?.webContents ?? null,
  });
  // === BEGIN: MB-T40 PTY relay wiring ===
  // wirePtyRelay called here (not at registerIpcHandlers line ~382) because
  // consoleController is null at that site; PTY output flows only after
  // createWindow() below. Dispatch authoring drift caught at HALT-WB2.
  wirePtyRelay(consoleController);
  // === END: MB-T40 ===
  // === BEGIN: §C.5 tile token scraper ===
  // Taps PTY stdout via consoleController.addStdoutObserver, strips ANSI,
  // extracts "[0-9]+ tokens" with 500ms per-session debounce, then emits
  // workstation:tile-token-update to the renderer. preload.mts subscribes
  // via ipcRenderer.on and surfaces as workstationBridge.onTileTokenUpdate.
  registerTileTokenScraper({
    broadcaster: consoleController,
    onTokenUpdate: (sessionName, tokensUsed) => {
      mainWindow?.webContents.send('workstation:tile-token-update', {
        sessionName,
        tokensUsed,
      });
    },
  });
  // === END: §C.5 tile token scraper ===
  // === BEGIN: MB-T-HSO-WIRE shared-emitter-and-writer ===
  // Construction order per ticket §4 WB ladder intro:
  //   shared EventEmitter → writer → harvester (WB5) → parser observer (WB7)
  //   → approval-policy (WB9) → pool auto-spawn (WB11; lands AFTER this zone).
  //
  // Zone relocated from its WB3-original position (above Fix-A api-key) to
  // here (after §C.5 tile-token-scraper) at WB5 GREEN: harvester needs
  // consoleController (set at registerConsoleIpcHandlers above) for its
  // IConsoleBroadcaster.addStdoutObserver dep; that reference is not in
  // scope until after line ~489. Same construction-order chain holds —
  // emitter still precedes writer still precedes harvester within this
  // zone. Probe-mbthsowire-02 (T2's WB2 RED) asserts zone presence + zone
  // content + zone position relative to app.whenReady() only; all pass
  // post-relocation. Probe-mbthsowire-04 (this commit's WB4 RED at
  // cd135e4) asserts both writer and harvester construction in the same
  // zone — only satisfiable with the harvester in this relocated zone.
  //
  // Writer subscribes 7 listeners via its constructor (swarm-state-writer.ts:
  // 205-211: tile-grid:session-add/remove, action-variant:fired, halt:emitted,
  // error:recorded, peer:turn-complete, handoff:triggered). The emitter
  // retains the writer through those listener references for the lifetime
  // of the main process; no dispose() call is wired (writer lives until
  // process exit, matching MB-T38 intended lifecycle).
  //
  // swarmStatePath resolves to the repo's docs/swarm-state.md per plan §5.1
  // Q-V35-2. app.getAppPath() returns the unpackaged Electron app dir
  // (packages/dispatch-workstation in dev); two parent-segments reach the
  // repo root. SwarmStateWriter requires an ABSOLUTE path per its config
  // doc (swarm-state-writer.ts:71). swarm-state.md does not currently
  // exist on disk; writer creates it on the first event emission via the
  // atomic-write helper (writeFileSync + renameSync at line 410-414).
  const sharedDispatchEmitter = new EventEmitter();
  const swarmStateWriter = new SwarmStateWriter(sharedDispatchEmitter, {
    swarmStatePath: resolve(app.getAppPath(), '..', '..', 'docs/swarm-state.md'),
    handoffDir: resolve(app.getAppPath(), '..', '..', 'docs/coordination'),
  });
  // Keep the binding live for any future dispose() wiring at app shutdown
  // and to satisfy noUnusedLocals. The writer is also retained transitively
  // by the emitter's listener refs (see constructor subscriptions above).
  void swarmStateWriter;
  // WB5 — PeerSummaryHarvester. Dedicated SessionSendPromptIpcController
  // instance constructed here (not the one inside registerSessionSend-
  // PromptIpcHandlers) because the renderer-IPC controller's lifecycle is
  // bound to the ipcMain handler; the harvester's injector is a separate
  // logical consumer that fires §7 summary prompts via the same tmux send-
  // keys path. Two stateless controllers (each just routes to coreHas-
  // Session/coreSendKeys) are equivalent — no state coherence concern.
  // Harvester subscribes to consoleController.addStdoutObserver via .start()
  // (peer-summary-harvester.ts:141-145); inner-quiescence + responseBuffer
  // pattern from MB-T39 multi-chunk fix bb4c47c is honored by the existing
  // class (no wiring-side action required — default responseQuiescenceMs
  // 500ms per peer-summary-harvester.ts:138 matches Q-MCFIX-1(d)).
  const peerSummarySendPromptInjector = new SessionSendPromptIpcController(
    defaultSessionSendPromptDeps(),
  );
  const peerSummaryHarvester = new PeerSummaryHarvester({
    ptyBroadcaster: consoleController,
    promptInjector: peerSummarySendPromptInjector,
    stateEmitter: sharedDispatchEmitter,
  });
  peerSummaryHarvester.start();
  // Keep the binding live for any future dispose() wiring at app shutdown
  // and to satisfy noUnusedLocals. Harvester is also retained transitively
  // by consoleController's observer-fn ref (via addStdoutObserver) for
  // process lifetime.
  void peerSummaryHarvester;
  // WB7 — action-marker-router: independent __orchestrator_active observer
  // + Pattern B accumulator + dispatchActionVariant caller. Per WB1 spike
  // binding (3c9629b ADR §V): per-session string buffer + strip-and-re-parse
  // loop addresses Concern (i) multi-marker-in-buffer. Independent observer
  // from MB-T40 pty-stream-relay (multiple subscribers supported per
  // MB-T37 broadcaster fan-out contract); pty-stream-relay's whole-buffer-
  // clear semantics remain untouched.
  //
  // Sub-Y-1 stub-fires (Q-WB7-2 ack): dispatchDeps.fire-* deps are no-op
  // resolvers at WB7. ACTION_VARIANT_FIRED_EVENT still emits from
  // dispatchActionVariant (action-variant-ipc.ts:271 etc.) on each
  // successful dispatch — caught by swarm-state-writer's constructor
  // subscription above for honest dogfood signal (mechanism shipped,
  // fires stubbed). dispatchDeps.resolveApproval is the WB7 placeholder;
  // WB9 GREEN swaps to the real MB-T13 approval-policy-resolver-shim.
  // Real fire-* wiring is a dedicated downstream ticket per the v3.5
  // plan's MB-T-HSO-WIRE → real-actions sequencing.
  //
  // onError sink (Q-WB7-4 ack): `coarchitect:streamError` IPC channel —
  // matches existing chat error surface for malformed-marker user-visible
  // feedback.
  const actionMarkerRouterDispose = registerActionMarkerRouter({
    broadcaster: consoleController,
    dispatch: dispatchActionVariant,
    dispatchDeps: {
      // WB9 GREEN — real MB-T13 approval-policy resolver (replaces WB7 stub).
      // resolveApprovalShim fetches per-session policy via daemon HTTP
      // (GET /v3/sessions/:name/approval-policy), then delegates to the pure
      // resolveApproval. Failure-graceful: returns 'tight' (conservative
      // gate) on any error per shim docblock §15-35; daemon's no-row default
      // is 'medium' per approval-policy.ts L82 + Q-MBT13-4=c (SQL DEFAULT
      // + workstation-side resolver fallback both 'medium').
      resolveApproval: ({ actionType, sessionName }) =>
        resolveApprovalShim({
          actionType: actionType as MBT11ActionType,
          sessionName,
        }),
      fireSendPrompt: async () => undefined,
      fireSpawn: async (sessionName) => ({ sessionName }),
      fireKill: async () => undefined,
      firePullHandoff: async () => ({
        content: '',
        written_at: new Date().toISOString(),
        archived_to: '',
      }),
      fireAssignTask: async () => ({
        intent_id: `stub-${Date.now()}`,
      }),
    },
    onError: (message) => {
      mainWindow?.webContents.send('coarchitect:streamError', { message });
    },
  });
  // Keep the dispose handle live for any future app-shutdown wiring and to
  // satisfy noUnusedLocals. Router is also retained transitively by
  // consoleController's observer-fn ref (via addStdoutObserver) for the
  // process lifetime.
  void actionMarkerRouterDispose;
  // WB11 — OrchestratorPoolManager auto-spawn. Constructed LAST in this
  // sentinel zone after writer/harvester/observer/policy per plan §1.3
  // Obs-3 construction-order chain. Pool's .start() fires
  // _spawnAndRegister(__orchestrator_active) + _spawnAndRegister(
  // __orchestrator_standby) sequentially (hso-pool.ts:121-122), then
  // begins POLL_INTERVAL_MS tmux-poll crash detection.
  //
  // Dedicated SpawnIpcController instance for pool-driven spawns (mirrors
  // the WB5 dedicated SessionSendPromptIpcController pattern). Reuses the
  // same defaultSpawnHandlerDeps factory as the renderer-IPC controller
  // at registerSpawnIpcHandlers above — both produce a SpawnHandlerDeps
  // wired to the production tmux/daemon/cap-check helpers. Two stateless
  // controllers; no coherence issue.
  //
  // orchestratorSystemPromptPath resolves to the operator-authored MB-T41
  // prompt at packages/dispatch-workstation/src/main/hso-system-prompts/
  // orchestrator.md. app.getAppPath() returns the unpackaged Electron app
  // dir (packages/dispatch-workstation in dev). hso-pool.ts:
  // _spawnAndRegister sets process.env.CLAUDE_APPEND_SYSTEM_PROMPT to this
  // path before spawnController.handleSpawnRequest; spawn-handler.ts:
  // buildTmuxArgs reads the env var and appends `--append-system-prompt
  // <path>` to the claude argv (Sub-Q-A=b env-var injection).
  //
  // runTmuxHasSession wraps coreHasSession (dispatch-core/dist/transport/
  // tmux.js) — boolean → throw-on-absent contract conversion for the pool's
  // tmux-poll crash detection at hso-pool.ts:158-177.
  //
  // halt: log + surface to renderer as a chat error (mirrors actionMarker-
  // Router's onError pattern above). Pool halt paths: _spawnAndRegister
  // spawn failure (any SpawnErrorType — includes SessionAlreadyRegistered
  // daemon 409 per spawn-handler.ts:38, which is the placeholder collision
  // detection per dispatch §WB11(d); WB12/WB13 author the dedicated probe
  // + tighter user-visible surface).
  const orchestratorSpawnHandlerDeps = await defaultSpawnHandlerDeps();
  const orchestratorSpawnController = new SpawnIpcController(
    orchestratorSpawnHandlerDeps,
  );
  const orchestratorSystemPromptPath = resolve(
    app.getAppPath(),
    'src',
    'main',
    'hso-system-prompts',
    'orchestrator.md',
  );
  const orchestratorPool = new OrchestratorPoolManager({
    spawnController: orchestratorSpawnController,
    tileRegistry: new TileGridRegistryAdapter(),
    consoleIpc: consoleController,
    stateWriter: swarmStateWriter,
    orchestratorSystemPromptPath,
    runTmuxHasSession: async (sessionName: string) => {
      const exists = await coreHasSession(sessionName);
      if (!exists) {
        throw new Error(`tmux session "${sessionName}" not found`);
      }
    },
    dispatchModeReader: readDispatchMode,
    halt: (reason: string) => {
      console.error('[MB-T-HSO-WIRE OrchestratorPoolManager halt]', reason);
      mainWindow?.webContents.send('coarchitect:streamError', { message: reason });
    },
    // Path (E) fix01e: production daemon-sessions client. Pool uses this to
    // GET reserved-name state at start() and PATCH-to-'held' at stop() —
    // avoids Blocker 3 (sessions.ts:155) collision on stale killed rows
    // from previous workstation lifecycles. Default-arg ctor reads token
    // from ~/.foxworks-dispatch/token + uses FOXWORKS_DAEMON_URL env var
    // (default http://localhost:7878). Auth header: 'x-conductor-token'
    // per MB-F-DAEMON-AUTH-HEADER-CONTRACT-DOC (NOT Authorization: Bearer).
    daemonSessionsClient: new DefaultDaemonSessionsClient(),
  });
  void orchestratorPool.start();
  // Keep the binding live for any future stop()/dispose() wiring at app
  // shutdown and to satisfy noUnusedLocals. Pool is also retained
  // transitively by consoleController's observer-fn ref (via
  // addStdoutObserver / addStreamCloseObserver) + setInterval poll timer
  // for process lifetime.
  void orchestratorPool;
  // === END: MB-T-HSO-WIRE shared-emitter-and-writer ===
  // === BEGIN: MB-T-POOL-SHUTDOWN-HOOK-FIX shutdown-hook (do not modify outside this block) ===
  // Wires `orchestratorPool.stop()` (hso-pool.ts:266-286 shipped at
  // deca210 path-E) to electron's `before-quit` event so the pool's
  // teardown PATCH calls (reserved-name rows → state='held') complete
  // before app exits. Closes MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION
  // (Tier 3 at FOLLOWUPS.md:286) — pre-fix, clean SIGTERM left 2 daemon
  // orphans per launch (state='armed' for __orchestrator_active +
  // __orchestrator_standby); post-fix, rows survive at state='held' and
  // subsequent launch's path-E start() GET-then-PATCH-to-'armed' handles
  // them cleanly. Also closes the pool-driven manifestation of
  // MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVES-ORPHAN-REGISTRATIONS (Tier 2).
  //
  // Sub-Q-B=b operator-acked 2026-05-11: bounded 5000ms timeout via
  // Promise.race so a hung daemon does not block app exit indefinitely.
  // pool.stop() is best-effort per its shipped implementation (try/catch
  // silently swallows daemon errors at hso-pool.ts:282-284); the race
  // is defense-in-depth for the rare "daemon hangs without erroring"
  // case.
  //
  // event.preventDefault() + app.exit(0): preventDefault() defers the
  // real quit so the async teardown can complete; app.exit(0) bypasses
  // electron's normal quit-flow (app.quit() would re-fire before-quit
  // and loop). Per electron 41 before-quit docs.
  app.on('before-quit', (event) => {
    event.preventDefault();
    void (async () => {
      try {
        await Promise.race([
          orchestratorPool.stop(),
          new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
        ]);
      } finally {
        app.exit(0);
      }
    })();
  });
  // === END: MB-T-POOL-SHUTDOWN-HOOK-FIX shutdown-hook ===
  // MB-T07 card-IPC wiring removed at MB-T-HSO-WIRE WB14b (v3.0 path
  // removal); card-wiring.ts + card-ipc.ts deleted in this commit.
  registerOnboardingIpc();

  // === Onboarding mount (Session C / Batch 6 / wiring-mounts) ===
  // Closes MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT (vision §8.1 ship-gate).
  // Smoke-harness path (MB_TEST_HOOKS=1): preserve existing sentinel-only
  // behavior — the harness drives onboarding via stdin (ONBOARDING_API_KEY,
  // ONBOARDING_DONE) so the headless test loop does not block on a real
  // BrowserWindow modal. Production path: open the onboarding window via
  // electronOnboardingDeps and await operator completion before continuing
  // to createWindow().
  {
    const cfgDir = configDir();
    if (await checkFirstLaunch({ configDir: cfgDir })) {
      if (process.env.MB_TEST_HOOKS === '1') {
        process.stdout.write('ONBOARDING_REQUIRED\n');
      } else {
        await runOnboardingIfNeeded({
          configDir: cfgDir,
          ...electronOnboardingDeps({ preloadPath: ONBOARDING_PRELOAD_PATH }),
        });
      }
    }
  }
  // === end Onboarding mount ===

  await createWindow();
  registerLifecycleHooks(app, () => mainWindow, createWindow);
  // CC Console menu — initial empty session list; refresh wiring is a
  // followup. Operator can still see the menu's cap-status hint when the
  // panel cap is reached even with an empty session list.
  refreshConsoleMenu([]);

  // === BEGIN: Fix-C console trigger (cairn finding #82, do not modify outside this block) ===
  // Closes MB-F-CONSOLE-T03-MENU-SUBSCRIPTION + cairn finding #82.
  // Operator-arbitrated 2026-05-04: hybrid (WS /v2/events/stream as a
  // "something changed → refetch" trigger + REST GET /v2/sessions for the
  // session list). Daemon emits no session_created/session_removed events
  // on the bus (cairn finding #88); pure event-driven impossible at this
  // daemon HEAD.
  {
    const FIX_C_DAEMON_HTTP_URL =
      process.env['FOXWORKS_DAEMON_URL'] ?? 'http://localhost:7878';
    const FIX_C_DAEMON_WS_URL =
      process.env['FOXWORKS_DAEMON_WS_URL'] ?? 'ws://localhost:7878';
    let fixCToken = '';
    try {
      fixCToken = fixCReadFileSync(
        fixCJoin(fixCHomedir(), '.foxworks-dispatch', 'token'),
        'utf8',
      ).trim();
    } catch {
      // No token → fetch will 401; menu stays in initial empty state.
      // Operator refinement (a) — no hidden polling, no error escalation.
    }
    subscribeConsoleMenuToDaemon({
      httpUrl: FIX_C_DAEMON_HTTP_URL,
      wsUrl: FIX_C_DAEMON_WS_URL,
      token: fixCToken,
      fetchImpl: (url, init) => fetch(url, init),
      wsFactory: (url) => {
        const ws = new WebSocket(url);
        const adapter: ConsoleMountWebSocket = {
          on(event, cb) {
            if (event === 'open') {
              ws.addEventListener('open', () => (cb as () => void)());
            } else if (event === 'message') {
              ws.addEventListener('message', (ev: MessageEvent) => {
                const data =
                  typeof ev.data === 'string' ? ev.data : String(ev.data);
                (cb as (d: string) => void)(data);
              });
            } else if (event === 'close') {
              ws.addEventListener('close', (ev: CloseEvent) => {
                (cb as (c: number, r: string) => void)(ev.code, ev.reason);
              });
            } else if (event === 'error') {
              ws.addEventListener('error', () =>
                (cb as (e: Error) => void)(new Error('websocket error')),
              );
            }
          },
          close(code, reason) {
            ws.close(code, reason);
          },
        };
        return adapter;
      },
      refreshMenu: (sessions) => refreshConsoleMenu(sessions),
    });
  }
  // === END: Fix-C ===

  // === BEGIN: MB-T12 tile-grid mount (do not modify outside this block) ===
  // WB12 — replaces the WB1-era no-op mountConsoleTileGrid wiring with
  // the real tile-grid integration. The renderer-side React tree mounts
  // in dist/tile-grid/renderer.js (built from src/tile-grid/mount.ts) and
  // is loaded by workstation-shell.html.
  //
  // This block (main-process side) sets up:
  //   - DetachTileIpcController (WB11b) — opens detached BrowserWindows
  //     on tile-detach-button clicks; routes 'tile:detach' invoke +
  //     'tile:detach-closed' notify back to renderer.
  //   - ConsoleIpcController.setSessionTarget callback (WB11a multi-target
  //     refactor) — wired to the detach controller so console:* events
  //     for a detached session route to the detached window's webContents
  //     instead of mainWindow.
  //   - TILE_GRID_MOUNTED stdout sentinel (MB_TEST_HOOKS=1) for smoke
  //     harness verification.
  //
  // R-MBT12-6 honored: this is a NEW sentinel-bracketed block adjacent
  // to (but not inside) the existing Fix-C / Probe-92 sentinel zones.
  const detachTileController = new DetachTileIpcController({
    windowFactory: createDefaultWindowFactory(BrowserWindow),
    consolePanelHtmlPath: CONSOLE_PANEL_HTML_PATH,
    preloadPath: PRELOAD_PATH,
    setSessionTarget: (sessionName, target) => {
      consoleController?.setSessionTarget(sessionName, target);
    },
    notifyMainWindow: (sessionName) => {
      const wc = mainWindow?.webContents;
      if (wc && !wc.isDestroyed()) {
        wc.send('tile:detach-closed', { sessionName });
      }
    },
  });
  detachTileController.registerHandlers(ipcMain);
  if (process.env['MB_TEST_HOOKS'] === '1') {
    process.stdout.write('TILE_GRID_MOUNTED\n');
  }
  // === END: MB-T12 tile-grid mount ===

  // === BEGIN: MB-T16 approval-policy IPC (do not modify outside this block) ===
  // WB4 — wires `workstation:approval-policy-get` + `workstation:approval-
  // policy-put` ipcMain handlers. The renderer-side TileApprovalPicker
  // (mounted by TileGridApp via renderPickerSlot closure) invokes these
  // channels through the preload contextBridge methods
  // `getSessionApprovalPolicy` / `putSessionApprovalPolicy`.
  //
  // The default factory wires DAEMON_URL (env var or localhost:7878
  // fallback) + readDaemonToken() (~/.foxworks-dispatch/token via fs).
  // Token is re-read per request so it can rotate without process
  // restart.
  //
  // Closes MB-F-T13-TILE-HEADER-PICKER-INTEGRATION (FOLLOWUPS.md:160)
  // — the tile-header dropdown that lets operators flip approval
  // policy via tile UI is now functional end-to-end (renderer →
  // preload bridge → ipcMain handler → daemon GET/PUT
  // /v3/sessions/:name/approval-policy → SQLite session_policies).
  //
  // R-MBT16-7 + R-MBT12-6 honored: NEW sentinel-bracketed block
  // adjacent to (NOT inside) the existing MB-T12 / Fix-C / Probe-92
  // sentinel zones.
  const approvalPolicyController = createDefaultApprovalPolicyIpcController();
  approvalPolicyController.registerHandlers(ipcMain);
  if (process.env['MB_TEST_HOOKS'] === '1') {
    process.stdout.write('APPROVAL_POLICY_IPC_MOUNTED\n');
  }
  // === END: MB-T16 approval-policy IPC ===

  // === BEGIN: MB-T17 autopilot IPC (do not modify outside this block) ===
  // WB4 — wires `workstation:autopilot-get` + `workstation:autopilot-put`
  // ipcMain handlers. The renderer-side TileAutopilotToggle (mounted by
  // TileGridApp via renderAutopilotSlot closure) invokes these channels
  // through the preload contextBridge methods `getSessionAutopilotEnabled`
  // / `setSessionAutopilotEnabled`.
  //
  // Default factory wires `new AutopilotLoop()` (default deps reading/
  // writing autopilot-state-store at <userData>/autopilot-state.json).
  // Q-MBT17-9=a: parallel AutopilotLoop instance is explicitly safe per
  // autopilot-loop.ts file header — pre-WB14 the singleton was shared
  // with the v3.0 orchestrator-action-handler caller in coarchitect-ipc.ts
  // (both removed at MB-T-HSO-WIRE WB14a/b). Post-WB14 the v3.5 caller
  // (action-marker-router → dispatchActionVariant) does not currently
  // hold an AutopilotLoop instance; this controller's instance is the
  // sole live one. Parallel-safe contract still holds for any future
  // v3.5 instance that may be wired downstream.
  //
  // Closes MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION (FOLLOWUPS.md:173)
  // — the tile-header autopilot toggle that MB-T11 deferred to a follow-
  // on now ships end-to-end (renderer → preload bridge → ipcMain handler
  // → AutopilotLoop → autopilot-state.json).
  //
  // R-MBT17-7 honored: NEW sentinel-bracketed block adjacent to (NOT
  // inside) the MB-T16 sentinel zone.
  const autopilotController = createDefaultAutopilotIpcController();
  autopilotController.registerHandlers(ipcMain);
  if (process.env['MB_TEST_HOOKS'] === '1') {
    process.stdout.write('AUTOPILOT_IPC_MOUNTED\n');
  }
  // === END: MB-T17 autopilot IPC ===

  // === BEGIN: MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE mount (do not modify outside this block) ===
  // WB7 — Wave-1 sentinel zone per Q-MVP-W1-5=(a) ack (operator 17:55 MDT).
  //
  // This block reserves the main-process anchor for the orchestrator-focus-
  // pane wiring. Per Q-MVP-W1-1=(a) ack (operator 17:55 MDT) the renderer
  // consumes the EXISTING `coarchitect:ptyChunk` broadcast emitted by
  // src/main/pty-stream-relay.ts:52 — NO new IPC channel + NO new main-side
  // controller registration is required.
  //
  // Per Q-MVP-W1-6=(c) overlay strategy: the renderer-side bundle
  // (src/orchestrator-focus-pane/mount.ts) auto-creates its own overlay div
  // and attaches to document.body on DOMContentLoaded, so the READ-ONLY
  // workstation-shell.html does NOT need a `<script>` tag or anchor div
  // edit at this WB. Production load wiring (script-tag injection into
  // shell.html OR webContents.executeJavaScript bridge) is the gate for
  // user-visible mount and is deferred to a follow-on wave with operator
  // shell.html territory amendment — Tier-1 followup
  // MB-F-MVP-W1-PRODUCTION-MOUNT-WIRING-PENDING-SHELL-HTML-AMENDMENT
  // (filed at WB-final).
  //
  // Smoke-harness sentinel: emit FOCUS_PANE_IPC_READY when
  // MB_TEST_HOOKS=1 so the runtime-launch smoke can assert the new
  // sentinel zone was reached without ERR_MODULE_NOT_FOUND class bugs
  // (mirrors MB-T12 / MB-T16 / MB-T17 patterns at lines 1088 / 1116 /
  // 1148).
  if (process.env['MB_TEST_HOOKS'] === '1') {
    process.stdout.write('FOCUS_PANE_IPC_READY\n');
  }
  // === END: MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE mount ===

  // MB-T24 dispatch-mode IPC was relocated UP to register BEFORE
  // createWindow (see WB4b runtime-smoke finding zone above near
  // registerSpawnIpcHandlers). Renderer DispatchModeToggle invokes
  // getDispatchMode at mount, so the handler must be live before the
  // chat-shell renderer auto-mounts. The post-createWindow zone is
  // intentionally absent.

  // ONBOARDING_READY sentinel is emitted after createWindow returns so the
  // smoke harness's runOnboarding() can wait deterministically.
  if (process.env.MB_TEST_HOOKS === '1') {
    process.stdout.write('ONBOARDING_READY\n');
  }
});

// stdin channel for deterministic exit (MB-S04 ADR K3) and test hooks.
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string | Buffer) => {
  const line = chunk.toString().trim();

  if (line === 'QUIT') {
    app.quit();
    return;
  }

  // MB_TEST_HOOKS: SAVE_SPLITTER <pos> — writes splitter position to userData JSON.
  // Used by splitter-persists.test.ts two-spawn cycle.
  if (process.env.MB_TEST_HOOKS === '1') {
    const m = /^SAVE_SPLITTER (\d+)$/.exec(line);
    if (m) {
      const pos = parseInt(m[1], 10);
      writeSplitterPosition(pos);
      process.stdout.write(`SPLITTER_SAVED ${pos}\n`);
      return;
    }

    // MB-T04: CLICK_SPAWN_BUTTON — clicks header [+ Spawn Session] via DOM,
    // exercising the modal-open path used by spawn-modal-opens.test.ts.
    if (line === 'CLICK_SPAWN_BUTTON') {
      if (!mainWindow) return;
      mainWindow.webContents
        .executeJavaScript(
          `(function() {
            var b = document.querySelector('[data-testid="spawn-button"]');
            if (!b) { console.error('FIXTURE: spawn-button not found'); return; }
            b.click();
          })();`,
        )
        .catch((err: Error) => {
          process.stderr.write('CLICK_SPAWN_BUTTON error: ' + err.message + '\n');
        });
      return;
    }

    // MB-T04: FILL_AND_SUBMIT_SPAWN <repoPath>|<sessionName> — fills the spawn
    // modal inputs and clicks [Spawn]; exercises the IPC fire-path used by
    // spawn-modal-emits-intent.test.ts. Pipe separator chosen so shell paths
    // (which can contain spaces) survive intact; pipe is excluded by the
    // strict regex below to keep the parse unambiguous.
    const fillMatch = /^FILL_AND_SUBMIT_SPAWN ([^|]+)\|(.+)$/.exec(line);
    if (fillMatch) {
      if (!mainWindow) return;
      const repoEsc = JSON.stringify(fillMatch[1]);
      const nameEsc = JSON.stringify(fillMatch[2]);
      mainWindow.webContents
        .executeJavaScript(
          `(function() {
            var rp = document.querySelector('[data-testid="spawn-repo-path"]');
            var sn = document.querySelector('[data-testid="spawn-session-name"]');
            var sb = document.querySelector('[data-testid="spawn-confirm-button"]');
            if (!rp || !sn || !sb) {
              console.error('FIXTURE: spawn modal inputs not found');
              return;
            }
            rp.value = ${repoEsc};
            sn.value = ${nameEsc};
            sb.click();
          })();`,
        )
        .catch((err: Error) => {
          process.stderr.write('FILL_AND_SUBMIT_SPAWN error: ' + err.message + '\n');
        });
      return;
    }

    // MB-T08: smoke-harness onboarding driver. The renderer-side modal mount
    // is followup-tracked, so under MB_TEST_HOOKS the smoke harness drives
    // onboarding directly through the same persistence calls the renderer
    // would invoke via IPC. Behavior is identical from a config-on-disk
    // standpoint; ship-gate validates that operators get a working app
    // post-onboarding regardless of which path drove the flow.
    if (line === 'ONBOARDING_NEXT') {
      // Step 1 → step 2 advance is renderer-internal in production; in the
      // smoke path it's a no-op echo so the harness's command sequence
      // stays symmetric.
      process.stdout.write('ONBOARDING_STEP_API_KEY\n');
      return;
    }
    const apiKeyMatch = /^ONBOARDING_API_KEY (.+)$/.exec(line);
    if (apiKeyMatch) {
      try {
        saveApiKey(apiKeyMatch[1], { configDir: configDir(), safeStorage });
        process.stdout.write('ONBOARDING_API_KEY_SAVED\n');
      } catch (err) {
        process.stderr.write(
          `ONBOARDING_API_KEY error: ${(err as Error).message}\n`,
        );
      }
      return;
    }
    if (line === 'ONBOARDING_DONE') {
      markOnboardingComplete({ configDir: configDir() });
      process.stdout.write('ONBOARDING_COMPLETE\n');
      return;
    }

    // === BEGIN: Probe-92 obs-infra — KANBAN_EVAL stdin handler (do not modify outside this block) ===
    // KANBAN_EVAL <id>|<code> — runs <code> via executeJavaScript on the
    // kanban webview's webContents (captured in did-attach-webview
    // above) and emits KANBAN_EVAL_RESULT <id> <json> to stdout where
    // <json> is { ok: true, result } | { ok: false, error: string }.
    // Used by Probes 5-9 to read localStorage / DOM / fetch from inside
    // the webview without baking probe-specific sentinels into preload.
    // Pipe separator chosen for the same reason FILL_AND_SUBMIT_SPAWN
    // uses it (shell paths/JSON survive intact). Production: gate
    // unreachable (already inside MB_TEST_HOOKS=1 block).
    const kanbanEvalMatch = /^KANBAN_EVAL ([^|]+)\|(.+)$/.exec(line);
    if (kanbanEvalMatch) {
      const id = kanbanEvalMatch[1];
      const code = kanbanEvalMatch[2];
      if (!kanbanWebContents || kanbanWebContents.isDestroyed()) {
        process.stdout.write(
          `KANBAN_EVAL_RESULT ${id} ${JSON.stringify({
            ok: false,
            error: 'webview-not-attached',
          })}\n`,
        );
        return;
      }
      kanbanWebContents.executeJavaScript(code, true).then(
        (result: unknown) => {
          process.stdout.write(
            `KANBAN_EVAL_RESULT ${id} ${JSON.stringify({ ok: true, result })}\n`,
          );
        },
        (err: Error) => {
          process.stdout.write(
            `KANBAN_EVAL_RESULT ${id} ${JSON.stringify({
              ok: false,
              error: err.message,
            })}\n`,
          );
        },
      );
      return;
    }
    // === END: Probe-92 obs-infra — KANBAN_EVAL stdin handler ===

    // === BEGIN: Session 3 SHELL_EVAL stdin handler (do not modify outside this block) ===
    // SHELL_EVAL <id>|<code> — runs <code> via executeJavaScript on the
    // shell webContents (mainWindow.webContents) and emits SHELL_EVAL_RESULT
    // <id> <json> to stdout where <json> is { ok: true, result } | { ok:
    // false, error: string }. Direct parallel of KANBAN_EVAL above but
    // targets the shell webview (workstation-shell.html) instead of the
    // embedded kanban <webview>. Used by Session-3 P1 ConsolePanel-mount
    // probe to read shell DOM and drive consoleBridge from the renderer.
    // Pipe separator survives shell paths / JSON intact (same convention
    // as FILL_AND_SUBMIT_SPAWN / KANBAN_EVAL).
    // Production: gate unreachable (already inside MB_TEST_HOOKS=1 block).
    const shellEvalMatch = /^SHELL_EVAL ([^|]+)\|(.+)$/.exec(line);
    if (shellEvalMatch) {
      const id = shellEvalMatch[1];
      const code = shellEvalMatch[2];
      const wc = mainWindow?.webContents;
      if (!wc || wc.isDestroyed()) {
        process.stdout.write(
          `SHELL_EVAL_RESULT ${id} ${JSON.stringify({
            ok: false,
            error: 'shell-not-attached',
          })}\n`,
        );
        return;
      }
      wc.executeJavaScript(code, true).then(
        (result: unknown) => {
          process.stdout.write(
            `SHELL_EVAL_RESULT ${id} ${JSON.stringify({ ok: true, result })}\n`,
          );
        },
        (err: Error) => {
          process.stdout.write(
            `SHELL_EVAL_RESULT ${id} ${JSON.stringify({
              ok: false,
              error: err.message,
            })}\n`,
          );
        },
      );
      return;
    }
    // === END: Session 3 SHELL_EVAL stdin handler ===

    // === BEGIN: Fix-89 test hook (cairn finding #89, do not modify outside this block) ===
    // REFRESH_CONSOLE_MENU <comma,separated,names> — drives refreshConsoleMenu
    // directly so the fix-89 integration test (test/integration/fix-89-menu-
    // rebuild/) can exercise menu rebuild propagation without depending on a
    // running daemon. The integration test asserts the macOS native menu
    // bar's "CC Console" submenu reflects the rebuilt names via AppleScript
    // introspection; this stdin handler is the deterministic trigger.
    // Empty-tail handling: trailing/leading whitespace + empty entries are
    // discarded so callers can pass a single name without commas.
    // Production: gate unreachable (already inside MB_TEST_HOOKS=1 block).
    const fix89RefreshMatch = /^REFRESH_CONSOLE_MENU (.+)$/.exec(line);
    if (fix89RefreshMatch) {
      const names = fix89RefreshMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');
      refreshConsoleMenu(names);
      process.stdout.write(`REFRESH_CONSOLE_MENU_DONE ${names.length}\n`);
      return;
    }
    // === END: Fix-89 test hook ===

    // COARCH-T03: TYPE_AND_SEND <content> — sets chat-input value and clicks send button.
    const typeAndSend = /^TYPE_AND_SEND (.+)$/.exec(line);
    if (typeAndSend && mainWindow) {
      const contentEsc = JSON.stringify(typeAndSend[1]);
      mainWindow.webContents
        .executeJavaScript(
          `(function() {
            var input = document.querySelector('[data-testid="chat-input"]');
            var btn = document.querySelector('[data-testid="send-button"]');
            if (!input || !btn) { console.error('FIXTURE: chat-input or send-button not found'); return; }
            input.value = ${contentEsc};
            btn.click();
          })();`,
        )
        .catch((err: Error) => {
          process.stderr.write('TYPE_AND_SEND error: ' + err.message + '\n');
        });
      return;
    }
  }
});

// === BEGIN: MB-T-PHASE-4-BOTTOM-RAIL deferred-wiring anchor ===
// Per operator decision 2026-05-16 (BR-IMPL-1=(b) DEFER), the production
// wiring for the bottom-rail MaxParallelCounter + BypassPermsIndicator
// consumer surfaces is DEFERRED out of this ticket. The renderer-side
// pluggable-source seams shipped in chat-shell/mount.ts (resolveRender
// MaxParallelCounter at b3e8daf + resolveRenderBypassPerms at 8c905b9)
// accept production sources at MountChatShellOptions but no main-
// process supplier is wired today.
//
// What's deferred (Tier-1 followup body proposed at WB-final):
//   1. createBypassPermsSource() singleton instantiation at app start.
//   2. spawn-ipc.ts defaultSpawnHandlerDeps factory population of
//      bypassPermsSource field (closes the gap at spawn-handler.ts:486
//      where deps.bypassPermsSource?.recordSpawn is already wired but
//      always falsy in production).
//   3. coarchitect-ipc.ts onUpdate fan-out emitting
//      `coarchitect:bypass-perms-update` to renderer (mirrors rate-
//      limit-aggregator fan-out at coarchitect-ipc.ts:144-150).
//   4. preload.mts coarchitectBridge.onBypassPermsUpdate exposure.
//   5. mount.ts auto-mount block subscribing to onBypassPermsUpdate
//      and threading bypassPermsActiveCount + bypassPermsDispatchMode
//      into MountChatShellOptions.
//   6. Raw-fs <userData>/max-parallel.json reader (per CLAUDE.md §3.5
//      splitter-state.ts pattern) supplying MaxParallelSource to
//      mount.ts maxParallelSource option.
//   7. Renderer-side sessions-stream accumulator off workstationBridge.
//      onSpawnResult (BR-2=(a) renderer-internal filter ratification).
//
// Why deferred: items (3) + (4) require amending WORKSTATION_CONTRACT.md
// §6.6 IPC channels, which is operator-arbitrated frozen-contract
// territory per CLAUDE.md §1. Bundling the §6.6 amendment with the
// renderer pluggable-source seam would gate the seam ship on contract
// arbitration; operator separated them by deferring items 1-7 to a
// dedicated Tier-1 followup (mirrors MB-F-MOUNT-WIRING-HTTPSESSIONLIST
// CLIENT-PROD-WIRING-DEFERRED precedent shipped at 7c8a957 under the
// same NEW-EMERGENT-CLASS arbitration).
//
// Closure path (Tier 1; proposed at WB-final of this ticket; operator-
// stamp envelope for FOLLOWUPS.md insertion):
//   MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16
//
// Future implementation site: the Tier-1 followup IMPL session lands
// items 1-7 INSIDE this sentinel zone (CLAUDE.md §3.3 discipline —
// new logic in existing zone OK when zone-scope-matched; or a sibling
// `=== BEGIN: MB-T-PHASE-4-BOTTOM-RAIL prod wiring ===` zone if scope
// expansion is needed).
// === END: MB-T-PHASE-4-BOTTOM-RAIL ===
