// MB-S04 spike: minimal Electron main process for spawn-and-observe testing.
// Throwaway. Goal: validate vitest can spawn Electron, observe a window-ready
// sentinel on stdout, send SIGTERM, and observe a clean exit.
import { app, BrowserWindow } from 'electron';

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 400,
    height: 300,
    show: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL('data:text/html;charset=utf-8,<html><body><h1>MB-S04</h1></body></html>');
  win.webContents.on('did-finish-load', () => {
    process.stdout.write('SPIKE_READY\n');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

// Clean-exit signal handlers — primary contract under test.
process.on('SIGTERM', () => {
  process.stdout.write('SPIKE_SIGTERM\n');
  app.quit();
});

process.on('SIGINT', () => {
  process.stdout.write('SPIKE_SIGINT\n');
  app.quit();
});

// stdin-line quit channel — alternative quit mechanism for the test
// (SIGTERM may behave inconsistently across platforms; stdin gives us a
// in-band channel that maps to a deterministic exit).
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  if (chunk.toString().trim() === 'QUIT') {
    process.stdout.write('SPIKE_STDIN_QUIT\n');
    app.quit();
  }
});
