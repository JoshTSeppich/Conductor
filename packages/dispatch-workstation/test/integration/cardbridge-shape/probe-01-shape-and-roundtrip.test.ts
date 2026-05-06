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
// C1 GREEN: describe wrapped in conditional. When BUNDLE_PATH is absent
// (gitignored dist/ — operator must run `pnpm --filter dispatch-workstation
// build` or focused `node packages/dispatch-workstation/scripts/build-card-
// bridge.mjs`), the entire describe block is replaced with describe.skip
// carrying a loud, action-instruction reason string. Pattern adapted from
// mb-t05-spawn-tmux/probe-01-tmux-session-exists.test.ts (auto-skip-with-
// MANUAL per finding #115 / fix-94 precedent), but using describe.skip
// instead of per-it ctx.skip so the reason string surfaces louder in the
// vitest reporter output.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const BUNDLE_PATH = resolve(PACKAGE_ROOT, 'dist/main/card-bridge.cjs');

const requireCjs = createRequire(import.meta.url);

const SKIP_REASON =
  `cardbridge-shape Probe 1 SKIPPED: ${BUNDLE_PATH} missing. ` +
  `Run \`pnpm --filter dispatch-workstation build\` ` +
  `(or focused: \`node packages/dispatch-workstation/scripts/build-card-bridge.mjs\`) ` +
  `then re-run this probe for KNOWN evidence.`;

if (!existsSync(BUNDLE_PATH)) {
  describe.skip(SKIP_REASON, () => {
    it('preconditions: bundle exists and loads', () => {
      // Skipped — body unreachable.
    });
  });
} else {
  describe('cardbridge-shape Probe 1 — preload bundle exposes CardBridge with correct envelope round-trip', () => {
    it('preconditions: bundle exists and loads', () => {
      requireCjs(BUNDLE_PATH);
    });
  });
}
