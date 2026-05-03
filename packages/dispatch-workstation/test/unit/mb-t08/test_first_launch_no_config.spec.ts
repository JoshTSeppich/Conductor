// MB-T08 Cluster 1 — Test 1/3: first-launch detection when no config file present.
//
// Vision §8.1 (RATIFIED): "First-launch flow walks operator through API key
// entry and project list config." The first-launch detector reads a JSON
// config file from the Electron userData directory; absence of the file
// (or absence of the relevant key) means the operator has not completed
// onboarding yet, so isFirstLaunch() must return true.
//
// Test isolation: production reads from app.getPath('userData'); the
// detector accepts an explicit configDir override (mirrors window-lifecycle.ts:26
// MB_WINDOW_STATE_DIR pattern) so tests use a fresh tmpdir without bringing
// up Electron.
//
// RED state: src/onboarding/first-launch-detector.ts absent → import fails → FAIL.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isFirstLaunch } from '../../../src/onboarding/first-launch-detector.js';

let configDir: string;

beforeEach(() => {
  configDir = mkdtempSync(join(tmpdir(), 'mb-t08-fl1-'));
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
});

describe('MB-T08 cluster 1 — first-launch detection (no config)', () => {
  it('returns true when the config file does not exist', () => {
    // Sanity: nothing in the tmp dir yet.
    expect(existsSync(join(configDir, 'workstation-config.json'))).toBe(false);

    expect(isFirstLaunch({ configDir })).toBe(true);
  });

  it('returns true when the config dir itself does not exist', () => {
    const missing = join(configDir, 'subdir-that-does-not-exist');
    expect(existsSync(missing)).toBe(false);

    expect(isFirstLaunch({ configDir: missing })).toBe(true);
  });
});
