// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB7 (red) —
// BottomRailCostMeter: wireframe-formatted cost meter consuming the
// existing MB-T26 coarchitectBridge.onCostUpdate aggregation channel.
//
// Per ticket body f8fc24d §4 WB7 + Sub-Q-T4-C=(i) operator-acked
// default 2026-05-12 ("accept all defaults"):
//   - Sub-Q-T4-C=(i) reuses existing onCostUpdate channel (data
//     source unchanged); WB7 RED authoring investigates aggregation
//     semantics + WB8 GREEN ships wireframe-formatted display.
//
// Investigation finding [KNOWN, surfaced in commit body]:
//   `coarchitect-ipc.ts:89` shows `ipcMain.handle('coarchitect:
//   getDailyCost', () => 0)` — STUB returning 0. No actual
//   `captureUsageToLedger` implementation in this file. Sub-Q-T4-C=
//   (i) default still ships the cost-meter slot; aggregation backend
//   gap filed as Tier 3 followup `MB-F-COST-METER-AGGREGATION-
//   BACKEND-STUBBED` at WB14 docs.
//
// Wireframe-format choice: existing `cost-meter.tsx` renders
// `$X.XXXX` (4 decimal places); wireframe target 2026-05-11 shows
// "conductor api · $0.42 today" (2 decimal places + prefix + suffix).
// WB8 ships NEW `bottom-rail-cost-meter.tsx` wrapper that consumes
// the SAME `coarchitectBridge.onCostUpdate` data source as
// `cost-meter.tsx` but renders the wireframe text format. Original
// MB-T26 cost-meter component remains intact for other slot uses.
//
// Encoded contract (4 conditions):
//   (1) BottomRailCostMeter component is exported from
//       `src/chat-shell/bottom-rail-cost-meter.tsx` (dynamic-import
//       @vite-ignore RED-robust).
//   (2) Without bridge (null/undefined): renders
//       `<span data-testid="bottom-rail-cost-meter">conductor api · — today</span>`
//       (em-dash placeholder for no-data state per cost-meter.tsx
//       convention line 13-14).
//   (3) With bridge supplying total=0.42: renders text matching
//       /conductor api · \$0\.42 today/ — wireframe-exact format.
//   (4) With bridge supplying total=1.2345: renders text matching
//       /conductor api · \$1\.23 today/ — 2 decimal places fixed
//       (truncates 4th decimal per wireframe display semantics).
//
// RED state at HEAD `8113c0b` (post-WB6 GREEN):
//   - `src/chat-shell/bottom-rail-cost-meter.tsx` does NOT exist;
//     4/4 conditions fail at the dynamic-import + component-absent
//     guard cascade.

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BottomRailCostMeterCmp = (props: any) => JSX.Element;

let BottomRailCostMeter: BottomRailCostMeterCmp | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/chat-shell/bottom-rail-cost-meter.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    BottomRailCostMeter = (
      mod as { BottomRailCostMeter?: BottomRailCostMeterCmp }
    ).BottomRailCostMeter;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

interface BridgeStub {
  readonly onCostUpdate: (cb: (totalUsd: number) => void) => () => void;
}

function makeBridge(initialCallback?: (cb: (n: number) => void) => void): {
  bridge: BridgeStub;
  emit: (n: number) => void;
} {
  let captured: ((n: number) => void) | null = null;
  const bridge: BridgeStub = {
    onCostUpdate: (cb) => {
      captured = cb;
      if (initialCallback) initialCallback(cb);
      return () => {
        captured = null;
      };
    },
  };
  return {
    bridge,
    emit: (n) => {
      if (captured) captured(n);
    },
  };
}

describe('MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB7 — BottomRailCostMeter wireframe-formatted cost meter (Sub-Q-T4-C=i reuse existing bridge)', () => {
  describe('Condition (1): BottomRailCostMeter component is exported', () => {
    it('module `src/chat-shell/bottom-rail-cost-meter.tsx` exports BottomRailCostMeter', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(
        BottomRailCostMeter,
        'BottomRailCostMeter export must exist (WB8 GREEN authors the module)',
      ).toBeDefined();
    });
  });

  describe('Condition (2): no-bridge → em-dash placeholder', () => {
    it('without bridge: renders "conductor api · — today" placeholder', () => {
      expect(BottomRailCostMeter).toBeDefined();
      render(<BottomRailCostMeter />);
      const slot = screen.queryByTestId('bottom-rail-cost-meter');
      expect(slot, 'bottom-rail-cost-meter slot must render').not.toBeNull();
      expect(
        slot!.textContent,
        'no-bridge: text must include em-dash placeholder per cost-meter.tsx convention',
      ).toMatch(/conductor api · — today/);
    });
  });

  describe('Condition (3): bridge total=0.42 → wireframe exact format', () => {
    it('after bridge emits totalUsd=0.42: text matches /conductor api · \\$0\\.42 today/', async () => {
      expect(BottomRailCostMeter).toBeDefined();
      const { bridge, emit } = makeBridge();
      render(<BottomRailCostMeter bridge={bridge} />);
      await act(async () => {
        emit(0.42);
      });
      const slot = screen.getByTestId('bottom-rail-cost-meter');
      expect(slot.textContent).toMatch(/conductor api · \$0\.42 today/);
    });
  });

  describe('Condition (4): 2-decimal truncation', () => {
    it('after bridge emits totalUsd=1.2345: text matches /conductor api · \\$1\\.23 today/ (2 decimal places)', async () => {
      expect(BottomRailCostMeter).toBeDefined();
      const { bridge, emit } = makeBridge();
      render(<BottomRailCostMeter bridge={bridge} />);
      await act(async () => {
        emit(1.2345);
      });
      const slot = screen.getByTestId('bottom-rail-cost-meter');
      expect(
        slot.textContent,
        'wireframe format truncates to 2 decimal places',
      ).toMatch(/conductor api · \$1\.23 today/);
    });
  });
});
