// Fix-82 / Probe 4 — consoleBridge.openPanel renderer surface present.
//
// Cairn finding #82 / Fix-C Fix-2: ConsoleBridge interface gains
// `openPanel(sessionName: string): Promise<void>`, factory wires it
// to `ipc.invoke('console:open-panel', { sessionName })`. The channel
// already existed at console-ipc.ts; no main-side wiring change.
// `preload.mts` exposes the bridge via the existing
// `contextBridge.exposeInMainWorld('consoleBridge', ...)` call.
//
// This probe is a build-pipeline asserter for the factory-wiring side
// AND a fail-loud cross-reference to the existing unit test that
// pins the surface contract. Per operator arbitration on probe-suite
// scope: cross-references stay as test files (not compressed into
// REPORT.md prose) so suite renames or deletions trip the test
// runner immediately.
//
// KNOWN: pure-fs assertions; no Electron, no daemon, no runtime.
//
// Pattern reference: probe-82 probe-01 (build-pipeline grep) +
// fail-loud cross-ref pattern.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const SRC_CONSOLE_BRIDGE_TS = resolve(PACKAGE_ROOT, 'src/main/console-bridge.ts');
const SRC_CONSOLE_IPC_TS = resolve(PACKAGE_ROOT, 'src/main/console-ipc.ts');
const SRC_PRELOAD_MTS = resolve(PACKAGE_ROOT, 'src/main/preload.mts');
const DIST_CONSOLE_BRIDGE_JS = resolve(PACKAGE_ROOT, 'dist/main/console-bridge.js');
const DIST_PRELOAD_CJS = resolve(PACKAGE_ROOT, 'dist/main/preload.cjs');

// Fail-loud cross-ref: existing unit test that pins the openPanel
// contract. If renamed or deleted, this probe goes RED — operator
// notices immediately rather than discovering coverage drift later.
const UNIT_TEST_OPENPANEL = resolve(
  PACKAGE_ROOT,
  'test/unit/fix-console-trigger/test_console_bridge_open_panel.spec.ts',
);

function readUtf8(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`expected ${path}`);
  }
  return readFileSync(path, 'utf8');
}

describe('Fix-82 / Probe 4 — consoleBridge.openPanel renderer surface', () => {
  it('console-bridge.ts factory wires openPanel to console:open-panel invoke', () => {
    // KNOWN: factory wiring assertion. Both the interface declaration
    // (Promise<void> shape) and the factory body (ipc.invoke) must
    // survive — otherwise the renderer side is a no-op that returns
    // undefined regardless of what the main side handles.
    const src = readUtf8(SRC_CONSOLE_BRIDGE_TS);
    expect(src).toMatch(/openPanel\(sessionName: string\): Promise<void>/);
    expect(src).toMatch(
      /openPanel:.*ipc\.invoke\(\s*'console:open-panel',\s*\{\s*sessionName\s*\}/s,
    );
  });

  it('console-ipc.ts main-side handler registers console:open-panel', () => {
    // KNOWN: main-side handler must accept the channel the bridge
    // invokes. Renderer-side openPanel reaching a missing main-side
    // handler would resolve undefined silently; the unit test cannot
    // catch that cross-process gap because it stubs the IPC layer.
    const src = readUtf8(SRC_CONSOLE_IPC_TS);
    expect(src).toMatch(/'console:open-panel'/);
  });

  it('preload.mts exposes consoleBridge via contextBridge', () => {
    // KNOWN: even with the factory shape correct, if the bridge isn't
    // exposed under window.consoleBridge the renderer cannot reach it.
    const src = readUtf8(SRC_PRELOAD_MTS);
    expect(src).toMatch(
      /contextBridge\.exposeInMainWorld\(\s*'consoleBridge'\s*,\s*makeConsoleBridge/,
    );
  });

  it('dist/main/console-bridge.js + preload.cjs carry the bundled openPanel wiring', () => {
    // KNOWN: build-pipeline assertion. esbuild bundles preload.cjs
    // from preload.mts which imports console-bridge.ts → dist must
    // contain both the channel string AND the openPanel symbol.
    const distBridge = readUtf8(DIST_CONSOLE_BRIDGE_JS);
    expect(distBridge).toMatch(/openPanel/);
    expect(distBridge).toMatch(/console:open-panel/);
    const distPreload = readUtf8(DIST_PRELOAD_CJS);
    // bundled preload contains the entire console-bridge factory inline
    // (esbuild-bundled IIFE); both literals must be present.
    expect(distPreload).toMatch(/openPanel/);
    expect(distPreload).toMatch(/console:open-panel/);
  });

  it('fail-loud cross-ref: existing unit test pins the openPanel surface contract', () => {
    // KNOWN-by-cross-reference. The unit test at the linked path
    // covers: surface presence, invoke channel + payload shape,
    // Promise resolution, error propagation (per finding #82
    // resolution Fix-C Fix-2). If the file is renamed or removed,
    // this probe goes RED loudly — operator must update the cross-ref
    // (or replace the coverage) rather than silently lose probe
    // territory.
    expect(
      existsSync(UNIT_TEST_OPENPANEL),
      `expected unit test at ${UNIT_TEST_OPENPANEL}; ` +
        `if intentionally moved, update this cross-ref accordingly`,
    ).toBe(true);
    const unitSrc = readUtf8(UNIT_TEST_OPENPANEL);
    // Sanity: the unit test still asserts the surface this probe
    // claims it asserts. If the unit test is gutted to a no-op, the
    // cross-reference is meaningless — guard against that too.
    expect(unitSrc).toMatch(/openPanel/);
    expect(unitSrc).toMatch(/console:open-panel/);
  });
});
