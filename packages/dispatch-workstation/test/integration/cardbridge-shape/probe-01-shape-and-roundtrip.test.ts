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
// C1 RED: No auto-skip guard. Bundle is currently absent from this worktree
// (gitignored dist/), so require(BUNDLE_PATH) throws MODULE_NOT_FOUND and
// the test fails. The C1 GREEN commit wraps describe in describe.skip when
// the bundle is missing.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const BUNDLE_PATH = resolve(PACKAGE_ROOT, 'dist/main/card-bridge.cjs');

const requireCjs = createRequire(import.meta.url);

describe('cardbridge-shape Probe 1 — preload bundle exposes CardBridge with correct envelope round-trip', () => {
  it('preconditions: bundle exists and loads', () => {
    requireCjs(BUNDLE_PATH);
  });
});
