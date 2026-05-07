// @vitest-environment happy-dom
//
// MB-T12 WB11a probe-04 — Tile detached-status placeholder rendering:
//   - status='detached' renders <tile-detached-placeholder> inside tile-body
//   - status='detached' does NOT render ConsolePanel inside tile-body
//   - status='open' / 'idle' / 'killed' continue to render ConsolePanel
//   - status='detached' + collapsed=true → no body at all (collapse precedence)
//   - detached tile still has full header chrome (kill/detach/collapse buttons)

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

describe('MB-T12 WB11a — Tile detached placeholder', () => {
  it('status="detached" renders tile-detached-placeholder inside tile-body', () => {
    const props = makeProps({ status: 'detached', collapsed: false });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-body')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('tile-body')).getByTestId(
        'tile-detached-placeholder',
      ),
    ).toBeInTheDocument();
  });

  it('placeholder text mentions reattach guidance', () => {
    const props = makeProps({ status: 'detached', collapsed: false });
    render(<Tile {...props} />);
    const text = screen.getByTestId('tile-detached-placeholder').textContent ?? '';
    expect(text).toMatch(/detached/i);
    expect(text).toMatch(/close|reattach/i);
  });

  it('status="detached" does NOT render ConsolePanel inside tile-body', () => {
    const props = makeProps({ status: 'detached', collapsed: false });
    render(<Tile {...props} />);
    expect(
      within(screen.getByTestId('tile-body')).queryByTestId(
        'console-panel-root',
      ),
    ).not.toBeInTheDocument();
  });

  it('status="open" renders ConsolePanel (regression check)', () => {
    const props = makeProps({ status: 'open', collapsed: false });
    render(<Tile {...props} />);
    expect(
      within(screen.getByTestId('tile-body')).getByTestId('console-panel-root'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('tile-body')).queryByTestId(
        'tile-detached-placeholder',
      ),
    ).not.toBeInTheDocument();
  });

  it('status="idle" renders ConsolePanel (default behavior unchanged)', () => {
    const props = makeProps({ status: 'idle', collapsed: false });
    render(<Tile {...props} />);
    expect(
      within(screen.getByTestId('tile-body')).getByTestId('console-panel-root'),
    ).toBeInTheDocument();
  });

  it('status="killed" renders ConsolePanel (until parent removes the tile)', () => {
    const props = makeProps({ status: 'killed', collapsed: false });
    render(<Tile {...props} />);
    expect(
      within(screen.getByTestId('tile-body')).getByTestId('console-panel-root'),
    ).toBeInTheDocument();
  });

  it('status="detached" + collapsed=true: no body at all (collapse takes precedence)', () => {
    const props = makeProps({ status: 'detached', collapsed: true });
    render(<Tile {...props} />);
    expect(screen.queryByTestId('tile-body')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tile-detached-placeholder')).not.toBeInTheDocument();
  });

  it('detached tile still renders header chrome (kill/detach/collapse buttons)', () => {
    const props = makeProps({ status: 'detached', collapsed: false });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-header')).toBeInTheDocument();
    expect(screen.getByTestId('tile-kill-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tile-detach-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tile-collapse-btn')).toBeInTheDocument();
  });

  it('detached tile data-status reflects "detached" on tile root', () => {
    const props = makeProps({ status: 'detached' });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-sess-x').getAttribute('data-status')).toBe('detached');
  });

  it('toggling status from "open" to "detached" via re-render flips body content', () => {
    const props = makeProps({ status: 'open' });
    const { rerender } = render(<Tile {...props} />);
    expect(
      within(screen.getByTestId('tile-body')).getByTestId('console-panel-root'),
    ).toBeInTheDocument();

    rerender(<Tile {...props} status="detached" />);
    expect(
      within(screen.getByTestId('tile-body')).queryByTestId('console-panel-root'),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('tile-body')).getByTestId('tile-detached-placeholder'),
    ).toBeInTheDocument();
  });
});
