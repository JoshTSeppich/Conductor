// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 4 — Test 3/3: error banner renders on console:error.
//
// CONSOLE-T02 forwards daemon-stream errors (network failure, daemon
// unreachable, terminal close codes) as console:error with
// {sessionName, message, errorType?}. The panel surfaces this so the
// operator knows the stream is unhealthy without crashing.
//
// RED state: pre-cluster-4 the onError handler is a no-op.
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 4 — error banner rendering', () => {
  it('emitError renders [data-testid=console-error-banner] without crash', () => {
    const fake = makeFakeConsoleBridge();
    render(
      <ConsolePanel
        consoleBridge={fake.bridge}
        createTerminal={() => makeFakeTerminalAdapter()}
      />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    expect(screen.queryByTestId('console-error-banner')).not.toBeInTheDocument();

    act(() => {
      fake.emitError({
        sessionName: 'alpha',
        message: 'daemon stream errored: ECONNREFUSED',
      });
    });

    const banner = screen.getByTestId('console-error-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent ?? '').toContain('ECONNREFUSED');
    // Header still rendered — error does NOT close the panel automatically.
    expect(screen.getByTestId('console-panel-header')).toBeInTheDocument();
  });

  it('opening a fresh session clears any prior error banner', () => {
    const fake = makeFakeConsoleBridge();
    render(
      <ConsolePanel
        consoleBridge={fake.bridge}
        createTerminal={() => makeFakeTerminalAdapter()}
      />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
      fake.emitError({ sessionName: 'alpha', message: 'boom' });
    });
    expect(screen.getByTestId('console-error-banner')).toBeInTheDocument();

    act(() => {
      fake.emitClose({ sessionName: 'alpha' });
      fake.emitOpen({ sessionName: 'beta' });
    });
    expect(screen.queryByTestId('console-error-banner')).not.toBeInTheDocument();
  });
});
