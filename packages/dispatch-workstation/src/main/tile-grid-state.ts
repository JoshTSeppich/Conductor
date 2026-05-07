// MB-T12 WB3 — tile-grid state persistence (JSON-file in userData).
//
// Per Q-MBT12-3=b: mirrors splitter-state.ts / autopilot-state-store.ts
// pattern (raw fs JSON in userData with env-override). NO `electron-store`
// dep — consistent with the rest of dispatch-workstation/src/main/.
//
// File path:
//   <userData>/tile-grid-state.json
//
// File contents (single object, sessionName-keyed):
//   {
//     "<sessionName>": TileLayoutState,
//     ...
//   }
//
// Persisted fields cover the operator-driven tile chrome state for
// each session:
//   - orderIndex: tile position in the grid (0-based). Mutated by
//     drag-swap (WB8). Callers are responsible for assigning an order
//     when a tile is first auto-mounted (typically `current N` so new
//     tiles append to the end).
//   - collapsed: whether the tile is collapsed to header-only (WB10).
//   - detached: whether the tile is currently rendered in a separate
//     BrowserWindow (WB11). When true, the main-grid tile shows a
//     "detached" placeholder until the detached window closes.
//
// Forward-compat: WB7 (drag-resize) introduces grid-template-rows /
// grid-template-columns overrides. That state is grid-level (not
// per-session) and will live in a separate top-level field of this
// JSON file when WB7 lands. The current readers tolerate unknown
// fields (JSON.parse is permissive; the validator only checks the
// known TileLayoutState fields).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app as appSingleton } from 'electron';

export interface TileLayoutState {
  readonly orderIndex: number;
  readonly collapsed: boolean;
  readonly detached: boolean;
}

export function defaultTileLayoutState(orderIndex = 0): TileLayoutState {
  return {
    orderIndex,
    collapsed: false,
    detached: false,
  };
}

const STATE_FILENAME = 'tile-grid-state.json';

function stateDir(): string {
  const override = process.env['MB_TILE_GRID_STATE_DIR'];
  if (override && override.length > 0) {
    return override;
  }
  return appSingleton.getPath('userData');
}

function statePath(): string {
  return join(stateDir(), STATE_FILENAME);
}

export function readAllTileLayoutStates(): Record<string, TileLayoutState> {
  try {
    const raw = readFileSync(statePath(), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, TileLayoutState> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isTileLayoutState(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeAllTileLayoutStates(
  all: Record<string, TileLayoutState>,
): void {
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(statePath(), JSON.stringify(all, null, 2), 'utf8');
  } catch {
    // Best-effort. v3.0 single-user model tolerates persistence drop.
  }
}

/**
 * Read a single session's tile state. Returns null when the session has
 * no persisted state (caller decides initial values — typically
 * `defaultTileLayoutState(currentTileCount)` for an auto-mount).
 */
export function readTileLayoutState(
  sessionName: string,
): TileLayoutState | null {
  const all = readAllTileLayoutStates();
  return all[sessionName] ?? null;
}

export function writeTileLayoutState(
  sessionName: string,
  state: TileLayoutState,
): void {
  const all = readAllTileLayoutStates();
  all[sessionName] = state;
  writeAllTileLayoutStates(all);
}

function isTileLayoutState(v: unknown): v is TileLayoutState {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  if (typeof s['orderIndex'] !== 'number') return false;
  if (!Number.isInteger(s['orderIndex'])) return false;
  if (typeof s['collapsed'] !== 'boolean') return false;
  if (typeof s['detached'] !== 'boolean') return false;
  return true;
}
