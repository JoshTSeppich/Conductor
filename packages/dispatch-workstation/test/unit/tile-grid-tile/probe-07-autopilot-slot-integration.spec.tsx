// @vitest-environment happy-dom
//
// MB-T17 WB4 probe-07 — Tile.tsx renderAutopilotSlot prop integration.
//
// Verifies that:
//   - When renderAutopilotSlot prop is provided, its result renders INSIDE
//     the existing `<div data-slot="autopilot" data-testid="tile-autopilot-
//     slot-{name}">` wrapper (preserving the MB-T12 WB5 wrapper testid +
//     data-slot attribute per Q-MBT17-4=a slot-wrapper preservation).
//   - When renderAutopilotSlot is undefined, the wrapper renders empty
//     (existing-test compatibility — tile-grid-tile probe-01 + MB-T12
//     WB5 contract preserved).
//   - renderAutopilotSlot is called with the tile's sessionName (each
//     tile gets its own toggle keyed by name).
//   - Slot wrapper data-slot="autopilot" attribute persists with or
//     without toggle content.
//   - renderAutopilotSlot's content can include interactive elements
//     (e.g., <input type="checkbox">) without breaking drag-swap on
//     the surrounding tile-header (the toggle's <input> is an
//     interactive target, so isInteractiveTarget filter blocks
//     drag-swap there).

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

describe('MB-T17 WB4 — Tile renderAutopilotSlot prop renders inside slot wrapper', () => {
  it('with renderAutopilotSlot: toggle content renders inside tile-autopilot-slot-{name} wrapper', () => {
    const renderAutopilotSlot = (sessionName: string) => (
      <div data-testid="toggle-stub" data-session={sessionName}>
        toggle for {sessionName}
      </div>
    );
    render(
      <Tile {...makeProps({ sessionName: 'alpha' })} renderAutopilotSlot={renderAutopilotSlot} />,
    );
    const slot = screen.getByTestId('tile-autopilot-slot-alpha');
    expect(slot).toBeInTheDocument();
    const stub = within(slot).getByTestId('toggle-stub');
    expect(stub).toBeInTheDocument();
    expect(stub.getAttribute('data-session')).toBe('alpha');
    expect(stub).toHaveTextContent('toggle for alpha');
  });

  it('without renderAutopilotSlot: wrapper renders empty (existing-test compatibility)', () => {
    render(<Tile {...makeProps({ sessionName: 'beta' })} />);
    const slot = screen.getByTestId('tile-autopilot-slot-beta');
    expect(slot).toBeInTheDocument();
    expect(within(slot).queryByTestId('toggle-stub')).not.toBeInTheDocument();
    expect(slot.children.length).toBe(0);
  });

  it('slot wrapper preserves data-slot="autopilot" attribute (with or without content)', () => {
    const { rerender } = render(<Tile {...makeProps({ sessionName: 'gamma' })} />);
    expect(
      screen.getByTestId('tile-autopilot-slot-gamma').getAttribute('data-slot'),
    ).toBe('autopilot');

    rerender(
      <Tile
        {...makeProps({ sessionName: 'gamma' })}
        renderAutopilotSlot={() => <span data-testid="x">x</span>}
      />,
    );
    expect(
      screen.getByTestId('tile-autopilot-slot-gamma').getAttribute('data-slot'),
    ).toBe('autopilot');
  });

  it('renderAutopilotSlot is called with the tile sessionName (per-tile keyed toggle)', () => {
    const fn = vi.fn(() => <div data-testid="toggle-stub" />);
    render(<Tile {...makeProps({ sessionName: 'keyed-x' })} renderAutopilotSlot={fn} />);
    expect(fn).toHaveBeenCalledWith('keyed-x');
  });

  it('LEGACY tile-autopilot-slot-{name} testid remains in DOM (MB-T12 WB5 contract preserved)', () => {
    render(
      <Tile
        {...makeProps({ sessionName: 'legacy' })}
        renderAutopilotSlot={() => <div>toggle</div>}
      />,
    );
    expect(screen.getByTestId('tile-autopilot-slot-legacy')).toBeInTheDocument();
  });
});

describe('MB-T17 WB4 — drag-swap interaction with autopilot toggle', () => {
  it('mousedown on toggle <input type="checkbox"> (interactive) does NOT fire onSwapDragStart', () => {
    const onSwapDragStart = vi.fn();
    render(
      <Tile
        {...makeProps({ sessionName: 'drag-test', onSwapDragStart })}
        renderAutopilotSlot={() => (
          <input
            type="checkbox"
            role="switch"
            data-testid="toggle-input"
            onChange={() => {
              /* no-op for the test */
            }}
          />
        )}
      />,
    );
    fireEvent.mouseDown(screen.getByTestId('toggle-input'));
    // <input> is an interactive target; isInteractiveTarget filter
    // blocks drag-swap (Q-MBT17-1=a + MB-T15 WB4 contract:
    // input/select/textarea/button skip drag-swap).
    expect(onSwapDragStart).not.toHaveBeenCalled();
  });

  it('mousedown on autopilot slot container <div> (non-interactive) DOES bubble to drag-swap', () => {
    const onSwapDragStart = vi.fn();
    render(
      <Tile
        {...makeProps({ sessionName: 'drag-pass', onSwapDragStart })}
        renderAutopilotSlot={() => (
          <div data-testid="toggle-div">passive toggle content</div>
        )}
      />,
    );
    fireEvent.mouseDown(screen.getByTestId('toggle-div'));
    // <div> is NOT in isInteractiveTarget filter; mousedown bubbles
    // up to tile-header → onSwapDragStart fires.
    expect(onSwapDragStart).toHaveBeenCalledWith('drag-pass');
  });
});
