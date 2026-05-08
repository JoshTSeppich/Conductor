// @vitest-environment happy-dom
//
// MB-T26 WB3 — probe-01: CostMeter render + bridge subscription.
//
// Operator-confirmed Q-MBT26-1=a (header-bar slot model) + Q-MBT26-5=d
// (push-based via onCostUpdate bridge method) 2026-05-07.
//
// Asserts:
//   1. Renders chat-shell-cost-meter-slot wrapper
//   2. Renders chat-shell-cost-meter-value with em-dash placeholder when
//      no bridge supplied
//   3. Subscribes to bridge.onCostUpdate at mount
//   4. Updates display when callback fires with a number
//   5. Calls cleanup-fn on unmount

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CostMeter } from '../../../src/chat-shell/cost-meter.js';

describe('MB-T26 WB3 — CostMeter render', () => {
  it('renders chat-shell-cost-meter-slot wrapper', () => {
    render(<CostMeter />);
    expect(screen.getByTestId('chat-shell-cost-meter-slot')).toBeInTheDocument();
  });

  it('renders em-dash placeholder when no bridge is supplied', () => {
    render(<CostMeter />);
    const value = screen.getByTestId('chat-shell-cost-meter-value');
    expect(value).toHaveTextContent('—');
  });

  it('renders em-dash placeholder when bridge is null', () => {
    render(<CostMeter bridge={null} />);
    expect(screen.getByTestId('chat-shell-cost-meter-value')).toHaveTextContent('—');
  });
});

describe('MB-T26 WB3 — CostMeter bridge subscription', () => {
  it('subscribes to bridge.onCostUpdate at mount', () => {
    const onCostUpdate = vi.fn().mockReturnValue(() => {});
    render(<CostMeter bridge={{ onCostUpdate }} />);
    expect(onCostUpdate).toHaveBeenCalledTimes(1);
  });

  it('updates display when bridge invokes the callback with a number', () => {
    let captured: ((total: number) => void) | null = null;
    const onCostUpdate = vi.fn((cb: (total: number) => void) => {
      captured = cb;
      return () => {};
    });
    render(<CostMeter bridge={{ onCostUpdate }} />);
    expect(captured).not.toBeNull();
    act(() => {
      captured!(0.0123);
    });
    expect(screen.getByTestId('chat-shell-cost-meter-value')).toHaveTextContent(
      '$0.0123',
    );
  });

  it('formats the cost to 4 decimal places', () => {
    let captured: ((total: number) => void) | null = null;
    const onCostUpdate = vi.fn((cb: (total: number) => void) => {
      captured = cb;
      return () => {};
    });
    render(<CostMeter bridge={{ onCostUpdate }} />);
    act(() => {
      captured!(1.5);
    });
    expect(screen.getByTestId('chat-shell-cost-meter-value')).toHaveTextContent(
      '$1.5000',
    );
  });

  it('calls cleanup-fn on unmount', () => {
    const cleanup = vi.fn();
    const onCostUpdate = vi.fn().mockReturnValue(cleanup);
    const { unmount } = render(<CostMeter bridge={{ onCostUpdate }} />);
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
