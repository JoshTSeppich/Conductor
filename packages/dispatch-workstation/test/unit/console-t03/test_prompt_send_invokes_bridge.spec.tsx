// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 3 — Test 2/3: Send invokes consoleBridge.sendStdin.
//
// Vision §10.7: webview→shell `console:send-stdin` carries the operator's
// typed prompt; shell forwards to daemon POST /v3/sessions/:name/console/stdin
// per CONDUCTOR_API_CONTRACT.md §4.7.2. The renderer surface is the bridge
// method `sendStdin(sessionName, bytes, encoding?)`. Default encoding is utf8.
//
// RED state: pre-cluster-3 the panel has no Send button or input wired to
// the bridge → fake.sendStdinCalls stays empty → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 3 — Send invokes bridge.sendStdin', () => {
  it('typing in the input + clicking Send invokes sendStdin with sessionName + bytes + utf8', async () => {
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

    const input = screen.getByTestId('console-prompt-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'run-tests\n' } });
    fireEvent.click(screen.getByTestId('console-prompt-send'));

    // Fire-and-forget: the panel awaits the ack but doesn't block on it.
    // Microtask flush via act ensures the async handler resolves before the assertion.
    await act(async () => {
      await Promise.resolve();
    });

    expect(fake.sendStdinCalls).toEqual([
      { sessionName: 'alpha', bytes: 'run-tests\n', encoding: 'utf8' },
    ]);
  });

  it('input is cleared after Send', async () => {
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

    const input = screen.getByTestId('console-prompt-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.click(screen.getByTestId('console-prompt-send'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(input.value).toBe('');
  });

  it('clicking Send with empty input is a no-op (no bridge call)', async () => {
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

    fireEvent.click(screen.getByTestId('console-prompt-send'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(fake.sendStdinCalls).toEqual([]);
  });
});
