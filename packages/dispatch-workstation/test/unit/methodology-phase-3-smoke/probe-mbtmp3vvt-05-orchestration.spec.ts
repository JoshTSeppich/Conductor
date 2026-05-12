// MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING · WB8+WB9 paired · MBTMP3VVT-05
//
// Probes the runPhase3Smoke orchestration via its pure-fn extracted
// pieces:
//   - classifyResult({ buildOk?, launchOk?, diffResult?, thresholdPercent? })
//     → SmokeState ∈ 'PASS'|'FAIL'|'TARGET-ABSENT'|'BUILD-FAILED'|'LAUNCH-FAILED'
//   - formatSummary({ state, screenshotPath?, mismatchPercent?, durationMs?, targetImagePath? })
//     → single-line string for commit body inclusion
//
// End-to-end runPhase3Smoke invocation (with real electron launch) is
// exercised at WB-final smoke cycle + manual operator runs; not unit-
// tested here.

import { describe, it, expect } from 'vitest';

describe('MBTMP3VVT-05 orchestration (γ) — classifyResult + formatSummary contracts', () => {
  it('classifyResult exported as function', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    expect(mod.classifyResult).toBeDefined();
    expect(typeof mod.classifyResult).toBe('function');
  });

  it('classifyResult returns BUILD-FAILED when buildOk === false', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    expect(mod.classifyResult({ buildOk: false })).toBe('BUILD-FAILED');
  });

  it('classifyResult returns LAUNCH-FAILED when buildOk but launchOk === false', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    expect(mod.classifyResult({ buildOk: true, launchOk: false })).toBe(
      'LAUNCH-FAILED',
    );
  });

  it('classifyResult returns TARGET-ABSENT when diffResult.error === "TARGET-ABSENT"', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    const result = mod.classifyResult({
      buildOk: true,
      launchOk: true,
      diffResult: { error: 'TARGET-ABSENT', mismatchedPixels: -1, totalPixels: 0, ratio: NaN },
    });
    expect(result).toBe('TARGET-ABSENT');
  });

  it('classifyResult returns PASS when ratio*100 <= thresholdPercent', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    expect(
      mod.classifyResult({
        buildOk: true,
        launchOk: true,
        diffResult: { mismatchedPixels: 100, totalPixels: 100_000, ratio: 0.001 },
        thresholdPercent: 1,
      }),
    ).toBe('PASS');
  });

  it('classifyResult returns FAIL when ratio*100 > thresholdPercent', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    expect(
      mod.classifyResult({
        buildOk: true,
        launchOk: true,
        diffResult: { mismatchedPixels: 5_000, totalPixels: 100_000, ratio: 0.05 },
        thresholdPercent: 1,
      }),
    ).toBe('FAIL');
  });

  it('formatSummary exported as function returning single-line string', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    expect(mod.formatSummary).toBeDefined();
    expect(typeof mod.formatSummary).toBe('function');
    const summary = mod.formatSummary({
      state: 'TARGET-ABSENT',
      screenshotPath: '/tmp/foo.png',
      durationMs: 3500,
    });
    expect(typeof summary).toBe('string');
    expect(summary).not.toContain('\n');
    expect(summary).toContain('TARGET-ABSENT');
    expect(summary).toContain('/tmp/foo.png');
  });

  it('formatSummary PASS state includes mismatch percent', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    const summary = mod.formatSummary({
      state: 'PASS',
      screenshotPath: '/tmp/foo.png',
      mismatchPercent: 0.5,
      durationMs: 35000,
      targetImagePath: '/tmp/target.png',
    });
    expect(summary).toContain('PASS');
    expect(summary).toContain('0.5');
    expect(summary).toContain('/tmp/target.png');
  });
});
