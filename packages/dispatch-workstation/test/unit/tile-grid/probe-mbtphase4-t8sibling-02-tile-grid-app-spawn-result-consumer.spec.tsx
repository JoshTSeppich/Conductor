// @vitest-environment happy-dom
//
// MB-T-PHASE-4-T8-SIBLING-EXEC WB3 RED — tile-grid-app spawn-result
// extension-field consumer.
//
// Build-doc §4 WB3 (414ed80): tile-grid-app extracts `model` +
// `spawnedAtMs` from the spawn-result reply, populates
// `TileGridSessionEntry.model` (existing field per MB-T15), and captures
// `spawnedAtMs` into a renderer-local Map<sessionName, number> via
// useState (anchor-only per c5-trinity pattern at tile-grid-app.tsx
// :170-196). A new optional `onSpawnedAtMsCapture` callback prop fires
// on capture as a test-observable seam (forward-position hook for
// future persistence wiring).
//
// Conditions (per build-doc §4):
//   02a: model from spawn-result propagates to TileGridSessionEntry.model
//        end-to-end (observed via DOM chip data-chip attribute after
//        spawn-result with model='claude-opus-4-7' → chip 'O4.7·1M' per
//        color-helpers.ts:62-69 mapping).
//   02b: spawnedAtMs from spawn-result invokes onSpawnedAtMsCapture
//        callback prop with (sessionName, FIXED_MS).
//
// RED state at HEAD `ab35a5a`:
//   - tile-grid-app.tsx `SpawnSuccessReply` extracts only `sessionName`
//     + `cwd?` (verified line 132-142). `model` is dropped on the floor;
//     `TileGridSessionEntry.model` stays undefined → TileHeader renders
//     the default `'claude-sonnet-4-6'` shortcode 'S4.6'. 02a fails on
//     `data-chip` not matching 'O4.7·1M'.
//   - TileGridAppProps does NOT declare `onSpawnedAtMsCapture`; even if
//     passed at runtime (via cast), the spawn-result handler never
//     invokes it. captured.length === 0 → 02b fails.
//
// WB4 GREEN: extend `SpawnSuccessReply` type guard with model? +
// spawnedAtMs?; populate `TileGridSessionEntry.model`; add
// onSpawnedAtMsCapture prop + invoke it from the spawn-result handler.

import { describe, it, expect, vi } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

// ─── Fake bridge ─────────────────────────────────────────────────────

interface FakeBridge extends WorkstationBridgeShape {
  emitSpawnResult: (reply: unknown) => void;
}

function makeFakeBridge(): FakeBridge {
  const spawnHandlers = new Set<(reply: unknown) => void>();
  return {
    onSpawnResult: (cb) => {
      spawnHandlers.add(cb);
      return () => {
        spawnHandlers.delete(cb);
      };
    },
    emitSpawnResult: (reply) => {
      spawnHandlers.forEach((h) => h(reply));
    },
  };
}

function makeFixtures() {
  return {
    workstation: makeFakeBridge(),
    consoleBridge: makeFakeConsoleBridge().bridge,
    createTerminal: () => makeFakeTerminalAdapter(),
  };
}

// Probe-extension prop shape — cast at the test site so the probe is
// TS-clean at both RED (prop absent on TileGridAppProps) and GREEN
// (prop declared). Mirrors the WB1 probe's ExtensionFieldsShape pattern.
type ExtraProps = {
  onSpawnedAtMsCapture?: (sessionName: string, spawnedAtMs: number) => void;
};

describe('MB-T-PHASE-4-T8-SIBLING-EXEC WB3 — tile-grid-app spawn-result extension consumer', () => {
  it('02a: model from spawn-result propagates to TileGridSessionEntry.model → TileHeader chip', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.consoleBridge}
        createTerminal={f.createTerminal}
      />,
    );
    act(() => {
      f.workstation.emitSpawnResult({
        type: 'success',
        result: {
          sessionName: 'session-opus',
          model: 'claude-opus-4-7',
          spawnedAtMs: 1_700_000_000_000,
        },
      });
    });
    const chip = screen.getByTestId('tile-header-model-chip');
    // Opus 4.7 → 'O4.7·1M' per color-helpers.ts modelChipShortcode.
    // At RED: TileHeader receives undefined model, defaults to
    // 'claude-sonnet-4-6' → chip data-chip = 'S4.6'.
    expect(chip.getAttribute('data-chip')).toMatch(/^O4\.7/);
  });

  it('02b: spawnedAtMs from spawn-result invokes onSpawnedAtMsCapture callback', () => {
    const captured: Array<[string, number]> = [];
    const onSpawnedAtMsCapture = vi.fn(
      (sessionName: string, spawnedAtMs: number) => {
        captured.push([sessionName, spawnedAtMs]);
      },
    );
    const f = makeFixtures();
    const extraProps: ExtraProps = { onSpawnedAtMsCapture };
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.consoleBridge}
        createTerminal={f.createTerminal}
        {...(extraProps as Record<string, unknown>)}
      />,
    );
    const FIXED = 1_700_000_000_000;
    act(() => {
      f.workstation.emitSpawnResult({
        type: 'success',
        result: {
          sessionName: 'session-foo',
          model: 'claude-opus-4-7',
          spawnedAtMs: FIXED,
        },
      });
    });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual(['session-foo', FIXED]);
  });
});
