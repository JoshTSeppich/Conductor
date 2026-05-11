// §C.1′ WB1 red — frame-mode-state.ts read/write/default
//
// Mirrors tile-grid-state probe-01 pattern (static import; env var read
// at call time inside function body, not at module load).
//
// Probes:
//   - readFrameMode returns 'C' (default) when file absent
//   - writeFrameMode('A') then readFrameMode returns 'A'
//   - writeFrameMode('C') then readFrameMode returns 'C'
//   - corrupted JSON falls back to 'C'
//   - unrecognised mode string falls back to 'C'
//   - mode field missing from valid JSON falls back to 'C'
//   - write does not throw when dir is already present
//   - persists across two sequential reads

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  readFrameMode,
  writeFrameMode,
} from '../../../src/main/frame-mode-state.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'c1r-frame-mode-state-'));
  process.env['MB_FRAME_MODE_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_FRAME_MODE_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('§C.1′ frame-mode-state — readFrameMode', () => {
  it('returns C (default) when no state file exists', () => {
    expect(readFrameMode()).toBe('C');
  });

  it('returns A after writeFrameMode A', () => {
    writeFrameMode('A');
    expect(readFrameMode()).toBe('A');
  });

  it('returns C after writeFrameMode C', () => {
    writeFrameMode('C');
    expect(readFrameMode()).toBe('C');
  });

  it('returns C when JSON is corrupted', () => {
    writeFileSync(join(dir, 'frame-mode-state.json'), 'NOT_JSON', 'utf8');
    expect(readFrameMode()).toBe('C');
  });

  it('returns C when mode field is an unrecognised string', () => {
    writeFileSync(
      join(dir, 'frame-mode-state.json'),
      JSON.stringify({ mode: 'B' }),
      'utf8',
    );
    expect(readFrameMode()).toBe('C');
  });

  it('returns C when mode field is missing from valid JSON', () => {
    writeFileSync(
      join(dir, 'frame-mode-state.json'),
      JSON.stringify({ other: 'data' }),
      'utf8',
    );
    expect(readFrameMode()).toBe('C');
  });
});

describe('§C.1′ frame-mode-state — writeFrameMode', () => {
  it('does not throw when the dir is already present', () => {
    expect(() => writeFrameMode('A')).not.toThrow();
  });

  it('persists across two sequential readFrameMode calls', () => {
    writeFrameMode('A');
    expect(readFrameMode()).toBe('A');
    expect(readFrameMode()).toBe('A');
  });
});
