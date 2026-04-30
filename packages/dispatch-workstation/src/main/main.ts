// MB-T01 green: Foxworks Workstation Electron entry.
//
// Minimum scaffold per V3_TICKETS.md L100-L106. Production behavior comes
// in MB-T02+ (dispatch-web BrowserWindow load) and beyond. This entry's
// only job is to open an empty BrowserWindow and respond to the test
// instrumentation channels defined by docs/adr/MB-S04-vitest-electron-spawn.md.
import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRELOAD_PATH = resolve(__dirname, 'preload.js');

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
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

  mainWindow.loadURL(
    'data:text/html;charset=utf-8,' +
      encodeURIComponent(
        '<!doctype html><html><head><meta charset="utf-8"><title>Foxworks Workstation</title></head><body><h1>Foxworks Workstation</h1><p>v3.0 scaffold (MB-T01)</p></body></html>',
      ),
  );

  // Test sentinel for MB-T01 Red criterion (MB-S04 ADR K2).
  mainWindow.webContents.on('did-finish-load', () => {
    process.stdout.write('WINDOW_READY\n');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

// Defensive teardown — quit when last window closes (Electron's default
// macOS behavior keeps the app alive without a window; for v3.0 scaffold
// we exit the process to match the Red criterion's clean-exit contract).
app.on('window-all-closed', () => {
  app.quit();
});

// stdin "QUIT" channel for the MB-T01 Red criterion (MB-S04 ADR K3).
// Deterministic exit code 0; preferred over SIGTERM (K4 non-deterministic).
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string | Buffer) => {
  if (chunk.toString().trim() === 'QUIT') {
    app.quit();
  }
});
