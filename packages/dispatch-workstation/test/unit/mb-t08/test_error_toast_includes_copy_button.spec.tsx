// @vitest-environment happy-dom
//
// MB-T08 Cluster 3 — Test 6/6: technical-details section has a copy button
// that copies the full error envelope to clipboard. Per V3_TICKETS.md
// MB-T08 ticket prompt: "copy-pasteable error details for debugging."
//
// RED state: src/error-display/error-toast.tsx absent → import fails → FAIL.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorToast } from '../../../src/error-display/error-toast.js';

describe('MB-T08 cluster 3 — ErrorToast copy-to-clipboard', () => {
  it('exposes a copy button that calls clipboard.writeText with the envelope', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // happy-dom navigator.clipboard may be undefined; stub the global.
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      writable: true,
      configurable: true,
    });

    render(
      <ErrorToast
        error={{
          type: 'SpawnFailed',
          message: 'tmux: command not found',
          sessionName: 'sherpa',
          stderr: 'sh: tmux: command not found',
        }}
        onDismiss={() => {}}
      />,
    );

    const copy = screen.getByTestId('error-toast-copy');
    expect(copy).toBeInTheDocument();
    fireEvent.click(copy);
    expect(writeText).toHaveBeenCalledTimes(1);
    const payload = writeText.mock.calls[0][0] as string;
    expect(payload).toContain('SpawnFailed');
    expect(payload).toContain('tmux: command not found');
    expect(payload).toContain('sherpa');
  });
});
