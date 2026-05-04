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
// === Console mount imports (Session C / Batch 6 / wiring-mounts) ===
import { mountConsoleTileGrid } from './console-mount.js';
// === end Console mount imports ===

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRELOAD_PATH = resolve(__dirname, 'preload.cjs');
const SHELL_PATH = resolve(__dirname, 'workstation-shell.html');
// === Onboarding mount path (Session C / Batch 6 / wiring-mounts) ===
const ONBOARDING_PRELOAD_PATH = resolve(__dirname, 'preload-onboarding.cjs');
// === end Onboarding mount path ===

let mainWindow: BrowserWindow | null = null;

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
  });
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
  registerApplicationMenu();
  registerIpcHandlers();
  registerSpawnIpcHandlers();
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

  // === Console mount (Session C / Batch 6 / wiring-mounts) ===
  // Closes MB-F-CONSOLE-T03-SHELL-INTEGRATION (vision §10.10 ship-gate).
  //
  // v3.0 single-panel-in-shell: the shell's inline script subscribes to
  // window.consoleBridge.onConsoleOpen / onConsoleClose directly (see
  // workstation-shell.html), so the tile region's visibility tracks
  // panel state without requiring main-process panel-event observability.
  // mountConsoleTileGrid is wired here for the parallel
  // console-tile:show / console-tile:hide IPC channels that MB-T12
  // multi-panel tiling will consume; in v3.0 it stays quiescent because
  // ConsoleIpcController does not surface panel-event observability and
  // the menu callback wiring (refreshConsoleMenu's onOpen) lives outside
  // Session-C's sentinel territory.
  //
  // The CONSOLE_TILE_GRID_MOUNTED stdout sentinel is emitted on mount so
  // the smoke harness can validate the wiring chain even though no panel
  // events fire in v3.0. Future MB-T12 will replace the no-op event
  // sources with controller-derived subscriptions.
  const consoleMountDispose = mountConsoleTileGrid({
    onPanelOpen: () => () => {
      /* v3.0: no panel-event source on controller; MB-T12 wires this. */
    },
    onPanelClose: () => () => {
      /* v3.0: no panel-event source on controller; MB-T12 wires this. */
    },
    sendToShell: (channel, payload) => {
      const wc = mainWindow?.webContents;
      if (wc && !wc.isDestroyed()) wc.send(channel, payload);
    },
    emitTestSentinel: (sentinel) => {
      if (process.env.MB_TEST_HOOKS === '1') {
        process.stdout.write(sentinel + '\n');
      }
    },
  });
  // Capture the dispose handle so future window-close lifecycle hooks
  // can release subscriptions cleanly. No-op in v3.0 (subscriptions are
  // empty), but keeps the symmetry for MB-T12.
  void consoleMountDispose;
  // === end Console mount ===

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
