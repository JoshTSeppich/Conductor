// @vitest-environment happy-dom
//
// MB-T12 WB6 — TileGrid top-level component:
//   - N=0 → empty state (returns null; parent collapses)
//   - N=1/2/4/6 → renders correct grid shape via computeGridLayout
//   - N=9 → overflow style applied; 9 tiles render (tile-cell elements)
//   - Each tile keyed by sessionName; ConsolePanel filters bridge events
//     by targetSessionName per WB4 (cross-tile isolation)
//   - onKill/onCollapse/onDetach callback props fan out to each tile

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import {
  TileGrid,
  type TileGridSessionEntry,
} from '../../../src/tile-grid/tile-grid.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function makeFixtures(sessionNames: string[]): {
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

describe('MB-T12 WB6 TileGrid — empty state', () => {
  it('N=0 renders nothing (returns null)', () => {
    const { bridge, createTerminal } = makeFixtures([]);
    const { container } = render(
      <TileGrid
        sessions={[]}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    expect(screen.queryByTestId('tile-grid-root')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid^="tile-cell-"]').length).toBe(0);
  });
});

describe('MB-T12 WB6 TileGrid — N tiles render', () => {
  it('N=1 renders 1 tile in a 1×1 grid', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['sess-a']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-tile-count')).toBe('1');
    expect(within(root).getByTestId('tile-cell-sess-a')).toBeInTheDocument();
    expect(within(root).getByTestId('tile-sess-a')).toBeInTheDocument();
    expect(root.style.gridTemplateRows).toBe('repeat(1, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(1, 1fr)');
  });

  it('N=2 renders 2 tiles in a 1×2 grid', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-tile-count')).toBe('2');
    expect(root.style.gridTemplateRows).toBe('repeat(1, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    expect(within(root).getByTestId('tile-cell-a')).toBeInTheDocument();
    expect(within(root).getByTestId('tile-cell-b')).toBeInTheDocument();
  });

  it('N=4 renders 4 tiles in a 2×2 grid', () => {
    const { bridge, sessions, createTerminal } = makeFixtures([
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
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-tile-count')).toBe('4');
    expect(root.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    for (const name of ['a', 'b', 'c', 'd']) {
      expect(within(root).getByTestId(`tile-cell-${name}`)).toBeInTheDocument();
    }
  });

  it('N=6 renders 6 tiles in a 2×3 grid', () => {
    const { bridge, sessions, createTerminal } = makeFixtures([
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
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-tile-count')).toBe('6');
    expect(root.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    for (const name of ['a', 'b', 'c', 'd', 'e', 'f']) {
      expect(within(root).getByTestId(`tile-cell-${name}`)).toBeInTheDocument();
    }
  });
});

describe('MB-T12 WB6 TileGrid — overflow case (N=9)', () => {
  it('N=9 renders 9 tile cells; explicit grid stays 2×4; overflow style applied', () => {
    const { bridge, sessions, createTerminal } = makeFixtures([
      's0',
      's1',
      's2',
      's3',
      's4',
      's5',
      's6',
      's7',
      's8',
    ]);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-tile-count')).toBe('9');
    expect(root.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
    expect(root.style.gridAutoRows).toBe('1fr');
    expect(root.style.overflowY).toBe('auto');
    // All 9 tile cells render.
    for (let i = 0; i < 9; i++) {
      expect(within(root).getByTestId(`tile-cell-s${i}`)).toBeInTheDocument();
    }
  });

  it('N=9 overflow tile (9th, idx=8) does not get an explicit grid-area assignment', () => {
    const { bridge, sessions, createTerminal } = makeFixtures([
      's0',
      's1',
      's2',
      's3',
      's4',
      's5',
      's6',
      's7',
      's8',
    ]);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    const cell8 = screen.getByTestId('tile-cell-s8');
    expect(cell8.style.gridArea).toBe('');
    const cell0 = screen.getByTestId('tile-cell-s0');
    expect(cell0.style.gridArea).toBe('t0');
  });
});

describe('MB-T12 WB6 TileGrid — cross-tile isolation', () => {
  it('emitOpen for sess-b binds only the panel inside tile-cell-b (tiles a, c stay idle)', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b', 'c']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    act(() => {
      bridge.emitOpen({ sessionName: 'b' });
    });
    const cellA = screen.getByTestId('tile-cell-a');
    const cellB = screen.getByTestId('tile-cell-b');
    const cellC = screen.getByTestId('tile-cell-c');
    expect(within(cellA).getByTestId('console-panel-empty')).toBeInTheDocument();
    expect(within(cellB).getByTestId('console-panel-header')).toHaveTextContent('b');
    expect(within(cellC).getByTestId('console-panel-empty')).toBeInTheDocument();
  });
});

describe('MB-T12 WB6 TileGrid — callback fan-out', () => {
  it('onKill fires with the clicked tile sessionName', () => {
    const onKill = vi.fn();
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onKill={onKill}
      />,
    );
    fireEvent.click(within(screen.getByTestId('tile-cell-b')).getByTestId('tile-kill-btn'));
    expect(onKill).toHaveBeenCalledTimes(1);
    expect(onKill).toHaveBeenCalledWith('b');
  });

  it('onCollapse fires with the clicked tile sessionName', () => {
    const onCollapse = vi.fn();
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onCollapse={onCollapse}
      />,
    );
    fireEvent.click(within(screen.getByTestId('tile-cell-a')).getByTestId('tile-collapse-btn'));
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledWith('a');
  });

  it('onDetach fires with the clicked tile sessionName', () => {
    const onDetach = vi.fn();
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onDetach={onDetach}
      />,
    );
    fireEvent.click(within(screen.getByTestId('tile-cell-b')).getByTestId('tile-detach-btn'));
    expect(onDetach).toHaveBeenCalledTimes(1);
    expect(onDetach).toHaveBeenCalledWith('b');
  });
});

describe('MB-T12 WB6 TileGrid — per-session status + collapsed flow-through', () => {
  it('status prop on a session entry reflects on the rendered tile', () => {
    const { bridge, createTerminal } = makeFixtures([]);
    const sessions: TileGridSessionEntry[] = [
      { name: 'a', status: 'open' },
      { name: 'b', status: 'killed' },
    ];
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    expect(screen.getByTestId('tile-a').getAttribute('data-status')).toBe('open');
    expect(screen.getByTestId('tile-b').getAttribute('data-status')).toBe('killed');
  });

  it('collapsed flag on a session entry hides that tile body only', () => {
    const { bridge, createTerminal } = makeFixtures([]);
    const sessions: TileGridSessionEntry[] = [
      { name: 'a', collapsed: true },
      { name: 'b', collapsed: false },
    ];
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    const cellA = screen.getByTestId('tile-cell-a');
    const cellB = screen.getByTestId('tile-cell-b');
    expect(within(cellA).queryByTestId('tile-body')).not.toBeInTheDocument();
    expect(within(cellB).getByTestId('tile-body')).toBeInTheDocument();
  });
});
