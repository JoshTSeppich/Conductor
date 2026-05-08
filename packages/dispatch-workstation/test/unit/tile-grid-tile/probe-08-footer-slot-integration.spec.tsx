// @vitest-environment happy-dom
//
// MB-T18 WB3 probe-08 — Tile.tsx renderFooterSlot prop integration.
//
// Verifies that:
//   - When renderFooterSlot prop is provided, its result renders INSIDE
//     the existing `<div data-slot="footer" data-testid="tile-footer-
//     slot-{name}">` wrapper (preserving the MB-T12 WB5 wrapper testid +
//     data-slot attribute per Q-MBT18-4=a slot-wrapper preservation).
//   - When renderFooterSlot is undefined, the wrapper renders empty
//     (existing-test compatibility — tile-grid-tile probe-01 + MB-T12
//     WB5 contract preserved).
//   - renderFooterSlot is called with the tile's sessionName (each
//     tile gets its own footer keyed by name).
//   - Slot wrapper data-slot="footer" attribute persists with or
//     without footer content.
//   - Footer slot renders even when the tile is collapsed (footer is
//     a sibling of tile-header AND tile-body, NOT inside tile-body
//     which is gated by !collapsed).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

describe('MB-T18 WB3 — Tile renderFooterSlot prop renders inside slot wrapper', () => {
  it('with renderFooterSlot: footer content renders inside tile-footer-slot-{name} wrapper', () => {
    const renderFooterSlot = (sessionName: string) => (
      <div data-testid="footer-stub" data-session={sessionName}>
        footer for {sessionName}
      </div>
    );
    render(
      <Tile {...makeProps({ sessionName: 'alpha' })} renderFooterSlot={renderFooterSlot} />,
    );
    const slot = screen.getByTestId('tile-footer-slot-alpha');
    expect(slot).toBeInTheDocument();
    const stub = within(slot).getByTestId('footer-stub');
    expect(stub).toBeInTheDocument();
    expect(stub.getAttribute('data-session')).toBe('alpha');
    expect(stub).toHaveTextContent('footer for alpha');
  });

  it('without renderFooterSlot: wrapper renders empty (existing-test compatibility)', () => {
    render(<Tile {...makeProps({ sessionName: 'beta' })} />);
    const slot = screen.getByTestId('tile-footer-slot-beta');
    expect(slot).toBeInTheDocument();
    expect(within(slot).queryByTestId('footer-stub')).not.toBeInTheDocument();
    expect(slot.children.length).toBe(0);
  });

  it('slot wrapper preserves data-slot="footer" attribute (with or without content)', () => {
    const { rerender } = render(<Tile {...makeProps({ sessionName: 'gamma' })} />);
    expect(
      screen.getByTestId('tile-footer-slot-gamma').getAttribute('data-slot'),
    ).toBe('footer');

    rerender(
      <Tile
        {...makeProps({ sessionName: 'gamma' })}
        renderFooterSlot={() => <span data-testid="x">x</span>}
      />,
    );
    expect(
      screen.getByTestId('tile-footer-slot-gamma').getAttribute('data-slot'),
    ).toBe('footer');
  });

  it('renderFooterSlot is called with the tile sessionName (per-tile keyed footer)', () => {
    const fn = vi.fn(() => <div data-testid="footer-stub" />);
    render(<Tile {...makeProps({ sessionName: 'keyed-x' })} renderFooterSlot={fn} />);
    expect(fn).toHaveBeenCalledWith('keyed-x');
  });

  it('LEGACY tile-footer-slot-{name} testid remains in DOM (MB-T12 WB5 contract preserved)', () => {
    render(
      <Tile
        {...makeProps({ sessionName: 'legacy' })}
        renderFooterSlot={() => <div>footer</div>}
      />,
    );
    expect(screen.getByTestId('tile-footer-slot-legacy')).toBeInTheDocument();
  });

  it('footer slot wrapper renders even when tile is collapsed (footer is sibling to body, not inside it)', () => {
    render(
      <Tile
        {...makeProps({ sessionName: 'collapsed-x', collapsed: true })}
        renderFooterSlot={() => <div data-testid="footer-stub">footer content</div>}
      />,
    );
    // Body is hidden when collapsed (existing MB-T12 WB10 behavior)
    expect(screen.queryByTestId('tile-body')).not.toBeInTheDocument();
    // Footer wrapper + content still present (footer is OUTSIDE tile-body's conditional render)
    const slot = screen.getByTestId('tile-footer-slot-collapsed-x');
    expect(slot).toBeInTheDocument();
    expect(within(slot).getByTestId('footer-stub')).toBeInTheDocument();
  });

  it('footer slot wrapper renders AFTER tile-header (DOM order: header → body → footer)', () => {
    render(
      <Tile
        {...makeProps({ sessionName: 'order-x' })}
        renderFooterSlot={() => <div data-testid="footer-stub">footer</div>}
      />,
    );
    const tileRoot = screen.getByTestId('tile-order-x');
    const header = screen.getByTestId('tile-header');
    const body = screen.getByTestId('tile-body');
    const footerSlot = screen.getByTestId('tile-footer-slot-order-x');
    // All three are direct children of tileRoot.
    expect(header.parentElement).toBe(tileRoot);
    expect(body.parentElement).toBe(tileRoot);
    expect(footerSlot.parentElement).toBe(tileRoot);
    // DOM order via .compareDocumentPosition: footerSlot appears AFTER body
    expect(
      footerSlot.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeGreaterThan(0);
  });
});
