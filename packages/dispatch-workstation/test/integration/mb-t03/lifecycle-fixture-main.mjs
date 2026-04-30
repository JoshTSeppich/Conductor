// Electron entry point for MB-T03 integration tests (window-state-persists.test.ts).
// Spawned by the test instead of dist/main/main.js so the test can exercise
// createManagedWindow + registerLifecycleHooks without waiting for Zipper-1 to
// wire those functions into main.ts. Satisfies §7.2 pre-condition: test suite
// passes before Zipper-1.
//
// Uses MB-S04 ADR primitives:
//   WINDOW_READY stdout sentinel (K2) — emitted on did-finish-load
//   stdin QUIT (K3) — deterministic exit code 0
// Plus MB-T03 extensions:
//   WINDOW_STATE stdout sentinel — emitted by createManagedWindow
//   RESIZE stdin command — handled by createManagedWindow when MB_TEST_HOOKS=1
import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Resolve window-lifecycle.js from dist/main/ relative to fixture location:
// test/integration/mb-t03/ → ../../../dist/main/window-lifecycle.js
const lifecyclePath = resolve(__dirname, '../../../dist/main/window-lifecycle.js');

const { createManagedWindow, registerLifecycleHooks } = await import(lifecyclePath);

let mainWindow = null;

function createWindow() {
  mainWindow = createManagedWindow({
    width: 1024,
    height: 768,
    show: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(
    'data:text/html;charset=utf-8,' +
      encodeURIComponent(
        '<!doctype html><html><head><meta charset="utf-8"><title>MB-T03 fixture</title></head><body><h1>MB-T03 lifecycle fixture</h1></body></html>',
      ),
  );

  // WINDOW_READY sentinel per MB-S04 ADR K2.
  mainWindow.webContents.on('did-finish-load', () => {
    process.stdout.write('WINDOW_READY\n');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

registerLifecycleHooks(app, () => mainWindow, createWindow);

// stdin QUIT channel per MB-S04 ADR K3.
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  if (chunk.toString().trim() === 'QUIT') {
    app.quit();
  }
});
