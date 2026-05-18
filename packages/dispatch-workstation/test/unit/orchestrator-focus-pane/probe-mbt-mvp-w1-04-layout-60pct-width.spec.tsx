// @vitest-environment happy-dom
//
// MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE WB4 probe-04 — Layout ~60% width overlay.
//
// Per arbitration Q-MVP-W1-6=(c) (operator ack 17:55 MDT): fixed-position
// overlay strategy. The FocusPane attaches via CSS position:fixed with
// width:60vw rather than integrating into workstation-shell.html's
// flex layout (which is READ-ONLY per manifest territory).
//
// Per Q-MVP-W1-7=(a): shared-window mount (auto-mount into a body-level
// fixed-position div from focus-pane bundle, no separate BrowserWindow).
//
// Subsequent waves replace the existing UI (tab-strip, kanban-column)
// per operator vision §"REPLACES current tab-strip" — so overlay-obscuring
// is an acceptable trajectory per gen-7 V4 §C(VIII) coarch-authority ack.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusPane } from '../../../src/orchestrator-focus-pane/focus-pane.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

describe('MB-T-MVP-W1 WB4 — FocusPane overlay layout (Q6=(c))', () => {
  it('root has position:fixed (overlay above shell content)', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    render(<FocusPane createTerminal={createTerminal} />);
    const root = screen.getByTestId('orchestrator-focus-pane-root');
    expect(root.style.position).toBe('fixed');
  });

  it('root has width:60vw (~60% viewport width per operator vision §Component 1)', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    render(<FocusPane createTerminal={createTerminal} />);
    const root = screen.getByTestId('orchestrator-focus-pane-root');
    expect(root.style.width).toBe('60vw');
  });

  it('root has a non-auto z-index (overlay layering)', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    render(<FocusPane createTerminal={createTerminal} />);
    const root = screen.getByTestId('orchestrator-focus-pane-root');
    const z = root.style.zIndex;
    expect(z).not.toBe('');
    expect(z).not.toBe('auto');
  });

  it('root has explicit height (bordered visual frame per operator vision)', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    render(<FocusPane createTerminal={createTerminal} />);
    const root = screen.getByTestId('orchestrator-focus-pane-root');
    expect(root.style.height).not.toBe('');
  });
});

describe('MB-T-MVP-W1 WB4 — FocusPane body-root containment', () => {
  it('focus-pane-body element is a descendant of focus-pane-root', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    render(<FocusPane createTerminal={createTerminal} />);
    const root = screen.getByTestId('orchestrator-focus-pane-root');
    const body = screen.getByTestId('orchestrator-focus-pane-body');
    expect(root.contains(body)).toBe(true);
  });

  it('focus-pane-header element is a descendant of focus-pane-root', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    render(<FocusPane createTerminal={createTerminal} />);
    const root = screen.getByTestId('orchestrator-focus-pane-root');
    const header = screen.getByTestId('orchestrator-focus-pane-header');
    expect(root.contains(header)).toBe(true);
  });

  it('header chrome anchors (pid/uptime/cpu/budget) live inside the focus-pane root', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    render(<FocusPane createTerminal={createTerminal} />);
    const root = screen.getByTestId('orchestrator-focus-pane-root');
    expect(root.contains(screen.getByTestId('orchestrator-focus-pane-header-pid'))).toBe(true);
    expect(root.contains(screen.getByTestId('orchestrator-focus-pane-header-uptime'))).toBe(true);
    expect(root.contains(screen.getByTestId('orchestrator-focus-pane-header-cpu'))).toBe(true);
    expect(root.contains(screen.getByTestId('orchestrator-focus-pane-header-budget'))).toBe(true);
  });
});

describe('MB-T-MVP-W1 WB4 — FocusPane accepts spawnedAtMs prop (header pass-through)', () => {
  it('passing spawnedAtMs renders live uptime in the header (5m elapsed)', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    const spawnedAtMs = 1_700_000_000_000;
    const nowMs = spawnedAtMs + 5 * 60_000;
    render(<FocusPane createTerminal={createTerminal} spawnedAtMs={spawnedAtMs} nowMs={nowMs} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent('5m');
  });

  it('omitting spawnedAtMs leaves uptime as em-dash placeholder', () => {
    const createTerminal = vi.fn(() => makeFakeTerminalAdapter());
    render(<FocusPane createTerminal={createTerminal} nowMs={Date.now()} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent('—');
  });
});
