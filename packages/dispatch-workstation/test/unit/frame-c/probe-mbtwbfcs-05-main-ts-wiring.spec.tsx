// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB9 (red) — main.ts wiring
// sentinel-zone contract probe.
//
// Per ticket body a1f7a03 §4 WB9:
//   Source-text inspection of main.ts: asserts a NEW sentinel zone
//   `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE wiring ===`
//   exists; contains the mount-time wiring for the new frame-c/
//   surface (`tryAutoMountFrameC()` or equivalent factory call);
//   placed inside the `app.whenReady()` callback after Frame Router
//   header mount (specifically: after the §C.1′ frame-mode IPC
//   zone end at line ~468 per existing main.ts structure).
//
// Encoded contract (4 conditions per ticket body acceptance):
//   (1) main.ts contains `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-
//       SURFACE wiring ===` sentinel zone opening marker.
//   (2) main.ts contains the corresponding `=== END: MB-T-WIREFRAME-
//       C1P2-FRAME-C-SURFACE wiring ===` closing marker.
//   (3) Between the BEGIN and END markers, the literal string
//       `tryAutoMountFrameC` appears (function name reference, either
//       as a call site OR as a documentation reference per CLAUDE.md
//       §3.3 sentinel-zone discipline — the renderer-side factory in
//       tile-grid/mount.ts is the actual mount; main.ts's zone
//       documents the cross-process wiring boundary).
//   (4) BEGIN marker position is AFTER `// === END: §C.1′ frame-mode
//       IPC ===` line position — the "wiring" zone lands after the
//       Frame Router IPC zone per ticket body §4 WB10 placement.
//       Also implicitly inside app.whenReady() callback (line 409
//       opens; closing `});` is far later — any position between
//       §C.1′ end (line ~468) and that closing is inside the
//       callback).
//
// RED state at HEAD `525c502` (post-WB8 GREEN):
//   - Conditions (1)(2)(3)(4) ALL FAIL — the "wiring" sentinel
//     zone does not yet exist; only `swarm-state-read imports` and
//     `swarm-state-read IPC` zones from WB8 GREEN are present for
//     this ticket. WB10 GREEN authors the "wiring" zone.
//   - Condition (4)'s early guard (BEGIN must be >= 0) fails when
//     marker absent — stricter than a vacuous-pass design; ensures
//     WB10 GREEN must flip all 4 conditions cleanly to GREEN.
//
// WB10 GREEN target:
//   - Add NEW sentinel zone `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-
//     C-SURFACE wiring === ... === END: ===` to main.ts inside
//     app.whenReady() callback, after §C.1′ frame-mode IPC zone
//     end (and after my WB8 swarm-state-read IPC zone OR before
//     it — placement TBD at WB10).
//   - Zone contains `tryAutoMountFrameC` reference (either an
//     actual call OR a documentation comment referencing the
//     renderer-side `tile-grid/mount.ts` factory per ticket body
//     §4 WB10 territory — "Renderer mount happens via tile-grid/
//     mount.ts-style auto-mount").
//   - tile-grid/mount.ts extension at WB10 adds the actual
//     `tryAutoMountFrameC()` function mirroring `tryAutoMountFrame
//     ShellHeader` at tile-grid/mount.ts:131-148.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAIN_TS_PATH = resolve(
  __dirname,
  '../../../src/main/main.ts',
);

const WIRING_BEGIN_MARKER =
  '=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE wiring ===';
const WIRING_END_MARKER =
  '=== END: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE wiring ===';
const FRAME_MODE_IPC_END_MARKER = '=== END: §C.1′ frame-mode IPC ===';
const TRY_AUTO_MOUNT_REFERENCE = 'tryAutoMountFrameC';

let mainTsSource: string | undefined;
let readError: Error | undefined;

beforeAll(() => {
  try {
    mainTsSource = readFileSync(MAIN_TS_PATH, 'utf8');
  } catch (e) {
    readError = e instanceof Error ? e : new Error(String(e));
  }
});

describe('MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB9 — main.ts wiring sentinel-zone contract', () => {
  describe('Condition (1): wiring sentinel BEGIN marker present', () => {
    it(`main.ts contains "${WIRING_BEGIN_MARKER}"`, () => {
      if (readError) throw new Error(`read failed: ${readError.message}`);
      expect(mainTsSource).toBeDefined();
      expect(
        mainTsSource!.includes(WIRING_BEGIN_MARKER),
        `main.ts must contain BEGIN marker "${WIRING_BEGIN_MARKER}" (WB10 GREEN authors this zone)`,
      ).toBe(true);
    });
  });

  describe('Condition (2): wiring sentinel END marker present', () => {
    it(`main.ts contains "${WIRING_END_MARKER}"`, () => {
      expect(mainTsSource).toBeDefined();
      expect(
        mainTsSource!.includes(WIRING_END_MARKER),
        `main.ts must contain END marker "${WIRING_END_MARKER}"`,
      ).toBe(true);
    });
  });

  describe('Condition (3): tryAutoMountFrameC reference between BEGIN and END', () => {
    it(`text between BEGIN and END markers contains "${TRY_AUTO_MOUNT_REFERENCE}"`, () => {
      expect(mainTsSource).toBeDefined();
      const beginIdx = mainTsSource!.indexOf(WIRING_BEGIN_MARKER);
      const endIdx = mainTsSource!.indexOf(WIRING_END_MARKER);
      // If either marker absent, this condition fails — surface a
      // distinct error so the failure-cause is clear.
      expect(
        beginIdx,
        'BEGIN marker must be present for this condition to evaluate (Condition 1 must pass first)',
      ).toBeGreaterThanOrEqual(0);
      expect(
        endIdx,
        'END marker must be present for this condition to evaluate (Condition 2 must pass first)',
      ).toBeGreaterThanOrEqual(0);
      expect(
        endIdx,
        'END marker must appear AFTER BEGIN marker',
      ).toBeGreaterThan(beginIdx);
      const zoneText = mainTsSource!.slice(beginIdx, endIdx);
      expect(
        zoneText.includes(TRY_AUTO_MOUNT_REFERENCE),
        `Between BEGIN and END markers, "${TRY_AUTO_MOUNT_REFERENCE}" must appear (as call OR doc-reference per ticket body §4 WB10)`,
      ).toBe(true);
    });
  });

  describe('Condition (4): wiring zone positioned AFTER §C.1′ frame-mode IPC zone end', () => {
    it('BEGIN marker line position > §C.1′ frame-mode IPC END marker line position', () => {
      expect(mainTsSource).toBeDefined();
      const frameModeEndIdx = mainTsSource!.indexOf(
        FRAME_MODE_IPC_END_MARKER,
      );
      const wiringBeginIdx = mainTsSource!.indexOf(WIRING_BEGIN_MARKER);
      // §C.1′ frame-mode IPC end must always be present (shipped at
      // 44764fd). Anchor the positional comparison.
      expect(
        frameModeEndIdx,
        '§C.1′ frame-mode IPC END marker must be present in main.ts (precondition: frame-router shipped at 44764fd)',
      ).toBeGreaterThanOrEqual(0);
      // If wiring BEGIN absent, this condition fails — surface a
      // distinct error.
      expect(
        wiringBeginIdx,
        'wiring BEGIN marker must be present for positional assertion (Condition 1 must pass first)',
      ).toBeGreaterThanOrEqual(0);
      expect(
        wiringBeginIdx,
        'wiring BEGIN must be positioned AFTER §C.1′ frame-mode IPC END (ticket body §4 WB10 placement)',
      ).toBeGreaterThan(frameModeEndIdx);
    });
  });
});
