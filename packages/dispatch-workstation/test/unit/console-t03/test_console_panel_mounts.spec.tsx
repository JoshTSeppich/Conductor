// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 1 — Test 1/3: ConsolePanel mounts without crash.
//
// Vision §10 (eac381e): the operator-facing CC-console panel renders inside
// the Workstation webview. Per §10.11 Q4 (ratified) the terminal area uses
// xterm.js for ANSI/UTF-8 fidelity. This test asserts the React component
// mounts in a happy-dom DOM, renders the terminal container element, and
// does NOT crash even when no console:open event has fired yet (idle state).
//
// RED state: src/console-panel/console-panel.tsx absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 1 — ConsolePanel mounts', () => {
  it('renders without crash given an idle bridge', () => {
    const fake = makeFakeConsoleBridge();
    render(
      <ConsolePanel
        consoleBridge={fake.bridge}
        createTerminal={() => makeFakeTerminalAdapter()}
      />,
    );
    // The root container is always present even before any console:open.
    expect(screen.getByTestId('console-panel-root')).toBeInTheDocument();
  });

  it('shows an idle/empty state before any console:open event', () => {
    const fake = makeFakeConsoleBridge();
    render(
      <ConsolePanel
        consoleBridge={fake.bridge}
        createTerminal={() => makeFakeTerminalAdapter()}
      />,
    );
    // No session bound yet — empty-state placeholder is what the operator sees.
    expect(screen.getByTestId('console-panel-empty')).toBeInTheDocument();
  });

  it('registers exactly one listener per shell→webview channel on mount', () => {
    const fake = makeFakeConsoleBridge();
    render(
      <ConsolePanel
        consoleBridge={fake.bridge}
        createTerminal={() => makeFakeTerminalAdapter()}
      />,
    );
    const counts = fake.listenerCounts();
    // ConsolePanel must subscribe to all five shell→webview channels: open,
    // close, stdout-chunk, gap, error. Cluster 1 verifies registration; the
    // "exactly one each" invariant guards against double-mount regressions.
    expect(counts).toEqual({ open: 1, close: 1, chunk: 1, gap: 1, error: 1 });
  });
});
