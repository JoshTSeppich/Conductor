// MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB1 (red) —
// probe-mbtwft9-01-current-stub-state: source-text sentinel that the
// `coarchitect:getRateLimitState` STUB has been replaced AND the
// PlanTimerText mount auto-wire has been added.
//
// Per ticket body §4 WB1 + P5 dispatch /tmp/dispatch-p5.txt P5b:
//   - Asserts `coarchitect-ipc.ts:94` no longer contains the literal
//     `ipcMain.handle('coarchitect:getRateLimitState', () => null)` STUB.
//   - Asserts the rate-limit aggregator module exists at
//     `src/main/rate-limit-aggregator.ts` (Sub-Q-T9-A default path =(c)
//     PTY-scrape SPIKE-FIRST; presence-check only, not behavior).
//   - Asserts `src/chat-shell/mount.ts` contains `resolveRenderPlanTimerText`
//     symbol (closes the PlanTimerText arm of MB-F-T4-BOTTOM-RAIL-MOUNT-
//     WIRING Tier 2 at WB7).
//
// Investigation finding [KNOWN, at HEAD a34f519]:
//   `coarchitect-ipc.ts:91-94` shows the STUB body:
//     ```
//     // PlanUsageRing renderer ring data source is currently UN-WIRED post-
//     // WB14 v3.0 removal. MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO (Tier 2)
//     // tracks the PTY-scrape-based replacement; until migrated, returns null.
//     ipcMain.handle('coarchitect:getRateLimitState', () => null);
//     ```
//   The 3-line comment block + 1-line handler must be replaced at WB6
//   GREEN with an aggregator-driven response.
//
//   `mount.ts` (per direct-read at HEAD a34f519) has `resolveRenderCost-
//   Meter` precedent but NO `resolveRenderPlanTimerText` symbol; per
//   T4 WB14 findings §IX `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2 row,
//   PlanTimerText production wiring is the deferred arm closed at T9 WB7.
//
// Encoded contract (3 conditions):
//   (1) `coarchitect-ipc.ts` source-text does NOT match the STUB literal
//       `ipcMain.handle('coarchitect:getRateLimitState', () => null)`.
//   (2) Module `src/main/rate-limit-aggregator.ts` exists at filesystem.
//   (3) `src/chat-shell/mount.ts` source-text contains `resolveRenderPlanTimerText`
//       symbol (closes T4 WB14 Tier 2 PlanTimerText arm).
//
// RED state at HEAD `a34f519`:
//   - Condition (1) FAILS: STUB literal present at line 94.
//   - Condition (2) FAILS: aggregator module absent.
//   - Condition (3) FAILS: mount.ts contains `resolveRenderCostMeter` +
//     `resolveRenderDispatchModeToggle` but NOT `resolveRenderPlanTimerText`.
// All three flip GREEN at WB4 (module ship) + WB6 (handler rewrite) +
// WB7 (mount auto-wire).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const COARCHITECT_IPC_PATH = resolve(
  WORKSTATION_ROOT,
  'src/main/coarchitect-ipc.ts',
);
const RATE_LIMIT_AGGREGATOR_PATH = resolve(
  WORKSTATION_ROOT,
  'src/main/rate-limit-aggregator.ts',
);
const MOUNT_PATH = resolve(WORKSTATION_ROOT, 'src/chat-shell/mount.ts');

// Literal pattern from coarchitect-ipc.ts:94 at HEAD a34f519.
const STUB_PATTERN =
  /ipcMain\.handle\(\s*['"]coarchitect:getRateLimitState['"]\s*,\s*\(\s*\)\s*=>\s*null\s*\)/;

describe('MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB1 — plan-timer data-flow STUB state', () => {
  describe('Condition (1): coarchitect-ipc.ts getRateLimitState STUB removed', () => {
    it('coarchitect-ipc.ts must NOT contain the `() => null` STUB literal for `coarchitect:getRateLimitState` handler', () => {
      expect(
        existsSync(COARCHITECT_IPC_PATH),
        `coarchitect-ipc.ts must exist at ${COARCHITECT_IPC_PATH}`,
      ).toBe(true);
      const source = readFileSync(COARCHITECT_IPC_PATH, 'utf8');
      expect(
        source,
        'coarchitect-ipc.ts:94 currently registers `coarchitect:getRateLimitState` as `() => null` STUB; WB6 GREEN must replace with aggregator-driven handler',
      ).not.toMatch(STUB_PATTERN);
    });
  });

  describe('Condition (2): rate-limit-aggregator module exists', () => {
    it('module `src/main/rate-limit-aggregator.ts` must exist (Sub-Q-T9-A default path; WB4 GREEN authors)', () => {
      expect(
        existsSync(RATE_LIMIT_AGGREGATOR_PATH),
        `rate-limit-aggregator.ts must exist at ${RATE_LIMIT_AGGREGATOR_PATH} — WB4 GREEN authors the module`,
      ).toBe(true);
    });
  });

  describe('Condition (3): mount.ts contains resolveRenderPlanTimerText auto-wire', () => {
    it('mount.ts must reference `resolveRenderPlanTimerText` (closes MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING PlanTimerText arm at WB7)', () => {
      expect(
        existsSync(MOUNT_PATH),
        `mount.ts must exist at ${MOUNT_PATH}`,
      ).toBe(true);
      const source = readFileSync(MOUNT_PATH, 'utf8');
      expect(
        source,
        'mount.ts at HEAD has resolveRenderCostMeter precedent but no resolveRenderPlanTimerText; WB7 GREEN adds the closure to auto-wire PlanTimerText',
      ).toMatch(/resolveRenderPlanTimerText/);
    });
  });
});
