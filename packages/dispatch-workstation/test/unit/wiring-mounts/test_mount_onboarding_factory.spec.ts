// MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT — Cluster 2 RED.
//
// mountOnboarding(deps) opens the onboarding modal as its own BrowserWindow
// (no parent — main window is created AFTER onboarding completes per
// existing main.ts ordering at app.whenReady()), loads onboarding.html, and
// resolves when the renderer fires the workstation:onboarding-complete IPC.
//
// Dependencies are injected so the orchestration is testable without booting
// Electron. The fake records calls so the test can assert:
//   1. createOnboardingWindow is invoked exactly once.
//   2. loadFile is called with the dist/onboarding/onboarding.html path.
//   3. close() is called only AFTER awaitOnComplete resolves.
//   4. mountOnboarding does not resolve before awaitOnComplete resolves.
//
// RED state: src/main/onboarding-mount.ts absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import {
  mountOnboarding,
  ONBOARDING_HTML_FILENAME,
  type OnboardingWindowHandle,
} from '../../../src/main/onboarding-mount.js';

interface FakeWindow extends OnboardingWindowHandle {
  loadFileCalls: string[];
  closeCalls: number;
}

function makeFakeWindow(): FakeWindow {
  const loadFileCalls: string[] = [];
  let closeCalls = 0;
  return {
    loadFileCalls,
    get closeCalls() {
      return closeCalls;
    },
    async loadFile(p: string) {
      loadFileCalls.push(p);
    },
    close() {
      closeCalls += 1;
    },
  } as FakeWindow;
}

describe('MB-F-MB-T08 — mountOnboarding factory', () => {
  it('creates exactly one onboarding window and loads onboarding.html', async () => {
    const fake = makeFakeWindow();
    let createCount = 0;
    let resolveComplete!: () => void;
    const completePromise = new Promise<void>((r) => {
      resolveComplete = r;
    });

    const mountP = mountOnboarding({
      createOnboardingWindow: () => {
        createCount += 1;
        return fake;
      },
      awaitOnComplete: () => completePromise,
    });

    // Allow the implementation to call loadFile.
    await Promise.resolve();
    await Promise.resolve();

    expect(createCount).toBe(1);
    expect(fake.loadFileCalls).toHaveLength(1);
    expect(fake.loadFileCalls[0]).toMatch(/onboarding\.html$/);
    expect(fake.loadFileCalls[0]).toContain(ONBOARDING_HTML_FILENAME);

    // Has not resolved yet (awaitOnComplete still pending).
    let resolved = false;
    void mountP.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    // Resolve completion → mountOnboarding closes window and resolves.
    resolveComplete();
    await mountP;
    expect(fake.closeCalls).toBe(1);
  });

  it('does not close the window before awaitOnComplete resolves', async () => {
    const fake = makeFakeWindow();
    let resolveComplete!: () => void;
    const completePromise = new Promise<void>((r) => {
      resolveComplete = r;
    });

    const mountP = mountOnboarding({
      createOnboardingWindow: () => fake,
      awaitOnComplete: () => completePromise,
    });

    // Pump several microtasks; close must remain unset.
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
    expect(fake.closeCalls).toBe(0);

    resolveComplete();
    await mountP;
    expect(fake.closeCalls).toBe(1);
  });

  it('propagates loadFile rejection (does not swallow load errors)', async () => {
    const failing: OnboardingWindowHandle = {
      async loadFile() {
        throw new Error('loadFile boom');
      },
      close() {},
    };
    const completePromise = new Promise<void>(() => {
      /* never resolves */
    });

    await expect(
      mountOnboarding({
        createOnboardingWindow: () => failing,
        awaitOnComplete: () => completePromise,
      }),
    ).rejects.toThrow(/loadFile boom/);
  });
});
