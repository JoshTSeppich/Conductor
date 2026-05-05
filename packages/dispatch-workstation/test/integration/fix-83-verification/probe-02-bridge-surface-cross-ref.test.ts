// Fix-83 / Probe 2 — workstationBridge.onSpawnResult surface present.
//
// Cairn finding #83 / Fix-B Fix-2: `workstationBridge.onSpawnResult`
// is the renderer-side subscription surface for `workstation:spawn-
// result` IPC events. Listener-attach logic lives in `spawn-result-
// listener.ts:attachSpawnResultListener` so the seam is unit-testable
// without booting Electron. The unit test at `test/unit/fix-spawn-
// result/test_spawn_result_subscription.spec.ts` covers: channel
// registration, success-payload propagation, error-payload
// propagation, cleanup-fn returned, repeated-cycle leak-free
// (5 / 5 GREEN per Fix-B resolution doc).
//
// This probe is the build-pipeline asserter for the contextBridge
// exposure side AND a fail-loud cross-reference to that unit test.
// Per operator arbitration: cross-references stay as test files
// (not REPORT.md prose) so suite renames trip the runner.
//
// KNOWN: pure-fs assertions; no Electron, no daemon, no runtime.
//
// Pattern reference: probe-82-04 (bridge surface + unit-test cross-
// ref).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const SRC_PRELOAD_MTS = resolve(PACKAGE_ROOT, 'src/main/preload.mts');
const SRC_LISTENER_TS = resolve(PACKAGE_ROOT, 'src/main/spawn-result-listener.ts');
const DIST_PRELOAD_CJS = resolve(PACKAGE_ROOT, 'dist/main/preload.cjs');

// Fail-loud cross-ref: the unit test that pins the listener-seam
// behavioral contract.
const UNIT_TEST_LISTENER = resolve(
  PACKAGE_ROOT,
  'test/unit/fix-spawn-result/test_spawn_result_subscription.spec.ts',
);

function readUtf8(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`expected ${path}`);
  }
  return readFileSync(path, 'utf8');
}

describe('Fix-83 / Probe 2 — workstationBridge.onSpawnResult surface', () => {
  it('preload.mts wires onSpawnResult to attachSpawnResultListener with cleanup-fn return', () => {
    // KNOWN: surface presence + correct shape. Renderer expects
    // onSpawnResult(cb) → cleanupFn (mirrors coarchitectBridge.onStream*
    // pattern). Wrong return shape would silently break unsubscribe.
    const src = readUtf8(SRC_PRELOAD_MTS);
    // Pattern: `onSpawnResult: (...) => ... attachSpawnResultListener(ipcRenderer, cb)`.
    // Cb type signature contains nested `()` so a strict character class
    // can't bound it; the wiring's load-bearing edges are the member
    // name + arrow + helper invocation with ipcRenderer + cb.
    expect(src).toMatch(/onSpawnResult:\s*\(/);
    expect(src).toMatch(
      /attachSpawnResultListener\(\s*ipcRenderer,\s*cb\s*\)/,
    );
  });

  it('spawn-result-listener.ts returns cleanup-fn that removes the listener', () => {
    // KNOWN: helper contract — subscribe registers, return value
    // unsubscribes. Without the cleanup-fn, repeated spawn results
    // would accumulate handlers; resolution doc explicitly cites
    // "repeated-cycle leak-free" as a unit-test surface.
    const src = readUtf8(SRC_LISTENER_TS);
    expect(src).toMatch(/ipc\.on\('workstation:spawn-result'/);
    expect(src).toMatch(
      /return\s*\(\)\s*=>\s*ipc\.removeListener\('workstation:spawn-result'/,
    );
  });

  it('dist/main/preload.cjs bundles the onSpawnResult bridge member', () => {
    // KNOWN: build-pipeline assertion. The contextBridge wiring is
    // bundled via esbuild from preload.mts; missing member at runtime
    // means renderer's `window.workstationBridge.onSpawnResult` is
    // undefined → shell logs "not available" and silent UX returns.
    const dist = readUtf8(DIST_PRELOAD_CJS);
    expect(dist).toMatch(/onSpawnResult/);
    expect(dist).toMatch(/workstation:spawn-result/);
    expect(dist).toMatch(/removeListener/);
  });

  it('fail-loud cross-ref: unit test pins the listener-seam contract', () => {
    // KNOWN-by-cross-reference. The unit test exercises the seam
    // deterministically: channel registration, success / error
    // payload propagation, cleanup-fn semantics, repeated-cycle
    // leak-free. Re-implementing those with mocks here would
    // duplicate the unit test.
    expect(
      existsSync(UNIT_TEST_LISTENER),
      `expected unit test at ${UNIT_TEST_LISTENER}; ` +
        `if intentionally moved, update this cross-ref`,
    ).toBe(true);
    const src = readUtf8(UNIT_TEST_LISTENER);
    expect(src).toMatch(/attachSpawnResultListener/);
    expect(src).toMatch(/'workstation:spawn-result'/);
    // The 5 cases per resolution doc. Anchor the test count via the
    // describe/it block headcount so a no-op gut would trip this
    // probe (we count 'it(' / 'test(' invocations as a sanity
    // floor — 5 cases minimum).
    const itCount = (src.match(/\bit\(/g) ?? []).length +
      (src.match(/\btest\(/g) ?? []).length;
    expect(
      itCount,
      `expected ≥ 5 cases per Fix-B resolution doc; got ${itCount}`,
    ).toBeGreaterThanOrEqual(5);
  });
});
