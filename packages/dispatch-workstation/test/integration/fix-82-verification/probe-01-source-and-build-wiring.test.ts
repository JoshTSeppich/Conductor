// Fix-82 / Probe 1 — source + build-artifact wiring grep.
//
// Cairn finding #82 (MB-F-CONSOLE-T03-OPERATOR-TRIGGER-UNREACHABLE).
// Fix-C shipped two integration points:
//   (a) `subscribeConsoleMenuToDaemon` helper in console-mount.ts wired
//       inside main.ts `app.whenReady()` between an explicit Fix-C
//       sentinel pair, exposing the operator-trigger menu.
//   (b) `consoleBridge.openPanel(sessionName)` action method on the
//       contextBridge surface, wired to the existing 'console:open-panel'
//       IPC channel.
//
// This probe is the build-pipeline asserter for both. It is orthogonal
// to behavioral probes 2-3 (which verify bootstrap fetch and debounce
// at runtime) and probe 4 (which verifies the consoleBridge surface).
// Catches regressions in:
//   - source-tree edits that remove the Fix-C sentinel region
//   - esbuild flag changes / dead-code-elim that drop the helper from
//     the bundle
//   - preload bundler changes that drop the 'console:open-panel' channel
//     string
//
// KNOWN evidence: direct fs read of src/main/*.ts and dist/main/*. No
// runtime, no Electron, no daemon dependency.
//
// Pattern reference: probe-92 probe-03 (build-artifact bootstrap wiring).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const SRC_MAIN_TS = resolve(PACKAGE_ROOT, 'src/main/main.ts');
const SRC_CONSOLE_MOUNT_TS = resolve(PACKAGE_ROOT, 'src/main/console-mount.ts');
const SRC_CONSOLE_BRIDGE_TS = resolve(PACKAGE_ROOT, 'src/main/console-bridge.ts');
const DIST_MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');
const DIST_CONSOLE_MOUNT_JS = resolve(PACKAGE_ROOT, 'dist/main/console-mount.js');
const DIST_CONSOLE_IPC_JS = resolve(PACKAGE_ROOT, 'dist/main/console-ipc.js');
const DIST_CONSOLE_BRIDGE_JS = resolve(PACKAGE_ROOT, 'dist/main/console-bridge.js');
const DIST_PRELOAD_CJS = resolve(PACKAGE_ROOT, 'dist/main/preload.cjs');

function readUtf8(path: string): string {
  if (!existsSync(path)) {
    throw new Error(
      `expected ${path}; build with \`pnpm --filter dispatch-workstation build\``,
    );
  }
  return readFileSync(path, 'utf8');
}

describe('Fix-82 / Probe 1 — source + build-artifact wiring', () => {
  it('console-mount.ts exports subscribeConsoleMenuToDaemon', () => {
    // KNOWN: source-tree assertion. Helper presence is the precondition
    // for the wiring chain probes 2-3 exercise at runtime.
    const src = readUtf8(SRC_CONSOLE_MOUNT_TS);
    expect(src).toMatch(/export function subscribeConsoleMenuToDaemon\b/);
    expect(src).toMatch(/export interface SubscribeConsoleMenuDeps\b/);
  });

  it('console-bridge.ts factory exposes openPanel(sessionName)', () => {
    // KNOWN: source-tree assertion for Fix-C Fix-2 (bridge surface).
    const src = readUtf8(SRC_CONSOLE_BRIDGE_TS);
    expect(src).toMatch(/openPanel\(sessionName: string\): Promise<void>/);
    expect(src).toMatch(/'console:open-panel'/);
  });

  it('main.ts wires subscribeConsoleMenuToDaemon inside Fix-C sentinel region', () => {
    // KNOWN: source-tree assertion.
    // The Fix-C sentinel region is the single integration point for #82.
    // Any edit that removes the sentinel pair, the import, or the call
    // breaks the wiring chain — this probe is the canary.
    const src = readUtf8(SRC_MAIN_TS);
    // Sentinel pair (pattern from coordination scaffold §1).
    expect(src).toMatch(
      /=== BEGIN: Fix-C console trigger \(cairn finding #82, do not modify outside this block\) ===/,
    );
    expect(src).toMatch(/=== END: Fix-C ===/);
    // Import + call both required.
    expect(src).toMatch(/import \{\s*[^}]*subscribeConsoleMenuToDaemon[^}]*\}/);
    expect(src).toMatch(/subscribeConsoleMenuToDaemon\(\{/);
  });

  it('dist contains the bundled subscribeConsoleMenuToDaemon symbol', () => {
    // KNOWN: build-pipeline assertion. tsc emits per-file modules — the
    // helper definition lives in dist/main/console-mount.js; main.js
    // re-imports it. A regression dropping it from either file would
    // surface here.
    const distMount = readUtf8(DIST_CONSOLE_MOUNT_JS);
    expect(distMount).toMatch(/export function subscribeConsoleMenuToDaemon/);
    // The helper's bootstrap path performs GET /v2/sessions and the
    // refresh path emits refreshConsoleMenu — both must survive bundling.
    expect(distMount).toMatch(/\/v2\/sessions/);
    const distMain = readUtf8(DIST_MAIN_JS);
    expect(distMain).toMatch(/subscribeConsoleMenuToDaemon/);
    expect(distMain).toMatch(/refreshConsoleMenu/);
  });

  it('console:open-panel channel present in main-side handler + renderer-side bridge + preload', () => {
    // KNOWN: cross-artifact symmetric assertion. Three sites must all
    // survive the build:
    //   - dist/main/console-ipc.js     — ipcMain.handle('console:open-panel', ...)
    //   - dist/main/console-bridge.js  — bridge factory invoke('console:open-panel', ...)
    //   - dist/main/preload.cjs        — bundled bridge included in renderer preload
    // Any side missing the literal channel string at bundle time means
    // the IPC roundtrip silently fails — this catches that regression
    // class specifically.
    expect(readUtf8(DIST_CONSOLE_IPC_JS)).toMatch(/console:open-panel/);
    expect(readUtf8(DIST_CONSOLE_BRIDGE_JS)).toMatch(/console:open-panel/);
    expect(readUtf8(DIST_PRELOAD_CJS)).toMatch(/console:open-panel/);
  });
});
