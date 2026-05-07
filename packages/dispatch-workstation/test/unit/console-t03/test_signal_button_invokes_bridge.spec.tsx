// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 4 — Test 1/3: signal buttons → bridge.signal.
//
// Vision §10.10 ship-gate: "Ctrl-C in panel produces SIGINT to CC".
// CONDUCTOR_API_CONTRACT.md §4.7.4 enumerates the v3.0 signal set as
// SIGINT / SIGTERM / SIGHUP (vision §10.11 Q2 ratified — broader signals
// deferred). The panel exposes one button per supported signal; clicks
// invoke consoleBridge.signal(sessionName, signalName).
//
// RED state: pre-cluster-4 the panel renders no signal buttons →
// getByTestId('signal-sigint') returns null → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 4 — signal buttons', () => {
  it('SIGINT button click invokes consoleBridge.signal(name, "SIGINT")', async () => {
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

    fireEvent.click(screen.getByTestId('signal-sigint'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(fake.signalCalls).toEqual([{ sessionName: 'alpha', signal: 'SIGINT' }]);
  });

  it('SIGTERM button click invokes consoleBridge.signal(name, "SIGTERM")', async () => {
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

    fireEvent.click(screen.getByTestId('signal-sigterm'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(fake.signalCalls).toEqual([{ sessionName: 'alpha', signal: 'SIGTERM' }]);
  });

  it('SIGHUP button click invokes consoleBridge.signal(name, "SIGHUP")', async () => {
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

    fireEvent.click(screen.getByTestId('signal-sighup'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(fake.signalCalls).toEqual([{ sessionName: 'alpha', signal: 'SIGHUP' }]);
  });
});
