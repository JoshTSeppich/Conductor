// MB-T19 WB4 probe-03 — tile-grid-state heroSessionName persistence.
//
// Verifies the WB4 hero-session field read/write API, the parser's
// defensive shape checks, and that heroSessionName preserves perTile
// + gridOverride state across writes (mirrors probe-02 gridOverride
// pattern).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readGridOverride,
  readHeroSessionName,
  readTileLayoutState,
  writeGridOverride,
  writeHeroSessionName,
  writeTileLayoutState,
} from '../../../src/main/tile-grid-state.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mbt19-wb4-hero-'));
  process.env['MB_TILE_GRID_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_TILE_GRID_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('tile-grid-state — probe 03: heroSessionName persistence', () => {
  it('readHeroSessionName returns null when no file exists', () => {
    expect(readHeroSessionName()).toBeNull();
  });

  it('readHeroSessionName returns null when file has perTile but no hero field', () => {
    writeTileLayoutState('sess-a', {
      orderIndex: 0,
      collapsed: false,
      detached: false,
    });
    expect(readHeroSessionName()).toBeNull();
  });

  it('writeHeroSessionName then readHeroSessionName roundtrips a session name', () => {
    writeHeroSessionName('sess-hero');
    expect(readHeroSessionName()).toBe('sess-hero');
  });

  it('writeHeroSessionName(null) clears a previously-set hero', () => {
    writeHeroSessionName('sess-x');
    expect(readHeroSessionName()).toBe('sess-x');
    writeHeroSessionName(null);
    expect(readHeroSessionName()).toBeNull();
  });

  it('writeHeroSessionName("") is treated as clear (empty string drops field)', () => {
    writeHeroSessionName('sess-x');
    writeHeroSessionName('');
    expect(readHeroSessionName()).toBeNull();
  });

  it('hero write preserves perTile state', () => {
    writeTileLayoutState('sess-a', {
      orderIndex: 0,
      collapsed: false,
      detached: false,
    });
    writeHeroSessionName('sess-a');
    // perTile still present
    expect(readTileLayoutState('sess-a')).toEqual({
      orderIndex: 0,
      collapsed: false,
      detached: false,
    });
    // hero stored
    expect(readHeroSessionName()).toBe('sess-a');
  });

  it('hero write preserves gridOverride state', () => {
    writeGridOverride({ colSizes: ['200px', '400px'] });
    writeHeroSessionName('sess-x');
    expect(readGridOverride()).toEqual({ colSizes: ['200px', '400px'] });
    expect(readHeroSessionName()).toBe('sess-x');
  });

  it('perTile + gridOverride writes preserve hero across mutations', () => {
    writeHeroSessionName('sess-x');
    writeTileLayoutState('sess-a', {
      orderIndex: 0,
      collapsed: false,
      detached: false,
    });
    writeGridOverride({ rowSizes: ['100px', '200px'] });
    expect(readHeroSessionName()).toBe('sess-x');
    expect(readTileLayoutState('sess-a')).not.toBeNull();
    expect(readGridOverride()).not.toBeNull();
  });

  it('parser drops invalid heroSessionName types (number → null)', () => {
    // Write file directly with malformed value to verify defensive parsing.
    const filePath = join(dir, 'tile-grid-state.json');
    writeFileSync(
      filePath,
      JSON.stringify({ perTile: {}, heroSessionName: 42 }),
      'utf8',
    );
    expect(readHeroSessionName()).toBeNull();
  });

  it('parser accepts explicit null heroSessionName (round-trip)', () => {
    const filePath = join(dir, 'tile-grid-state.json');
    writeFileSync(
      filePath,
      JSON.stringify({ perTile: {}, heroSessionName: null }),
      'utf8',
    );
    expect(readHeroSessionName()).toBeNull();
  });

  it('parser drops empty-string heroSessionName (treated as no value)', () => {
    const filePath = join(dir, 'tile-grid-state.json');
    writeFileSync(
      filePath,
      JSON.stringify({ perTile: {}, heroSessionName: '' }),
      'utf8',
    );
    expect(readHeroSessionName()).toBeNull();
  });

  it('persisted JSON file shape includes heroSessionName when set', () => {
    writeHeroSessionName('sess-q');
    const filePath = join(dir, 'tile-grid-state.json');
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed['heroSessionName']).toBe('sess-q');
  });
});
