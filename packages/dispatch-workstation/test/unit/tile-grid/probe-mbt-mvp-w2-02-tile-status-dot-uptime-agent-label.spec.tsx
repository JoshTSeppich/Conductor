// @vitest-environment happy-dom
//
// MB-T-MVP-W2-AGENT-GRID WB3 — per-tile chrome verification probe.
//
// Operator-vision Component 2 spec (docs/coordination/operator-vision-
// three-pane-conductor-2026-05-17.md:83):
//   "Per-tile: status dot (green=running), agent label, uptime, live
//    tmux output stream"
//
// This probe asserts each tile in the agent-grid renders all THREE
// chrome elements end-to-end:
//   - tile-status-indicator    (status dot — data-status="running" → green)
//   - tile-session-name        (agent label per Q-W2-3 = session.name verbatim)
//   - tile-header-uptime       (uptime label rendered when spawnedAtMs prop
//                               present + >60s old per formatUptimeLabel)
//
// The "live tmux output stream" element (ConsolePanel mount via tile.tsx:258)
// is verified in probe-04 (cross-tile isolation) since its assertion shape
// (xterm.js render via consoleBridge.onStdoutChunk) is independent of this
// probe's chrome-render assertions.
//
// RED → GREEN cycle:
// - RED: the `spawnedAtMs` field on the spawn-result envelope is captured
//   into a renderer-local side-Map (tile-grid-app.tsx:218-226) BUT is not
//   prop-drilled into <Tile> → <TileHeader>. End-to-end the uptime label
//   never renders in production. Tile-grid-app's t8-sibling commit
//   explicitly deferred the prop-drill (build-doc §1.5: "tile-grid.tsx +
//   tile.tsx out of t8-sibling-exec territory"). Wave-2 closes that gap.
// - GREEN: add `spawnedAtMs?: number` to TileGridSessionEntry; populate
//   from spawn-result handler; thread through TileGrid + Tile to TileHeader.

import { describe, it, expect } from 'vitest';
import { render, act, screen, within } from '@testing-library/react';
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

// Spawn the agent at a fixed point >60s before "now" so the uptime
// label renders (formatUptimeLabel returns null for sub-minute uptimes).
const NOW_MS = 1_700_000_000_000;
const SPAWN_MS = NOW_MS - 5 * 60_000; // 5 minutes ago

describe('MB-T-MVP-W2 WB3 — per-tile chrome (status dot + agent label + uptime)', () => {
  it('after spawn-result, the tile renders status dot + agent label + uptime', () => {
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
          sessionName: 'agent-alpha',
          model: 'claude-opus-4-7',
          spawnedAtMs: SPAWN_MS,
        },
      });
    });

    const tile = screen.getByTestId('tile-agent-alpha');

    // (a) Status dot — operator-vision: "status dot (green=running)"
    const statusDot = within(tile).getByTestId('tile-status-indicator');
    expect(statusDot).toBeInTheDocument();
    // Default seeded status when no statusListClient is provided is the
    // TileGridApp-merged 'idle' fallback. The presence of the dot
    // affordance (regardless of color) verifies the render contract.
    // Production color flips to green via statusListClient snapshot
    // (MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION).
    expect(statusDot.getAttribute('data-status')).toBeTruthy();

    // (b) Agent label — per Q-W2-3 disposition (a): session.name verbatim
    const agentLabel = within(tile).getByTestId('tile-session-name');
    expect(agentLabel.textContent).toBe('agent-alpha');

    // (c) Uptime — RED-then-GREEN: the testid is conditional on
    // spawnedAtMs being threaded end-to-end to <TileHeader>. After GREEN
    // wiring, this renders the "5m" label (formatUptimeLabel of 5 minutes).
    const uptime = within(tile).getByTestId('tile-header-uptime');
    expect(uptime).toBeInTheDocument();
    expect(uptime.textContent).toBeTruthy();
  });

  it('multiple concurrent tiles each render their own chrome (cross-tile isolation)', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.consoleBridge}
        createTerminal={f.createTerminal}
      />,
    );
    act(() => {
      for (const name of ['alpha', 'bravo', 'charlie', 'delta']) {
        f.workstation.emitSpawnResult({
          type: 'success',
          result: {
            sessionName: name,
            spawnedAtMs: SPAWN_MS,
          },
        });
      }
    });

    // Grid is in agent-grid mode (TileGridApp default true) → N=4 → 2x2
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-agent-grid-mode')).toBe('true');
    expect(root.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(2, 1fr)');

    // Each tile has its own chrome triad.
    for (const name of ['alpha', 'bravo', 'charlie', 'delta']) {
      const tile = screen.getByTestId(`tile-${name}`);
      expect(within(tile).getByTestId('tile-status-indicator')).toBeInTheDocument();
      expect(within(tile).getByTestId('tile-session-name').textContent).toBe(name);
      expect(within(tile).getByTestId('tile-header-uptime')).toBeInTheDocument();
    }
  });

  it('tile without spawnedAtMs renders status + agent label, omits uptime (graceful absent-data)', () => {
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
          sessionName: 'agent-no-uptime',
          // No spawnedAtMs — simulates daemon-recovery rehydrate or
          // pre-WB4-of-MB-T-PHASE-4 spawn envelopes.
        },
      });
    });
    const tile = screen.getByTestId('tile-agent-no-uptime');
    expect(within(tile).getByTestId('tile-status-indicator')).toBeInTheDocument();
    expect(within(tile).getByTestId('tile-session-name').textContent).toBe(
      'agent-no-uptime',
    );
    // Uptime conditional on spawnedAtMs presence; absent → testid not rendered.
    expect(within(tile).queryByTestId('tile-header-uptime')).toBeNull();
  });
});
