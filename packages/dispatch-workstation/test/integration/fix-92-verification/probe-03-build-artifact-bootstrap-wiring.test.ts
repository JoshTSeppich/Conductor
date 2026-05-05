// Probe-92 / Probe 3 — build artifact contains bootstrap wiring.
//
// Asserts that the BUILT artifacts (not source) contain the wiring
// strings Fix-92 ships:
//   (a) dist/main/card-bridge.cjs (built from card-bridge-preload.mts)
//       contains both 'workstation:get-daemon-token' (the IPC channel)
//       AND 'x-conductor-token' (the localStorage key).
//   (b) dist/main/main.js (built from main.ts) contains the
//       'workstation:get-daemon-token' handler registration string.
//
// Why built artifacts and not source? Electron loads the compiled JS
// from dist/. If the build pipeline ever regresses (wrong esbuild flag,
// stripped string, dead-code elimination, sentinel-region accidentally
// excluded from the bundler entry-point), the source could look fine
// while the runtime is broken. This probe catches build-pipeline
// regressions specifically.
//
// Cairn label: KNOWN — direct fs read of the built artifacts. The
// existing 90abbb5 commit body explicitly cited this as a verification
// step that passed at fix time; this probe encodes it as a permanent
// regression test.
//
// Build-before-test requirement: this test runs `pnpm build` on demand
// if the artifacts are missing, mirroring the smoke harness's build
// gate. Mirrors the existsSync-precondition pattern in
// app-launches-clean.test.ts:81-85 and webview-loader-callable.test.ts:94-99.
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const CARD_BRIDGE_CJS = resolve(PACKAGE_ROOT, 'dist/main/card-bridge.cjs');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');

const IPC_CHANNEL = 'workstation:get-daemon-token';
const LOCALSTORAGE_KEY = 'x-conductor-token';

beforeAll(() => {
  // KNOWN: build is required for the probe to have artifacts to grep.
  // If artifacts are missing (e.g. CI without a prior build step), run
  // the build now. Skip if both already exist — keeps the probe fast
  // when used as a regression net during dev iteration.
  if (existsSync(CARD_BRIDGE_CJS) && existsSync(MAIN_JS)) return;
  execFileSync('pnpm', ['--filter', 'dispatch-workstation', 'build'], {
    stdio: 'inherit',
    cwd: resolve(PACKAGE_ROOT, '../..'),
  });
}, 120_000);

describe('Probe-92 / Probe 3 — build artifact contains bootstrap wiring', () => {
  it('dist/main/card-bridge.cjs contains the IPC channel literal', () => {
    expect(
      existsSync(CARD_BRIDGE_CJS),
      `expected built ${CARD_BRIDGE_CJS}; build pipeline regression`,
    ).toBe(true);

    const contents = readFileSync(CARD_BRIDGE_CJS, 'utf8');

    // KNOWN: the preload's ipcRenderer.invoke argument must survive the
    // bundler. esbuild's default treatment preserves string literals
    // inside function calls, but a future bundler-flag change (e.g.
    // mangling, dead-code-elim across export boundaries) could strip it.
    expect(
      contents.includes(IPC_CHANNEL),
      `expected '${IPC_CHANNEL}' literal in ${CARD_BRIDGE_CJS}; ` +
        `Fix-92 IPC roundtrip will silently no-op without it`,
    ).toBe(true);
  });

  it('dist/main/card-bridge.cjs contains the localStorage key literal', () => {
    const contents = readFileSync(CARD_BRIDGE_CJS, 'utf8');

    // KNOWN: localStorage.setItem('x-conductor-token', ...) must survive
    // the bundler. dispatch-web's useAuthBootstrap reads this exact key
    // (auth/useAuthBootstrap.ts:26 readToken via token-storage.ts).
    expect(
      contents.includes(LOCALSTORAGE_KEY),
      `expected '${LOCALSTORAGE_KEY}' literal in ${CARD_BRIDGE_CJS}; ` +
        `dispatch-web's readToken would not find any value the preload ` +
        `wrote under a different key`,
    ).toBe(true);
  });

  it('dist/main/main.js contains the IPC handler registration string', () => {
    expect(
      existsSync(MAIN_JS),
      `expected built ${MAIN_JS}; build pipeline regression`,
    ).toBe(true);

    const contents = readFileSync(MAIN_JS, 'utf8');

    // KNOWN: ipcMain.handle('workstation:get-daemon-token', ...) — the
    // string must survive the tsc compile from main.ts:216. Without
    // this, ipcRenderer.invoke from the preload would reject ("no
    // handler for channel"), Fix-92's catch block would swallow the
    // error, and TokenPrompt would mount (the exact pre-fix bug).
    expect(
      contents.includes(IPC_CHANNEL),
      `expected '${IPC_CHANNEL}' literal in ${MAIN_JS}; ` +
        `IPC handler registration would be missing`,
    ).toBe(true);
  });
});
