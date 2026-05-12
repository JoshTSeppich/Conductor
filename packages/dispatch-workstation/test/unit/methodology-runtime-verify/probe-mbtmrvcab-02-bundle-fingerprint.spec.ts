// MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β · WB3 RED · MBTMRVCAB-02
//
// Probes closure-path-β "bundle-inclusion verification" lib-level
// classification: given a dist file path and a non-empty list of
// fingerprint substrings, the gate returns PASS when ALL fingerprints
// occur ≥1 time in the file and FAIL when ANY fingerprint has count 0.
// Empty fingerprint list → ERROR (vacuous PASS is methodology-incident-
// class per Sub-Q-MBTMRVCAB-C=i discipline).
//
// At WB3 RED time the import target `verifyBundleFingerprint` does not
// yet exist (the .mjs module exists from WB2 but only exports α surface).
// WB4 GREEN extends the module with β surface and flips RED → GREEN.
//
// Design note (matches WB1 probe layout): pure substring count on a
// readFileSync output — no minification awareness, no AST. Per ticket
// body §8 risk register, esbuild config has `minify: false` and this
// coupling is load-bearing for β; tracked at WB6 docs.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// @ts-expect-error — WB3 RED: verifyBundleFingerprint absent until WB4 GREEN extends the .mjs module.
import { verifyBundleFingerprint } from '../../../scripts/methodology-runtime-verify.mjs';

describe('MBTMRVCAB-02 bundle-inclusion verification (β) — lib classification', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mbtmrvcab-02-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns PASS when single fingerprint is present in dist', () => {
    const distPath = join(tmpDir, 'dist.js');
    writeFileSync(distPath, 'console.log("hello-world-fingerprint");');

    const result = verifyBundleFingerprint({
      distPath,
      fingerprints: ['hello-world-fingerprint'],
    });

    expect(result.state).toBe('PASS');
    expect(result.results).toEqual([
      { fingerprint: 'hello-world-fingerprint', count: 1 },
    ]);
  });

  it('returns FAIL when single fingerprint is absent (count=0)', () => {
    const distPath = join(tmpDir, 'dist.js');
    writeFileSync(distPath, '// bundle without target string');

    const result = verifyBundleFingerprint({
      distPath,
      fingerprints: ['missing-fingerprint'],
    });

    expect(result.state).toBe('FAIL');
    expect(result.results).toEqual([
      { fingerprint: 'missing-fingerprint', count: 0 },
    ]);
  });

  it('returns FAIL when ANY fingerprint in the set is absent (mixed)', () => {
    const distPath = join(tmpDir, 'dist.js');
    writeFileSync(distPath, 'frame-c-root\nmountFrameC();');

    const result = verifyBundleFingerprint({
      distPath,
      fingerprints: ['frame-c-root', 'never-present-string-xyz'],
    });

    expect(result.state).toBe('FAIL');
    expect(result.results).toContainEqual({ fingerprint: 'frame-c-root', count: 1 });
    expect(result.results).toContainEqual({ fingerprint: 'never-present-string-xyz', count: 0 });
  });

  it('counts multiple occurrences of the same fingerprint', () => {
    const distPath = join(tmpDir, 'dist.js');
    writeFileSync(distPath, 'foo foo foo bar foo');

    const result = verifyBundleFingerprint({
      distPath,
      fingerprints: ['foo'],
    });

    expect(result.state).toBe('PASS');
    expect(result.results).toEqual([{ fingerprint: 'foo', count: 4 }]);
  });

  it('returns PASS when all fingerprints (multi) present', () => {
    const distPath = join(tmpDir, 'dist.js');
    writeFileSync(distPath, 'data-testid="frame-c-root" + mountFrameC + workstation:read-swarm-state');

    const result = verifyBundleFingerprint({
      distPath,
      fingerprints: ['frame-c-root', 'mountFrameC', 'workstation:read-swarm-state'],
    });

    expect(result.state).toBe('PASS');
    expect(result.results.every((r) => r.count >= 1)).toBe(true);
  });

  it('throws ERROR when fingerprint list is empty (vacuous PASS prevention)', () => {
    const distPath = join(tmpDir, 'dist.js');
    writeFileSync(distPath, 'anything');

    expect(() =>
      verifyBundleFingerprint({ distPath, fingerprints: [] })
    ).toThrow();
  });

  it('throws ERROR when distPath does not exist', () => {
    const distPath = join(tmpDir, 'never-existed.js');
    expect(() =>
      verifyBundleFingerprint({ distPath, fingerprints: ['x'] })
    ).toThrow();
  });
});
