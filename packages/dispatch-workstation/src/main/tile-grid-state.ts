// MB-T12 WB3 + WB7 — tile-grid state persistence (JSON-file in userData).
//
// Per Q-MBT12-3=b: mirrors splitter-state.ts / autopilot-state-store.ts
// pattern (raw fs JSON in userData with env-override). NO `electron-store`
// dep — consistent with the rest of dispatch-workstation/src/main/.
//
// File path:
//   <userData>/tile-grid-state.json
//
// File contents (post-WB7 shape):
//   {
//     "perTile": {
//       "<sessionName>": TileLayoutState,
//       ...
//     },
//     "gridOverride"?: GridOverride    // optional, set by drag-resize (WB7)
//   }
//
// Per-tile state covers the operator-driven tile chrome state for each
// session:
//   - orderIndex: tile position in the grid (0-based). Mutated by
//     drag-swap (WB8). Callers are responsible for assigning an order
//     when a tile is first auto-mounted (typically `current N` so new
//     tiles append to the end).
//   - collapsed: whether the tile is collapsed to header-only (WB10).
//   - detached: whether the tile is currently rendered in a separate
//     BrowserWindow (WB11). When true, the main-grid tile shows a
//     "detached" placeholder until the detached window closes.
//
// Grid override (WB7) is grid-level (not per-session): rowSizes and
// colSizes are CSS-value strings (e.g., "200px") that override the
// computeGridLayout default `repeat(N, 1fr)`. Override is discarded
// at the consumer level when the grid's (rows, cols) shape changes
// (e.g., session spawn changes layout from 2×2 to 2×3).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app as appSingleton } from 'electron';

export interface TileLayoutState {
  readonly orderIndex: number;
  readonly collapsed: boolean;
  readonly detached: boolean;
}

export interface GridOverride {
  readonly rowSizes?: readonly string[];
  readonly colSizes?: readonly string[];
}

interface TileGridStateFile {
  perTile: Record<string, TileLayoutState>;
  gridOverride?: GridOverride;
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

function readFile(): TileGridStateFile {
  try {
    const raw = readFileSync(statePath(), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { perTile: {} };
    }
    const root = parsed as Record<string, unknown>;
    const perTile: Record<string, TileLayoutState> = {};
    const rawPerTile = root['perTile'];
    if (rawPerTile && typeof rawPerTile === 'object' && !Array.isArray(rawPerTile)) {
      for (const [k, v] of Object.entries(rawPerTile as Record<string, unknown>)) {
        if (isTileLayoutState(v)) perTile[k] = v;
      }
    }
    const out: TileGridStateFile = { perTile };
    const rawOverride = root['gridOverride'];
    if (isGridOverride(rawOverride)) {
      out.gridOverride = rawOverride;
    }
    return out;
  } catch {
    return { perTile: {} };
  }
}

function writeFile(file: TileGridStateFile): void {
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(statePath(), JSON.stringify(file, null, 2), 'utf8');
  } catch {
    // Best-effort. v3.0 single-user model tolerates persistence drop.
  }
}

export function readAllTileLayoutStates(): Record<string, TileLayoutState> {
  return readFile().perTile;
}

export function writeAllTileLayoutStates(
  all: Record<string, TileLayoutState>,
): void {
  const file = readFile();
  file.perTile = { ...all };
  writeFile(file);
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
  const file = readFile();
  file.perTile = { ...file.perTile, [sessionName]: state };
  writeFile(file);
}

// ─── Grid-level override (WB7) ────────────────────────────────────────────

/**
 * Read the current grid-level override (drag-resize state). Returns null
 * when no override has been persisted (use computeGridLayout defaults).
 */
export function readGridOverride(): GridOverride | null {
  return readFile().gridOverride ?? null;
}

/**
 * Write or clear the grid-level override. Pass null to clear.
 * Per-tile state is preserved across grid-override writes.
 */
export function writeGridOverride(override: GridOverride | null): void {
  const file = readFile();
  if (override === null) {
    delete file.gridOverride;
  } else {
    file.gridOverride = override;
  }
  writeFile(file);
}

// ─── Validators ───────────────────────────────────────────────────────────

function isTileLayoutState(v: unknown): v is TileLayoutState {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  if (typeof s['orderIndex'] !== 'number') return false;
  if (!Number.isInteger(s['orderIndex'])) return false;
  if (typeof s['collapsed'] !== 'boolean') return false;
  if (typeof s['detached'] !== 'boolean') return false;
  return true;
}

function isGridOverride(v: unknown): v is GridOverride {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (o['rowSizes'] !== undefined && !isStringArray(o['rowSizes'])) return false;
  if (o['colSizes'] !== undefined && !isStringArray(o['colSizes'])) return false;
  return true;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}
