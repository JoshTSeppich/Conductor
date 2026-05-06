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
// C2 RED: shape assertion added (window.cardBridge exposes all 6 methods
// per finding #111-canonical CardBridge interface at card-bridge.ts:97-104
// and card-ipc-bridge.ts:63-70). Uses a placeholder `bridge: any = null`
// — no bundle-loading machinery yet. Assertions fail because bridge is
// null. C2 GREEN adds createRequire + require.cache stub for electron,
// requires the bundle, captures the bridge from the contextBridge.
// exposeInMainWorld spy.
//
// Type-only structural reference (per Q5 operator authorization): the
// CardBridge interface declared on the WEB side is the canonical shape
// finding #111 commits to. Importing the type does not modify dispatch-
// web (Session 1 territory) — it's a compile-time structural assertion
// only.

import { describe, it, expect } from 'vitest';
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
  // C2 RED PLACEHOLDER: bundle-loading machinery deferred to C2 GREEN.
  // bridge is null; shape assertions fail. This is the expected RED state.
  const bridge: CardBridge | null = null;

  describe('cardbridge-shape Probe 1 — preload bundle exposes CardBridge with correct envelope round-trip', () => {
    it('exposes window.cardBridge with all 6 canonical methods', () => {
      expect(bridge).not.toBeNull();
      const b = bridge as CardBridge;
      for (const method of CANONICAL_METHODS) {
        expect(
          typeof b[method],
          `cardBridge.${method} must be a function — drift would mean shell-side rename or missing method`,
        ).toBe('function');
      }
    });
  });
}
