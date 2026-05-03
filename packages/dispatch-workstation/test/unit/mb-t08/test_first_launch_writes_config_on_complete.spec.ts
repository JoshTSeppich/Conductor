// MB-T08 Cluster 1 — Test 3/3: markOnboardingComplete writes the config file
// and flips isFirstLaunch from true to false.
//
// End-to-end first-launch lifecycle: detector returns true → onboarding runs →
// caller invokes markOnboardingComplete → next isFirstLaunch returns false.
//
// RED state: src/onboarding/first-launch-detector.ts absent → import fails → FAIL.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  isFirstLaunch,
  markOnboardingComplete,
} from '../../../src/onboarding/first-launch-detector.js';

let configDir: string;

beforeEach(() => {
  configDir = mkdtempSync(join(tmpdir(), 'mb-t08-fl3-'));
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
});

describe('MB-T08 cluster 1 — markOnboardingComplete persists state', () => {
  it('writes the config file with onboardingCompleted=true', () => {
    expect(isFirstLaunch({ configDir })).toBe(true);

    markOnboardingComplete({ configDir });

    const path = join(configDir, 'workstation-config.json');
    expect(existsSync(path)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    expect(parsed.onboardingCompleted).toBe(true);
  });

  it('flips isFirstLaunch from true to false after markOnboardingComplete', () => {
    expect(isFirstLaunch({ configDir })).toBe(true);
    markOnboardingComplete({ configDir });
    expect(isFirstLaunch({ configDir })).toBe(false);
  });

  it('creates the config dir if it does not exist', () => {
    const fresh = join(configDir, 'nested', 'userData');
    expect(existsSync(fresh)).toBe(false);

    markOnboardingComplete({ configDir: fresh });

    expect(existsSync(join(fresh, 'workstation-config.json'))).toBe(true);
    expect(isFirstLaunch({ configDir: fresh })).toBe(false);
  });
});
