// @vitest-environment happy-dom
//
// MB-T12 WB9 probe-01 — TileGridApp spawn auto-mount integration.
//
// Verifies:
//   - Initial sessions seed renders correctly
//   - workstationBridge.onSpawnResult({type:'success', result:{sessionName}})
//     fires → tile X appears in the grid (layout reflows per WB6 logic)
//   - {type:'error'} reply does NOT mount a tile
//   - Duplicate spawn-result (same sessionName) is idempotent (no second tile)
//   - onSessionMounted fires with the new sessionName
//   - Cross-WB integration: kill removes tile; swap reorders tiles
//   - layout reflow: spawn 4 tiles → 2×2; spawn 5th → 2×3

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

interface FakeWorkstationBridge extends WorkstationBridgeShape {
  emitSpawnResult: (reply: unknown) => void;
  listenerCount: () => number;
}

function makeFakeWorkstationBridge(): FakeWorkstationBridge {
  const handlers = new Set<(reply: unknown) => void>();
  return {
    onSpawnResult: (cb) => {
      handlers.add(cb);
      return () => {
        handlers.delete(cb);
      };
    },
    emitSpawnResult: (reply) => {
      handlers.forEach((h) => h(reply));
    },
    listenerCount: () => handlers.size,
  };
}

function makeFixtures() {
  return {
    workstation: makeFakeWorkstationBridge(),
    console: makeFakeConsoleBridge(),
    createTerminal: () => makeFakeTerminalAdapter(),
  };
}

describe('MB-T12 WB9 — TileGridApp initial render', () => {
  it('renders nothing when no initialSessions and no spawns yet', () => {
    const f = makeFixtures();
    const { container } = render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
      />,
    );
    expect(screen.queryByTestId('tile-grid-root')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid^="tile-cell-"]').length).toBe(0);
  });

  it('renders initial sessions when initialSessions prop is provided', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'sess-init-a' }, { name: 'sess-init-b' }]}
      />,
    );
    expect(screen.getByTestId('tile-cell-sess-init-a')).toBeInTheDocument();
    expect(screen.getByTestId('tile-cell-sess-init-b')).toBeInTheDocument();
    expect(screen.getByTestId('tile-grid-root').getAttribute('data-tile-count')).toBe('2');
  });
});

describe('MB-T12 WB9 — spawn auto-mount on success reply', () => {
  it('emit spawn-result success → new tile appears', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
      />,
    );
    expect(screen.queryByTestId('tile-grid-root')).not.toBeInTheDocument();

    act(() => {
      f.workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'sess-spawned-1' },
      });
    });

    expect(screen.getByTestId('tile-grid-root')).toBeInTheDocument();
    expect(screen.getByTestId('tile-cell-sess-spawned-1')).toBeInTheDocument();
  });

  it('multiple successful spawns mount tiles in arrival order', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
      />,
    );
    act(() => {
      f.workstation.emitSpawnResult({ type: 'success', result: { sessionName: 's1' } });
      f.workstation.emitSpawnResult({ type: 'success', result: { sessionName: 's2' } });
      f.workstation.emitSpawnResult({ type: 'success', result: { sessionName: 's3' } });
    });

    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-tile-count')).toBe('3');
    const cells = Array.from(root.querySelectorAll('[data-testid^="tile-cell-"]'));
    expect(cells.map((c) => c.getAttribute('data-testid'))).toEqual([
      'tile-cell-s1',
      'tile-cell-s2',
      'tile-cell-s3',
    ]);
  });

  it('layout reflows from 2×2 (N=4) to 2×3 (N=5) when 5th tile mounts', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[
          { name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' },
        ]}
      />,
    );
    expect(screen.getByTestId('tile-grid-root').style.gridTemplateColumns).toBe('repeat(2, 1fr)');

    act(() => {
      f.workstation.emitSpawnResult({ type: 'success', result: { sessionName: 'e' } });
    });

    expect(screen.getByTestId('tile-grid-root').style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    expect(screen.getByTestId('tile-grid-root').getAttribute('data-tile-count')).toBe('5');
  });
});

