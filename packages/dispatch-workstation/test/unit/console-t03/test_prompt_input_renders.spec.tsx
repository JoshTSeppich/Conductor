// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 3 — Test 1/3: prompt input renders inside the panel.
//
// Vision §10.10 ship-gate: "operator types a prompt + sees CC respond
// in the panel within 500ms p50 first-byte latency". The input surface
// belongs to the panel — separate textarea + Send button below the
// terminal (per ticket-prompt cluster 3 GREEN recommendation: simpler UX,
// no terminal-mode-switching complexity for v3.0).
//
// RED state: cluster 1+2 GREEN does not render any prompt-input markup;
// querying [data-testid=console-prompt-input] returns null → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 3 — prompt input rendered when session bound', () => {
  it('console-prompt-input + console-prompt-send appear after console:open', () => {
    const fake = makeFakeConsoleBridge();
    render(
      <ConsolePanel
        targetSessionName="alpha"
        consoleBridge={fake.bridge}
        createTerminal={() => makeFakeTerminalAdapter()}
      />,
    );

    // Idle: no prompt UI.
    expect(screen.queryByTestId('console-prompt-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('console-prompt-send')).not.toBeInTheDocument();

    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    // Bound: prompt UI rendered.
    expect(screen.getByTestId('console-prompt-input')).toBeInTheDocument();
    expect(screen.getByTestId('console-prompt-send')).toBeInTheDocument();
  });

  it('prompt input is removed again on console:close', () => {
    const fake = makeFakeConsoleBridge();
    render(
      <ConsolePanel
        targetSessionName="alpha"
        consoleBridge={fake.bridge}
        createTerminal={() => makeFakeTerminalAdapter()}
      />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });
    expect(screen.getByTestId('console-prompt-input')).toBeInTheDocument();

    act(() => {
      fake.emitClose({ sessionName: 'alpha' });
    });

    expect(screen.queryByTestId('console-prompt-input')).not.toBeInTheDocument();
  });
});
