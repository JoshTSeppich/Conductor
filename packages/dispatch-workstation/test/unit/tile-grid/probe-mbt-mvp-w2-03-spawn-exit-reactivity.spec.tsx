// @vitest-environment happy-dom
//
// MB-T-MVP-W2-AGENT-GRID WB-final probe-03 — spawn/exit reactivity.
//
// Operator-vision Component 2 (docs/coordination/operator-vision-three-
// pane-conductor-2026-05-17.md:84):
//   "Tiles appear on session spawn, disappear on exit"
//
// Q-W2-4 disposition (a) per CLAUDE.md §3.4 mechanical-translation under
// scope-gate "Layout restyle ONLY":
//   - "Appear on spawn" is wired via tile-grid-app.tsx workstationBridge.
//     onSpawnResult subscription (pre-existing, MB-T12 WB9; verified at
//     Phase-1 diagnose).
//   - "Disappear on exit" wires to the existing kill-button → handleKill
//     → setSessions filter chain (tile-grid-app.tsx:379-381). Auto-exit
//     reactivity on daemon-side process-exit is DEFERRED to followup
//     MB-F-AGENT-GRID-AUTO-EXIT-REACTIVITY (Tier 1) per boot-prompt §B
//     "VERIFIES + harnesses, does NOT rebuild" scope-gate.
//
// This probe verifies the present-day spawn-appear / kill-disappear
// behavior. Auto-exit follow-up tracked separately.

import { describe, it, expect } from 'vitest';
import { render, act, screen, fireEvent } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

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

describe('MB-T-MVP-W2 WB-final — spawn-appear / kill-disappear reactivity', () => {
  it('initial render with no sessions returns null grid (no tile-grid-root)', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.consoleBridge}
        createTerminal={f.createTerminal}
      />,
    );
    expect(screen.queryByTestId('tile-grid-root')).toBeNull();
  });

  it('tile appears when spawn-result success envelope fires', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.consoleBridge}
        createTerminal={f.createTerminal}
      />,
    );
    expect(screen.queryByTestId('tile-grid-root')).toBeNull();
    act(() => {
      f.workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'spawn-target' },
      });
    });
    expect(screen.getByTestId('tile-grid-root')).not.toBeNull();
    expect(screen.getByTestId('tile-spawn-target')).not.toBeNull();
  });

  it('multiple spawn-results grow the grid (1 → 2 → 4 tiles, agent-grid layout flips shape)', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.consoleBridge}
        createTerminal={f.createTerminal}
      />,
    );

    // Spawn 1 → 1x1
    act(() => {
      f.workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'a' },
      });
    });
    let root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-tile-count')).toBe('1');
    expect(root.style.gridTemplateRows).toBe('repeat(1, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(1, 1fr)');

    // Spawn 2nd → 1x2
    act(() => {
      f.workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'b' },
      });
    });
    root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-tile-count')).toBe('2');
    expect(root.style.gridTemplateColumns).toBe('repeat(2, 1fr)');

    // Spawn 3rd + 4th → 2x2 (agent-grid "2x2" anchor)
    act(() => {
      f.workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'c' },
      });
      f.workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'd' },
      });
    });
    root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-tile-count')).toBe('4');
    expect(root.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
  });

  it('idempotent: duplicate spawn-result for same sessionName does NOT duplicate tile', () => {
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
        result: { sessionName: 'recovery-target' },
      });
      f.workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'recovery-target' },
      });
    });
    expect(screen.getByTestId('tile-grid-root').getAttribute('data-tile-count')).toBe('1');
  });

  it('tile disappears when kill-button is clicked (kill-button-driven exit)', () => {
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
        result: { sessionName: 'kill-target' },
      });
      f.workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'keep' },
      });
    });
    expect(screen.getByTestId('tile-kill-target')).not.toBeNull();
    expect(screen.getByTestId('tile-keep')).not.toBeNull();

    // Click the kill button on kill-target.
    const killBtn = screen.getAllByTestId('tile-kill-btn')[0];
    act(() => {
      fireEvent.click(killBtn);
    });
    // kill-target's tile is gone; keep remains.
    expect(screen.queryByTestId('tile-kill-target')).toBeNull();
    expect(screen.getByTestId('tile-keep')).not.toBeNull();
  });
});
