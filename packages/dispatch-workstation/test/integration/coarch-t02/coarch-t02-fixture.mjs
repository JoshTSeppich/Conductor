// Electron entry for COARCH-T02 integration tests. Spawned by vitest tests via
// child_process.spawn(ELECTRON_BIN, [FIXTURE_MJS]).
// Loads dist/coarchitect/chat-panel.html via BrowserWindow.loadFile() (MB-S05 K3).
//
// Sentinel protocol (stdout):
//   RENDER_OK — React ChatPanel mounted (forwarded from renderer console.log)
//   MESSAGE_SENT <content> — postMessage called (forwarded from renderer console.log)
//
// stdin commands:
//   TYPE_AND_SEND <text> — fills chat-input + clicks send via executeJavaScript
//   QUIT — deterministic exit code 0 (MB-S04 ADR K3)
//
// MB-S05 ADR K6 (CRITICAL): console-message uses Event-object form (event.message),
// NOT positional args — positional form is deprecated in Electron 41.
import { app, BrowserWindow } from 'electron';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHAT_HTML_PATH = resolve(__dirname, '../../../dist/coarchitect/chat-panel.html');

let win = null;

app.whenReady().then(() => {
  win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // K6 (CRITICAL): Event-object form — positional args deprecated in Electron 41.
  win.webContents.on('console-message', (event) => {
    const msg = event.message;
    if (msg === 'RENDER_OK') {
      process.stdout.write('RENDER_OK\n');
    } else if (msg.startsWith('MESSAGE_SENT ')) {
      process.stdout.write(msg + '\n');
    }
  });

  win.loadFile(CHAT_HTML_PATH).catch((err) => {
    process.stderr.write(`loadFile error: ${err.message}\n`);
    app.quit();
  });

  win.on('closed', () => {
    win = null;
  });
});

app.on('window-all-closed', () => app.quit());

process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk) => {
  const line = chunk.toString().trim();

  if (line === 'QUIT') {
    app.quit();
    return;
  }

  if (line.startsWith('TYPE_AND_SEND ')) {
    const text = line.slice('TYPE_AND_SEND '.length);
    if (!win || win.isDestroyed()) return;

    const escaped = JSON.stringify(text);
    await win.webContents
      .executeJavaScript(
        `(function() {
          var input = document.querySelector('[data-testid="chat-input"]');
          var button = document.querySelector('[data-testid="send-button"]');
          if (!input || !button) {
            console.error('FIXTURE: chat-input or send-button not found');
            return;
          }
          input.value = ${escaped};
          button.click();
        })()`,
      )
      .catch((err) => {
        process.stderr.write('executeJavaScript error: ' + err.message + '\n');
      });
  }
});
