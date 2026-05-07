// @vitest-environment happy-dom
//
// MB-T12 WB10 probe-02 — TileGridApp collapse round-trip across remount:
//   - Mount with initialSessions=[a, b] (both expanded by default)
//   - Click tile-a's collapse button → onPersistSessions called with
//     a.collapsed=true; tile-a body removed; tile-b unaffected.
//   - Simulate persistence read: unmount + re-mount with initialSessions=
//     [{a, collapsed:true}, b] → tile-a renders collapsed; tile-b expanded.
//   - Click collapsed tile-a (root, NOT button) → onPersistSessions called
//     with a.collapsed=false (toggle); tile-a body returns.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function makeFakeWorkstation(): WorkstationBridgeShape {
  return {
    onSpawnResult: () => () => {
      /* no-op */
    },
  };
}

function makeFixtures() {
  return {
    workstation: makeFakeWorkstation(),
    console: makeFakeConsoleBridge(),
    createTerminal: () => makeFakeTerminalAdapter(),
  };
}

describe('MB-T12 WB10 — collapse round-trip across remount', () => {
  it('collapse-button click fires onPersistSessions with collapsed=true', () => {
    const f = makeFixtures();
    const onPersistSessions = vi.fn();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }, { name: 'b' }]}
        onPersistSessions={onPersistSessions}
      />,
    );
    fireEvent.click(within(screen.getByTestId('tile-cell-a')).getByTestId('tile-collapse-btn'));

    expect(onPersistSessions).toHaveBeenCalled();
    const lastCall = onPersistSessions.mock.calls[onPersistSessions.mock.calls.length - 1];
    expect(lastCall[0]).toEqual([
      { name: 'a', collapsed: true },
      { name: 'b' },
    ]);
  });

  it('after collapse: tile-a body hidden, tile-b body visible', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }, { name: 'b' }]}
      />,
    );
    expect(within(screen.getByTestId('tile-cell-a')).getByTestId('tile-body')).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId('tile-cell-a')).getByTestId('tile-collapse-btn'));
    expect(within(screen.getByTestId('tile-cell-a')).queryByTestId('tile-body')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('tile-cell-b')).getByTestId('tile-body')).toBeInTheDocument();
  });

  it('remount with initialSessions[a].collapsed=true reproduces the collapsed state', () => {
    const f = makeFixtures();
    // Simulate a persistence-read on cold-boot: parent reads
    // tile-grid-state, finds a.collapsed=true, seeds initialSessions.
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[
          { name: 'a', collapsed: true },
          { name: 'b' },
        ]}
      />,
    );
    expect(within(screen.getByTestId('tile-cell-a')).queryByTestId('tile-body')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('tile-cell-b')).getByTestId('tile-body')).toBeInTheDocument();
    expect(screen.getByTestId('tile-a').style.height).toBe('40px');
  });

  it('full round-trip: collapse → unmount → remount with persisted state → re-expand via tile-root click', () => {
    const f = makeFixtures();
    const onPersistSessions = vi.fn();

    // Phase 1: mount with both expanded; click collapse on a.
    const { unmount } = render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }, { name: 'b' }]}
        onPersistSessions={onPersistSessions}
      />,
    );
    fireEvent.click(within(screen.getByTestId('tile-cell-a')).getByTestId('tile-collapse-btn'));

    // Capture what would be persisted.
    const persistedSessions = onPersistSessions.mock.calls[onPersistSessions.mock.calls.length - 1][0];
    expect(persistedSessions).toEqual([
      { name: 'a', collapsed: true },
      { name: 'b' },
    ]);
    unmount();

    // Phase 2: re-mount with the persisted state as the new initialSessions
    // (simulates app restart reading from tile-grid-state.json).
    const onPersistSessions2 = vi.fn();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={persistedSessions}
        onPersistSessions={onPersistSessions2}
      />,
    );

    // tile-a is collapsed (no body, height=40px).
    expect(within(screen.getByTestId('tile-cell-a')).queryByTestId('tile-body')).not.toBeInTheDocument();
    expect(screen.getByTestId('tile-a').style.height).toBe('40px');
    // tile-b is expanded.
    expect(within(screen.getByTestId('tile-cell-b')).getByTestId('tile-body')).toBeInTheDocument();

    // Phase 3: click on the collapsed tile root → toggles back to expanded.
    fireEvent.click(screen.getByTestId('tile-a'));
    expect(within(screen.getByTestId('tile-cell-a')).getByTestId('tile-body')).toBeInTheDocument();
    expect(screen.getByTestId('tile-a').style.height).toBe('');

    // Persistence callback fired again with collapsed=false.
    const finalCall = onPersistSessions2.mock.calls[onPersistSessions2.mock.calls.length - 1];
    expect(finalCall[0]).toEqual([
      { name: 'a', collapsed: false },
      { name: 'b' },
    ]);
  });

  it('toggle collapse twice → ends in original state; persistence reflects each toggle', () => {
    const f = makeFixtures();
    const onPersistSessions = vi.fn();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }]}
        onPersistSessions={onPersistSessions}
      />,
    );
    // Toggle 1: expand → collapse
    fireEvent.click(within(screen.getByTestId('tile-cell-a')).getByTestId('tile-collapse-btn'));
    expect(screen.getByTestId('tile-a').style.height).toBe('40px');

    // Toggle 2: collapse → expand (via collapse button, label is now "Expand")
    fireEvent.click(within(screen.getByTestId('tile-cell-a')).getByTestId('tile-collapse-btn'));
    expect(screen.getByTestId('tile-a').style.height).toBe('');

    // Two onPersistSessions calls captured.
    expect(onPersistSessions).toHaveBeenCalledTimes(2);
    expect(onPersistSessions.mock.calls[0][0]).toEqual([{ name: 'a', collapsed: true }]);
    expect(onPersistSessions.mock.calls[1][0]).toEqual([{ name: 'a', collapsed: false }]);
  });
});
