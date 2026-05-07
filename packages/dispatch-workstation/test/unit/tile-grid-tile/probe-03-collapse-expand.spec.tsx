// @vitest-environment happy-dom
//
// MB-T12 WB10 probe-03 — Tile collapse/expand visual + click-to-expand UX:
//   - collapsed=true sets inline style height:40px + overflow:hidden
//   - collapsed=true sets alignSelf:start so tile sits at top of its grid cell
//   - collapsed=false has no inline tile-root height/overflow style
//   - collapsed tile click (anywhere except interactive elements) → onCollapse
//   - collapsed tile click on kill button does NOT fire onCollapse (filter ok)
//   - expanded tile click does NOT fire onCollapse (no handler when expanded)

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

describe('MB-T12 WB10 — Tile collapsed visual style', () => {
  it('collapsed=true sets inline height:40px on tile root', () => {
    const props = makeProps({ sessionName: 'col-a', collapsed: true });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-col-a').style.height).toBe('40px');
  });

  it('collapsed=true sets inline overflow:hidden on tile root', () => {
    const props = makeProps({ sessionName: 'col-b', collapsed: true });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-col-b').style.overflow).toBe('hidden');
  });

  it('collapsed=true sets alignSelf:start so tile pins to top of grid cell', () => {
    const props = makeProps({ sessionName: 'col-c', collapsed: true });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-col-c').style.alignSelf).toBe('start');
  });

  it('collapsed=false has no inline height set on tile root', () => {
    const props = makeProps({ sessionName: 'exp-a', collapsed: false });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-exp-a').style.height).toBe('');
  });

  it('collapsed=false has no inline overflow set on tile root', () => {
    const props = makeProps({ sessionName: 'exp-b', collapsed: false });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-exp-b').style.overflow).toBe('');
  });
});

describe('MB-T12 WB10 — Click collapsed tile to expand', () => {
  it('click on collapsed tile root background → onCollapse(sessionName)', () => {
    const onCollapse = vi.fn();
    const props = makeProps({
      sessionName: 'click-bg',
      collapsed: true,
      onCollapse,
    });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-click-bg'));
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledWith('click-bg');
  });

  it('click on collapsed tile session-name label → onCollapse', () => {
    const onCollapse = vi.fn();
    const props = makeProps({
      sessionName: 'click-name',
      collapsed: true,
      onCollapse,
    });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-session-name'));
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledWith('click-name');
  });

  it('click on collapsed tile status indicator → onCollapse', () => {
    const onCollapse = vi.fn();
    const props = makeProps({
      sessionName: 'click-status',
      collapsed: true,
      onCollapse,
    });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-status-indicator'));
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledWith('click-status');
  });

  it('click on collapsed tile kill button → onKill, NOT a duplicate onCollapse', () => {
    const onCollapse = vi.fn();
    const onKill = vi.fn();
    const props = makeProps({
      sessionName: 'click-kill',
      collapsed: true,
      onCollapse,
      onKill,
    });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-kill-btn'));
    expect(onKill).toHaveBeenCalledTimes(1);
    expect(onKill).toHaveBeenCalledWith('click-kill');
    // The interactive-target filter prevents the tile-root onClick from
    // firing when the click was on the kill button.
    expect(onCollapse).not.toHaveBeenCalled();
  });

  it('click on collapsed tile detach button → onDetach, NOT onCollapse', () => {
    const onCollapse = vi.fn();
    const onDetach = vi.fn();
    const props = makeProps({
      sessionName: 'click-detach',
      collapsed: true,
      onCollapse,
      onDetach,
    });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-detach-btn'));
    expect(onDetach).toHaveBeenCalledTimes(1);
    expect(onCollapse).not.toHaveBeenCalled();
  });

  it('click on collapsed tile collapse button → onCollapse fires once (not twice)', () => {
    const onCollapse = vi.fn();
    const props = makeProps({
      sessionName: 'click-collapse-btn',
      collapsed: true,
      onCollapse,
    });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-collapse-btn'));
    // The button's onClick fires onCollapse. The tile-root onClick is
    // gated by isInteractiveTarget — the click was on a button, so the
    // root handler skips. Net: 1 onCollapse call.
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledWith('click-collapse-btn');
  });
});

describe('MB-T12 WB10 — Expanded tile click does NOT fire onCollapse', () => {
  it('click on expanded tile root → onCollapse not fired (handler omitted)', () => {
    const onCollapse = vi.fn();
    const props = makeProps({
      sessionName: 'exp-click',
      collapsed: false,
      onCollapse,
    });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-exp-click'));
    expect(onCollapse).not.toHaveBeenCalled();
  });

  it('click on expanded tile body (ConsolePanel area) → onCollapse not fired', () => {
    const onCollapse = vi.fn();
    const props = makeProps({
      sessionName: 'exp-body',
      collapsed: false,
      onCollapse,
    });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-body'));
    expect(onCollapse).not.toHaveBeenCalled();
  });

  it('expanded tile collapse-button click still fires onCollapse (only path)', () => {
    const onCollapse = vi.fn();
    const props = makeProps({
      sessionName: 'exp-via-btn',
      collapsed: false,
      onCollapse,
    });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-collapse-btn'));
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledWith('exp-via-btn');
  });
});
