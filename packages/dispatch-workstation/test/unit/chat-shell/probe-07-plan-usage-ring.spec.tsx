// @vitest-environment happy-dom
//
// MB-T25 WB1 — probe-07 RED: PlanUsageRing render + bridge subscription.
//
// Operator-confirmed at HALT 0 (2026-05-08): Outcome A (headers exposed)
// 5-WB ladder; bridge surface `coarchitectBridge.onRateLimitUpdate(cb)`;
// data contract `RateLimitState` with 4 nested-bucket dimensions.
//
// Asserts the WB3 GREEN contract:
//   1. Renders chat-shell-plan-usage-slot wrapper element
//   2. Renders chat-shell-plan-usage-countdown with em-dash "—" placeholder
//      when no bridge supplied
//   3. Renders em-dash placeholder when bridge is null
//   4. Subscribes to bridge.onRateLimitUpdate at mount
//   5. Updates display when bridge invokes the callback with RateLimitState
//   6. Calls cleanup-fn on unmount
//
// At WB1 (RED), assertions 1 passes incidentally (scaffold renders the
// wrapper) but assertions 2-6 FAIL because the WB1 plan-usage-ring.tsx
// scaffold:
//   - Renders "WB1 RED scaffold" text instead of "—" placeholder
//   - Does not subscribe (no useEffect call site)
//   - Does not hold/update state from cb invocations
//   - Does not return cleanup-fn from useEffect
//
// WB3 GREEN replaces the stub.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  PlanUsageRing,
  type PlanUsageRingBridge,
} from '../../../src/chat-shell/plan-usage-ring.js';
import type { RateLimitState } from '../../../src/chat-shell/ring-helpers.js';

const fixtureState: RateLimitState = {
  requests: { limit: 1000, remaining: 600, reset: 1_700_000_000_000 },
  tokens: { limit: 2_000_000, remaining: 1_400_000, reset: 1_700_000_000_000 },
  inputTokens: {
    limit: 1_000_000,
    remaining: 750_000,
    reset: 1_700_000_000_000,
  },
  outputTokens: {
    limit: 500_000,
    remaining: 400_000,
    reset: 1_700_000_000_000,
  },
};

describe('MB-T25 WB1 — PlanUsageRing render', () => {
  it('renders chat-shell-plan-usage-slot wrapper', () => {
    render(<PlanUsageRing />);
    expect(screen.getByTestId('chat-shell-plan-usage-slot')).toBeInTheDocument();
  });

  it('renders em-dash placeholder when no bridge is supplied', () => {
    render(<PlanUsageRing />);
    const countdown = screen.getByTestId('chat-shell-plan-usage-countdown');
    expect(countdown).toHaveTextContent('—');
  });

  it('renders em-dash placeholder when bridge is null', () => {
    render(<PlanUsageRing bridge={null} />);
    expect(
      screen.getByTestId('chat-shell-plan-usage-countdown'),
    ).toHaveTextContent('—');
  });
});

describe('MB-T25 WB1 — PlanUsageRing bridge subscription', () => {
  it('subscribes to bridge.onRateLimitUpdate at mount', () => {
    const onRateLimitUpdate = vi.fn().mockReturnValue(() => {});
    const bridge: PlanUsageRingBridge = { onRateLimitUpdate };
    render(<PlanUsageRing bridge={bridge} />);
    expect(onRateLimitUpdate).toHaveBeenCalledTimes(1);
  });

  it('updates countdown text when bridge invokes the callback with RateLimitState', () => {
    let captured: ((state: RateLimitState) => void) | null = null;
    const onRateLimitUpdate = vi.fn(
      (cb: (state: RateLimitState) => void) => {
        captured = cb;
        return () => {};
      },
    );
    render(<PlanUsageRing bridge={{ onRateLimitUpdate }} />);
    expect(captured).not.toBeNull();
    act(() => {
      captured!(fixtureState);
    });
    // Em-dash should no longer be present after live data fires;
    // countdown should show "Hh MMm" format. Real-impl computes
    // Hh MMm from fixtureState.tokens.reset relative to Date.now();
    // assertion narrows to "no longer em-dash" rather than locking a
    // specific Hh-MMm value (deterministic value depends on
    // Date.now() at test execution time).
    expect(
      screen.getByTestId('chat-shell-plan-usage-countdown'),
    ).not.toHaveTextContent('—');
  });

  it('calls cleanup-fn on unmount', () => {
    const cleanup = vi.fn();
    const onRateLimitUpdate = vi.fn().mockReturnValue(cleanup);
    const { unmount } = render(
      <PlanUsageRing bridge={{ onRateLimitUpdate }} />,
    );
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
