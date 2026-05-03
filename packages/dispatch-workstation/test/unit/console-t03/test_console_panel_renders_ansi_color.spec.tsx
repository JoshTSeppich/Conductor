// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 2 — Test 2/3: ANSI escape sequences pass through unchanged.
//
// Vision §10.11 Q4 (ratified): xterm.js renders ANSI color + cursor-control
// escape sequences faithfully. The panel's job is to forward bytes verbatim;
// it must NOT strip, parse, or otherwise mutate ANSI sequences. xterm.js
// itself handles the rendering. This test asserts the byte-passthrough
// contract — the integration with real xterm rendering is a CONSOLE-T03
// ship-gate visual check (vision §10.10) plus the existing MB-S06 §1
// KNOWN bytes-integrity finding.
//
// RED state: pre-cluster-2 the no-op chunk handler drops all bytes; the
// adapter sees nothing → assertion fails.
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 2 — ANSI passthrough', () => {
  it('ANSI color escape sequence reaches adapter unchanged', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();
    render(
      <ConsolePanel consoleBridge={fake.bridge} createTerminal={() => adapter} />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    // Standard "red FG" ANSI: ESC[31m, then text, then reset ESC[0m.
    const ansi = '[31mERROR[0m: something\n';

    act(() => {
      fake.emitChunk({
        sessionName: 'alpha',
        stdoutSeq: 1,
        bytes: ansi,
        encoding: 'utf8',
      });
    });

    expect(adapter.writes).toEqual([ansi]);
  });

  it('cursor-control sequence (CSI) reaches adapter unchanged', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();
    render(
      <ConsolePanel consoleBridge={fake.bridge} createTerminal={() => adapter} />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    // ESC[2J = clear screen; ESC[H = home cursor.
    const csi = '[2J[Hredrawn';

    act(() => {
      fake.emitChunk({
        sessionName: 'alpha',
        stdoutSeq: 1,
        bytes: csi,
        encoding: 'utf8',
      });
    });

    expect(adapter.writes).toEqual([csi]);
  });
});
