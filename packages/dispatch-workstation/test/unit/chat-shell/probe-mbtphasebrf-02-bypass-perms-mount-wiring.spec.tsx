// MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION WB3 (red) —
// probe-mbtphasebrf-02-bypass-perms-mount-wiring: source-text sentinel
// that mount.ts has been extended with the `resolveRenderBypassPerms`
// factory under the BR-IMPL-1=(b) DEFER scope (operator decision
// 2026-05-16):
//
//   - WORKSTATION_CONTRACT.md §6.6 frozen — no IPC channel for
//     `coarchitect:bypass-perms-update` under this ladder.
//   - Workstation-internal scope = pluggable bypass-perms-count seam
//     in mount.ts (analogous to max-parallel-source.ts seam shipped
//     at WB2 b3e8daf).
//   - Production wiring (bypass-perms-source main-process aggregator
//     subscription + IPC fan-out) becomes part of Tier-1 followup
//     MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-
//     66-AMENDMENT-2026-05-16 at WB-final.
//
// Unlike max-parallel-source.ts (WB2), bypass-perms does NOT need a
// new source module — the seam is a single optional number+dispatchMode
// pair in MountChatShellOptions. T11 already shipped BypassPerms
// IndicatorProps.bypassActiveCount? (bypass-perms-indicator.tsx:40) +
// the dispatchMode override is sourced from existing dispatchModeBridge
// (preload.mts MB-T24 zone). The seam under DEFER simply accepts a
// pluggable `bypassPermsActiveCount?` number that callers (Tier-1
// followup) will populate from a renderer-side subscription.
//
// Precedent: probe-mbtphasebrf-01-max-parallel-mount-wiring (sibling
// WB1 RED shape) + probe-mbtwft9-01-current-stub-state (T9 precedent).
//
// Encoded contract (2 conditions):
//   (1) `mount.ts` source-text contains the `resolveRenderBypassPerms`
//       symbol (mirrors `resolveRenderMaxParallelCounter` at the
//       MB-T-PHASE-4-BOTTOM-RAIL sentinel zone shipped at b3e8daf).
//   (2) `mount.ts` source-text references `BypassPermsIndicator` (the
//       T4 WB12 component at bypass-perms-indicator.tsx:59 — the
//       factory must import it to construct the slot supplier).
//
// RED state at HEAD `b3e8daf` post-WB2 GREEN:
//   - Condition (1) FAILS: mount.ts has resolveRenderMaxParallelCounter
//     (WB2 ship) + resolveRenderPlanTimerText (T9 ship) + sibling
//     factories but NOT resolveRenderBypassPerms.
//   - Condition (2) FAILS: mount.ts does not import BypassPermsIndicator
//     today (renderBypassPerms slot is destructured at chat-shell.tsx:157
//     but no mount.ts factory produces it — chat-shell.tsx:248
//     renders empty slot in production).
// Both flip GREEN at WB4 (mount.ts MOD — add resolveRenderBypassPerms +
// BypassPermsIndicator import).
//
// Sub-Q binding rows cited:
//   - BR-1=(b) DEFER — pluggable seam only; production IPC subscription
//     deferred to Tier-1 followup.
//   - BR-4=(b) Out-of-scope (anti-absorption per CLAUDE.md §2.12) —
//     bottom-rail-cost-meter consumer-wiring NOT in this WB.
//   - BR-6=(c) Skip — derivative of BR-1=(a); under (b) DEFER the
//     skip absorbs into the Tier-1 followup.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const MOUNT_PATH = resolve(WORKSTATION_ROOT, 'src/chat-shell/mount.ts');

describe('MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION WB3 — bypass-perms mount-wiring', () => {
  describe('Condition (1): mount.ts contains resolveRenderBypassPerms symbol', () => {
    it('mount.ts must reference `resolveRenderBypassPerms` (mirrors WB2 resolveRenderMaxParallelCounter at b3e8daf)', () => {
      expect(
        existsSync(MOUNT_PATH),
        `mount.ts must exist at ${MOUNT_PATH}`,
      ).toBe(true);
      const source = readFileSync(MOUNT_PATH, 'utf8');
      expect(
        source,
        'mount.ts at HEAD has resolveRenderMaxParallelCounter (WB2 ship) + sibling factories but NOT resolveRenderBypassPerms; WB4 GREEN adds the factory under BR-1=(b) DEFER scope (pluggable bypassPermsActiveCount seam, no IPC subscription)',
      ).toMatch(/resolveRenderBypassPerms/);
    });
  });

  describe('Condition (2): mount.ts imports BypassPermsIndicator component', () => {
    it('mount.ts must import `BypassPermsIndicator` from ./bypass-perms-indicator.js (factory closure constructs the slot supplier)', () => {
      expect(
        existsSync(MOUNT_PATH),
        `mount.ts must exist at ${MOUNT_PATH}`,
      ).toBe(true);
      const source = readFileSync(MOUNT_PATH, 'utf8');
      expect(
        source,
        'mount.ts must import BypassPermsIndicator to build the resolveRenderBypassPerms factory closure; WB4 GREEN adds the import line',
      ).toMatch(
        /import\s+\{[^}]*BypassPermsIndicator[^}]*\}\s+from\s+['"]\.\/bypass-perms-indicator\.js['"]/,
      );
    });
  });
});
