// MB-T12 WB7 probe-02 — tile-grid-state gridOverride persistence.
//
// Verifies the WB7 grid-level override (drag-resize) read/write API,
// the validator's defensive shape checks, and that gridOverride and
// perTile state preserve each other across writes.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readAllTileLayoutStates,
  readGridOverride,
  readTileLayoutState,
  writeAllTileLayoutStates,
  writeGridOverride,
  writeTileLayoutState,
} from '../../../src/main/tile-grid-state.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mbt12-wb7-grid-override-'));
  process.env['MB_TILE_GRID_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_TILE_GRID_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('tile-grid-state — probe 02: gridOverride persistence', () => {
  it('readGridOverride returns null when no file exists', () => {
    expect(readGridOverride()).toBeNull();
  });

  it('readGridOverride returns null when file has perTile but no gridOverride', () => {
    writeTileLayoutState('sess-a', { orderIndex: 0, collapsed: false, detached: false });
    expect(readGridOverride()).toBeNull();
  });

  it('writeGridOverride then readGridOverride round-trips colSizes', () => {
    writeGridOverride({ colSizes: ['200px', '400px'] });
    expect(readGridOverride()).toEqual({ colSizes: ['200px', '400px'] });
  });

  it('writeGridOverride then readGridOverride round-trips rowSizes', () => {
    writeGridOverride({ rowSizes: ['150px', '250px'] });
    expect(readGridOverride()).toEqual({ rowSizes: ['150px', '250px'] });
  });

  it('writeGridOverride round-trips both colSizes and rowSizes', () => {
    writeGridOverride({ colSizes: ['1fr', '2fr'], rowSizes: ['100px', '200px'] });
    expect(readGridOverride()).toEqual({
      colSizes: ['1fr', '2fr'],
      rowSizes: ['100px', '200px'],
    });
  });

  it('writeGridOverride(null) clears a previously persisted override', () => {
    writeGridOverride({ colSizes: ['200px', '400px'] });
    expect(readGridOverride()).not.toBeNull();
    writeGridOverride(null);
    expect(readGridOverride()).toBeNull();
  });
});

describe('tile-grid-state — probe 02: cross-API isolation', () => {
  it('writeGridOverride does NOT disturb existing perTile entries', () => {
    writeTileLayoutState('sess-a', { orderIndex: 0, collapsed: true, detached: false });
    writeTileLayoutState('sess-b', { orderIndex: 1, collapsed: false, detached: true });
    writeGridOverride({ colSizes: ['300px', '500px'] });
    expect(readAllTileLayoutStates()).toEqual({
      'sess-a': { orderIndex: 0, collapsed: true, detached: false },
      'sess-b': { orderIndex: 1, collapsed: false, detached: true },
    });
    expect(readGridOverride()).toEqual({ colSizes: ['300px', '500px'] });
  });

  it('writeTileLayoutState does NOT disturb existing gridOverride', () => {
    writeGridOverride({ colSizes: ['200px', '400px'], rowSizes: ['100px', '200px'] });
    writeTileLayoutState('sess-a', { orderIndex: 0, collapsed: false, detached: false });
    expect(readGridOverride()).toEqual({
      colSizes: ['200px', '400px'],
      rowSizes: ['100px', '200px'],
    });
    expect(readTileLayoutState('sess-a')).toEqual({
      orderIndex: 0,
      collapsed: false,
      detached: false,
    });
  });

  it('writeAllTileLayoutStates does NOT disturb existing gridOverride', () => {
    writeGridOverride({ colSizes: ['200px', '400px'] });
    writeAllTileLayoutStates({
      'sess-a': { orderIndex: 0, collapsed: false, detached: false },
    });
    expect(readGridOverride()).toEqual({ colSizes: ['200px', '400px'] });
  });

  it('writeGridOverride(null) does NOT disturb perTile entries', () => {
    writeTileLayoutState('sess-x', { orderIndex: 0, collapsed: true, detached: false });
    writeGridOverride({ rowSizes: ['100px', '200px'] });
    writeGridOverride(null);
    expect(readTileLayoutState('sess-x')).toEqual({
      orderIndex: 0,
      collapsed: true,
      detached: false,
    });
    expect(readGridOverride()).toBeNull();
  });
});

describe('tile-grid-state — probe 02: defensive parse', () => {
  it('readGridOverride returns null when gridOverride is malformed (non-object)', () => {
    writeFileSync(
      join(dir, 'tile-grid-state.json'),
      JSON.stringify({ perTile: {}, gridOverride: 'not-an-object' }),
      'utf8',
    );
    expect(readGridOverride()).toBeNull();
  });

  it('readGridOverride returns null when colSizes is non-string array', () => {
    writeFileSync(
      join(dir, 'tile-grid-state.json'),
      JSON.stringify({ perTile: {}, gridOverride: { colSizes: [200, 400] } }),
      'utf8',
    );
    expect(readGridOverride()).toBeNull();
  });

  it('readGridOverride returns null when rowSizes is not an array', () => {
    writeFileSync(
      join(dir, 'tile-grid-state.json'),
      JSON.stringify({ perTile: {}, gridOverride: { rowSizes: 'oops' } }),
      'utf8',
    );
    expect(readGridOverride()).toBeNull();
  });
});

describe('tile-grid-state — probe 02: file format', () => {
  it('on-disk file uses { perTile: {...}, gridOverride: {...} } wrapper', () => {
    writeTileLayoutState('sess-x', { orderIndex: 0, collapsed: false, detached: false });
    writeGridOverride({ colSizes: ['100px', '300px'] });
    const raw = JSON.parse(readFileSync(join(dir, 'tile-grid-state.json'), 'utf8'));
    expect(raw).toEqual({
      perTile: {
        'sess-x': { orderIndex: 0, collapsed: false, detached: false },
      },
      gridOverride: { colSizes: ['100px', '300px'] },
    });
  });

  it('writeGridOverride creates the file even when no perTile state exists', () => {
    writeGridOverride({ rowSizes: ['200px', '300px'] });
    expect(existsSync(join(dir, 'tile-grid-state.json'))).toBe(true);
    const raw = JSON.parse(readFileSync(join(dir, 'tile-grid-state.json'), 'utf8'));
    expect(raw).toEqual({
      perTile: {},
      gridOverride: { rowSizes: ['200px', '300px'] },
    });
  });
});
