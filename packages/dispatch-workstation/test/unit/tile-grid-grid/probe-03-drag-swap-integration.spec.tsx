// @vitest-environment happy-dom
//
// MB-T12 WB8 probe-03 — TileGrid drag-swap integration.
//
// Verifies:
//   - mousedown on tile A's header + mouseup on tile B's header
//     → onSwap('A', 'B')
//   - mouseup on the SAME tile (no swap target change) → no onSwap call
//   - drop outside any header (document mouseup) → drag canceled, no onSwap
//   - drop after kill-button mousedown → drag never started (button skip)
//   - swap of tiles 0 and 2 (the brief's example): mousedown on a, mouseup on c

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  TileGrid,
  type TileGridSessionEntry,
} from '../../../src/tile-grid/tile-grid.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function makeFixtures(sessionNames: string[]) {
  return {
    bridge: makeFakeConsoleBridge(),
    sessions: sessionNames.map((name) => ({ name })) as TileGridSessionEntry[],
    createTerminal: () => makeFakeTerminalAdapter(),
  };
}

describe('MB-T12 WB8 — TileGrid drag-swap orchestration', () => {
  it('drag tile a header → drop on tile c header → onSwap("a", "c") (brief: swap tiles 0 and 2)', () => {
    const onSwap = vi.fn();
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b', 'c', 'd']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onSwap={onSwap}
      />,
    );

    const headerA = within(screen.getByTestId('tile-cell-a')).getByTestId('tile-header');
    const headerC = within(screen.getByTestId('tile-cell-c')).getByTestId('tile-header');
    fireEvent.mouseDown(headerA);
    fireEvent.mouseUp(headerC);

    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(onSwap).toHaveBeenCalledWith('a', 'c');
  });

  it('drag and drop on same tile (a→a) does NOT fire onSwap', () => {
    const onSwap = vi.fn();
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onSwap={onSwap}
      />,
    );

    const headerA = within(screen.getByTestId('tile-cell-a')).getByTestId('tile-header');
    fireEvent.mouseDown(headerA);
    fireEvent.mouseUp(headerA);

    expect(onSwap).not.toHaveBeenCalled();
  });

  it('drop outside any header (document mouseup) does NOT fire onSwap', () => {
    const onSwap = vi.fn();
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onSwap={onSwap}
      />,
    );

    const headerA = within(screen.getByTestId('tile-cell-a')).getByTestId('tile-header');
    fireEvent.mouseDown(headerA);
    fireEvent.mouseUp(document);

    expect(onSwap).not.toHaveBeenCalled();
  });

  it('cancel: drag a, then drop outside, then drop on b → no onSwap (drag was canceled)', () => {
    const onSwap = vi.fn();
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onSwap={onSwap}
      />,
    );

    const headerA = within(screen.getByTestId('tile-cell-a')).getByTestId('tile-header');
    const headerB = within(screen.getByTestId('tile-cell-b')).getByTestId('tile-header');
    fireEvent.mouseDown(headerA);
    fireEvent.mouseUp(document);
    // After cancel, a drop on b alone should NOT fire onSwap (no source).
    fireEvent.mouseUp(headerB);

    expect(onSwap).not.toHaveBeenCalled();
  });

  it('mousedown on kill button does NOT start a swap drag (regression: kill still works)', () => {
    const onSwap = vi.fn();
    const onKill = vi.fn();
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onSwap={onSwap}
        onKill={onKill}
      />,
    );

    const cellA = screen.getByTestId('tile-cell-a');
    fireEvent.mouseDown(within(cellA).getByTestId('tile-kill-btn'));
    // Drop on tile b's header — no swap, since drag never started.
    const headerB = within(screen.getByTestId('tile-cell-b')).getByTestId('tile-header');
    fireEvent.mouseUp(headerB);

    expect(onSwap).not.toHaveBeenCalled();

    // The actual click on the kill button still routes to onKill (regression).
    fireEvent.click(within(cellA).getByTestId('tile-kill-btn'));
    expect(onKill).toHaveBeenCalledWith('a');
  });

  it('omitting onSwap prop disables drag-swap entirely (no Tile callback wiring)', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );

    const headerA = within(screen.getByTestId('tile-cell-a')).getByTestId('tile-header');
    const headerB = within(screen.getByTestId('tile-cell-b')).getByTestId('tile-header');
    expect(() => {
      fireEvent.mouseDown(headerA);
      fireEvent.mouseUp(headerB);
    }).not.toThrow();
  });

  it('reverse drag: drop on tile a after dragging from c → onSwap("c", "a")', () => {
    const onSwap = vi.fn();
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b', 'c', 'd']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onSwap={onSwap}
      />,
    );

    const headerA = within(screen.getByTestId('tile-cell-a')).getByTestId('tile-header');
    const headerC = within(screen.getByTestId('tile-cell-c')).getByTestId('tile-header');
    fireEvent.mouseDown(headerC);
    fireEvent.mouseUp(headerA);

    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(onSwap).toHaveBeenCalledWith('c', 'a');
  });

  it('two consecutive swaps complete cleanly (state reset between drags)', () => {
    const onSwap = vi.fn();
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b', 'c', 'd']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onSwap={onSwap}
      />,
    );

    const headerA = within(screen.getByTestId('tile-cell-a')).getByTestId('tile-header');
    const headerB = within(screen.getByTestId('tile-cell-b')).getByTestId('tile-header');
    const headerD = within(screen.getByTestId('tile-cell-d')).getByTestId('tile-header');
    // Swap 1: a → b
    fireEvent.mouseDown(headerA);
    fireEvent.mouseUp(headerB);
    // Swap 2: d → a
    fireEvent.mouseDown(headerD);
    fireEvent.mouseUp(headerA);

    expect(onSwap).toHaveBeenCalledTimes(2);
    expect(onSwap.mock.calls[0]).toEqual(['a', 'b']);
    expect(onSwap.mock.calls[1]).toEqual(['d', 'a']);
  });
});
