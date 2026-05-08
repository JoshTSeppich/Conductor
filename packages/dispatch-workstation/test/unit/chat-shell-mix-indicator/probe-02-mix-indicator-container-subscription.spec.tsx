// @vitest-environment happy-dom
//
// MB-T27 WB2 GREEN — MixIndicatorContainer subscription tests (probe-02).
//
// Operator-confirmed dispositions exercised:
//   - Q-MBT27-3=a: bridge.onSpawnResult subscription model
//     (preload.mts UNCHANGED).
//   - Q-MBT27-5=a: undefined / unmapped models NOT counted in any
//     chip ("unknown" bucket).
//
// Coverage:
//   - Initial render with no bridge / null bridge → empty session list
//     → all chips at 0 (zero-state preserved).
//   - Subscribes to bridge.onSpawnResult on mount.
//   - Spawn-success reply with `model` field increments matching chip.
//   - Multiple replies group correctly across all 4 chips.
//   - Idempotent on duplicate sessionName (daemon recovery re-fires).
//   - Ignores non-success / malformed / null / undefined replies.
//   - Reply with no model field is NOT counted (Q-MBT27-5=a).
//   - Cleanup fn returned by onSpawnResult is invoked on unmount.
//
// All 9 tests PASS at WB2 GREEN.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  MixIndicatorContainer,
  type ModelMixBridge,
} from '../../../src/chat-shell/mix-indicator.js';

function makeFakeBridge() {
  const callbacks: ((reply: unknown) => void)[] = [];
  const cleanup = vi.fn();
  const bridge: ModelMixBridge = {
    onSpawnResult: (cb) => {
      callbacks.push(cb);
      return cleanup;
    },
  };
  return {
    bridge,
    fire(reply: unknown) {
      for (const cb of callbacks) cb(reply);
    },
    cleanup,
  };
}

describe('MB-T27 WB2 GREEN — MixIndicatorContainer subscription (probe-02)', () => {
  it('renders zero-state chips when no bridge supplied', () => {
    render(<MixIndicatorContainer />);
    expect(screen.getByTestId('mix-indicator-root')).toBeInTheDocument();
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O471M-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-H-count')).toHaveTextContent('0');
  });

  it('renders zero-state chips when bridge=null', () => {
    render(<MixIndicatorContainer bridge={null} />);
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('0');
  });

  it('subscribes to bridge.onSpawnResult exactly once on mount', () => {
    const onSpawnResult = vi.fn(() => () => {});
    render(<MixIndicatorContainer bridge={{ onSpawnResult }} />);
    expect(onSpawnResult).toHaveBeenCalledTimes(1);
  });

  it('increments S46 chip count on spawn-success reply with sonnet-4-6 model', () => {
    const fake = makeFakeBridge();
    render(<MixIndicatorContainer bridge={fake.bridge} />);
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('0');
    act(() => {
      fake.fire({
        type: 'success',
        result: { sessionName: 'sess-1', model: 'claude-sonnet-4-6' },
      });
    });
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('1');
    expect(screen.getByTestId('mix-indicator-chip-O46-count')).toHaveTextContent('0');
  });

  it('groups multiple spawn-success replies across all 4 chips', () => {
    const fake = makeFakeBridge();
    render(<MixIndicatorContainer bridge={fake.bridge} />);
    act(() => {
      fake.fire({
        type: 'success',
        result: { sessionName: 's1', model: 'claude-sonnet-4-6' },
      });
      fake.fire({
        type: 'success',
        result: { sessionName: 's2', model: 'claude-opus-4-6' },
      });
      fake.fire({
        type: 'success',
        result: { sessionName: 's3', model: 'claude-opus-4-7-1m-context' },
      });
      fake.fire({
        type: 'success',
        result: { sessionName: 's4', model: 'claude-haiku-4-5' },
      });
    });
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('1');
    expect(screen.getByTestId('mix-indicator-chip-O46-count')).toHaveTextContent('1');
    expect(screen.getByTestId('mix-indicator-chip-O471M-count')).toHaveTextContent('1');
    expect(screen.getByTestId('mix-indicator-chip-H-count')).toHaveTextContent('1');
  });

  it('is idempotent: duplicate sessionName does not double-count', () => {
    const fake = makeFakeBridge();
    render(<MixIndicatorContainer bridge={fake.bridge} />);
    act(() => {
      fake.fire({
        type: 'success',
        result: { sessionName: 'sess-1', model: 'claude-sonnet-4-6' },
      });
      fake.fire({
        type: 'success',
        result: { sessionName: 'sess-1', model: 'claude-sonnet-4-6' },
      });
    });
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('1');
  });

  it('ignores non-success / malformed / null / undefined replies', () => {
    const fake = makeFakeBridge();
    render(<MixIndicatorContainer bridge={fake.bridge} />);
    act(() => {
      fake.fire({ type: 'failure', error: 'spawn failed' });
      fake.fire({ malformed: true });
      fake.fire(null);
      fake.fire(undefined);
      fake.fire({ type: 'success' }); // missing result
      fake.fire({ type: 'success', result: {} }); // missing sessionName
      fake.fire({ type: 'success', result: { sessionName: '' } }); // empty
    });
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O471M-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-H-count')).toHaveTextContent('0');
  });

  it('does NOT count session when reply has no model field (Q-MBT27-5=a)', () => {
    const fake = makeFakeBridge();
    render(<MixIndicatorContainer bridge={fake.bridge} />);
    act(() => {
      fake.fire({ type: 'success', result: { sessionName: 'sess-1' } });
      fake.fire({ type: 'success', result: { sessionName: 'sess-2', cwd: '/repo' } });
    });
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O471M-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-H-count')).toHaveTextContent('0');
  });

  it('cleanup fn returned by onSpawnResult is invoked on unmount', () => {
    const fake = makeFakeBridge();
    const { unmount } = render(<MixIndicatorContainer bridge={fake.bridge} />);
    expect(fake.cleanup).not.toHaveBeenCalled();
    unmount();
    expect(fake.cleanup).toHaveBeenCalledTimes(1);
  });
});
