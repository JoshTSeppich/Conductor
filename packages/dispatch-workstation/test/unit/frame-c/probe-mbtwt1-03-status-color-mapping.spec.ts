// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB5 (red) — status-color mapping
// module contract probe.
//
// Per ticket body `ec60622` §4 WB5 + Sub-Q-T1-C=(i) operator-acked
// "extend TileStatus enum + renderer-derived" (2026-05-12):
//
//   NEW module `packages/dispatch-workstation/src/frame-c/status-color.ts`
//   exports `statusToColor(status: TileStatus): string` returning the
//   four wireframe colors (green/amber/red/grey) per ticket body §3.3:
//     - open    → '#5b9d6e' (green)
//     - idle    → '#888888' (grey)
//     - detached → '#c97a3a' (amber)
//     - error   → '#c54a4a' (red)     [NEW enum value at WB6]
//     - warning → '#c97a3a' (amber)   [NEW enum value at WB6]
//     - killed  → hidden / sentinel (SessionList filters out before
//                  reaching this function; module may return any value
//                  for 'killed' — probe does not constrain this case
//                  beyond non-crash).
//
// Encoded contract (6 conditions per ticket body acceptance):
//   (1) Module imports without error — `frame-c/status-color.ts` exists
//       and exports `statusToColor` function.
//   (2) statusToColor('open') returns a green-family hex (subset of
//       wireframe green palette; permissive on exact value to allow
//       T7 visual-polish refinement). Contract: starts with '#' +
//       returns the documented '#5b9d6e' for v3.0 ship.
//   (3) statusToColor('idle') returns the documented '#888888' grey.
//   (4) statusToColor('detached') returns the documented '#c97a3a' amber.
//   (5) statusToColor('error') returns the documented '#c54a4a' red
//       — REQUIRES TileStatus enum extension at WB6 GREEN per Sub-Q-C=(i)
//       'idle' | 'open' | 'killed' | 'detached' | 'error' | 'warning'.
//   (6) statusToColor('warning') returns amber (documented '#c97a3a' alias).
//
// RED state at HEAD `a8cd71d` (post-WB4 GREEN):
//   - Module `frame-c/status-color.ts` does NOT exist (verified by
//     dynamic import rejection).
//   - All 6 conditions FAIL on the import-resolve guard.
//
// WB6 GREEN target:
//   - NEW `packages/dispatch-workstation/src/frame-c/status-color.ts`
//     exports `statusToColor(status: TileStatus): string` per the
//     mapping above.
//   - MOD `packages/dispatch-workstation/src/tile-grid/types.ts:22`
//     to extend TileStatus union with `'error'` and `'warning'`
//     (additive — existing consumers tolerate via fallback at
//     session-list.tsx:124 STATUS_DOT_HEX[x] ?? STATUS_DOT_HEX['open']
//     and similar in tile-header.tsx).
//   - MOD `packages/dispatch-workstation/src/frame-c/session-list.tsx`
//     to replace inline STATUS_DOT_HEX literal (lines 64-70) with
//     `statusToColor()` import; preserves data-testid + data-status
//     attributes for existing probes.
//   - Verify Wave B + Wave C #5 probes remain GREEN (consumer non-
//     regression per CLAUDE.md memory feedback_consumer_non_regression_
//     per_wb).

import { describe, it, expect, beforeAll } from 'vitest';

// Loose-typed import — status-color.ts may not yet exist at probe time.
// Dynamic import + beforeAll catch ensures we see import failures as a
// dispatchable RED guard rather than spec-load-time hard crash.
type StatusToColorFn = (status: string) => string | null | undefined;

let statusToColor: StatusToColorFn | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/frame-c/status-color.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    statusToColor = (mod as { statusToColor?: StatusToColorFn })
      .statusToColor;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

describe('MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB5 — status-color mapping module contract', () => {
  describe('Condition (1): module imports + statusToColor function exists', () => {
    it('frame-c/status-color.ts exports statusToColor function', () => {
      if (importError) {
        throw new Error(
          `module import failed (RED state at WB5 — WB6 GREEN authors NEW frame-c/status-color.ts): ${importError.message}`,
        );
      }
      expect(
        statusToColor,
        'statusToColor must be exported from frame-c/status-color.ts',
      ).toBeDefined();
      expect(typeof statusToColor).toBe('function');
    });
  });

  describe('Condition (2): statusToColor("open") returns green hex', () => {
    it('open → "#5b9d6e" (wireframe green)', () => {
      expect(statusToColor).toBeDefined();
      const color = statusToColor!('open');
      expect(
        color,
        'open status must map to wireframe green per ticket body §3.3 Sub-Q-T1-C=(i) mapping',
      ).toBe('#5b9d6e');
    });
  });

  describe('Condition (3): statusToColor("idle") returns grey hex', () => {
    it('idle → "#888888" (wireframe grey)', () => {
      expect(statusToColor).toBeDefined();
      const color = statusToColor!('idle');
      expect(
        color,
        'idle status must map to wireframe grey per ticket body §3.3',
      ).toBe('#888888');
    });
  });

  describe('Condition (4): statusToColor("detached") returns amber hex', () => {
    it('detached → "#c97a3a" (wireframe amber)', () => {
      expect(statusToColor).toBeDefined();
      const color = statusToColor!('detached');
      expect(
        color,
        'detached status must map to wireframe amber per ticket body §3.3',
      ).toBe('#c97a3a');
    });
  });

  describe('Condition (5): statusToColor("error") returns red hex (NEW enum value)', () => {
    it('error → "#c54a4a" (wireframe red)', () => {
      expect(statusToColor).toBeDefined();
      const color = statusToColor!('error');
      expect(
        color,
        'error status (NEW TileStatus enum value at WB6) must map to wireframe red per ticket body §3.3 Sub-Q-T1-C=(i)',
      ).toBe('#c54a4a');
    });
  });

  describe('Condition (6): statusToColor("warning") returns amber hex (NEW enum value)', () => {
    it('warning → "#c97a3a" (wireframe amber alias)', () => {
      expect(statusToColor).toBeDefined();
      const color = statusToColor!('warning');
      expect(
        color,
        'warning status (NEW TileStatus enum value at WB6) must map to wireframe amber (alias of detached per ticket body §3.3 Sub-Q-T1-C=(i))',
      ).toBe('#c97a3a');
    });
  });
});
