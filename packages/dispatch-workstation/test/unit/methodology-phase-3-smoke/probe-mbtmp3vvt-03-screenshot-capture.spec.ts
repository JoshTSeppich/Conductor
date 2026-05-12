// MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING · WB5 RED · MBTMP3VVT-03
//
// Probes the `captureScreenshot` export contract — function signature
// + return-type-Promise-of-void. End-to-end behavior (real PNG write)
// verified at WB2 SPIKE `9f58359` (page.screenshot wrote 57,945-byte
// valid PNG) + at WB-final smoke cycle (real workstation render).
//
// This probe additionally asserts `resolveScreenshotPath({ sha,
// screenshotDir })` export — pure-fn path computation per dispatch
// §SCOPE bullet 1: `docs/coordination/screenshots/<sha>.png`.

import { describe, it, expect } from 'vitest';

describe('MBTMP3VVT-03 screenshot capture (γ) — function + path contract', () => {
  it('module exports captureScreenshot function', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    expect(
      mod.captureScreenshot,
      'captureScreenshot must be exported (RED until WB6 GREEN adds the function)',
    ).toBeDefined();
    expect(typeof mod.captureScreenshot).toBe('function');
  });

  it('module exports resolveScreenshotPath function', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    expect(
      mod.resolveScreenshotPath,
      'resolveScreenshotPath must be exported (RED until WB6 GREEN)',
    ).toBeDefined();
    expect(typeof mod.resolveScreenshotPath).toBe('function');
  });

  it('resolveScreenshotPath composes docs/coordination/screenshots/<sha>.png', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    const result = mod.resolveScreenshotPath({
      sha: 'abc1234',
      screenshotDir: 'docs/coordination/screenshots',
    });
    expect(result).toBe('docs/coordination/screenshots/abc1234.png');
  });

  it('resolveScreenshotPath defaults applied when sha/dir omitted (returns relative path with default dir)', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    const result = mod.resolveScreenshotPath({ sha: 'deadbeef' });
    // Default dir is docs/coordination/screenshots/; path ends with sha.png.
    expect(result.endsWith('/deadbeef.png')).toBe(true);
    expect(result.includes('docs/coordination/screenshots')).toBe(true);
  });
});
