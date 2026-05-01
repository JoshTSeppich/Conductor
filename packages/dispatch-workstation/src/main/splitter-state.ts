import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app as appSingleton } from 'electron';

const STATE_FILENAME = 'splitter-state.json';

// MB_SPLITTER_STATE_DIR env var overrides userData path for test isolation
// (same pattern as MB_WINDOW_STATE_DIR in window-lifecycle.ts).
function stateDir(): string {
  return process.env.MB_SPLITTER_STATE_DIR ?? appSingleton.getPath('userData');
}

export function readSplitterPosition(): number | null {
  try {
    const raw = readFileSync(join(stateDir(), STATE_FILENAME), 'utf8');
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (typeof p.chatHeight === 'number' && p.chatHeight > 0) {
      return p.chatHeight;
    }
  } catch {
    // No saved state or parse error — fall through.
  }
  return null;
}

export function writeSplitterPosition(chatHeight: number): void {
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, STATE_FILENAME), JSON.stringify({ chatHeight }), 'utf8');
  } catch {
    // Non-fatal — best-effort persistence.
  }
}
