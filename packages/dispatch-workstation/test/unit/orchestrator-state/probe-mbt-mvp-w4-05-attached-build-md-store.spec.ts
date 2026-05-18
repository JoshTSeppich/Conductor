// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB6 — probe-05:
// attached-build-md-state-store.ts (Q3=(a)) persistence.

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  existsSync,
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  defaultAttachedBuildMdPersistedState,
  readAttachedBuildMdState,
  writeAttachedBuildMdState,
} from '../../../src/main/attached-build-md-state-store.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mb-attached-bmd-'));
  process.env['MB_ATTACHED_BUILD_MD_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_ATTACHED_BUILD_MD_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('MB-T-MVP-W4 probe-05 — attached-build-md-state-store', () => {
  it('defaultAttachedBuildMdPersistedState returns { path: null }', () => {
    expect(defaultAttachedBuildMdPersistedState()).toEqual({ path: null });
  });

  it('read on absent file returns default { path: null }', () => {
    expect(existsSync(join(dir, 'attached-build-md-state.json'))).toBe(false);
    expect(readAttachedBuildMdState()).toEqual({ path: null });
  });

  it('write persists JSON to env-override directory', () => {
    writeAttachedBuildMdState({ path: '/repo/BUILD.md' });
    const filePath = join(dir, 'attached-build-md-state.json');
    expect(existsSync(filePath)).toBe(true);
    expect(JSON.parse(readFileSync(filePath, 'utf8'))).toEqual({
      path: '/repo/BUILD.md',
    });
  });

  it('read after write roundtrips path string', () => {
    writeAttachedBuildMdState({ path: '/repo/BUILD.md' });
    expect(readAttachedBuildMdState()).toEqual({ path: '/repo/BUILD.md' });
  });

  it('read after write null overrides previous path (detach)', () => {
    writeAttachedBuildMdState({ path: '/repo/BUILD.md' });
    writeAttachedBuildMdState({ path: null });
    expect(readAttachedBuildMdState()).toEqual({ path: null });
  });

  it('read with malformed JSON returns default', () => {
    writeFileSync(
      join(dir, 'attached-build-md-state.json'),
      '{ broken',
      'utf8',
    );
    expect(readAttachedBuildMdState()).toEqual({ path: null });
  });

  it('read with shape-mismatched JSON returns default', () => {
    writeFileSync(
      join(dir, 'attached-build-md-state.json'),
      JSON.stringify({ path: 123 }),
      'utf8',
    );
    expect(readAttachedBuildMdState()).toEqual({ path: null });
  });

  it('read with array-typed JSON returns default', () => {
    writeFileSync(
      join(dir, 'attached-build-md-state.json'),
      JSON.stringify(['/repo/BUILD.md']),
      'utf8',
    );
    expect(readAttachedBuildMdState()).toEqual({ path: null });
  });
});
