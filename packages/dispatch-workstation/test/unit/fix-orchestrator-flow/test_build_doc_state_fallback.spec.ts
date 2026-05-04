// MB-F-#84-B RED — build-doc-state userData fallback.
//
// Cairn finding #84 Defect B: build-doc-state.ts:17-23 falls through three
// env vars (MB_BUILD_DOC_STATE_DIR / MB_WORKSTATION_USERDATA / MB_APP_USERDATA)
// to ''. None are set in production. Result: writeBuildDocConfig silently
// no-ops, readBuildDocConfig returns null, the orchestrator system prompt
// never loads, and chat falls through to plain LLM (no card emit).
//
// Existing build-doc-state.spec.ts only ever exercises the env-var path
// (MB_BUILD_DOC_STATE_DIR set in beforeEach), so it cannot detect Defect B.
// This spec runs the production path: env vars cleared, production fallback
// to app.getPath('userData') exercised, file presence verified.
//
// Electron's `app` is module-mocked because importing it at top level pulls
// the full Electron runtime; the mock returns a tmp dir per test and lets
// the unit test stay node-only.
//
// RED state: build-doc-state.ts has no electron import → app.getPath
// fallback absent → write to '' → no file written → assertion fails.
// GREEN state: fourth fallback returns mocked tmp dir → file written.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Module mock for electron — must be hoisted before the SUT import below.
// The mocked `app.getPath('userData')` returns whatever __setMockUserData
// installs at the per-test level via vi.mocked() introspection.
let mockUserDataDir = '';
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return mockUserDataDir;
      throw new Error(`unexpected app.getPath argument: ${name}`);
    },
  },
}));

import {
  readBuildDocConfig,
  writeBuildDocConfig,
  type BuildDocConfig,
} from '../../../src/coarchitect/build-doc-state.js';

const SAVED_ENV = {
  stateDir: process.env['MB_BUILD_DOC_STATE_DIR'],
  workstationUserdata: process.env['MB_WORKSTATION_USERDATA'],
  appUserdata: process.env['MB_APP_USERDATA'],
};

beforeEach(() => {
  // Production parity: clear all three env vars so the userData fallback
  // is the only resolvable path.
  delete process.env['MB_BUILD_DOC_STATE_DIR'];
  delete process.env['MB_WORKSTATION_USERDATA'];
  delete process.env['MB_APP_USERDATA'];
  mockUserDataDir = mkdtempSync(join(tmpdir(), 'fix-A-builddoc-'));
});

afterEach(() => {
  if (mockUserDataDir) rmSync(mockUserDataDir, { recursive: true, force: true });
  if (SAVED_ENV.stateDir !== undefined) {
    process.env['MB_BUILD_DOC_STATE_DIR'] = SAVED_ENV.stateDir;
  }
  if (SAVED_ENV.workstationUserdata !== undefined) {
    process.env['MB_WORKSTATION_USERDATA'] = SAVED_ENV.workstationUserdata;
  }
  if (SAVED_ENV.appUserdata !== undefined) {
    process.env['MB_APP_USERDATA'] = SAVED_ENV.appUserdata;
  }
});

describe('Fix-A / finding #84 Defect B — build-doc-state userData fallback', () => {
  it('writes build-doc-config.json to app.getPath(userData) when no env vars are set', () => {
    const config: BuildDocConfig = {
      repoRoot: '/Users/test/Desktop/foxworks-dispatch',
      relativePath: 'docs/build-docs/v3-tickets.build.md',
      allowedScopes: ['/Users/test/Desktop/foxworks-dispatch'],
    };

    writeBuildDocConfig(config);

    const expectedPath = join(mockUserDataDir, 'build-doc-config.json');
    expect(existsSync(expectedPath)).toBe(true);
    expect(JSON.parse(readFileSync(expectedPath, 'utf8'))).toEqual(config);
  });

  it('reads back the persisted config via the userData fallback', () => {
    const config: BuildDocConfig = {
      repoRoot: '/repo',
      relativePath: 'plan.build.md',
      allowedScopes: [],
    };
    writeBuildDocConfig(config);

    expect(readBuildDocConfig()).toEqual(config);
  });

  it('still honors MB_BUILD_DOC_STATE_DIR override (test isolation preserved)', () => {
    const overrideDir = mkdtempSync(join(tmpdir(), 'fix-A-builddoc-override-'));
    process.env['MB_BUILD_DOC_STATE_DIR'] = overrideDir;

    const config: BuildDocConfig = {
      repoRoot: '/repo',
      relativePath: 'plan.build.md',
      allowedScopes: [],
    };
    writeBuildDocConfig(config);

    // File goes to override dir, NOT userData mock.
    expect(existsSync(join(overrideDir, 'build-doc-config.json'))).toBe(true);
    expect(existsSync(join(mockUserDataDir, 'build-doc-config.json'))).toBe(false);

    rmSync(overrideDir, { recursive: true, force: true });
  });
});
