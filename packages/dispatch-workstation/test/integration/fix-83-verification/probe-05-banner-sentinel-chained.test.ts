// Fix-83 / Probe 5 — banner→sentinel call-order proof.
//
// KNOWN-redundant by-design. The shell DOM banner (success auto-
// dismiss / error persistent) is the operator-visible UX surface
// that finding #83 requested. Asserting banner *visibility* directly
// would require either a SHELL_EVAL stdin handler in main.ts (>50
// LOC observability extension; halt-condition territory) OR a
// CDP / DevTools attach against the running webContents (not in
// scope per probe-92's reframe pattern).
//
// Instead, this probe leans on the source-tree fact that the banner
// is rendered by `showSpawnResultBanner(...)` AND the SPAWN_RESULT_
// OK / SPAWN_RESULT_ERROR sentinels are emitted from the same
// `handleSpawnResult(reply)` function, AFTER the banner-show line.
// Probes 3 + 4 observe the sentinels firing live → the banner
// code path executed, by lexical-ordering proof.
//
// This probe asserts that lexical-ordering invariant in source so
// future edits cannot reorder the lines (sentinel-before-banner)
// without tripping it. It is a fail-loud cross-reference to probes
// 3 + 4 + the existing unit test, packaged as a test file rather
// than REPORT.md prose per operator arbitration.
//
// KNOWN: pure-fs. No Electron, no daemon.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const SHELL_HTML = resolve(PACKAGE_ROOT, 'src/main/workstation-shell.html');
const PROBE_03 = resolve(__dirname, 'probe-03-spawn-result-error-daemon-unreachable.test.ts');
const PROBE_04 = resolve(__dirname, 'probe-04-spawn-result-ok-live-daemon.test.ts');

function readUtf8(path: string): string {
  if (!existsSync(path)) throw new Error(`expected ${path}`);
  return readFileSync(path, 'utf8');
}

describe('Fix-83 / Probe 5 — banner→sentinel call-order proof', () => {
  it('handleSpawnResult success branch: showSpawnResultBanner precedes SPAWN_RESULT_OK console.log', () => {
    // KNOWN: the SPAWN_RESULT_OK sentinel only fires AFTER the banner
    // is shown. Probes 3 + 4 observe SPAWN_RESULT_* sentinels live →
    // banner-show code path executed by lexical proof. Reordering
    // would silently degrade observability AND make the redundancy
    // claim false; this assertion pins the order.
    const src = readUtf8(SHELL_HTML);
    const successBlockIdx = src.indexOf("if (reply.type === 'success')");
    const okConsoleIdx = src.indexOf("console.log('SPAWN_RESULT_OK '");
    const successBannerIdx = src.indexOf("showSpawnResultBanner('success'", successBlockIdx);
    expect(successBlockIdx, 'expected success branch in handleSpawnResult').toBeGreaterThanOrEqual(0);
    expect(successBannerIdx, 'expected showSpawnResultBanner success call').toBeGreaterThan(successBlockIdx);
    expect(okConsoleIdx, 'expected SPAWN_RESULT_OK console.log').toBeGreaterThan(successBannerIdx);
  });

  it('handleSpawnResult error branch: showSpawnResultBanner precedes SPAWN_RESULT_ERROR console.log', () => {
    // KNOWN: same proof for the error branch. Probe 3 observes
    // SPAWN_RESULT_ERROR live → showSpawnResultBanner('error', ...)
    // executed first by lexical proof.
    const src = readUtf8(SHELL_HTML);
    const errBlockIdx = src.indexOf("if (reply.type === 'error')");
    const errBannerIdx = src.indexOf("showSpawnResultBanner('error'", errBlockIdx);
    const errConsoleIdx = src.indexOf("console.log('SPAWN_RESULT_ERROR '");
    expect(errBlockIdx, 'expected error branch in handleSpawnResult').toBeGreaterThanOrEqual(0);
    expect(errBannerIdx, 'expected showSpawnResultBanner error call').toBeGreaterThan(errBlockIdx);
    expect(errConsoleIdx, 'expected SPAWN_RESULT_ERROR console.log').toBeGreaterThan(errBannerIdx);
  });

  it('error banner persists (no auto-dismiss timer); success banner auto-dismisses', () => {
    // KNOWN: per finding #83 fix-B resolution + workstation-shell.html
    // L506 + L513: success → showSpawnResultBanner('success', ..., 3000);
    // error → showSpawnResultBanner('error', ..., 0). The asymmetric
    // dismiss is the UX requirement (operator must consciously dismiss
    // an error vs auto-fade a success). Pin the call shapes.
    const src = readUtf8(SHELL_HTML);
    expect(src).toMatch(/showSpawnResultBanner\(\s*'success',[^,]+,\s*3000\s*\)/);
    expect(src).toMatch(/showSpawnResultBanner\(\s*'error',[^,]+,\s*0\s*\)/);
  });

  it('fail-loud cross-ref: probes 3 and 4 (sentinel observation siblings) exist', () => {
    // KNOWN-by-cross-reference. The lexical proof above is meaningful
    // ONLY because probes 3 + 4 actually observe the sentinels firing
    // at runtime. If those sibling probes are deleted, the lexical
    // proof becomes vestigial — operator must replace the runtime
    // observation or accept loss of coverage.
    expect(
      existsSync(PROBE_03),
      `expected probe-03 at ${PROBE_03}; if intentionally moved, update this cross-ref`,
    ).toBe(true);
    expect(
      existsSync(PROBE_04),
      `expected probe-04 at ${PROBE_04}; if intentionally moved, update this cross-ref`,
    ).toBe(true);
    // Sanity: those probes still observe the sentinels they claim to.
    const p3 = readUtf8(PROBE_03);
    const p4 = readUtf8(PROBE_04);
    expect(p3).toMatch(/SPAWN_RESULT_ERROR /);
    expect(p4).toMatch(/SPAWN_RESULT_OK /);
  });
});
