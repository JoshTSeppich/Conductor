// MB-S05 spike: minimal Electron main process.
// Validates: file:// BrowserWindow loading (E2), console-message sentinel (E3),
// stdin QUIT clean exit (E4). Production webPreferences preserved (sandbox+contextIsolation).
import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Resolves to dist/renderer/index.html relative to dist/main/main.js at runtime.
const HTML_PATH = resolve(__dirname, '../renderer/index.html');

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    webPreferences: {
      // Production settings per §5 contract — spike must hold these to validate
      // that esbuild bundle runs in a fully sandboxed renderer.
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // E2: load via file:// — production pattern Session D will use.
  // Production main.ts currently uses loadURL('data:text/html...'); Session D
  // switches to loadFile() for the chat panel renderer. This validates that switch.
  mainWindow.loadFile(HTML_PATH);

  // E2 sentinel: window loaded and DOM ready.
  mainWindow.webContents.on('did-finish-load', () => {
    process.stdout.write('WINDOW_READY\n');
  });

  // E3 sentinel: React component mounted and useEffect ran.
  // Renderer emits console.log('RENDER_OK'); main pipes it to stdout for harness.
  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    if (message === 'RENDER_OK') {
      process.stdout.write('RENDER_OK\n');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

// MB-S04 K3: stdin QUIT for deterministic exit code 0.
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  if (chunk.toString().trim() === 'QUIT') {
    app.quit();
  }
});
