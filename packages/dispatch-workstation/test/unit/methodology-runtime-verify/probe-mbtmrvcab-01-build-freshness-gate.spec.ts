// MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β · WB1 RED · MBTMRVCAB-01
//
// Probes closure-path-α "build-freshness gate" lib-level classification:
// given a dist file mtime and a HEAD commit timestamp, the gate returns
// STALE when distMtimeS < headCommitTimeS and FRESH otherwise (inclusive
// boundary).
//
// At WB1 RED time the import target `scripts/methodology-runtime-verify.mjs`
// does not yet exist; vitest fails this suite at module-resolve. WB2 GREEN
// authors the module and flips RED → GREEN by satisfying the three
// classification cases below.
//
// Design note (Sub-Q-MBTMRVCAB-A=ii operator-arbitrated 2026-05-12): the
// lib-level helper accepts `headCommitTimeS` as a parameter — pure two-number
// comparison with one fs.statSync side-effect. CLI surface (WB2) resolves
// HEAD timestamp via `git log -1 --format=%at` and forwards to the lib.
// This separation keeps the probe deterministic and free of repo-state
// coupling.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, utimesSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// @ts-expect-error — WB1 RED: import target absent until WB2 GREEN ships the .mjs module.
import { verifyBuildFreshness } from '../../../scripts/methodology-runtime-verify.mjs';

describe('MBTMRVCAB-01 build-freshness gate (α) — lib classification', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mbtmrvcab-01-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns STALE when distMtimeS < headCommitTimeS', () => {
    const distPath = join(tmpDir, 'main.js');
    writeFileSync(distPath, '// synthetic dist artifact');

    const headCommitTimeS = Math.floor(Date.now() / 1000);
    const distMtimeS = headCommitTimeS - 3600; // 1 hour stale
    utimesSync(distPath, distMtimeS, distMtimeS);

    const result = verifyBuildFreshness({ distPath, headCommitTimeS });

    expect(result.state).toBe('STALE');
    expect(result.distMtimeS).toBe(distMtimeS);
    expect(result.headCommitTimeS).toBe(headCommitTimeS);
  });

  it('returns FRESH when distMtimeS > headCommitTimeS', () => {
    const distPath = join(tmpDir, 'main.js');
    writeFileSync(distPath, '// synthetic dist artifact');

    const headCommitTimeS = Math.floor(Date.now() / 1000) - 3600; // commit was 1h ago
    const distMtimeS = Math.floor(Date.now() / 1000); // rebuilt just now
    utimesSync(distPath, distMtimeS, distMtimeS);

    const result = verifyBuildFreshness({ distPath, headCommitTimeS });

    expect(result.state).toBe('FRESH');
    expect(result.distMtimeS).toBe(distMtimeS);
    expect(result.headCommitTimeS).toBe(headCommitTimeS);
  });

  it('returns FRESH when distMtimeS === headCommitTimeS (boundary inclusive)', () => {
    const distPath = join(tmpDir, 'main.js');
    writeFileSync(distPath, '// synthetic dist artifact');

    const t = Math.floor(Date.now() / 1000);
    utimesSync(distPath, t, t);

    const result = verifyBuildFreshness({ distPath, headCommitTimeS: t });

    expect(result.state).toBe('FRESH');
    expect(result.distMtimeS).toBe(t);
    expect(result.headCommitTimeS).toBe(t);
  });

  it('throws ERROR when distPath does not exist (build never ran)', () => {
    const distPath = join(tmpDir, 'never-existed.js');
    const headCommitTimeS = Math.floor(Date.now() / 1000);

    expect(() => verifyBuildFreshness({ distPath, headCommitTimeS })).toThrow();
  });
});
