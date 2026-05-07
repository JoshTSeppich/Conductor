// @vitest-environment happy-dom
//
// MB-T12 WB7 probe-02 — TileGrid drag-resize integration.
//
// Verifies:
//   - Resize handles render in correct count (cols-1 vertical + rows-1 horizontal)
//   - Drag a vertical handle 50px right → onResizeEnd fires with shifted colSizes
//   - Drag a horizontal handle 30px down → onResizeEnd fires with shifted rowSizes
//   - gridOverride prop's initial colSizes/rowSizes apply inline
//   - Mismatched gridOverride shape (rows/cols mismatch) is discarded
//   - Drag respects min-band clamp (computeNewSizesAfterDrag delegate)
//
// Test seam: pass `getCurrentPixelSizes` to inject deterministic
// initial sizes (avoids happy-dom's getBoundingClientRect quirks).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('MB-T12 WB7 — TileGrid resize handle rendering', () => {
  it('N=4 (2×2) renders 1 vertical handle + 1 horizontal handle', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b', 'c', 'd']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    expect(screen.getByTestId('tile-resize-handle-vertical-0')).toBeInTheDocument();
    expect(screen.getByTestId('tile-resize-handle-horizontal-0')).toBeInTheDocument();
    expect(screen.queryByTestId('tile-resize-handle-vertical-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tile-resize-handle-horizontal-1')).not.toBeInTheDocument();
  });

  it('N=6 (2×3) renders 2 vertical handles + 1 horizontal handle', () => {
    const { bridge, sessions, createTerminal } = makeFixtures([
      'a', 'b', 'c', 'd', 'e', 'f',
    ]);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    expect(screen.getByTestId('tile-resize-handle-vertical-0')).toBeInTheDocument();
    expect(screen.getByTestId('tile-resize-handle-vertical-1')).toBeInTheDocument();
    expect(screen.queryByTestId('tile-resize-handle-vertical-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('tile-resize-handle-horizontal-0')).toBeInTheDocument();
  });

  it('N=8 (2×4) renders 3 vertical handles + 1 horizontal handle', () => {
    const { bridge, sessions, createTerminal } = makeFixtures([
      's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7',
    ]);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    for (let i = 0; i < 3; i++) {
      expect(screen.getByTestId(`tile-resize-handle-vertical-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('tile-resize-handle-vertical-3')).not.toBeInTheDocument();
    expect(screen.getByTestId('tile-resize-handle-horizontal-0')).toBeInTheDocument();
  });

  it('N=1 (1×1) renders zero handles', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['only']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    expect(screen.queryByTestId('tile-resize-handle-vertical-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tile-resize-handle-horizontal-0')).not.toBeInTheDocument();
  });

  it('N=2 (1×2) renders 1 vertical handle + 0 horizontal handles', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    expect(screen.getByTestId('tile-resize-handle-vertical-0')).toBeInTheDocument();
    expect(screen.queryByTestId('tile-resize-handle-horizontal-0')).not.toBeInTheDocument();
  });
});

describe('MB-T12 WB7 — drag-resize fires onResizeEnd with shifted sizes', () => {
  it('vertical handle drag 50px right → onResizeEnd with colSizes shifted', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b', 'c', 'd']);
    const onResizeEnd = vi.fn();
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onResizeEnd={onResizeEnd}
        getCurrentPixelSizes={() => ({
          colPx: [400, 400],
          rowPx: [300, 300],
        })}
      />,
    );

    const handle = screen.getByTestId('tile-resize-handle-vertical-0');
    fireEvent.mouseDown(handle, { clientX: 400, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 450, clientY: 300 });
    fireEvent.mouseUp(document);

    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    expect(onResizeEnd).toHaveBeenCalledWith({
      colSizes: ['450px', '350px'],
    });
  });

  it('horizontal handle drag 30px down → onResizeEnd with rowSizes shifted', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b', 'c', 'd']);
    const onResizeEnd = vi.fn();
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onResizeEnd={onResizeEnd}
        getCurrentPixelSizes={() => ({
          colPx: [400, 400],
          rowPx: [300, 300],
        })}
      />,
    );

    const handle = screen.getByTestId('tile-resize-handle-horizontal-0');
    fireEvent.mouseDown(handle, { clientX: 400, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 400, clientY: 330 });
    fireEvent.mouseUp(document);

    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    expect(onResizeEnd).toHaveBeenCalledWith({
      rowSizes: ['330px', '270px'],
    });
  });

  it('mouseup without prior mousedown does NOT fire onResizeEnd', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    const onResizeEnd = vi.fn();
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onResizeEnd={onResizeEnd}
        getCurrentPixelSizes={() => ({ colPx: [200, 200], rowPx: [200] })}
      />,
    );
    fireEvent.mouseUp(document);
    expect(onResizeEnd).not.toHaveBeenCalled();
  });

  it('drag respects min-band clamp (default 80px) — large delta clipped', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    const onResizeEnd = vi.fn();
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        onResizeEnd={onResizeEnd}
        getCurrentPixelSizes={() => ({ colPx: [200, 200], rowPx: [200] })}
      />,
    );

    const handle = screen.getByTestId('tile-resize-handle-vertical-0');
    fireEvent.mouseDown(handle, { clientX: 200, clientY: 200 });
    // Drag 500px right — would shrink right band to -300; clamp to 80.
    fireEvent.mouseMove(document, { clientX: 700, clientY: 200 });
    fireEvent.mouseUp(document);

    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    expect(onResizeEnd).toHaveBeenCalledWith({
      colSizes: ['320px', '80px'],
    });
  });
});

describe('MB-T12 WB7 — gridOverride prop applies on initial render', () => {
  it('gridOverride colSizes applied to grid-template-columns inline style', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        gridOverride={{ colSizes: ['250px', '350px'] }}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.style.gridTemplateColumns).toBe('250px 350px');
  });

  it('gridOverride rowSizes applied to grid-template-rows inline style', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b', 'c', 'd']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        gridOverride={{ rowSizes: ['150px', '250px'] }}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.style.gridTemplateRows).toBe('150px 250px');
  });

  it('gridOverride with mismatched cols length is discarded; default 1fr applies', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b', 'c']);
    // sessions=3 → layout 2×2 (4 cells); colSizes has 3 entries — mismatch.
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        gridOverride={{ colSizes: ['100px', '200px', '300px'] }}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
  });

  it('gridOverride with mismatched rows length is discarded', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b', 'c', 'd']);
    // sessions=4 → 2×2; rowSizes has 1 entry — mismatch.
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
        gridOverride={{ rowSizes: ['200px'] }}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.style.gridTemplateRows).toBe('repeat(2, 1fr)');
  });
});
