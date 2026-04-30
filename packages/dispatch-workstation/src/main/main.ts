// Foxworks Workstation Electron entry — wired by Zipper-1 (Round 2).
//
// Composes B's webview-loader (loadDispatchWeb) + C's menu (registerApplicationMenu)
// and window-lifecycle (createManagedWindow, registerLifecycleHooks) per
// parallel-cairn-round-2-contract.md §3.6 + §4.7 + §7.2.
import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadDispatchWeb } from './webview-loader.js';
import { registerApplicationMenu } from './menu.js';
import { createManagedWindow, registerLifecycleHooks } from './window-lifecycle.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRELOAD_PATH = resolve(__dirname, 'preload.js');

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
    },
  });

  // Register WINDOW_READY sentinel before loadDispatchWeb so the listener
  // exists when loadURL commences (did-finish-load timing discipline).
  mainWindow.webContents.on('did-finish-load', () => {
    process.stdout.write('WINDOW_READY\n');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await loadDispatchWeb(mainWindow);
}

app.whenReady().then(async () => {
  registerApplicationMenu();
  await createWindow();
  registerLifecycleHooks(app, () => mainWindow, createWindow);
});

// stdin "QUIT" channel for the MB-T01 Red criterion (MB-S04 ADR K3).
// Deterministic exit code 0; preferred over SIGTERM (K4 non-deterministic).
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string | Buffer) => {
  if (chunk.toString().trim() === 'QUIT') {
    app.quit();
  }
});
