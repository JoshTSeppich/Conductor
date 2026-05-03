// Adapter wrapping the upstream xterm.js Terminal so the React component can
// be unit-tested with a fake adapter (no Canvas required in happy-dom) while
// production wires the real @xterm/xterm Terminal at mount time.
//
// Why an adapter: per vision §10.11 Q4 (ratified) we use xterm.js for fidelity
// of ANSI / cursor-control / UTF-8 rendering. xterm.js's `Terminal` requires a
// real DOM with Canvas support to instantiate; happy-dom 15 does not implement
// Canvas. Splitting into an interface keeps cluster 1+2 unit tests fast and
// deterministic, and isolates xterm.js as a single integration boundary that
// CONSOLE-T03 ship-gate validation exercises end-to-end.

export interface TerminalAdapter {
  /** Mount the terminal renderer into the supplied container element. */
  open(container: HTMLElement): void;
  /** Write a chunk of bytes (already decoded to UTF-8 string) into the terminal. */
  write(data: string): void;
  /** Tear down the renderer, releasing DOM nodes and any internal listeners. */
  dispose(): void;
}

/**
 * Lazy factory for the production xterm.js-backed adapter. The real
 * `@xterm/xterm` Terminal is created on first call; happy-dom unit tests do
 * NOT call this factory — they inject a fake adapter via the
 * `createTerminal` prop on ConsolePanel.
 */
export async function createXtermAdapter(): Promise<TerminalAdapter> {
  const { Terminal } = await import('@xterm/xterm');
  const term = new Terminal({
    convertEol: true,
    cursorBlink: true,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 13,
    theme: {
      background: '#0a0a0a',
      foreground: '#e0e0e0',
    },
  });
  return {
    open(container) {
      term.open(container);
    },
    write(data) {
      term.write(data);
    },
    dispose() {
      term.dispose();
    },
  };
}
