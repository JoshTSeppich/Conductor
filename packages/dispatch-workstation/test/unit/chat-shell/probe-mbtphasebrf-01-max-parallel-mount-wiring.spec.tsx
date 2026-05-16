// MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION WB1 (red) —
// probe-mbtphasebrf-01-max-parallel-mount-wiring: source-text sentinel
// that mount.ts has been extended with the `resolveRenderMaxParallelCounter`
// factory + the supporting `max-parallel-source.ts` module under the
// BR-IMPL-1=(b) DEFER scope (operator decision 2026-05-16):
//
//   - WORKSTATION_CONTRACT.md §6.6 remains frozen — no IPC channel
//     amendment under this ladder.
//   - Workstation-internal scope = pluggable-source seam in mount.ts +
//     max-parallel-source.ts module establishing the interface; no
//     renderer subscription to main-process state.
//   - Production wiring (raw-fs <userData>/max-parallel.json reader +
//     main-process singleton + renderer IPC subscription) becomes
//     Tier-1 followup `MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-
//     WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16` proposed at
//     WB-final (mirrors MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-
//     WIRING-DEFERRED at 7c8a957 precedent).
//
// Precedent: probe-mbtwft9-01-current-stub-state.spec.ts (T9 WB1 RED
// shape — source-text grep + existsSync, no behavioral assertion;
// behavior is exercised at integration time per probe-mbtwt4-02 slot
// supplier path).
//
// Encoded contract (3 conditions):
//   (1) `mount.ts` source-text contains the `resolveRenderMaxParallel
//       Counter` symbol (mirrors `resolveRenderPlanTimerText` at
//       mount.ts:459-470 sibling pattern).
//   (2) Module `src/chat-shell/max-parallel-source.ts` exists at
//       filesystem (NEW per ticket §1.1 item 1 + manifest write
//       territory).
//   (3) `mount.ts` source-text imports from `./max-parallel-source.js`
//       (binds module composition; mount.ts must depend on the new
//       source module to drive `resolveRenderMaxParallelCounter` via
//       the pluggable-source seam).
//
// RED state at HEAD `f61fab9` post-Sub-Q-auto-ack commit:
//   - Condition (1) FAILS: `mount.ts` has resolveRenderPlanTimerText
//     + resolveRenderCostMeter + resolveRenderPlanUsageRing +
//     resolveRenderModelMix + resolveRenderDispatchModeToggle but
//     NOT resolveRenderMaxParallelCounter.
//   - Condition (2) FAILS: `max-parallel-source.ts` module absent.
//   - Condition (3) FAILS: no `max-parallel-source.js` import line.
// All three flip GREEN at WB2 (mount.ts MOD + max-parallel-source.ts
// NEW).
//
// Sub-Q binding rows cited:
//   - BR-1=(b) DEFER (operator decision 2026-05-16) — pluggable-source
//     seam, no IPC; prod wiring → Tier-1 followup.
//   - BR-2=(a) renderer-internal sessions-stream filter (ratified at
//     decisions doc §4.1 line 122) — applies at WB4 once Tier-1
//     followup is plugged; under deferred scope the seam accepts a
//     pluggable session source.
//   - BR-3=(b) raw-fs <userData>/max-parallel.json (decisions doc
//     §4.1 line 124) — DEFERRED under BR-IMPL-1=(b); max-parallel-
//     source.ts ships the interface, prod raw-fs reader is followup.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const MOUNT_PATH = resolve(WORKSTATION_ROOT, 'src/chat-shell/mount.ts');
const MAX_PARALLEL_SOURCE_PATH = resolve(
  WORKSTATION_ROOT,
  'src/chat-shell/max-parallel-source.ts',
);

describe('MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION WB1 — max-parallel mount-wiring', () => {
  describe('Condition (1): mount.ts contains resolveRenderMaxParallelCounter symbol', () => {
    it('mount.ts must reference `resolveRenderMaxParallelCounter` (mirrors T9 resolveRenderPlanTimerText at mount.ts:459-470)', () => {
      expect(
        existsSync(MOUNT_PATH),
        `mount.ts must exist at ${MOUNT_PATH}`,
      ).toBe(true);
      const source = readFileSync(MOUNT_PATH, 'utf8');
      expect(
        source,
        'mount.ts at HEAD has resolveRenderPlanTimerText / resolveRenderCostMeter / resolveRenderPlanUsageRing precedents but NOT resolveRenderMaxParallelCounter; WB2 GREEN adds the factory under BR-1=(b) DEFER scope (pluggable-source seam, no IPC)',
      ).toMatch(/resolveRenderMaxParallelCounter/);
    });
  });

  describe('Condition (2): max-parallel-source.ts module exists', () => {
    it('module `src/chat-shell/max-parallel-source.ts` must exist (NEW per ticket §1.1 item 1 + manifest write territory; WB2 GREEN authors)', () => {
      expect(
        existsSync(MAX_PARALLEL_SOURCE_PATH),
        `max-parallel-source.ts must exist at ${MAX_PARALLEL_SOURCE_PATH} — WB2 GREEN authors the module as the pluggable-source interface under BR-IMPL-1=(b) DEFER scope; raw-fs prod reader is deferred to Tier-1 followup`,
      ).toBe(true);
    });
  });

  describe('Condition (3): mount.ts imports from ./max-parallel-source.js', () => {
    it('mount.ts must import from `./max-parallel-source.js` (binds module composition; pluggable-source seam wired to resolveRenderMaxParallelCounter)', () => {
      expect(
        existsSync(MOUNT_PATH),
        `mount.ts must exist at ${MOUNT_PATH}`,
      ).toBe(true);
      const source = readFileSync(MOUNT_PATH, 'utf8');
      expect(
        source,
        'mount.ts must compose max-parallel-source.ts via ESM import; WB2 GREEN adds the import line and wires resolveRenderMaxParallelCounter through the new interface',
      ).toMatch(/from\s+['"]\.\/max-parallel-source\.js['"]/);
    });
  });
});
