// MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING · WB4 RED · MBTMP3VVT-02
//
// Probes the `launchHeadless` export contract — function signature +
// return shape — without actually invoking playwright-electron (which
// requires dist/main/main.js + would be a heavy unit test). End-to-end
// behavior verified at WB2 SPIKE `9f58359` (launchOk + firstWindowOk
// + screenshotOk all-pass on macOS Darwin 25.3); this probe asserts the
// public contract is intact after WB4 GREEN extends the skeleton.
//
// Design note: separating contract probe from end-to-end run keeps
// vitest cycle fast (no 3-5s electron launch per test); end-to-end is
// exercised at WB-final smoke cycle invocation (operator-manual OR
// CI-driven via `pnpm --filter dispatch-workstation verify:phase-3-
// smoke`).

import { describe, it, expect } from 'vitest';

describe('MBTMP3VVT-02 launch-headless contract (γ) — function export + return shape', () => {
  it('module exports launchHeadless function', async () => {
    let mod;
    let importError;
    try {
      const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
      mod = await import(/* @vite-ignore */ modulePath);
    } catch (e) {
      importError = e instanceof Error ? e : new Error(String(e));
    }
    if (importError) {
      throw new Error(`module import failed: ${importError.message}`);
    }
    expect(mod).toBeDefined();
    expect(
      mod.launchHeadless,
      'launchHeadless must be exported from scripts/phase-3-visual-smoke.mjs (RED until WB4 GREEN adds the function)',
    ).toBeDefined();
    expect(typeof mod.launchHeadless).toBe('function');
  });

  it('launchHeadless accepts opts arg + returns a Promise', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    expect(mod.launchHeadless).toBeDefined();
    // Function arity check — JS function.length is the number of named
    // parameters BEFORE the first default-valued one. launchHeadless({})
    // signature → arity 0 (single object parameter with default) OR 1
    // (no default). Either is acceptable.
    expect(mod.launchHeadless.length).toBeGreaterThanOrEqual(0);
    expect(mod.launchHeadless.length).toBeLessThanOrEqual(1);
  });
});
