// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 1 — Test 3/3: panel updates when console:close fires.
//
// Vision §10.7: shell→webview console:close. The panel transitions from
// opened-for-sessionName back to idle; the terminal adapter is disposed so
// xterm.js releases its DOM nodes + listeners.
//
// RED state: src/console-panel/console-panel.tsx absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 1 — onConsoleClose → panel state', () => {
  it('closing a panel returns to idle state, disposes terminal adapter', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();

    render(
      <ConsolePanel consoleBridge={fake.bridge} createTerminal={() => adapter} />,
    );

    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });
    expect(screen.getByTestId('console-panel-header')).toBeInTheDocument();
    expect(adapter.disposed).toBe(false);

    act(() => {
      fake.emitClose({ sessionName: 'alpha' });
    });

    // Header gone, empty state back, adapter disposed.
    expect(screen.queryByTestId('console-panel-header')).not.toBeInTheDocument();
    expect(screen.getByTestId('console-panel-empty')).toBeInTheDocument();
    expect(adapter.disposed).toBe(true);
  });

  it('close is no-op when no session is open (idempotent)', () => {
    const fake = makeFakeConsoleBridge();
    render(
      <ConsolePanel
        consoleBridge={fake.bridge}
        createTerminal={() => makeFakeTerminalAdapter()}
      />,
    );

    // Should not throw or transition into a corrupt state.
    act(() => {
      fake.emitClose({ sessionName: 'alpha' });
    });

    expect(screen.getByTestId('console-panel-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('console-panel-header')).not.toBeInTheDocument();
  });
});
