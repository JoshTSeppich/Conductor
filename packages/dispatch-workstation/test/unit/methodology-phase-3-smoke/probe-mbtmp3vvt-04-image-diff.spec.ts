// MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING · WB7 RED+GREEN · MBTMP3VVT-04
//
// Probes the `diffImages` export contract — function signature + result
// shape + graceful-degradation for absent paths.
//
// End-to-end pixelmatch invocation verified at WB7 GREEN by generating
// two small synthetic PNGs in a tmpdir, comparing them, and asserting
// the structured result (mismatchedPixels / totalPixels / ratio).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PNG } from 'pngjs';

let tmpDir;
beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mbtmp3vvt-04-'));
});
afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function makePng(width, height, fill /* [r,g,b,a] */) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      png.data[idx + 0] = fill[0];
      png.data[idx + 1] = fill[1];
      png.data[idx + 2] = fill[2];
      png.data[idx + 3] = fill[3];
    }
  }
  return PNG.sync.write(png);
}

describe('MBTMP3VVT-04 image-diff (γ) — function + graceful-degradation contract', () => {
  it('module exports diffImages function', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    expect(mod.diffImages).toBeDefined();
    expect(typeof mod.diffImages).toBe('function');
  });

  it('identical PNGs → mismatchedPixels === 0 + ratio === 0', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    const leftPath = join(tmpDir, 'left.png');
    const rightPath = join(tmpDir, 'right.png');
    const buf = makePng(4, 4, [255, 0, 0, 255]); // red 4x4
    writeFileSync(leftPath, buf);
    writeFileSync(rightPath, buf);
    const result = await mod.diffImages({
      leftPath,
      rightPath,
      outDiffPath: join(tmpDir, 'diff.png'),
    });
    expect(result.mismatchedPixels).toBe(0);
    expect(result.totalPixels).toBe(16);
    expect(result.ratio).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it('different PNGs → mismatchedPixels > 0 + ratio > 0', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    const leftPath = join(tmpDir, 'left2.png');
    const rightPath = join(tmpDir, 'right2.png');
    writeFileSync(leftPath, makePng(4, 4, [255, 0, 0, 255]));   // red
    writeFileSync(rightPath, makePng(4, 4, [0, 255, 0, 255])); // green
    const result = await mod.diffImages({
      leftPath,
      rightPath,
      outDiffPath: join(tmpDir, 'diff2.png'),
    });
    expect(result.mismatchedPixels).toBe(16);
    expect(result.totalPixels).toBe(16);
    expect(result.ratio).toBe(1);
  });

  it('absent leftPath → graceful-degradation { error: "READ-FAILED" }', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    const result = await mod.diffImages({
      leftPath: join(tmpDir, 'nonexistent.png'),
      rightPath: join(tmpDir, 'left.png'), // exists from earlier test
      outDiffPath: join(tmpDir, 'diff-absent.png'),
    });
    expect(result.error).toBe('READ-FAILED');
    expect(result.mismatchedPixels).toBe(-1);
    expect(result.totalPixels).toBe(0);
    expect(Number.isNaN(result.ratio)).toBe(true);
  });

  it('absent rightPath → graceful-degradation { error: "TARGET-ABSENT" }', async () => {
    const modulePath = '../../../scripts/phase-3-visual-smoke.mjs';
    const mod = await import(/* @vite-ignore */ modulePath);
    const leftPath = join(tmpDir, 'left.png');
    expect(existsSync(leftPath)).toBe(true);
    const result = await mod.diffImages({
      leftPath,
      rightPath: join(tmpDir, 'target-not-supplied.png'),
      outDiffPath: join(tmpDir, 'diff-target-absent.png'),
    });
    expect(result.error).toBe('TARGET-ABSENT');
    expect(result.mismatchedPixels).toBe(-1);
  });
});
