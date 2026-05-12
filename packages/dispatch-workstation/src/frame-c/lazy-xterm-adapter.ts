// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB12 — sync-shim factory
// wrapping the async createXtermAdapter for use by TerminalStream.
//
// TerminalStream (frame-c/terminal-stream.tsx) declares its
// `createTerminal` prop as `() => TerminalAdapter` (synchronous;
// matches ConsolePanel's prop shape at console-panel/console-panel.tsx
// :46-48). The production xterm adapter (createXtermAdapter at
// console-panel/terminal-adapter.ts:27) is async because it lazy-imports
// `@xterm/xterm` — Canvas-dependent and large enough that lazy import
// avoids loading it for renderers that never mount a terminal.
//
// This file mirrors the lazy-shim pattern at console-panel/mount.ts:
// 58-84 `defaultLazyAdapterFactory`: the returned adapter buffers
// open()-container + write()-data calls in memory until the async
// xterm import resolves, then replays them against the real adapter.
//
// T2 territory: NEW file under frame-c/. Avoids cross-territory edit
// on CONSOLE-T03 mount.ts by duplicating the ~25-line lazy-shim. Tier
// 3 followup candidate MB-F-LAZY-XTERM-ADAPTER-SHARED-EXTRACTION (file
// at WB14 if operator wants the duplication consolidated; for now,
// territorial separation is the priority).

import {
  createXtermAdapter,
  type TerminalAdapter,
} from '../console-panel/terminal-adapter.js';

/**
 * Returns a synchronous TerminalAdapter factory whose returned adapter
 * shims the async xterm import. Calls to `open(container)` and
 * `write(data)` made BEFORE the async import resolves are buffered;
 * once the real xterm adapter is available, the buffered container is
 * opened and queued writes are replayed in order.
 *
 * Disposal before the async import resolves cleans up the buffer state
 * + cancels takeover (real adapter, when it eventually resolves, sees
 * `real = null` post-dispose and skips the replay).
 */
export function createLazyXtermAdapter(): TerminalAdapter {
  let real: TerminalAdapter | null = null;
  let disposed = false;
  let containerHeld: HTMLElement | null = null;
  const queued: string[] = [];

  void createXtermAdapter().then((r) => {
    if (disposed) {
      r.dispose();
      return;
    }
    real = r;
    if (containerHeld) r.open(containerHeld);
    for (const data of queued) r.write(data);
    queued.length = 0;
  });

  return {
    open(container: HTMLElement) {
      if (real) real.open(container);
      else containerHeld = container;
    },
    write(data: string) {
      if (real) real.write(data);
      else queued.push(data);
    },
    dispose() {
      disposed = true;
      if (real) real.dispose();
      real = null;
      containerHeld = null;
      queued.length = 0;
    },
  };
}
