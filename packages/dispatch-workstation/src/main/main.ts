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
import { registerIpcHandlers } from './coarchitect-ipc.js';
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
import { wireCardIpc } from './card-wiring.js';
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
  // === MB-T09 session-send-prompt IPC ===
  // Per CONDUCTOR_V3_RESCOPE.md §3.4 + §4 — orchestrator (MB-T11) and
  // tile footer (MB-T12) consume this surface. Default deps wire to
  // canonical sendKeys (dispatch-core/src/transport/tmux.ts).
  registerSessionSendPromptIpcHandlers();
  // === end MB-T09 session-send-prompt IPC ===
  // === MB-T11 WB3 session-kill IPC ===
  // Per CONDUCTOR_V3_RESCOPE.md §3.6 + Q-MBT11-3=a — orchestrator-callable
  // kill (orchestrator-action-handler in WB5 fires this; no renderer-direct
  // tile-header kill in v3.0). Two-step: tmux kill-session + PATCH
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
  // CONSOLE-T02 IPC layer; CONSOLE-T03 wires the open-trigger menu below.
  consoleController = registerConsoleIpcHandlers({
    getWebContents: () => mainWindow?.webContents ?? null,
  });
  // === MB-T07 card wiring (Session B / Batch 6 / wiring-cards) ===
  wireCardIpc({ ipcOn: (channel, listener) => ipcMain.on(channel, listener) });
  // === end MB-T07 card wiring ===
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
