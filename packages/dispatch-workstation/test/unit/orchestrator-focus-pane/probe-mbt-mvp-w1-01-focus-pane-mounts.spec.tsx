// @vitest-environment happy-dom
//
// MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE WB1 probe-01 — FocusPane mounts.
//
// Verifies the minimum-shape contract for the Component-1 surface
// (operator-vision 23b4362 §"Component 1 — orchestrator-focus-pane"):
//
//   - <FocusPane /> renders without throwing
//   - Root element has data-testid="orchestrator-focus-pane-root"
//   - Streaming body container exists at data-testid="orchestrator-focus-pane-body"
//   - Header chrome anchor exists at data-testid="orchestrator-focus-pane-header"
//   - createTerminal prop is invoked exactly once on mount
//   - Terminal adapter's open(container) lands on the body element
//   - Terminal adapter's dispose() fires on unmount (subscription lifecycle)
//
// Pre-WB2 the IPC subscription is NOT wired (no ptyChunk handler exercised);
// that contract belongs to probe-02. This probe asserts ONLY that the
// renderer surface mounts cleanly and bridges to the xterm-style adapter.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusPane } from '../../../src/orchestrator-focus-pane/focus-pane.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

describe('MB-T-MVP-W1 WB1 — FocusPane mounts', () => {
  it('renders without throwing and exposes the focus-pane-root sentinel', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    expect(() =>
      render(<FocusPane createTerminal={createTerminal} />),
    ).not.toThrow();

    expect(screen.getByTestId('orchestrator-focus-pane-root')).toBeInTheDocument();
  });

  it('exposes the streaming body container at data-testid="orchestrator-focus-pane-body"', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    render(<FocusPane createTerminal={createTerminal} />);
    expect(screen.getByTestId('orchestrator-focus-pane-body')).toBeInTheDocument();
  });

  it('exposes the header chrome anchor at data-testid="orchestrator-focus-pane-header"', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    render(<FocusPane createTerminal={createTerminal} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header')).toBeInTheDocument();
  });

  it('invokes createTerminal exactly once on mount', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    render(<FocusPane createTerminal={createTerminal} />);
    expect(createTerminal).toHaveBeenCalledTimes(1);
  });

  it('terminal adapter open() lands on the focus-pane-body element', () => {
    const adapter = makeFakeTerminalAdapter();
    const createTerminal = vi.fn(() => adapter);
    render(<FocusPane createTerminal={createTerminal} />);

    const body = screen.getByTestId('orchestrator-focus-pane-body');
    expect(adapter.openedOn).toBe(body);
  });

  it('disposes the terminal adapter on unmount', () => {
    const adapter = makeFakeTerminalAdapter();
    const createTerminal = vi.fn(() => adapter);
    const { unmount } = render(<FocusPane createTerminal={createTerminal} />);

    expect(adapter.disposed).toBe(false);
    unmount();
    expect(adapter.disposed).toBe(true);
  });
});
