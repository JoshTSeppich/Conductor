// Fix-83 / Probe 1 — source + build-artifact wiring grep.
//
// Cairn finding #83 (MB-F-MB-T05-SPAWN-FAILURE-SILENTLY-SWALLOWED).
// Fix-B shipped the renderer-side spawn-result subscription chain:
//   - `spawn-result-listener.ts` — pure helper; testable seam
//   - `preload.mts` — workstationBridge.onSpawnResult exposed via
//     contextBridge, wired to attachSpawnResultListener(ipcRenderer, cb)
//   - `workstation-shell.html` — DOM banner + console sentinels
//     (SPAWN_RESULT_OK / SPAWN_RESULT_ERROR) inside handleSpawnResult
//   - `main.ts` — Fix-B SPAWN_RESULT_SUBSCRIPTION sentinel region
//     forwards the renderer's console sentinels to stdout under
//     MB_TEST_HOOKS=1
//
// This probe is the build-pipeline asserter for the whole chain.
// Orthogonal to the live behavioral probes (3 + 4) which exercise
// SPAWN_RESULT_ERROR + SPAWN_RESULT_OK end-to-end.
//
// KNOWN: pure-fs assertions; no runtime, no Electron, no daemon.
//
// Pattern reference: fix-82-verification/probe-01.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const SRC_MAIN_TS = resolve(PACKAGE_ROOT, 'src/main/main.ts');
const SRC_LISTENER_TS = resolve(PACKAGE_ROOT, 'src/main/spawn-result-listener.ts');
const SRC_PRELOAD_MTS = resolve(PACKAGE_ROOT, 'src/main/preload.mts');
const SRC_SHELL_HTML = resolve(PACKAGE_ROOT, 'src/main/workstation-shell.html');
const DIST_MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');
const DIST_LISTENER_JS = resolve(PACKAGE_ROOT, 'dist/main/spawn-result-listener.js');
const DIST_PRELOAD_CJS = resolve(PACKAGE_ROOT, 'dist/main/preload.cjs');
const DIST_SHELL_HTML = resolve(PACKAGE_ROOT, 'dist/main/workstation-shell.html');

function readUtf8(path: string): string {
  if (!existsSync(path)) {
    throw new Error(
      `expected ${path}; build with \`pnpm --filter dispatch-workstation build\``,
    );
  }
  return readFileSync(path, 'utf8');
}

describe('Fix-83 / Probe 1 — source + build-artifact wiring', () => {
  it('spawn-result-listener.ts exports attachSpawnResultListener', () => {
    // KNOWN: helper exists and ships the channel name `workstation:
    // spawn-result` it subscribes to. Either missing → renderer never
    // sees results.
    const src = readUtf8(SRC_LISTENER_TS);
    expect(src).toMatch(/export function attachSpawnResultListener/);
    expect(src).toMatch(/'workstation:spawn-result'/);
  });

  it('preload.mts exposes workstationBridge.onSpawnResult via contextBridge', () => {
    // KNOWN: bridge surface presence. Missing onSpawnResult → shell's
    // `window.workstationBridge.onSpawnResult` returns undefined →
    // shell logs "workstationBridge.onSpawnResult not available" and
    // results are silent (regression to pre-fix-83 symptom).
    const src = readUtf8(SRC_PRELOAD_MTS);
    expect(src).toMatch(
      /contextBridge\.exposeInMainWorld\(\s*'workstationBridge'/,
    );
    expect(src).toMatch(
      /onSpawnResult:.*attachSpawnResultListener\(\s*ipcRenderer,\s*cb\s*\)/s,
    );
  });

  it('workstation-shell.html subscribes via window.workstationBridge.onSpawnResult and emits sentinels', () => {
    // KNOWN: DOM-side wiring. The shell's handleSpawnResult emits
    // SPAWN_RESULT_OK / SPAWN_RESULT_ERROR after calling
    // showSpawnResultBanner — both must be present for the operator-
    // visible AND smoke-harness paths to work.
    const src = readUtf8(SRC_SHELL_HTML);
    expect(src).toMatch(/window\.workstationBridge\.onSpawnResult/);
    expect(src).toMatch(/console\.log\('SPAWN_RESULT_OK '/);
    expect(src).toMatch(/console\.log\('SPAWN_RESULT_ERROR '/);
    expect(src).toMatch(/showSpawnResultBanner/);
  });

  it('main.ts wires the SPAWN_RESULT_SUBSCRIPTION sentinel region forwarder', () => {
    // KNOWN: source-tree assertion of Fix-B's main-process forwarder.
    // The forwarder is what makes the smoke harness / probe stdout-
    // observable. Outside its sentinel region: forbidden territory
    // per coordination scaffold §1.
    const src = readUtf8(SRC_MAIN_TS);
    expect(src).toMatch(/=== BEGIN: Fix-B spawn-result subscription/);
    expect(src).toMatch(/=== END: Fix-B ===/);
    expect(src).toMatch(/SPAWN_RESULT_OK /);
    expect(src).toMatch(/SPAWN_RESULT_ERROR /);
  });

  it('dist artifacts carry the bundled wiring (listener + preload + main + shell)', () => {
    // KNOWN: build-pipeline assertion. Every site present in source
    // must survive bundling. Catches esbuild dead-code-elim + DOM
    // template literal escaping regressions that have bitten this
    // codebase before (cairn #80 bundler-vs-no-bundler class).
    const distListener = readUtf8(DIST_LISTENER_JS);
    expect(distListener).toMatch(/attachSpawnResultListener/);
    expect(distListener).toMatch(/workstation:spawn-result/);
    const distPreload = readUtf8(DIST_PRELOAD_CJS);
    expect(distPreload).toMatch(/onSpawnResult/);
    expect(distPreload).toMatch(/workstation:spawn-result/);
    const distMain = readUtf8(DIST_MAIN_JS);
    expect(distMain).toMatch(/SPAWN_RESULT_OK /);
    expect(distMain).toMatch(/SPAWN_RESULT_ERROR /);
    const distShell = readUtf8(DIST_SHELL_HTML);
    expect(distShell).toMatch(/onSpawnResult/);
    expect(distShell).toMatch(/SPAWN_RESULT_OK /);
    expect(distShell).toMatch(/SPAWN_RESULT_ERROR /);
  });
});
