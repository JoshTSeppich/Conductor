// COARCH-T04 Red cluster 1 — Build-doc settings persistence.
// Verifies: build-doc config (repo_root, relative_path, allowed_scopes) persisted
// to disk; cleared on demand; survives read-back (simulating restart).
//
// RED state: src/coarchitect/build-doc-state.ts absent → import fails → FAIL.
// GREEN state: readBuildDocConfig / writeBuildDocConfig / clearBuildDocConfig → PASS.
//
// Testing mechanism: vitest unit test (no Electron). Uses tmp dir for state isolation
// matching the MB_SPLITTER_STATE_DIR pattern from splitter-state.ts.
//
// Per WORKSTATION_CONTRACT.md §4.2: (repo_root_abs_path, relative_path) tuple
// persisted in Workstation settings (§8.3: electron-store or equivalent).
// Implementation: JSON file in app.getPath('userData') or MB_BUILD_DOC_STATE_DIR.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readBuildDocConfig,
  writeBuildDocConfig,
  clearBuildDocConfig,
  type BuildDocConfig,
} from '../../../src/coarchitect/build-doc-state.js';

let stateDir: string;

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), 'coarch-t04-state-'));
  process.env['MB_BUILD_DOC_STATE_DIR'] = stateDir;
});

afterEach(() => {
  delete process.env['MB_BUILD_DOC_STATE_DIR'];
  rmSync(stateDir, { recursive: true, force: true });
});

describe('COARCH-T04 cluster 1: build-doc state persistence', () => {
  it('returns null when no build doc is configured', () => {
    const config = readBuildDocConfig();
    expect(config).toBeNull();
  });

  it('persists build-doc config tuple and reads it back', () => {
    const config: BuildDocConfig = {
      repoRoot: '/Users/test/Desktop/foxworks-dispatch',
      relativePath: 'docs/build-docs/v3-tickets.build.md',
      allowedScopes: ['/Users/test/Desktop/foxworks-dispatch'],
    };
    writeBuildDocConfig(config);
    const readBack = readBuildDocConfig();
    expect(readBack).toEqual(config);
  });

  it('clears the build-doc config', () => {
    const config: BuildDocConfig = {
      repoRoot: '/Users/test/repo',
      relativePath: 'plan.build.md',
      allowedScopes: [],
    };
    writeBuildDocConfig(config);
    clearBuildDocConfig();
    const readBack = readBuildDocConfig();
    expect(readBack).toBeNull();
  });

  it('overwrites previous config on write', () => {
    writeBuildDocConfig({ repoRoot: '/path/a', relativePath: 'a.build.md', allowedScopes: [] });
    writeBuildDocConfig({ repoRoot: '/path/b', relativePath: 'b.build.md', allowedScopes: ['/path/b'] });
    const readBack = readBuildDocConfig();
    expect(readBack?.repoRoot).toBe('/path/b');
    expect(readBack?.relativePath).toBe('b.build.md');
  });
});
