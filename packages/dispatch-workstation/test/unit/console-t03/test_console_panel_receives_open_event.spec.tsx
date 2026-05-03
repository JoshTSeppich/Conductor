// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 1 — Test 2/3: panel updates when console:open fires.
//
// Vision §10.7: shell→webview console:open carries {sessionName}. The panel
// transitions from idle to opened-for-sessionName on event arrival; the
// header surfaces the session name and the xterm.js terminal container
// becomes the active mount target.
//
// RED state: src/console-panel/console-panel.tsx absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 1 — onConsoleOpen → panel state', () => {
  it('opening a panel for "alpha" surfaces session name in header + terminal container', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();

    render(
      <ConsolePanel consoleBridge={fake.bridge} createTerminal={() => adapter} />,
    );

    // Idle before event.
    expect(screen.queryByTestId('console-panel-header')).not.toBeInTheDocument();

    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    // After open: header carries the session name, empty-state goes away,
    // terminal container element is in the DOM (xterm mounts into it via
    // adapter.open in cluster 2; cluster 1 only asserts presence).
    expect(screen.getByTestId('console-panel-header')).toHaveTextContent('alpha');
    expect(screen.queryByTestId('console-panel-empty')).not.toBeInTheDocument();
    expect(screen.getByTestId('console-terminal')).toBeInTheDocument();
  });

  it('terminal adapter.open is invoked with the terminal container DOM node', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();

    render(
      <ConsolePanel consoleBridge={fake.bridge} createTerminal={() => adapter} />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    // The adapter is created and attached to the rendered terminal container.
    // Asserting against the same data-testid the panel renders.
    const container = screen.getByTestId('console-terminal');
    expect(adapter.openedOn).toBe(container);
  });
});
