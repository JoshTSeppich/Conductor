// MB-T08 Cluster 1 — Test 2/3: first-launch detection when onboarding-complete
// flag already written.
//
// Once onboarding completes, markOnboardingComplete() writes the config file
// with the onboardingCompleted flag set; subsequent calls to isFirstLaunch()
// must return false.
//
// RED state: src/onboarding/first-launch-detector.ts absent → import fails → FAIL.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isFirstLaunch } from '../../../src/onboarding/first-launch-detector.js';

let configDir: string;

beforeEach(() => {
  configDir = mkdtempSync(join(tmpdir(), 'mb-t08-fl2-'));
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
});

describe('MB-T08 cluster 1 — first-launch detection (config present)', () => {
  it('returns false when the config file marks onboarding complete', () => {
    writeFileSync(
      join(configDir, 'workstation-config.json'),
      JSON.stringify({ onboardingCompleted: true }),
      'utf8',
    );

    expect(isFirstLaunch({ configDir })).toBe(false);
  });

  it('returns true when the config file exists but onboarding flag is false', () => {
    writeFileSync(
      join(configDir, 'workstation-config.json'),
      JSON.stringify({ onboardingCompleted: false }),
      'utf8',
    );

    expect(isFirstLaunch({ configDir })).toBe(true);
  });

  it('returns true when the config file is malformed JSON', () => {
    writeFileSync(
      join(configDir, 'workstation-config.json'),
      '{not json',
      'utf8',
    );

    // Defensive: malformed config should not crash; treated as never-onboarded.
    expect(isFirstLaunch({ configDir })).toBe(true);
  });
});
