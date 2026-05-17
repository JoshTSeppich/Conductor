// MB-T-MVP-W2-AGENT-GRID WB1 probe-01 — computeAgentGridLayout spec-table.
//
// Per operator-vision Component 2 (docs/coordination/operator-vision-
// three-pane-conductor-2026-05-17.md:80-85):
//   - "2x2 or 2x3 grid of live tmux mirror tiles for active sub-sessions"
//   - "Should handle 1-12 concurrent tiles gracefully"
//
// Spec table (mechanical-translation per CLAUDE.md §3.4; Q-W2-5 disposition):
//   N=1     → 1×1
//   N=2     → 1×2
//   N=3-4   → 2×2   (operator vision "2x2" anchor; 4 tiles fits)
//   N=5-6   → 2×3   (operator vision "2x3" anchor; 6 tiles fits)
//   N=7-9   → 3×3
//   N=10-12 → 3×4
//   N≥13    → 3×4 explicit grid + overflow=true (gracefully degrade)
//
// Last-tile spans leftover cells in its row (mirrors tile-layout.ts
// convention) for operator-friendly visual balance.
//
// Pattern mirrors test/unit/tile-hero-squad-layout/probe-01-spec-table.spec.ts
// (MB-T19 WB2) and test/unit/tile-layout-grid-fit/probe-01-spec-table.spec.ts
// (MB-T12 WB2): pure-fn assertions, no React, no mocks.

// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  computeAgentGridLayout,
  type AgentGridLayout,
} from '../../../src/tile-grid/agent-grid-layout.js';
import {
  TileGrid,
  type TileGridSessionEntry,
} from '../../../src/tile-grid/tile-grid.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

// ─────────────────────────────────────────────────────────────────────
// N=1..12 — operator-vision "1-12 concurrent" range
// ─────────────────────────────────────────────────────────────────────

