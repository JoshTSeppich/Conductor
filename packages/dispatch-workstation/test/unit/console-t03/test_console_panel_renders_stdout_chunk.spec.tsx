// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 2 — Test 1/3: stdout chunks reach the terminal adapter.
//
// Vision §10.6 + CONDUCTOR_API_CONTRACT.md §4.7.3: shell forwards STDOUT
// bytes from the daemon's WS stream to the webview as console:stdout-chunk
// events with {sessionName, stdoutSeq, bytes, encoding}. The panel routes
// the bytes through to the xterm.js terminal via the TerminalAdapter
// abstraction (CONSOLE-T03 cluster 1 plumbed the adapter; this cluster
// wires the actual write).
//
// RED state: cluster 1 GREEN left onStdoutChunk as a no-op listener so this
// test fails until cluster 2 GREEN expands the body.
import { describe, it, expect } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 2 — stdout chunk routing', () => {
  it('utf8-encoded chunk flows to TerminalAdapter.write verbatim', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();
    render(
      <ConsolePanel targetSessionName="alpha" consoleBridge={fake.bridge} createTerminal={() => adapter} />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    act(() => {
      fake.emitChunk({
        sessionName: 'alpha',
        stdoutSeq: 1,
        bytes: 'hello world\n',
        encoding: 'utf8',
      });
    });

    expect(adapter.writes).toEqual(['hello world\n']);
  });

  it('chunks arriving before any console:open are dropped (no adapter to write to)', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();
    render(
      <ConsolePanel targetSessionName="alpha" consoleBridge={fake.bridge} createTerminal={() => adapter} />,
    );

    // No emitOpen — adapter never created.
    act(() => {
      fake.emitChunk({
        sessionName: 'alpha',
        stdoutSeq: 1,
        bytes: 'lost bytes',
        encoding: 'utf8',
      });
    });

    expect(adapter.writes).toEqual([]);
    // Idle state preserved.
    expect(screen.getByTestId('console-panel-empty')).toBeInTheDocument();
  });

  it('multiple chunks are written in arrival order', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();
    render(
      <ConsolePanel targetSessionName="alpha" consoleBridge={fake.bridge} createTerminal={() => adapter} />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    act(() => {
      fake.emitChunk({ sessionName: 'alpha', stdoutSeq: 1, bytes: 'one\n', encoding: 'utf8' });
      fake.emitChunk({ sessionName: 'alpha', stdoutSeq: 2, bytes: 'two\n', encoding: 'utf8' });
      fake.emitChunk({ sessionName: 'alpha', stdoutSeq: 3, bytes: 'three\n', encoding: 'utf8' });
    });

    expect(adapter.writes).toEqual(['one\n', 'two\n', 'three\n']);
  });
});
