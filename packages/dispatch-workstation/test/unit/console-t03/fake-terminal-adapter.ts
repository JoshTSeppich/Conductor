// Test double for the TerminalAdapter interface that production wires to
// xterm.js. Captures open/write/dispose calls so cluster 2 can assert byte
// forwarding without booting xterm into the happy-dom canvas (xterm requires
// a real terminal renderer; happy-dom does not implement Canvas).
import type { TerminalAdapter } from '../../../src/console-panel/terminal-adapter.js';

export interface FakeTerminalAdapter extends TerminalAdapter {
  writes: string[];
  openedOn: HTMLElement | null;
  disposed: boolean;
}

export function makeFakeTerminalAdapter(): FakeTerminalAdapter {
  const writes: string[] = [];
  let openedOn: HTMLElement | null = null;
  let disposed = false;
  return {
    open(container: HTMLElement) {
      openedOn = container;
    },
    write(data: string) {
      writes.push(data);
    },
    dispose() {
      disposed = true;
    },
    get writes() {
      return writes;
    },
    get openedOn() {
      return openedOn;
    },
    get disposed() {
      return disposed;
    },
  };
}