describe('MB-T-MVP-W2 WB1 — computeAgentGridLayout spec table N=1..12', () => {
  const cases: Array<{
    n: number;
    rows: number;
    cols: number;
    overflow: boolean;
  }> = [
    { n: 1, rows: 1, cols: 1, overflow: false },
    { n: 2, rows: 1, cols: 2, overflow: false },
    { n: 3, rows: 2, cols: 2, overflow: false },
    { n: 4, rows: 2, cols: 2, overflow: false },
    { n: 5, rows: 2, cols: 3, overflow: false },
    { n: 6, rows: 2, cols: 3, overflow: false },
    { n: 7, rows: 3, cols: 3, overflow: false },
    { n: 8, rows: 3, cols: 3, overflow: false },
    { n: 9, rows: 3, cols: 3, overflow: false },
    { n: 10, rows: 3, cols: 4, overflow: false },
    { n: 11, rows: 3, cols: 4, overflow: false },
    { n: 12, rows: 3, cols: 4, overflow: false },
  ];

  for (const c of cases) {
    it(`N=${c.n} → ${c.rows}×${c.cols}, overflow=${c.overflow}`, () => {
      const layout: AgentGridLayout = computeAgentGridLayout(c.n);
      expect(layout.rows).toBe(c.rows);
      expect(layout.cols).toBe(c.cols);
      expect(layout.overflow).toBe(c.overflow);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// gridTemplateAreas span semantics
// ─────────────────────────────────────────────────────────────────────

describe('MB-T-MVP-W2 WB1 — computeAgentGridLayout gridTemplateAreas', () => {
  it('N=1 → single cell ["t0"]', () => {
    expect(computeAgentGridLayout(1).gridTemplateAreas).toEqual(['t0']);
  });

  it('N=2 → ["t0 t1"]', () => {
    expect(computeAgentGridLayout(2).gridTemplateAreas).toEqual(['t0 t1']);
  });

  it('N=3 → 2×2 with last tile spanning leftover cell ["t0 t1", "t2 t2"]', () => {
    expect(computeAgentGridLayout(3).gridTemplateAreas).toEqual([
      't0 t1',
      't2 t2',
    ]);
  });

  it('N=4 → 2×2 even fit ["t0 t1", "t2 t3"]', () => {
    expect(computeAgentGridLayout(4).gridTemplateAreas).toEqual([
      't0 t1',
      't2 t3',
    ]);
  });

  it('N=5 → 2×3 with last tile spanning leftover cell ["t0 t1 t2", "t3 t4 t4"]', () => {
    expect(computeAgentGridLayout(5).gridTemplateAreas).toEqual([
      't0 t1 t2',
      't3 t4 t4',
    ]);
  });

  it('N=6 → 2×3 even fit ["t0 t1 t2", "t3 t4 t5"]', () => {
    expect(computeAgentGridLayout(6).gridTemplateAreas).toEqual([
      't0 t1 t2',
      't3 t4 t5',
    ]);
  });

  it('N=7 → 3×3 with last tile spanning leftover cells ["t0 t1 t2", "t3 t4 t5", "t6 t6 t6"]', () => {
    expect(computeAgentGridLayout(7).gridTemplateAreas).toEqual([
      't0 t1 t2',
      't3 t4 t5',
      't6 t6 t6',
    ]);
  });

  it('N=8 → 3×3 with last tile spanning leftover cell ["t0 t1 t2", "t3 t4 t5", "t6 t7 t7"]', () => {
    expect(computeAgentGridLayout(8).gridTemplateAreas).toEqual([
      't0 t1 t2',
      't3 t4 t5',
      't6 t7 t7',
    ]);
  });

  it('N=9 → 3×3 even fit', () => {
    expect(computeAgentGridLayout(9).gridTemplateAreas).toEqual([
      't0 t1 t2',
      't3 t4 t5',
      't6 t7 t8',
    ]);
  });

  it('N=10 → 3×4 with last tile spanning leftover cells', () => {
    expect(computeAgentGridLayout(10).gridTemplateAreas).toEqual([
      't0 t1 t2 t3',
      't4 t5 t6 t7',
      't8 t9 t9 t9',
    ]);
  });

  it('N=11 → 3×4 with last tile spanning leftover cell', () => {
    expect(computeAgentGridLayout(11).gridTemplateAreas).toEqual([
      't0 t1 t2 t3',
      't4 t5 t6 t7',
      't8 t9 t10 t10',
    ]);
  });

  it('N=12 → 3×4 even fit', () => {
    expect(computeAgentGridLayout(12).gridTemplateAreas).toEqual([
      't0 t1 t2 t3',
      't4 t5 t6 t7',
      't8 t9 t10 t11',
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Overflow at N>12 (graceful degradation beyond "1-12" vision range)
// ─────────────────────────────────────────────────────────────────────

describe('MB-T-MVP-W2 WB1 — computeAgentGridLayout overflow (N>12)', () => {
  it('N=13 → explicit grid still 3×4; overflow=true; areas match N=12', () => {
    const layout = computeAgentGridLayout(13);
    expect(layout.rows).toBe(3);
    expect(layout.cols).toBe(4);
    expect(layout.overflow).toBe(true);
    expect(layout.gridTemplateAreas).toEqual([
      't0 t1 t2 t3',
      't4 t5 t6 t7',
      't8 t9 t10 t11',
    ]);
  });

  it('N=20 → no further area-name growth; overflow handles extras', () => {
    const layout = computeAgentGridLayout(20);
    expect(layout.rows).toBe(3);
    expect(layout.cols).toBe(4);
    expect(layout.overflow).toBe(true);
    expect(layout.gridTemplateAreas).toEqual([
      't0 t1 t2 t3',
      't4 t5 t6 t7',
      't8 t9 t10 t11',
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Invalid-n guard (matches tile-layout.ts convention)
// ─────────────────────────────────────────────────────────────────────

describe('MB-T-MVP-W2 WB1 — computeAgentGridLayout invalid-n guard', () => {
  it('throws on n=0', () => {
    expect(() => computeAgentGridLayout(0)).toThrow(/positive integer/);
  });

  it('throws on n=-1', () => {
    expect(() => computeAgentGridLayout(-1)).toThrow(/positive integer/);
  });

  it('throws on non-integer n=2.5', () => {
    expect(() => computeAgentGridLayout(2.5)).toThrow(/positive integer/);
  });

  it('throws on NaN', () => {
    expect(() => computeAgentGridLayout(Number.NaN)).toThrow(/positive integer/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Return-shape immutability
// ─────────────────────────────────────────────────────────────────────

describe('MB-T-MVP-W2 WB1 — computeAgentGridLayout return shape', () => {
  it('gridTemplateAreas is an array (readonly TS contract)', () => {
    const layout = computeAgentGridLayout(4);
    expect(Array.isArray(layout.gridTemplateAreas)).toBe(true);
    expect(layout.gridTemplateAreas.length).toBe(2);
  });

  it('peer-module shape match: { rows, cols, overflow, gridTemplateAreas }', () => {
    const layout = computeAgentGridLayout(4);
    expect(Object.keys(layout).sort()).toEqual(
      ['cols', 'gridTemplateAreas', 'overflow', 'rows'].sort(),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────
// WB2 — TileGrid React-level: agentGridMode prop activates the new
// layout; default prop=undefined preserves legacy uniform geometry.
// ─────────────────────────────────────────────────────────────────────

function makeTileFixtures(sessionNames: string[]): {
  bridge: ReturnType<typeof makeFakeConsoleBridge>;
  sessions: TileGridSessionEntry[];
  createTerminal: () => ReturnType<typeof makeFakeTerminalAdapter>;
} {
  return {
    bridge: makeFakeConsoleBridge(),
    sessions: sessionNames.map((name) => ({ name })),
    createTerminal: () => makeFakeTerminalAdapter(),
  };
}

describe('MB-T-MVP-W2 WB2 — <TileGrid agentGridMode> activation', () => {
  it('agentGridMode={true} + N=4 renders 2×2 (operator-vision "2x2" anchor)', () => {
    const { bridge, sessions, createTerminal } = makeTileFixtures([
      'a',
      'b',
      'c',
      'd',
    ]);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        agentGridMode={true}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-tile-count')).toBe('4');
    expect(root.getAttribute('data-agent-grid-mode')).toBe('true');
    expect(root.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    for (const name of ['a', 'b', 'c', 'd']) {
      expect(within(root).getByTestId(`tile-cell-${name}`)).toBeInTheDocument();
    }
  });

  it('agentGridMode={true} + N=6 renders 2×3 (operator-vision "2x3" anchor)', () => {
    const { bridge, sessions, createTerminal } = makeTileFixtures([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
    ]);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        agentGridMode={true}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-agent-grid-mode')).toBe('true');
    expect(root.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
  });

  it('agentGridMode={true} + N=9 renders 3×3 (vs uniform 2×4)', () => {
    const names = Array.from({ length: 9 }, (_, i) => `s${i}`);
    const { bridge, sessions, createTerminal } = makeTileFixtures(names);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        agentGridMode={true}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-agent-grid-mode')).toBe('true');
    expect(root.style.gridTemplateRows).toBe('repeat(3, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
  });

  it('agentGridMode={true} + N=12 renders 3×4 (graceful 1-12 ceiling)', () => {
    const names = Array.from({ length: 12 }, (_, i) => `s${i}`);
    const { bridge, sessions, createTerminal } = makeTileFixtures(names);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        agentGridMode={true}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-agent-grid-mode')).toBe('true');
    expect(root.style.gridTemplateRows).toBe('repeat(3, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
  });

  it('agentGridMode default (omitted) preserves uniform geometry (no regression)', () => {
    // N=9 uniform layout is 2×4; agent-grid would be 3×3. This assertion
    // captures the non-regression contract: <TileGrid> without explicit
    // agentGridMode behaves bit-identical to pre-WB2 (MB-T12 default).
    const names = Array.from({ length: 9 }, (_, i) => `s${i}`);
    const { bridge, sessions, createTerminal } = makeTileFixtures(names);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-agent-grid-mode')).toBe('false');
    // Uniform layout at N=9 → 2×4 + overflow=true
    expect(root.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
  });

  it('hero-mode wins precedence over agentGridMode (Q-W2-2 FLAG-PRESERVE)', () => {
    const { bridge, sessions, createTerminal } = makeTileFixtures([
      'a',
      'b',
      'c',
    ]);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        agentGridMode={true}
        heroSessionName="a"
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('true');
    expect(root.getAttribute('data-agent-grid-mode')).toBe('false');
  });
});
