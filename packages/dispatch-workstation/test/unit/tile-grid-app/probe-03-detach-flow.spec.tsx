// @vitest-environment happy-dom
//
// MB-T12 WB11a probe-03 — TileGridApp detach flow integration:
//   - Detach button click → workstationBridge.detachTile(sessionName) called
//   - Optimistic status flip to 'detached' immediately
//   - onTileDetachClosed callback restores status to 'open'
//   - detachTile failure rolls back status to 'open'
//   - Omitting detachTile bridge method → graceful no-op (no crash)
//   - Persistence callback fires for status changes
//   - Subscription cleanup on unmount

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

interface FakeWorkstationBridgeWithDetach extends WorkstationBridgeShape {
  emitSpawnResult: (reply: unknown) => void;
  emitDetachClosed: (payload: { sessionName: string }) => void;
  detachTileCalls: () => string[];
  setDetachTileImpl: (
    impl: (sessionName: string) => Promise<{ ok: boolean }>,
  ) => void;
  detachClosedHandlerCount: () => number;
}

function makeFakeWorkstationBridge(): FakeWorkstationBridgeWithDetach {
  const spawnHandlers = new Set<(reply: unknown) => void>();
  const detachClosedHandlers = new Set<
    (payload: { sessionName: string }) => void
  >();
  const detachCalls: string[] = [];
  let detachImpl: (sessionName: string) => Promise<{ ok: boolean }> = async () => ({
    ok: true,
  });

  return {
    onSpawnResult: (cb) => {
      spawnHandlers.add(cb);
      return () => {
        spawnHandlers.delete(cb);
      };
    },
    detachTile: async (sessionName: string) => {
      detachCalls.push(sessionName);
      return detachImpl(sessionName);
    },
    onTileDetachClosed: (cb) => {
      detachClosedHandlers.add(cb);
      return () => {
        detachClosedHandlers.delete(cb);
      };
    },
    emitSpawnResult: (reply) => spawnHandlers.forEach((h) => h(reply)),
    emitDetachClosed: (payload) => detachClosedHandlers.forEach((h) => h(payload)),
    detachTileCalls: () => [...detachCalls],
    setDetachTileImpl: (impl) => {
      detachImpl = impl;
    },
    detachClosedHandlerCount: () => detachClosedHandlers.size,
  };
}

function makeFixtures() {
  return {
    workstation: makeFakeWorkstationBridge(),
    console: makeFakeConsoleBridge(),
    createTerminal: () => makeFakeTerminalAdapter(),
  };
}

describe('MB-T12 WB11a — TileGridApp detach flow integration', () => {
  it('detach button click invokes workstationBridge.detachTile with sessionName', async () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }, { name: 'b' }]}
      />,
    );

    fireEvent.click(
      within(screen.getByTestId('tile-cell-a')).getByTestId('tile-detach-btn'),
    );
    // Allow the async detach call to register.
    await act(async () => {
      await Promise.resolve();
    });

    expect(f.workstation.detachTileCalls()).toEqual(['a']);
  });

  it('after detach, tile-a status flips to "detached" → placeholder renders', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }]}
      />,
    );
    fireEvent.click(
      within(screen.getByTestId('tile-cell-a')).getByTestId('tile-detach-btn'),
    );

    expect(
      within(screen.getByTestId('tile-cell-a')).getByTestId(
        'tile-detached-placeholder',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('tile-cell-a')).queryByTestId(
        'console-panel-root',
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('tile-a').getAttribute('data-status')).toBe(
      'detached',
    );
  });

  it('emitDetachClosed restores status to "open"; ConsolePanel re-mounts', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }]}
      />,
    );
    fireEvent.click(
      within(screen.getByTestId('tile-cell-a')).getByTestId('tile-detach-btn'),
    );
    expect(screen.getByTestId('tile-a').getAttribute('data-status')).toBe(
      'detached',
    );

    act(() => {
      f.workstation.emitDetachClosed({ sessionName: 'a' });
    });

    expect(screen.getByTestId('tile-a').getAttribute('data-status')).toBe('open');
    expect(
      within(screen.getByTestId('tile-cell-a')).getByTestId('console-panel-root'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('tile-cell-a')).queryByTestId(
        'tile-detached-placeholder',
      ),
    ).not.toBeInTheDocument();
  });

  it('omitting detachTile bridge method makes detach a no-op (graceful degradation)', () => {
    const minimalBridge: WorkstationBridgeShape = {
      onSpawnResult: () => () => {
        /* noop */
      },
    };
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={minimalBridge}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }]}
      />,
    );
    expect(() => {
      fireEvent.click(
        within(screen.getByTestId('tile-cell-a')).getByTestId(
          'tile-detach-btn',
        ),
      );
    }).not.toThrow();
    // Status unchanged (still 'idle' from initial render — handleDetach
    // returns early because detachTile is undefined).
    expect(
      within(screen.getByTestId('tile-cell-a')).queryByTestId(
        'tile-detached-placeholder',
      ),
    ).not.toBeInTheDocument();
  });

  it('detachTile rejection rolls back status to "open"', async () => {
    const f = makeFixtures();
    f.workstation.setDetachTileImpl(async () => {
      throw new Error('detach window failed');
    });
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }]}
      />,
    );
    fireEvent.click(
      within(screen.getByTestId('tile-cell-a')).getByTestId('tile-detach-btn'),
    );

    // Optimistic flip first.
    expect(screen.getByTestId('tile-a').getAttribute('data-status')).toBe(
      'detached',
    );

    // Allow rejection to settle (two awaits — promise rejection then catch).
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('tile-a').getAttribute('data-status')).toBe('open');
  });

  it('persistence callback fires for status change to detached', () => {
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
    fireEvent.click(
      within(screen.getByTestId('tile-cell-a')).getByTestId('tile-detach-btn'),
    );

    const lastCall =
      onPersistSessions.mock.calls[onPersistSessions.mock.calls.length - 1];
    expect(lastCall[0]).toEqual([{ name: 'a', status: 'detached' }]);
  });

  it('onTileDetachClosed subscription cleans up on unmount', () => {
    const f = makeFixtures();
    expect(f.workstation.detachClosedHandlerCount()).toBe(0);
    const { unmount } = render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[]}
      />,
    );
    expect(f.workstation.detachClosedHandlerCount()).toBe(1);
    unmount();
    expect(f.workstation.detachClosedHandlerCount()).toBe(0);
  });

  it('emitDetachClosed for an unknown session is a no-op (no crash, no state change)', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }]}
      />,
    );
    expect(() => {
      act(() => {
        f.workstation.emitDetachClosed({ sessionName: 'unknown-sess' });
      });
    }).not.toThrow();
    // tile-a status unchanged.
    expect(screen.getByTestId('tile-a').getAttribute('data-status')).toBe('idle');
  });
});
