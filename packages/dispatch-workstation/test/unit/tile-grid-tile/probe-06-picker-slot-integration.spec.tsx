// @vitest-environment happy-dom
//
// MB-T16 WB4 probe-06 — Tile.tsx renderPickerSlot prop integration.
//
// Verifies that:
//   - When renderPickerSlot prop is provided, its result renders INSIDE
//     the existing `<div data-slot="picker" data-testid="tile-picker-
//     slot-{name}">` wrapper (preserving the legacy MB-T12 WB5
//     wrapper testid + data-slot attribute per Q-MBT16-3=a slot-
//     wrapper preservation).
//   - When renderPickerSlot is undefined, the wrapper renders empty
//     (existing-test compatibility — tile-grid-tile probe-01 + MB-T12
//     WB5 contract preserved).
//   - renderPickerSlot is called with the tile's sessionName (each
//     tile gets its own picker keyed by name).
//   - Slot wrapper data-slot="picker" attribute persists with or
//     without picker content.
//   - renderPickerSlot's content can include interactive elements
//     (e.g., <select>) without breaking drag-swap on the surrounding
//     tile-header (the picker's <select> is an interactive target,
//     so isInteractiveTarget filter blocks drag-swap there).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

describe('MB-T16 WB4 — Tile renderPickerSlot prop renders inside slot wrapper', () => {
  it('with renderPickerSlot: picker content renders inside tile-picker-slot-{name} wrapper', () => {
    const renderPickerSlot = (sessionName: string) => (
      <div data-testid="picker-stub" data-session={sessionName}>
        picker for {sessionName}
      </div>
    );
    render(
      <Tile {...makeProps({ sessionName: 'alpha' })} renderPickerSlot={renderPickerSlot} />,
    );
    const slot = screen.getByTestId('tile-picker-slot-alpha');
    expect(slot).toBeInTheDocument();
    const stub = within(slot).getByTestId('picker-stub');
    expect(stub).toBeInTheDocument();
    expect(stub.getAttribute('data-session')).toBe('alpha');
    expect(stub).toHaveTextContent('picker for alpha');
  });

  it('without renderPickerSlot: wrapper renders empty (existing-test compatibility)', () => {
    render(<Tile {...makeProps({ sessionName: 'beta' })} />);
    const slot = screen.getByTestId('tile-picker-slot-beta');
    expect(slot).toBeInTheDocument();
    // No picker-stub testid because no renderPickerSlot was provided.
    expect(within(slot).queryByTestId('picker-stub')).not.toBeInTheDocument();
    // Slot is empty (no children rendered by the conditional).
    expect(slot.children.length).toBe(0);
  });

  it('slot wrapper preserves data-slot="picker" attribute (with or without content)', () => {
    const { rerender } = render(<Tile {...makeProps({ sessionName: 'gamma' })} />);
    expect(
      screen.getByTestId('tile-picker-slot-gamma').getAttribute('data-slot'),
    ).toBe('picker');

    rerender(
      <Tile
        {...makeProps({ sessionName: 'gamma' })}
        renderPickerSlot={() => <span data-testid="x">x</span>}
      />,
    );
    expect(
      screen.getByTestId('tile-picker-slot-gamma').getAttribute('data-slot'),
    ).toBe('picker');
  });

  it('renderPickerSlot is called with the tile sessionName (per-tile keyed picker)', () => {
    const fn = vi.fn(() => <div data-testid="picker-stub" />);
    render(<Tile {...makeProps({ sessionName: 'keyed-x' })} renderPickerSlot={fn} />);
    expect(fn).toHaveBeenCalledWith('keyed-x');
  });

  it('LEGACY tile-picker-slot-{name} testid remains in DOM (MB-T12 WB5 contract preserved)', () => {
    render(
      <Tile
        {...makeProps({ sessionName: 'legacy' })}
        renderPickerSlot={() => <div>picker</div>}
      />,
    );
    expect(screen.getByTestId('tile-picker-slot-legacy')).toBeInTheDocument();
  });
});

describe('MB-T16 WB4 — drag-swap interaction with picker content', () => {
  it('mousedown on picker <select> (interactive) does NOT fire onSwapDragStart', () => {
    const onSwapDragStart = vi.fn();
    render(
      <Tile
        {...makeProps({ sessionName: 'drag-test', onSwapDragStart })}
        renderPickerSlot={() => (
          <select data-testid="picker-select">
            <option value="tight">tight</option>
            <option value="medium">medium</option>
          </select>
        )}
      />,
    );
    fireEvent.mouseDown(screen.getByTestId('picker-select'));
    // <select> is an interactive target; isInteractiveTarget filter
    // blocks drag-swap (Q-MBT16-1=a + MB-T15 WB4 isInteractiveTarget
    // contract: select/input/textarea/button skip drag-swap).
    expect(onSwapDragStart).not.toHaveBeenCalled();
  });

  it('mousedown on picker container <div> (non-interactive) DOES bubble to drag-swap', () => {
    const onSwapDragStart = vi.fn();
    render(
      <Tile
        {...makeProps({ sessionName: 'drag-pass', onSwapDragStart })}
        renderPickerSlot={() => (
          <div data-testid="picker-div">passive picker content</div>
        )}
      />,
    );
    fireEvent.mouseDown(screen.getByTestId('picker-div'));
    // <div> is NOT in isInteractiveTarget filter; mousedown bubbles
    // up to tile-header → onSwapDragStart fires.
    expect(onSwapDragStart).toHaveBeenCalledWith('drag-pass');
  });
});
