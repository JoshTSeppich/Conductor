// MB-T02 test harness — Electron entry point for webview-loader-callable.test.ts.
// Spawned by the test via spawn(ELECTRON_BIN, [HARNESS_PATH]).
// Imports dist/main/webview-loader.js (static ESM import).
// RED state: import fails (file absent) → process exits before emitting sentinel.
// GREEN state: loadDispatchWeb called → WEBVIEW_LOAD_ATTEMPTED emitted on stdout.
// Responds to stdin "QUIT" for deterministic exit code 0 per MB-S04 ADR K3.
import { app, BrowserWindow } from 'electron';
import { loadDispatchWeb } from '../../../dist/main/webview-loader.js';

let win = null;

app.whenReady().then(async () => {
  win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('closed', () => {
    win = null;
  });

  try {
    await loadDispatchWeb(win);
  } catch (_) {
    // loadURL rejection (ERR_CONNECTION_REFUSED when localhost:7878 not running)
    // is expected in isolated test env. The property under test is callability +
    // non-crash, not dispatch-web server connectivity.
  }

  process.stdout.write('WEBVIEW_LOAD_ATTEMPTED\n');
});

app.on('window-all-closed', () => app.quit());

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  if (chunk.toString().trim() === 'QUIT') app.quit();
});
