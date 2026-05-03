// @vitest-environment happy-dom
//
// MB-T08 Cluster 3 — Test 2/6: ErrorToast renders DaemonUnreachable with a
// retry button. V3_TICKETS.md MB-T08 names test_daemon_offline_state.spec.ts
// explicitly. DaemonUnreachable source: spawn-ipc.ts:158 (fetch failure) +
// :167 (HTTP error) + :141 (no token) all produce error_type='DaemonUnreachable'.
//
// RED state: src/error-display/error-toast.tsx absent → import fails → FAIL.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorToast } from '../../../src/error-display/error-toast.js';

describe('MB-T08 cluster 3 — ErrorToast DaemonUnreachable', () => {
  it('surfaces a friendly "daemon not running" title', () => {
    render(
      <ErrorToast
        error={{ type: 'DaemonUnreachable', message: 'fetch failed: ECONNREFUSED' }}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByTestId('error-toast-title')).toHaveTextContent(
      /daemon|not running|unreachable/i,
    );
  });

  it('renders a retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(
      <ErrorToast
        error={{ type: 'DaemonUnreachable', message: 'fetch failed: ECONNREFUSED' }}
        onDismiss={() => {}}
        onRetry={onRetry}
      />,
    );
    const retry = screen.getByTestId('error-toast-retry');
    expect(retry).toBeInTheDocument();
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry button when onRetry is not provided', () => {
    render(
      <ErrorToast
        error={{ type: 'DaemonUnreachable', message: 'fetch failed: ECONNREFUSED' }}
        onDismiss={() => {}}
      />,
    );
    expect(screen.queryByTestId('error-toast-retry')).toBeNull();
  });
});
