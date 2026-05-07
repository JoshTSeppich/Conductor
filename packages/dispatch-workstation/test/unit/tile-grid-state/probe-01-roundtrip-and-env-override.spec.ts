// MB-T12 WB3 probe-01 — tile-grid-state persistence round-trip + env override.
//
// Mirrors test/unit/autopilot-state-store/probe-01-store-persistence.spec.ts
// (sess-mbt11 WB6) with the tile-state shape. Uses MB_TILE_GRID_STATE_DIR
// override for test isolation.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  defaultTileLayoutState,
  readAllTileLayoutStates,
  readTileLayoutState,
  writeAllTileLayoutStates,
  writeTileLayoutState,
  type TileLayoutState,
} from '../../../src/main/tile-grid-state.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mbt12-wb3-tile-grid-state-'));
  process.env['MB_TILE_GRID_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_TILE_GRID_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('tile-grid-state — probe 01: persistence', () => {
  it('readTileLayoutState returns null when no file exists', () => {
    expect(readTileLayoutState('sess-x')).toBeNull();
  });

  it('readAllTileLayoutStates returns empty object when no file exists', () => {
    expect(readAllTileLayoutStates()).toEqual({});
  });

  it('writeTileLayoutState then readTileLayoutState round-trips', () => {
    const state: TileLayoutState = {
      orderIndex: 2,
      collapsed: true,
      detached: false,
    };
    writeTileLayoutState('sess-x', state);
    expect(readTileLayoutState('sess-x')).toEqual(state);
  });

  it('persists to tile-grid-state.json on disk', () => {
    writeTileLayoutState('sess-x', defaultTileLayoutState(0));
    expect(existsSync(join(dir, 'tile-grid-state.json'))).toBe(true);
  });

  it('writeTileLayoutState updates one entry without disturbing siblings', () => {
    writeTileLayoutState('sess-a', { orderIndex: 0, collapsed: false, detached: false });
    writeTileLayoutState('sess-b', { orderIndex: 1, collapsed: false, detached: false });
    writeTileLayoutState('sess-a', { orderIndex: 0, collapsed: true, detached: false });
    expect(readTileLayoutState('sess-a')).toEqual({
      orderIndex: 0,
      collapsed: true,
      detached: false,
    });
    expect(readTileLayoutState('sess-b')).toEqual({
      orderIndex: 1,
      collapsed: false,
      detached: false,
    });
  });

  it('writeAllTileLayoutStates round-trips via readAllTileLayoutStates', () => {
    const map: Record<string, TileLayoutState> = {
      'sess-a': { orderIndex: 0, collapsed: false, detached: false },
      'sess-b': { orderIndex: 1, collapsed: true, detached: false },
      'sess-c': { orderIndex: 2, collapsed: false, detached: true },
    };
    writeAllTileLayoutStates(map);
    expect(readAllTileLayoutStates()).toEqual(map);
  });

  it('readTileLayoutState returns null for an absent session even when other sessions are present', () => {
    writeTileLayoutState('sess-a', { orderIndex: 0, collapsed: false, detached: false });
    expect(readTileLayoutState('sess-other')).toBeNull();
  });
});

describe('tile-grid-state — probe 01: env override + dir creation', () => {
  it('MB_TILE_GRID_STATE_DIR overrides the userData path', () => {
    writeTileLayoutState('sess-env', { orderIndex: 0, collapsed: false, detached: false });
    expect(existsSync(join(dir, 'tile-grid-state.json'))).toBe(true);
  });

  it('writeAllTileLayoutStates creates the dir if it does not exist (recursive mkdir)', () => {
    const nested = join(dir, 'nested', 'sub');
    process.env['MB_TILE_GRID_STATE_DIR'] = nested;
    writeAllTileLayoutStates({ 'sess-x': defaultTileLayoutState(0) });
    expect(existsSync(join(nested, 'tile-grid-state.json'))).toBe(true);
  });
});

describe('tile-grid-state — probe 01: defensive parse + validator', () => {
  it('readAllTileLayoutStates returns {} when JSON is malformed', () => {
    writeFileSync(join(dir, 'tile-grid-state.json'), 'not valid json{', 'utf8');
    expect(readAllTileLayoutStates()).toEqual({});
  });

  it('readAllTileLayoutStates returns {} when JSON parses to a non-object', () => {
    writeFileSync(join(dir, 'tile-grid-state.json'), '"a string"', 'utf8');
    expect(readAllTileLayoutStates()).toEqual({});
  });

  it('readAllTileLayoutStates returns {} when JSON parses to an array', () => {
    writeFileSync(join(dir, 'tile-grid-state.json'), '[]', 'utf8');
    expect(readAllTileLayoutStates()).toEqual({});
  });

  it('readAllTileLayoutStates drops malformed entries (missing fields, wrong types)', () => {
    writeFileSync(
      join(dir, 'tile-grid-state.json'),
      JSON.stringify({
        valid: { orderIndex: 0, collapsed: false, detached: false },
        missingFields: { orderIndex: 0 },
        wrongType: { orderIndex: 'zero', collapsed: false, detached: false },
        nonInteger: { orderIndex: 1.5, collapsed: false, detached: false },
        nullEntry: null,
      }),
      'utf8',
    );
    const all = readAllTileLayoutStates();
    expect(Object.keys(all).sort()).toEqual(['valid']);
    expect(all['valid']).toEqual({ orderIndex: 0, collapsed: false, detached: false });
  });
});

describe('tile-grid-state — probe 01: defaults', () => {
  it('defaultTileLayoutState() returns orderIndex=0 when no arg', () => {
    expect(defaultTileLayoutState()).toEqual({
      orderIndex: 0,
      collapsed: false,
      detached: false,
    });
  });

  it('defaultTileLayoutState(N) returns orderIndex=N', () => {
    expect(defaultTileLayoutState(5)).toEqual({
      orderIndex: 5,
      collapsed: false,
      detached: false,
    });
  });
});
