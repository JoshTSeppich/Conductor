// MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION WB5 (red) —
// probe-mbtphasebrf-03-main-aggregator-instantiation: source-text
// sentinel that main.ts has been extended with the MB-T-PHASE-4-BOTTOM-
// RAIL sentinel zone under the BR-IMPL-1=(b) DEFER scope (operator
// decision 2026-05-16).
//
// IMPORTANT — this probe shape DIVERGES from the original ticket §4
// WB5 spec, which expected behavioral assertion that main.ts
// instantiates the bypass-perms-source singleton + populates
// defaultSpawnHandlerDeps.bypassPermsSource. Under BR-IMPL-1=(b)
// DEFER:
//
//   - main.ts singleton instantiation is DEFERRED to Tier-1 followup.
//   - spawn-ipc.ts dep-tree population is DEFERRED to Tier-1 followup.
//   - coarchitect-ipc.ts + preload.mts IPC fan-out are DEFERRED.
//
// What main.ts SHOULD ship at WB6 is the sentinel-zone documentation
// anchor per CLAUDE.md §3.3 — a `=== BEGIN: MB-T-PHASE-4-BOTTOM-RAIL
// ===` comment block placed outside existing sentinel zones (post
// MB-T-HSO-WIRE block ending at line 921, or near the rate-limit-
// aggregator instantiation at line 877 area). The zone body
// documents what's deferred + references the Tier-1 followup
// row that will close the deferral.
//
// This anchor serves three purposes:
//   1. Future readers can grep for `MB-T-PHASE-4-BOTTOM-RAIL` and
//      find the deferred-wiring site immediately.
//   2. The Tier-1 followup implementation lands its code INSIDE this
//      zone, preserving CLAUDE.md §3.3 sentinel discipline.
//   3. WB6 GREEN flips this probe with a minimal mechanical change
//      (no runtime behavior modified — just a comment block added).
//
// Encoded contract (2 conditions):
//   (1) main.ts source-text contains the `=== BEGIN: MB-T-PHASE-4-
//       BOTTOM-RAIL` sentinel marker.
//   (2) main.ts sentinel zone body references the Tier-1 followup
//       slug `MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-
//       WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16` (binds the
//       deferral anchor to the followup for traceability per memory
//       feedback_followup_row_as_forward_propagation_memory).
//
// RED state at HEAD `8c905b9` post-WB4 GREEN:
//   - Condition (1) FAILS: main.ts has no MB-T-PHASE-4-BOTTOM-RAIL
//     sentinel zone yet (grep -n on packages/dispatch-workstation/src/
//     main/main.ts returns 0 hits).
//   - Condition (2) FAILS: Tier-1 followup slug not referenced in
//     main.ts.
// Both flip GREEN at WB6 (main.ts MOD — add sentinel zone comment
// block).
//
// Sub-Q binding rows cited:
//   - BR-1=(b) DEFER — operator decision 2026-05-16.
//   - BR-5=(a) main.ts singleton instantiation DEFERRED — under (b)
//     scope, the ticket §1.4 binding row's prod wiring becomes the
//     Tier-1 followup body; this WB ships only the anchor zone.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const MAIN_PATH = resolve(WORKSTATION_ROOT, 'src/main/main.ts');

const SENTINEL_BEGIN_PATTERN = /===\s*BEGIN:\s*MB-T-PHASE-4-BOTTOM-RAIL/;
const FOLLOWUP_SLUG_PATTERN =
  /MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16/;

describe('MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION WB5 — main.ts deferred-wiring sentinel anchor', () => {
  describe('Condition (1): main.ts contains MB-T-PHASE-4-BOTTOM-RAIL sentinel zone marker', () => {
    it('main.ts must contain `=== BEGIN: MB-T-PHASE-4-BOTTOM-RAIL` sentinel comment per CLAUDE.md §3.3', () => {
      expect(
        existsSync(MAIN_PATH),
        `main.ts must exist at ${MAIN_PATH}`,
      ).toBe(true);
      const source = readFileSync(MAIN_PATH, 'utf8');
      expect(
        source,
        'main.ts at HEAD has many sentinel zones (Fix-A through MB-T-WIREFRAME-T5) but NO MB-T-PHASE-4-BOTTOM-RAIL zone; WB6 GREEN adds the deferred-wiring anchor under BR-IMPL-1=(b) DEFER scope',
      ).toMatch(SENTINEL_BEGIN_PATTERN);
    });
  });

  describe('Condition (2): main.ts sentinel zone references Tier-1 followup slug', () => {
    it('main.ts must reference `MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16` (binds deferral anchor to followup for traceability)', () => {
      expect(
        existsSync(MAIN_PATH),
        `main.ts must exist at ${MAIN_PATH}`,
      ).toBe(true);
      const source = readFileSync(MAIN_PATH, 'utf8');
      expect(
        source,
        'main.ts sentinel zone body must cite the Tier-1 followup slug so future readers grep-discoverable from main.ts → FOLLOWUPS.md row; WB6 GREEN authors the comment block',
      ).toMatch(FOLLOWUP_SLUG_PATTERN);
    });
  });
});
