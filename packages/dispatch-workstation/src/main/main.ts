// Foxworks Workstation Electron entry — wired by Zipper-1 (B+C) + Zipper-2 (D).
//
// Zipper-1 (68e6528): wired B's webview-loader + C's menu/window-lifecycle.
// Zipper-2: refactored to load wrapper page (workstation-shell.html) that hosts
// both dispatch-web kanban (top, <webview>) and COARCH-T02 chat panel (bottom).
// loadDispatchWeb() removed from this call site per Amendment 2026-04-30 (b);
// WEB_UI_URL forwarded to the wrapper via loadFile query param.
import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { WEB_UI_URL } from './webview-loader.js';
import { registerApplicationMenu } from './menu.js';
import { createManagedWindow, registerLifecycleHooks } from './window-lifecycle.js';
import { registerIpcHandlers } from './coarchitect-ipc.js';
import { registerSpawnIpcHandlers } from './spawn-ipc.js';
import { writeSplitterPosition } from './splitter-state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRELOAD_PATH = resolve(__dirname, 'preload.cjs');
const SHELL_PATH = resolve(__dirname, 'workstation-shell.html');

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
        msg.startsWith('SPLITTER_LOADED ') ||
        msg.startsWith('MESSAGE_SENT ')
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

app.whenReady().then(async () => {
  registerApplicationMenu();
  registerIpcHandlers();
  registerSpawnIpcHandlers();
  await createWindow();
  registerLifecycleHooks(app, () => mainWindow, createWindow);
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
  }
});
