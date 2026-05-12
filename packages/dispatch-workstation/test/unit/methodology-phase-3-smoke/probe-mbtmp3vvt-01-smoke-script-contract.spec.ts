// MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING · WB1 RED · MBTMP3VVT-01
//
// Probes the `phase-3-visual-smoke.mjs` module-existence + exported-
// `runPhase3Smoke` function contract.
//
// At WB1 RED time the import target `scripts/phase-3-visual-smoke.mjs`
// does not yet exist; vitest fails this suite at module-resolve. WB3
// GREEN authors the skeleton (signature + stub body); subsequent WBs
// fill in launch / capture / diff / orchestration impl.
//
// Design note: matches α-β `methodology-runtime-verify.mjs` separation
// pattern — lib-level helper imported from `scripts/`; CLI wrapper in
// the same file resolves repo-state (HEAD SHA) and forwards to the
// lib. This probe asserts the LIB-LEVEL export shape; CLI invocation
// is exercised at WB10 acceptance.

import { describe, it, expect } from 'vitest';

describe('MBTMP3VVT-01 phase-3-visual-smoke (γ) — module + function contract', () => {
  it('module imports without error + runPhase3Smoke exported', async () => {
    let mod: { runPhase3Smoke?: unknown } | undefined;
    let importError: Error | undefined;
    try {
      const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
      mod = await import(/* @vite-ignore */ modulePath);
    } catch (e) {
      importError = e instanceof Error ? e : new Error(String(e));
    }
    if (importError) {
      throw new Error(
        `RED state at WB1 — module absent (WB3 GREEN authors NEW scripts/phase-3-visual-smoke.mjs): ${importError.message}`,
      );
    }
    expect(mod).toBeDefined();
    expect(
      mod!.runPhase3Smoke,
      'runPhase3Smoke must be exported from scripts/phase-3-visual-smoke.mjs (Sub-Q-A=ii per-package package.json scripts pattern; lib-level export imported by both CLI wrapper and vitest probes)',
    ).toBeDefined();
    expect(typeof mod!.runPhase3Smoke).toBe('function');
  });
});
