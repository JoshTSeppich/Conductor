// MB-F-CARDBRIDGE-SMOKE / Probe 1 — preload bundle exposes window.cardBridge
// matching the web-side CardBridge interface, with envelope round-trip.
//
// Closes finding #111's followup recommendation (cairn-findings.md:2281):
// "add an integration smoke test that boots the preload bundle
// (`dist/main/card-bridge.cjs`) and asserts the exposed `cardBridge` shape
// matches the web-side `CardBridge` interface structurally. This would
// catch future drift even without per-side test coverage."
//
// Drift this would catch (per finding #111 root-cause cluster):
//   1. Method rename (e.g., shell-side back to `emitCardApproved` while
//      web-side stays `approve`). Shape assertion in C2 fires.
//   2. Channel-name shift (e.g., `card:approved` → `card:approve`). Emit-side
//      assertions in C3 fire on `toHaveBeenCalledWith` channel mismatch.
//   3. Subscribe-side listener-unwrap regression (returning the (event,
//      payload) tuple to the handler instead of just payload). C4 fires.
//   4. Cleanup-listener-reference drift (constructing a NEW listener arrow
//      in the cleanup closure, breaking ipcRenderer.removeListener). C4 §8.
//
// C2 GREEN: bundle-loading machinery wired. createRequire constructs a
// CommonJS require() bound to this test file's location; we pre-populate
// requireCjs.cache[electronPath] with a stub electron module BEFORE
// requireCjs(BUNDLE_PATH). When the bundle's `require("electron")` runs
// (esbuild emitted that as a bare external at line 4 of card-bridge.cjs),
// Node returns our stub instead of the real electron launcher binary.
//
// The stub's contextBridge.exposeInMainWorld is a vi.fn() spy that
// captures the bridge object on its second argument; the bundle calls
// it at line 43 with name='cardBridge'. The stub's ipcRenderer also
// has spies for send/on/removeListener (used in C3/C4) and an invoke
// that returns Promise.resolve(null) so the Fix-92 IIFE (lines 44-56
// of the bundle) settles cleanly without firing localStorage.setItem
// (per Phase 1 §G3).
//
// Type-only structural reference (per Q5 operator authorization): the
// CardBridge interface declared on the WEB side is the canonical shape
// finding #111 commits to. Importing the type does not modify dispatch-
// web (Session 1 territory) — it's a compile-time structural assertion
// only.

import { describe, it, expect, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CardBridge } from 'dispatch-web/src/orchestrator-cards/card-ipc-bridge.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const BUNDLE_PATH = resolve(PACKAGE_ROOT, 'dist/main/card-bridge.cjs');

const requireCjs = createRequire(import.meta.url);

const SKIP_REASON =
  `cardbridge-shape Probe 1 SKIPPED: ${BUNDLE_PATH} missing. ` +
  `Run \`pnpm --filter dispatch-workstation build\` ` +
  `(or focused: \`node packages/dispatch-workstation/scripts/build-card-bridge.mjs\`) ` +
  `then re-run this probe for KNOWN evidence.`;

// Six methods declared on the canonical CardBridge interface (web-side
// card-ipc-bridge.ts:63-70, structurally identical to shell-side card-
// bridge.ts:97-104 per finding #111 resolution). This list is the wire
// contract; any drift fails the C2 shape assertion.
const CANONICAL_METHODS: ReadonlyArray<keyof CardBridge> = [
  'approve',
  'decline',
  'multiChoiceSelect',
  'onCardRendered',
  'onCardSuperseded',
  'onCardUpdate',
];

if (!existsSync(BUNDLE_PATH)) {
  describe.skip(SKIP_REASON, () => {
    it('preconditions: bundle exists and loads', () => {
      // Skipped — body unreachable.
    });
  });
} else {
  // === Bundle loader (C2 GREEN) ===========================================
  // Step 1: build electron stub. contextBridge.exposeInMainWorld captures
  // the bridge into a closure variable; ipcRenderer surface stubs the four
  // methods the bundle uses (send/on/removeListener via the ipcAdapter at
  // bundle lines 35-41, plus invoke for the Fix-92 IIFE at line 46).
  let capturedBridge: CardBridge | null = null;

  const ipcSpies = {
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    invoke: vi.fn(() => Promise.resolve(null)),
  };

  const electronStub = {
    contextBridge: {
      exposeInMainWorld: vi.fn((name: string, obj: unknown) => {
        if (name === 'cardBridge') {
          capturedBridge = obj as CardBridge;
        }
      }),
    },
    ipcRenderer: ipcSpies,
  };

  // Step 2: pre-populate require.cache so the bundle's `require("electron")`
  // resolves to our stub. Resolving electron from this test's createRequire
  // anchor returns the path Node would otherwise load — same key the bundle
  // would resolve to via its own require() because both share Node's
  // module-resolution algorithm.
  const electronPath = requireCjs.resolve('electron');
  requireCjs.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: electronStub,
  } as unknown as NodeModule;

  // Step 3: require the bundle. contextBridge.exposeInMainWorld fires
  // synchronously at bundle line 43; capturedBridge is set before this
  // call returns. The Fix-92 IIFE (lines 44-56) is async — it awaits
  // ipcRenderer.invoke (returns Promise.resolve(null)) → typeof token
  // !== 'string' → no localStorage call → settles benignly. We do NOT
  // need to await it before reading capturedBridge (the bridge is
  // captured synchronously above the IIFE).
  requireCjs(BUNDLE_PATH);

  describe('cardbridge-shape Probe 1 — preload bundle exposes CardBridge with correct envelope round-trip', () => {
    it('exposes window.cardBridge with all 6 canonical methods', () => {
      expect(
        capturedBridge,
        'contextBridge.exposeInMainWorld("cardBridge", ...) was not invoked — preload bundle did not call the spy',
      ).not.toBeNull();
      const b = capturedBridge as CardBridge;
      for (const method of CANONICAL_METHODS) {
        expect(
          typeof b[method],
          `cardBridge.${method} must be a function — drift would mean shell-side rename or missing method`,
        ).toBe('function');
      }
    });
  });
}
