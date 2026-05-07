// @vitest-environment happy-dom
//
// MB-T12 WB8 probe-02 — Tile drag-swap callback wiring:
//   - mousedown on header (excluding buttons) → onSwapDragStart
//   - mouseup on header (excluding buttons) → onSwapDrop
//   - mousedown on a header button does NOT fire onSwapDragStart
//   - omitted swap callbacks → header still works for other interactions

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tile } from '../../../src/tile-grid/tile.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function makeProps(
  overrides: Partial<React.ComponentProps<typeof Tile>> = {},
): React.ComponentProps<typeof Tile> {
  const fake = makeFakeConsoleBridge();
  const adapter = makeFakeTerminalAdapter();
  return {
    sessionName: 'sess-x',
    consoleBridge: fake.bridge,
    createTerminal: () => adapter,
    collapsed: false,
    onKill: vi.fn(),
    onCollapse: vi.fn(),
    onDetach: vi.fn(),
    ...overrides,
  };
}

describe('MB-T12 WB8 — Tile header drag-swap callbacks', () => {
  it('mousedown on header (background area) fires onSwapDragStart with sessionName', () => {
    const onSwapDragStart = vi.fn();
    const props = makeProps({ sessionName: 'src-tile', onSwapDragStart });
    render(<Tile {...props} />);
    fireEvent.mouseDown(screen.getByTestId('tile-header'));
    expect(onSwapDragStart).toHaveBeenCalledTimes(1);
    expect(onSwapDragStart).toHaveBeenCalledWith('src-tile');
  });

  it('mouseup on header (background area) fires onSwapDrop with sessionName', () => {
    const onSwapDrop = vi.fn();
    const props = makeProps({ sessionName: 'tgt-tile', onSwapDrop });
    render(<Tile {...props} />);
    fireEvent.mouseUp(screen.getByTestId('tile-header'));
    expect(onSwapDrop).toHaveBeenCalledTimes(1);
    expect(onSwapDrop).toHaveBeenCalledWith('tgt-tile');
  });

  it('mousedown on session-name span fires onSwapDragStart (not an interactive target)', () => {
    const onSwapDragStart = vi.fn();
    const props = makeProps({ sessionName: 'name-area', onSwapDragStart });
    render(<Tile {...props} />);
    fireEvent.mouseDown(screen.getByTestId('tile-session-name'));
    expect(onSwapDragStart).toHaveBeenCalledTimes(1);
    expect(onSwapDragStart).toHaveBeenCalledWith('name-area');
  });

  it('mousedown on kill button does NOT fire onSwapDragStart', () => {
    const onSwapDragStart = vi.fn();
    const props = makeProps({ onSwapDragStart });
    render(<Tile {...props} />);
    fireEvent.mouseDown(screen.getByTestId('tile-kill-btn'));
    expect(onSwapDragStart).not.toHaveBeenCalled();
  });

  it('mousedown on collapse button does NOT fire onSwapDragStart', () => {
    const onSwapDragStart = vi.fn();
    const props = makeProps({ onSwapDragStart });
    render(<Tile {...props} />);
    fireEvent.mouseDown(screen.getByTestId('tile-collapse-btn'));
    expect(onSwapDragStart).not.toHaveBeenCalled();
  });

  it('mousedown on detach button does NOT fire onSwapDragStart', () => {
    const onSwapDragStart = vi.fn();
    const props = makeProps({ onSwapDragStart });
    render(<Tile {...props} />);
    fireEvent.mouseDown(screen.getByTestId('tile-detach-btn'));
    expect(onSwapDragStart).not.toHaveBeenCalled();
  });

  it('mouseup on kill button does NOT fire onSwapDrop', () => {
    const onSwapDrop = vi.fn();
    const props = makeProps({ onSwapDrop });
    render(<Tile {...props} />);
    fireEvent.mouseUp(screen.getByTestId('tile-kill-btn'));
    expect(onSwapDrop).not.toHaveBeenCalled();
  });

  it('header click flow (button onClick) still fires onKill (regression)', () => {
    const onKill = vi.fn();
    const props = makeProps({ sessionName: 'x', onKill });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-kill-btn'));
    expect(onKill).toHaveBeenCalledWith('x');
  });

  it('omitting onSwapDragStart/onSwapDrop is safe (no crash on header mousedown/mouseup)', () => {
    const props = makeProps();
    render(<Tile {...props} />);
    expect(() =>
      fireEvent.mouseDown(screen.getByTestId('tile-header')),
    ).not.toThrow();
    expect(() =>
      fireEvent.mouseUp(screen.getByTestId('tile-header')),
    ).not.toThrow();
  });
});
