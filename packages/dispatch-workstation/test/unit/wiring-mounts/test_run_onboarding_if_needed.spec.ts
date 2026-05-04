// MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT — Cluster 3 RED.
//
// runOnboardingIfNeeded is the orchestration helper called from main.ts:
// it consults checkFirstLaunch on the operator's configDir and either runs
// the mountOnboarding flow (returning true) or short-circuits (returning
// false). Centralising the if-check in this helper means main.ts gets a
// one-line sentinel-marked region instead of duplicated isFirstLaunch
// branching, which keeps the main.ts ownership window small (Session-B
// rebase contention surface minimized per scaffold §2.2).
//
// Acceptance criterion (vision §8.1): "First-launch flow walks operator
// through API key entry" — the orchestration must NOT mount the modal
// when the operator has already completed onboarding.
//
// RED state: src/main/onboarding-mount.ts absent → import fails → FAIL.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  runOnboardingIfNeeded,
  type OnboardingMountDeps,
  type OnboardingWindowHandle,
} from '../../../src/main/onboarding-mount.js';

let configDir: string;

beforeEach(() => {
  configDir = mkdtempSync(join(tmpdir(), 'wiring-mounts-roin-'));
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
});

function noopDeps(): OnboardingMountDeps {
  const fake: OnboardingWindowHandle = {
    async loadFile() {},
    close() {},
  };
  return {
    createOnboardingWindow: () => fake,
    awaitOnComplete: () => Promise.resolve(),
  };
}

describe('MB-F-MB-T08 — runOnboardingIfNeeded', () => {
  it('mounts the modal when checkFirstLaunch returns true (config missing)', async () => {
    let createCount = 0;
    const ran = await runOnboardingIfNeeded({
      configDir,
      createOnboardingWindow: () => {
        createCount += 1;
        return {
          async loadFile() {},
          close() {},
        };
      },
      awaitOnComplete: () => Promise.resolve(),
    });
    expect(ran).toBe(true);
    expect(createCount).toBe(1);
  });

  it('does NOT mount the modal when onboardingCompleted=true persisted', async () => {
    writeFileSync(
      join(configDir, 'workstation-config.json'),
      JSON.stringify({ onboardingCompleted: true }),
      'utf8',
    );

    let createCount = 0;
    const ran = await runOnboardingIfNeeded({
      configDir,
      createOnboardingWindow: () => {
        createCount += 1;
        return {
          async loadFile() {},
          close() {},
        };
      },
      awaitOnComplete: () => Promise.resolve(),
    });
    expect(ran).toBe(false);
    expect(createCount).toBe(0);
  });

  it('passes deps through to mountOnboarding (loadFile invoked)', async () => {
    const loadCalls: string[] = [];
    await runOnboardingIfNeeded({
      configDir,
      createOnboardingWindow: () => ({
        async loadFile(p: string) {
          loadCalls.push(p);
        },
        close() {},
      }),
      awaitOnComplete: () => Promise.resolve(),
    });
    expect(loadCalls).toHaveLength(1);
    expect(loadCalls[0]).toMatch(/onboarding\.html$/);
  });

  // Quiet TS unused-import guard for the noopDeps helper kept here for
  // future parametric variants; reference it once.
  it('noopDeps helper is well-formed (does not crash)', async () => {
    const d = noopDeps();
    expect(typeof d.createOnboardingWindow).toBe('function');
    expect(typeof d.awaitOnComplete).toBe('function');
  });
});
