// @vitest-environment happy-dom
//
// MB-T12 WB5 — Tile skeleton tests:
//   - Renders header with session name, status indicator, picker/autopilot/footer slots
//   - Mounts ConsolePanel with the correct targetSessionName
//   - Click handlers (kill, collapse, detach) invoke their callback props
//   - Collapsed=true hides tile body
//   - Status prop reflects on tile-status-indicator's data-status attribute

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { Tile } from '../../../src/tile-grid/tile.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function makeProps(overrides: Partial<React.ComponentProps<typeof Tile>> = {}) {
  const fake = makeFakeConsoleBridge();
  const adapter = makeFakeTerminalAdapter();
  return {
    fake,
    adapter,
    props: {
      sessionName: 'sess-x',
      consoleBridge: fake.bridge,
      createTerminal: () => adapter,
      collapsed: false,
      onKill: vi.fn(),
      onCollapse: vi.fn(),
      onDetach: vi.fn(),
      ...overrides,
    } as React.ComponentProps<typeof Tile>,
  };
}

describe('MB-T12 WB5 — Tile skeleton renders all chrome + slots', () => {
  it('renders the tile root with data-testid keyed by sessionName', () => {
    const { props } = makeProps({ sessionName: 'alpha' });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-alpha')).toBeInTheDocument();
  });

  it('renders session name in tile-session-name label', () => {
    const { props } = makeProps({ sessionName: 'beta' });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-session-name')).toHaveTextContent('beta');
  });

  it('renders all three header buttons (kill, collapse, detach)', () => {
    const { props } = makeProps();
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-kill-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tile-collapse-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tile-detach-btn')).toBeInTheDocument();
  });

  it('renders picker, autopilot, and footer placeholder slots', () => {
    const { props } = makeProps({ sessionName: 'gamma' });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-picker-slot-gamma')).toBeInTheDocument();
    expect(screen.getByTestId('tile-autopilot-slot-gamma')).toBeInTheDocument();
    expect(screen.getByTestId('tile-footer-slot-gamma')).toBeInTheDocument();
  });

  it('picker/autopilot/footer slots have data-slot attribute set for MB-T16/T17/T18 lookup', () => {
    const { props } = makeProps({ sessionName: 'delta' });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-picker-slot-delta').getAttribute('data-slot')).toBe('picker');
    expect(screen.getByTestId('tile-autopilot-slot-delta').getAttribute('data-slot')).toBe('autopilot');
    expect(screen.getByTestId('tile-footer-slot-delta').getAttribute('data-slot')).toBe('footer');
  });

  it('mounts ConsolePanel inside tile-body with matching targetSessionName', () => {
    const { props, fake } = makeProps({ sessionName: 'epsilon' });
    render(<Tile {...props} />);
    const body = screen.getByTestId('tile-body');
    // ConsolePanel renders a panel-root inside the body.
    expect(within(body).getByTestId('console-panel-root')).toBeInTheDocument();
    // Initially in idle (no console:open emitted yet).
    expect(within(body).getByTestId('console-panel-empty')).toBeInTheDocument();

    // Confirm the panel is bound to "epsilon" by emitting console:open
    // for that session and asserting the header surfaces.
    act(() => {
      fake.emitOpen({ sessionName: 'epsilon' });
    });
    expect(within(body).getByTestId('console-panel-header')).toHaveTextContent('epsilon');
  });
});

describe('MB-T12 WB5 — Tile click handlers invoke callback props', () => {
  it('kill button click calls onKill with the sessionName', () => {
    const { props } = makeProps({ sessionName: 'sess-kill' });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-kill-btn'));
    expect(props.onKill).toHaveBeenCalledTimes(1);
    expect(props.onKill).toHaveBeenCalledWith('sess-kill');
  });

  it('collapse button click calls onCollapse with the sessionName', () => {
    const { props } = makeProps({ sessionName: 'sess-collapse' });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-collapse-btn'));
    expect(props.onCollapse).toHaveBeenCalledTimes(1);
    expect(props.onCollapse).toHaveBeenCalledWith('sess-collapse');
  });

  it('detach button click calls onDetach with the sessionName', () => {
    const { props } = makeProps({ sessionName: 'sess-detach' });
    render(<Tile {...props} />);
    fireEvent.click(screen.getByTestId('tile-detach-btn'));
    expect(props.onDetach).toHaveBeenCalledTimes(1);
    expect(props.onDetach).toHaveBeenCalledWith('sess-detach');
  });

  it('callbacks do not fire on initial render', () => {
    const { props } = makeProps();
    render(<Tile {...props} />);
    expect(props.onKill).not.toHaveBeenCalled();
    expect(props.onCollapse).not.toHaveBeenCalled();
    expect(props.onDetach).not.toHaveBeenCalled();
  });
});

describe('MB-T12 WB5 — Tile collapsed state', () => {
  it('collapsed=true hides tile-body (ConsolePanel does not render)', () => {
    const { props } = makeProps({ collapsed: true });
    render(<Tile {...props} />);
    expect(screen.queryByTestId('tile-body')).not.toBeInTheDocument();
    expect(screen.queryByTestId('console-panel-root')).not.toBeInTheDocument();
  });

  it('collapsed=false renders tile-body containing ConsolePanel', () => {
    const { props } = makeProps({ collapsed: false });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-body')).toBeInTheDocument();
    expect(screen.getByTestId('console-panel-root')).toBeInTheDocument();
  });

  it('header (kill/detach/collapse buttons) remains visible when collapsed=true', () => {
    const { props } = makeProps({ collapsed: true });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-header')).toBeInTheDocument();
    expect(screen.getByTestId('tile-kill-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tile-collapse-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tile-detach-btn')).toBeInTheDocument();
  });

  it('collapse button label is "Collapse" when collapsed=false', () => {
    const { props } = makeProps({ collapsed: false });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-collapse-btn')).toHaveTextContent('Collapse');
  });

  it('collapse button label is "Expand" when collapsed=true', () => {
    const { props } = makeProps({ collapsed: true });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-collapse-btn')).toHaveTextContent('Expand');
  });

  it('data-collapsed attribute on tile root reflects collapsed prop', () => {
    const { props } = makeProps({ sessionName: 'sess-c', collapsed: true });
    const { rerender } = render(<Tile {...props} />);
    expect(screen.getByTestId('tile-sess-c').getAttribute('data-collapsed')).toBe('true');
    rerender(<Tile {...props} collapsed={false} />);
    expect(screen.getByTestId('tile-sess-c').getAttribute('data-collapsed')).toBe('false');
  });
});

describe('MB-T12 WB5 — Tile status indicator', () => {
  it('default status is "idle" when no status prop passed', () => {
    const { props } = makeProps();
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-status-indicator').getAttribute('data-status')).toBe('idle');
  });

  it('status="open" reflects on tile-status-indicator', () => {
    const { props } = makeProps({ status: 'open' });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-status-indicator').getAttribute('data-status')).toBe('open');
  });

  it('status="killed" reflects on tile-status-indicator', () => {
    const { props } = makeProps({ status: 'killed' });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-status-indicator').getAttribute('data-status')).toBe('killed');
  });

  it('status="detached" reflects on tile-status-indicator', () => {
    const { props } = makeProps({ status: 'detached' });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-status-indicator').getAttribute('data-status')).toBe('detached');
  });

  it('tile root data-status mirrors the status prop', () => {
    const { props } = makeProps({ sessionName: 'foo', status: 'killed' });
    render(<Tile {...props} />);
    expect(screen.getByTestId('tile-foo').getAttribute('data-status')).toBe('killed');
  });
});
