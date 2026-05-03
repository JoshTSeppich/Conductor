// @vitest-environment happy-dom
//
// MB-T08 Cluster 3 — Test 5/6: dismiss button fires onDismiss callback. The
// toast container itself is mounted/unmounted by the parent; the toast just
// signals dismissal via callback.
//
// RED state: src/error-display/error-toast.tsx absent → import fails → FAIL.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorToast } from '../../../src/error-display/error-toast.js';

describe('MB-T08 cluster 3 — ErrorToast dismissible', () => {
  it('fires onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <ErrorToast
        error={{ type: 'SpawnFailed', message: 'tmux not found' }}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByTestId('error-toast-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
