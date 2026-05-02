/**
 * CONSOLE-T01 — shared test fixture for the ConsoleOps injection.
 *
 * Two roles:
 *   - Recording stub: route handlers calling pasteRawBytes /
 *     attachStream are observed; tests assert call args + counts.
 *   - Stream injector: tests synthesize "pipe-pane delivered a line"
 *     events without spawning real tmux. Mirrors the
 *     mockWatcherFactory pattern at test/fixtures/server.ts so the
 *     spawnTestServer.triggerConsoleLine helper can fire lines per
 *     session by name.
 */

import type { ConsoleOps, ConsoleStreamHandle, DispatchMethod } from '../../src/console/console-ops.js';

export interface RecordedPaste {
  target: string;
  bytes: Buffer;
}

export interface RecordedSignal {
  target: string;
  signal: 'SIGINT' | 'SIGTERM' | 'SIGHUP';
}

export interface RecordingConsoleOps {
  ops: ConsoleOps;
  pastes: RecordedPaste[];
  signals: RecordedSignal[];
  /** True iff a stream is currently attached for `target`. */
  isAttached(target: string): boolean;
  /** Total times attachStream was invoked for `target` over the test. */
  attachCount(target: string): number;
  /** Fire a line event as if pipe-pane delivered it for `target`. */
  fireLine(target: string, line: Buffer): void;
}

export function recordingConsoleOps(): RecordingConsoleOps {
  const pastes: RecordedPaste[] = [];
  const signals: RecordedSignal[] = [];
  // Per-target callback registry. The route handler's attachStream
  // call registers a callback; fireLine invokes it.
  const callbacks = new Map<string, (line: Buffer) => void>();
  const attachCounts = new Map<string, number>();

  // The __fireLine property is the integration point for
  // spawnTestServer.triggerConsoleLine — fixture-side convention so
  // server.ts can fire lines without importing this module.
  const ops: ConsoleOps & { __fireLine?: (target: string, line: Buffer) => void } = {
    async pasteRawBytes(target: string, bytes: Buffer): Promise<void> {
      pastes.push({ target, bytes: Buffer.from(bytes) });
    },
    attachStream(target: string, onLine: (line: Buffer) => void): ConsoleStreamHandle {
      callbacks.set(target, onLine);
      attachCounts.set(target, (attachCounts.get(target) ?? 0) + 1);
      return {
        close: () => {
          if (callbacks.get(target) === onLine) callbacks.delete(target);
        },
      };
    },
    __fireLine(target: string, line: Buffer): void {
      const cb = callbacks.get(target);
      if (!cb) {
        throw new Error(`recordingConsoleOps.__fireLine: no stream attached for ${target}`);
      }
      cb(line);
    },
    async sendSignal(target, signal): Promise<DispatchMethod> {
      signals.push({ target, signal });
      // Match the production helper's per-signal dispatch_method
      // mapping so route handler tests assert on a stable contract.
      return signal === 'SIGINT' ? 'send_keys' : 'kill_2';
    },
  };

  return {
    ops,
    pastes,
    signals,
    isAttached: (t) => callbacks.has(t),
    attachCount: (t) => attachCounts.get(t) ?? 0,
    fireLine: (target, line) => {
      const cb = callbacks.get(target);
      if (!cb) {
        throw new Error(`recordingConsoleOps.fireLine: no stream attached for ${target}`);
      }
      cb(line);
    },
  };
}
