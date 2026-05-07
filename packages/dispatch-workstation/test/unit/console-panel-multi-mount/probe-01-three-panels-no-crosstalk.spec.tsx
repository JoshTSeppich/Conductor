// @vitest-environment happy-dom
//
// MB-T12 WB4 — multi-mount: three ConsolePanel instances each bound to a
// distinct targetSessionName. Bridge events fan out to all listeners; each
// panel filters by `p.sessionName === targetSessionName`. No cross-talk.
//
// Closes MB-F-CONSOLE-T03-MULTI-PANEL (FOLLOWUPS.md:132).

import { describe, it, expect } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

describe('MB-T12 WB4 multi-mount — 3 ConsolePanel instances filter by targetSessionName', () => {
  it('all panels start in idle state; no header rendered before any console:open fires', () => {
    const fake = makeFakeConsoleBridge();
    const a = makeFakeTerminalAdapter();
    const b = makeFakeTerminalAdapter();
    const c = makeFakeTerminalAdapter();

    const { container } = render(
      <div>
        <div data-testid="wrap-a">
          <ConsolePanel
            targetSessionName="sess-a"
            consoleBridge={fake.bridge}
            createTerminal={() => a}
          />
        </div>
        <div data-testid="wrap-b">
          <ConsolePanel
            targetSessionName="sess-b"
            consoleBridge={fake.bridge}
            createTerminal={() => b}
          />
        </div>
        <div data-testid="wrap-c">
          <ConsolePanel
            targetSessionName="sess-c"
            consoleBridge={fake.bridge}
            createTerminal={() => c}
          />
        </div>
      </div>,
    );

    expect(container.querySelectorAll('[data-testid="console-panel-empty"]').length).toBe(3);
    expect(container.querySelectorAll('[data-testid="console-panel-header"]').length).toBe(0);
  });

  it('emitOpen for sess-a binds only the panel with targetSessionName="sess-a"', () => {
    const fake = makeFakeConsoleBridge();
    const a = makeFakeTerminalAdapter();
    const b = makeFakeTerminalAdapter();
    const c = makeFakeTerminalAdapter();

    render(
      <div>
        <div data-testid="wrap-a">
          <ConsolePanel
            targetSessionName="sess-a"
            consoleBridge={fake.bridge}
            createTerminal={() => a}
          />
        </div>
        <div data-testid="wrap-b">
          <ConsolePanel
            targetSessionName="sess-b"
            consoleBridge={fake.bridge}
            createTerminal={() => b}
          />
        </div>
        <div data-testid="wrap-c">
          <ConsolePanel
            targetSessionName="sess-c"
            consoleBridge={fake.bridge}
            createTerminal={() => c}
          />
        </div>
      </div>,
    );

    act(() => {
      fake.emitOpen({ sessionName: 'sess-a' });
    });

    const wrapA = screen.getByTestId('wrap-a');
    const wrapB = screen.getByTestId('wrap-b');
    const wrapC = screen.getByTestId('wrap-c');

    expect(within(wrapA).getByTestId('console-panel-header')).toHaveTextContent('sess-a');
    expect(within(wrapB).queryByTestId('console-panel-header')).not.toBeInTheDocument();
    expect(within(wrapC).queryByTestId('console-panel-header')).not.toBeInTheDocument();
    expect(within(wrapB).getByTestId('console-panel-empty')).toBeInTheDocument();
    expect(within(wrapC).getByTestId('console-panel-empty')).toBeInTheDocument();
  });

  it('binding sess-c after sess-a leaves both bound; neither panel unbinds the other', () => {
    const fake = makeFakeConsoleBridge();
    const a = makeFakeTerminalAdapter();
    const b = makeFakeTerminalAdapter();
    const c = makeFakeTerminalAdapter();

    render(
      <div>
        <div data-testid="wrap-a">
          <ConsolePanel
            targetSessionName="sess-a"
            consoleBridge={fake.bridge}
            createTerminal={() => a}
          />
        </div>
        <div data-testid="wrap-b">
          <ConsolePanel
            targetSessionName="sess-b"
            consoleBridge={fake.bridge}
            createTerminal={() => b}
          />
        </div>
        <div data-testid="wrap-c">
          <ConsolePanel
            targetSessionName="sess-c"
            consoleBridge={fake.bridge}
            createTerminal={() => c}
          />
        </div>
      </div>,
    );

    act(() => {
      fake.emitOpen({ sessionName: 'sess-a' });
    });
    act(() => {
      fake.emitOpen({ sessionName: 'sess-c' });
    });

    expect(within(screen.getByTestId('wrap-a')).getByTestId('console-panel-header')).toHaveTextContent('sess-a');
    expect(within(screen.getByTestId('wrap-b')).queryByTestId('console-panel-header')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('wrap-c')).getByTestId('console-panel-header')).toHaveTextContent('sess-c');
  });

  it('stdout-chunk for sess-b is written only to adapter B (not A or C)', () => {
    const fake = makeFakeConsoleBridge();
    const a = makeFakeTerminalAdapter();
    const b = makeFakeTerminalAdapter();
    const c = makeFakeTerminalAdapter();

    render(
      <div>
        <ConsolePanel
          targetSessionName="sess-a"
          consoleBridge={fake.bridge}
          createTerminal={() => a}
        />
        <ConsolePanel
          targetSessionName="sess-b"
          consoleBridge={fake.bridge}
          createTerminal={() => b}
        />
        <ConsolePanel
          targetSessionName="sess-c"
          consoleBridge={fake.bridge}
          createTerminal={() => c}
        />
      </div>,
    );

    act(() => {
      fake.emitOpen({ sessionName: 'sess-a' });
      fake.emitOpen({ sessionName: 'sess-b' });
      fake.emitOpen({ sessionName: 'sess-c' });
    });
    act(() => {
      fake.emitChunk({
        sessionName: 'sess-b',
        stdoutSeq: 1,
        bytes: 'hello-b',
        encoding: 'utf8',
      });
    });

    expect(b.writes).toEqual(['hello-b']);
    expect(a.writes).toEqual([]);
    expect(c.writes).toEqual([]);
  });

  it('gap-detected for sess-a banner appears only on panel A; panels B and C unaffected', () => {
    const fake = makeFakeConsoleBridge();
    const a = makeFakeTerminalAdapter();
    const b = makeFakeTerminalAdapter();
    const c = makeFakeTerminalAdapter();

    render(
      <div>
        <div data-testid="wrap-a">
          <ConsolePanel
            targetSessionName="sess-a"
            consoleBridge={fake.bridge}
            createTerminal={() => a}
          />
        </div>
        <div data-testid="wrap-b">
          <ConsolePanel
            targetSessionName="sess-b"
            consoleBridge={fake.bridge}
            createTerminal={() => b}
          />
        </div>
        <div data-testid="wrap-c">
          <ConsolePanel
            targetSessionName="sess-c"
            consoleBridge={fake.bridge}
            createTerminal={() => c}
          />
        </div>
      </div>,
    );

    act(() => {
      fake.emitOpen({ sessionName: 'sess-a' });
      fake.emitOpen({ sessionName: 'sess-b' });
      fake.emitOpen({ sessionName: 'sess-c' });
    });
    act(() => {
      fake.emitGap({
        sessionName: 'sess-a',
        availableFromSeq: 100,
        currentSeq: 105,
      });
    });

    expect(within(screen.getByTestId('wrap-a')).getByTestId('console-gap-warning')).toBeInTheDocument();
    expect(within(screen.getByTestId('wrap-b')).queryByTestId('console-gap-warning')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('wrap-c')).queryByTestId('console-gap-warning')).not.toBeInTheDocument();
  });

  it('listener count is 5 channels × 3 panels = 15 listeners total', () => {
    const fake = makeFakeConsoleBridge();
    const a = makeFakeTerminalAdapter();
    const b = makeFakeTerminalAdapter();
    const c = makeFakeTerminalAdapter();

    render(
      <div>
        <ConsolePanel
          targetSessionName="sess-a"
          consoleBridge={fake.bridge}
          createTerminal={() => a}
        />
        <ConsolePanel
          targetSessionName="sess-b"
          consoleBridge={fake.bridge}
          createTerminal={() => b}
        />
        <ConsolePanel
          targetSessionName="sess-c"
          consoleBridge={fake.bridge}
          createTerminal={() => c}
        />
      </div>,
    );

    expect(fake.listenerCounts()).toEqual({
      open: 3,
      close: 3,
      chunk: 3,
      gap: 3,
      error: 3,
    });
  });

  it('emitClose for sess-a unbinds only panel A; panels B and C remain bound', () => {
    const fake = makeFakeConsoleBridge();
    const a = makeFakeTerminalAdapter();
    const b = makeFakeTerminalAdapter();
    const c = makeFakeTerminalAdapter();

    render(
      <div>
        <div data-testid="wrap-a">
          <ConsolePanel
            targetSessionName="sess-a"
            consoleBridge={fake.bridge}
            createTerminal={() => a}
          />
        </div>
        <div data-testid="wrap-b">
          <ConsolePanel
            targetSessionName="sess-b"
            consoleBridge={fake.bridge}
            createTerminal={() => b}
          />
        </div>
        <div data-testid="wrap-c">
          <ConsolePanel
            targetSessionName="sess-c"
            consoleBridge={fake.bridge}
            createTerminal={() => c}
          />
        </div>
      </div>,
    );

    act(() => {
      fake.emitOpen({ sessionName: 'sess-a' });
      fake.emitOpen({ sessionName: 'sess-b' });
      fake.emitOpen({ sessionName: 'sess-c' });
    });
    act(() => {
      fake.emitClose({ sessionName: 'sess-a' });
    });

    expect(within(screen.getByTestId('wrap-a')).queryByTestId('console-panel-header')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('wrap-a')).getByTestId('console-panel-empty')).toBeInTheDocument();
    expect(within(screen.getByTestId('wrap-b')).getByTestId('console-panel-header')).toHaveTextContent('sess-b');
    expect(within(screen.getByTestId('wrap-c')).getByTestId('console-panel-header')).toHaveTextContent('sess-c');
  });
});
