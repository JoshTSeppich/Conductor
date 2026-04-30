import {
  BrowserWindow,
  app as appSingleton,
  type App,
  type BrowserWindowConstructorOptions,
} from 'electron';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface WindowSizeDefaults {
  readonly width: number;
  readonly height: number;
}

const STATE_FILENAME = 'window-state.json';

interface PersistedGeometry {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

// MB_WINDOW_STATE_DIR env var overrides userData path for test isolation.
function stateDir(): string {
  return process.env.MB_WINDOW_STATE_DIR ?? appSingleton.getPath('userData');
}

function readGeometry(): PersistedGeometry | null {
  try {
    const raw = readFileSync(join(stateDir(), STATE_FILENAME), 'utf8');
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (typeof p.width === 'number' && typeof p.height === 'number') {
      const g: PersistedGeometry = { width: p.width, height: p.height };
      if (typeof p.x === 'number') g.x = p.x;
      if (typeof p.y === 'number') g.y = p.y;
      return g;
    }
  } catch {
    // No saved state or parse error — fall through to defaults.
  }
  return null;
}

function writeGeometry(win: BrowserWindow): void {
  const [width, height] = win.getSize();
  const [x, y] = win.getPosition();
  const g: PersistedGeometry = { width, height, x, y };
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, STATE_FILENAME), JSON.stringify(g), 'utf8');
  } catch {
    // Non-fatal — best-effort persistence.
  }
}

export function createManagedWindow(
  opts: WindowSizeDefaults & BrowserWindowConstructorOptions,
): BrowserWindow {
  const saved = readGeometry();
  const width = saved?.width ?? opts.width;
  const height = saved?.height ?? opts.height;
  const position: Pick<BrowserWindowConstructorOptions, 'x' | 'y'> =
    saved?.x !== undefined && saved?.y !== undefined ? { x: saved.x, y: saved.y } : {};

  const win = new BrowserWindow({ ...opts, width, height, ...position });

  // Stdout sentinel for test instrumentation (MB-S04 ADR K2 pattern).
  process.stdout.write(`WINDOW_STATE ${width} ${height}\n`);

  // Save geometry on close before BrowserWindow is destroyed.
  win.on('close', () => writeGeometry(win));

  // stdin "RESIZE <w> <h>" channel for test instrumentation (MB-S04 ADR K3 pattern).
  // Gated behind MB_TEST_HOOKS to avoid attaching stdin listener in production.
  if (process.env.MB_TEST_HOOKS === '1') {
    process.stdin.on('data', (chunk: string | Buffer) => {
      const line = chunk.toString().trim();
      const m = /^RESIZE (\d+) (\d+)$/.exec(line);
      if (m) {
        win.setSize(parseInt(m[1], 10), parseInt(m[2], 10));
        const [actualW, actualH] = win.getSize();
        process.stdout.write(`WINDOW_RESIZED ${actualW} ${actualH}\n`);
      }
    });
  }

  return win;
}

export function registerLifecycleHooks(
  app: App,
  getWindow: () => BrowserWindow | null,
  reopenWindow: () => void,
): void {
  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (getWindow() === null) {
      reopenWindow();
    }
  });
}
