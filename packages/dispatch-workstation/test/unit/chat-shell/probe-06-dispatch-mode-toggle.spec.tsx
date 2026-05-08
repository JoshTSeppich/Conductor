// @vitest-environment happy-dom
//
// MB-T24 WB1 RED — probe-06: DispatchModeToggle render + bridge interaction.
//
// Operator-confirmed Q-MBT24-3=a (two-button segmented control) +
// Q-MBT24-6=c (NEW dispatchModeBridge — getDispatchMode + setDispatchMode)
// + Q-MBT24-7=a (DispatchMode = 'auto' | 'ask') 2026-05-08.
//
// Asserts (eventual GREEN behavior at WB3):
//   1. Renders chat-shell-dispatch-mode-toggle-slot wrapper
//   2. Renders both segmented buttons (auto + ask)
//   3. Calls bridge.getDispatchMode at mount (initial-state read)
//   4. Reflects bridge-returned mode via aria-pressed on the active button
//   5. Click on inactive button calls bridge.setDispatchMode with new mode
//   6. After successful setDispatchMode, aria-pressed flips to clicked button
//   7. With no bridge supplied: renders 'ask' as the default-active state
//      (Q-MBT24-2=a default + non-interactive fallback)
//   8. Click on the already-active button is a no-op (no setDispatchMode call)
//
// WB1 RED: only test 1 (wrapper testid present) passes. Tests 2-8 fail
// because scaffold returns only the slot wrapper (no buttons, no bridge
// interaction). probe-06 turns GREEN at WB3 when buttons + handlers land.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { DispatchModeToggle } from '../../../src/chat-shell/dispatch-mode-toggle.js';
import type { DispatchModeBridge } from '../../../src/chat-shell/dispatch-mode-toggle.js';
import type { DispatchMode } from '../../../src/main/dispatch-mode-store.js';

function makeBridge(initial: DispatchMode = 'ask'): {
  bridge: DispatchModeBridge;
  getCalls: ReturnType<typeof vi.fn>;
  setCalls: ReturnType<typeof vi.fn>;
} {
  const getCalls = vi.fn(async () => initial);
  const setCalls = vi.fn(async (mode: DispatchMode) => mode);
  return {
    bridge: {
      getDispatchMode: getCalls,
      setDispatchMode: setCalls,
    },
    getCalls,
    setCalls,
  };
}

describe('MB-T24 WB1 — DispatchModeToggle render', () => {
  it('renders chat-shell-dispatch-mode-toggle-slot wrapper', () => {
    render(<DispatchModeToggle />);
    expect(
      screen.getByTestId('chat-shell-dispatch-mode-toggle-slot'),
    ).toBeInTheDocument();
  });

  it('renders both segmented buttons (auto + ask)', () => {
    render(<DispatchModeToggle />);
    expect(
      screen.getByTestId('chat-shell-dispatch-mode-toggle-auto'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('chat-shell-dispatch-mode-toggle-ask'),
    ).toBeInTheDocument();
  });

  it("with no bridge: renders 'ask' as the default-active state (Q-MBT24-2=a)", () => {
    render(<DispatchModeToggle />);
    const askBtn = screen.getByTestId('chat-shell-dispatch-mode-toggle-ask');
    const autoBtn = screen.getByTestId('chat-shell-dispatch-mode-toggle-auto');
    expect(askBtn).toHaveAttribute('aria-pressed', 'true');
    expect(autoBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it("with bridge null: renders 'ask' default (no fetch attempted)", () => {
    render(<DispatchModeToggle bridge={null} />);
    const askBtn = screen.getByTestId('chat-shell-dispatch-mode-toggle-ask');
    expect(askBtn).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('MB-T24 WB1 — DispatchModeToggle bridge interaction', () => {
  it('calls bridge.getDispatchMode at mount', async () => {
    const { bridge, getCalls } = makeBridge('auto');
    await act(async () => {
      render(<DispatchModeToggle bridge={bridge} />);
    });
    expect(getCalls).toHaveBeenCalledTimes(1);
  });

  it('reflects bridge-returned mode via aria-pressed on the active button', async () => {
    const { bridge } = makeBridge('auto');
    await act(async () => {
      render(<DispatchModeToggle bridge={bridge} />);
    });
    const autoBtn = screen.getByTestId('chat-shell-dispatch-mode-toggle-auto');
    const askBtn = screen.getByTestId('chat-shell-dispatch-mode-toggle-ask');
    expect(autoBtn).toHaveAttribute('aria-pressed', 'true');
    expect(askBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('click on inactive button calls bridge.setDispatchMode with new mode', async () => {
    const { bridge, setCalls } = makeBridge('ask');
    await act(async () => {
      render(<DispatchModeToggle bridge={bridge} />);
    });
    const autoBtn = screen.getByTestId('chat-shell-dispatch-mode-toggle-auto');
    await act(async () => {
      fireEvent.click(autoBtn);
    });
    expect(setCalls).toHaveBeenCalledTimes(1);
    expect(setCalls).toHaveBeenCalledWith('auto');
  });

  it('after successful setDispatchMode, aria-pressed flips to clicked button', async () => {
    const { bridge } = makeBridge('ask');
    await act(async () => {
      render(<DispatchModeToggle bridge={bridge} />);
    });
    const autoBtn = screen.getByTestId('chat-shell-dispatch-mode-toggle-auto');
    const askBtn = screen.getByTestId('chat-shell-dispatch-mode-toggle-ask');
    await act(async () => {
      fireEvent.click(autoBtn);
    });
    expect(autoBtn).toHaveAttribute('aria-pressed', 'true');
    expect(askBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('click on the already-active button is a no-op (no setDispatchMode call)', async () => {
    const { bridge, setCalls } = makeBridge('ask');
    await act(async () => {
      render(<DispatchModeToggle bridge={bridge} />);
    });
    const askBtn = screen.getByTestId('chat-shell-dispatch-mode-toggle-ask');
    await act(async () => {
      fireEvent.click(askBtn);
    });
    expect(setCalls).not.toHaveBeenCalled();
  });
});
