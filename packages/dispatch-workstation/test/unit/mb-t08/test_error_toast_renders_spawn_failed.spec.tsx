// @vitest-environment happy-dom
//
// MB-T08 Cluster 3 — Test 1/6: ErrorToast renders SpawnFailed envelope.
//
// Per V3_TICKETS.md MB-T08 acceptance: "Each named failure mode produces clear
// operator-facing surface." The toast accepts a normalized WorkstationError
// shape (error-mappings.ts maps spawn-ipc / console-ipc / coarch envelopes
// onto this union) and renders a friendly title + technical details.
//
// SpawnFailed source: spawn-ipc.ts:58 toErrorReply →
// {error_type:'SpawnFailed', message, sessionName?, stderr?}.
//
// RED state: src/error-display/error-toast.tsx absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorToast } from '../../../src/error-display/error-toast.js';

describe('MB-T08 cluster 3 — ErrorToast SpawnFailed', () => {
  it('renders a friendly title for SpawnFailed', () => {
    render(
      <ErrorToast
        error={{
          type: 'SpawnFailed',
          message: 'tmux: command not found',
          sessionName: 'sherpa',
        }}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByTestId('error-toast-root')).toBeInTheDocument();
    // Friendly title surface — operator-readable, doesn't dump the raw
    // error_type identifier as the heading.
    expect(screen.getByTestId('error-toast-title')).toHaveTextContent(
      /spawn|session.*failed/i,
    );
  });

  it('exposes the technical details (message + sessionName) in a collapsible region', () => {
    render(
      <ErrorToast
        error={{
          type: 'SpawnFailed',
          message: 'tmux: command not found',
          sessionName: 'sherpa',
        }}
        onDismiss={() => {}}
      />,
    );
    const details = screen.getByTestId('error-toast-details');
    expect(details).toBeInTheDocument();
    expect(details.textContent).toContain('tmux: command not found');
    expect(details.textContent).toContain('sherpa');
  });
});