describe('MB-T12 WB9 — spawn-result filtering', () => {
  it('emit spawn-result error → NO tile mounts', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
      />,
    );
    act(() => {
      f.workstation.emitSpawnResult({
        type: 'error',
        error: { message: 'spawn failed' },
      });
    });
    expect(screen.queryByTestId('tile-grid-root')).not.toBeInTheDocument();
  });

  it('malformed reply (missing type) does not mount or crash', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
      />,
    );
    expect(() => {
      act(() => {
        f.workstation.emitSpawnResult({ result: { sessionName: 'oops' } });
      });
    }).not.toThrow();
    expect(screen.queryByTestId('tile-grid-root')).not.toBeInTheDocument();
  });

  it('reply with empty sessionName is rejected', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
      />,
    );
    act(() => {
      f.workstation.emitSpawnResult({ type: 'success', result: { sessionName: '' } });
    });
    expect(screen.queryByTestId('tile-grid-root')).not.toBeInTheDocument();
  });

  it('duplicate spawn-result for the same sessionName is idempotent (no second tile)', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
      />,
    );
    act(() => {
      f.workstation.emitSpawnResult({ type: 'success', result: { sessionName: 'twice' } });
      f.workstation.emitSpawnResult({ type: 'success', result: { sessionName: 'twice' } });
    });
    expect(screen.getByTestId('tile-grid-root').getAttribute('data-tile-count')).toBe('1');
  });
});

describe('MB-T12 WB9 — onSessionMounted callback', () => {
  it('fires with new sessionName on each successful spawn', () => {
    const onSessionMounted = vi.fn();
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        onSessionMounted={onSessionMounted}
      />,
    );
    act(() => {
      f.workstation.emitSpawnResult({ type: 'success', result: { sessionName: 'a' } });
      f.workstation.emitSpawnResult({ type: 'success', result: { sessionName: 'b' } });
    });
    expect(onSessionMounted).toHaveBeenCalledTimes(2);
    expect(onSessionMounted.mock.calls[0]).toEqual(['a']);
    expect(onSessionMounted.mock.calls[1]).toEqual(['b']);
  });

  it('does NOT fire on error reply', () => {
    const onSessionMounted = vi.fn();
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        onSessionMounted={onSessionMounted}
      />,
    );
    act(() => {
      f.workstation.emitSpawnResult({ type: 'error', error: { message: 'boom' } });
    });
    expect(onSessionMounted).not.toHaveBeenCalled();
  });
});

describe('MB-T12 WB9 — cross-WB integration (kill / swap / collapse)', () => {
  it('kill removes the tile from the grid', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }, { name: 'b' }, { name: 'c' }]}
      />,
    );
    fireEvent.click(within(screen.getByTestId('tile-cell-b')).getByTestId('tile-kill-btn'));
    expect(screen.queryByTestId('tile-cell-b')).not.toBeInTheDocument();
    expect(screen.getByTestId('tile-grid-root').getAttribute('data-tile-count')).toBe('2');
  });

  it('swap reorders tiles in the grid', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }]}
      />,
    );
    const headerA = within(screen.getByTestId('tile-cell-a')).getByTestId('tile-header');
    const headerC = within(screen.getByTestId('tile-cell-c')).getByTestId('tile-header');
    fireEvent.mouseDown(headerA);
    fireEvent.mouseUp(headerC);

    // After swap: positions [c, b, a, d]
    const cells = Array.from(
      screen.getByTestId('tile-grid-root').querySelectorAll('[data-testid^="tile-cell-"]'),
    );
    expect(cells.map((c) => c.getAttribute('data-testid'))).toEqual([
      'tile-cell-c',
      'tile-cell-b',
      'tile-cell-a',
      'tile-cell-d',
    ]);
  });

  it('collapse toggle flips the collapsed flag for that tile only', () => {
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
    // tile b unaffected
    expect(within(screen.getByTestId('tile-cell-b')).getByTestId('tile-body')).toBeInTheDocument();
  });
});

describe('MB-T12 WB9 — bridge subscription lifecycle', () => {
  it('subscribes once on mount; unsubscribes on unmount', () => {
    const f = makeFixtures();
    expect(f.workstation.listenerCount()).toBe(0);
    const { unmount } = render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
      />,
    );
    expect(f.workstation.listenerCount()).toBe(1);
    unmount();
    expect(f.workstation.listenerCount()).toBe(0);
  });

  it('persistence callback (onPersistSessions) fires after kill/collapse/swap', () => {
    const onPersistSessions = vi.fn();
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }, { name: 'b' }]}
        onPersistSessions={onPersistSessions}
      />,
    );
    fireEvent.click(within(screen.getByTestId('tile-cell-b')).getByTestId('tile-kill-btn'));
    expect(onPersistSessions).toHaveBeenCalled();
    // Last call's first arg is the post-kill sessions array (just [a]).
    const lastCall = onPersistSessions.mock.calls[onPersistSessions.mock.calls.length - 1];
    expect(lastCall[0]).toEqual([{ name: 'a' }]);
  });
});
