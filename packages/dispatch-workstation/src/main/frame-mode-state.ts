import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app as appSingleton } from 'electron';

export type FrameMode = 'A' | 'C';

const STATE_FILENAME = 'frame-mode-state.json';
const DEFAULT_MODE: FrameMode = 'C';

// MB_FRAME_MODE_STATE_DIR env var overrides userData path for test isolation.
function stateDir(): string {
  return process.env['MB_FRAME_MODE_STATE_DIR'] ?? appSingleton.getPath('userData');
}

export function readFrameMode(): FrameMode {
  try {
    const raw = readFileSync(join(stateDir(), STATE_FILENAME), 'utf8');
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (p['mode'] === 'A' || p['mode'] === 'C') return p['mode'];
  } catch {
    // No saved state or parse error — fall through.
  }
  return DEFAULT_MODE;
}

export function writeFrameMode(mode: FrameMode): void {
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, STATE_FILENAME), JSON.stringify({ mode }), 'utf8');
  } catch {
    // Non-fatal — best-effort persistence.
  }
}
