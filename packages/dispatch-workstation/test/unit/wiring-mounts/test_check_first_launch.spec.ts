// MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT — Cluster 1 RED.
//
// onboarding-mount.ts is the new module that bundles the missing main-process
// surface for the onboarding renderer mount. It exports a thin wrapper around
// first-launch-detector.isFirstLaunch with a Promise<boolean> return so the
// app.whenReady().then() chain in main.ts can `await` it cleanly (the rest of
// the chain is async, so async-aligning the gate avoids mixing sync/async
// inside the .then() body).
//
// RED state: src/main/onboarding-mount.ts absent → import fails → FAIL.
// Test isolation: production reads from app.getPath('userData'); checkFirstLaunch
// accepts an explicit configDir override, mirrors first-launch-detector pattern.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkFirstLaunch } from '../../../src/main/onboarding-mount.js';

let configDir: string;

beforeEach(() => {
  configDir = mkdtempSync(join(tmpdir(), 'wiring-mounts-cfl-'));
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
});

describe('MB-F-MB-T08 — checkFirstLaunch', () => {
  it('returns true when config missing (operator never onboarded)', async () => {
    await expect(checkFirstLaunch({ configDir })).resolves.toBe(true);
  });

  it('returns false when onboardingCompleted=true persisted', async () => {
    writeFileSync(
      join(configDir, 'workstation-config.json'),
      JSON.stringify({ onboardingCompleted: true }),
      'utf8',
    );
    await expect(checkFirstLaunch({ configDir })).resolves.toBe(false);
  });

  it('returns true when config exists but onboardingCompleted is missing/false', async () => {
    writeFileSync(
      join(configDir, 'workstation-config.json'),
      JSON.stringify({ onboardingCompleted: false, somethingElse: 1 }),
      'utf8',
    );
    await expect(checkFirstLaunch({ configDir })).resolves.toBe(true);
  });
});
