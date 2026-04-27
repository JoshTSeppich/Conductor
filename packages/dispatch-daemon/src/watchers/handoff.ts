/**
 * Handoff watcher per DAEMON-T13.
 *
 * Production impl uses node:fs.watch (S02 ADR pattern):
 * watch the parent directory, filter events by filename to
 * the handoff file's basename. Single-file watch is avoided —
 * S02 tradeoff #5 documents that single-file watches break
 * on rename. Atomic writes (tmp + rename) surface as 2 events
 * per S02 #2; the manager's debounce coalesces them into a
 * single emit.
 *
 * Event-type discrimination: macOS fs.watch reports almost
 * everything as 'rename' regardless of actual file operation
 * (S02 #1). We treat any event for the target filename as
 * "something changed; re-stat" and forward {path, size_bytes}
 * to the onWritten callback.
 *
 * The WatcherFactory interface is shared with T14/T15 (future
 * git + STATUS.json watchers will additively extend it). T13
 * locks only createHandoffWatcher; T14/T15 surface their own
 * methods at their respective pre-regs.
 */

import { watch, type FSWatcher } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';

export interface HandoffWatcherOpts {
  /** Session cwd (parent dir of handoff_path by fd convention).
   *  Watched directly; fs.watch fires for the dir's children. */
  cwd: string;
  /** Absolute path to the handoff file. The watcher matches
   *  events by basename(handoffPath); writes to the same dir
   *  with a different basename are ignored. */
  handoffPath: string;
  /** Called when the handoff file is detected as written.
   *  Subsequent debouncing is the manager's responsibility. */
  onWritten: (data: { path: string; size_bytes: number }) => void;
}

export interface WatcherHandle {
  close: () => void;
}

export interface WatcherFactory {
  createHandoffWatcher(opts: HandoffWatcherOpts): WatcherHandle;
}

export function createHandoffWatcher(
  opts: HandoffWatcherOpts,
): WatcherHandle {
  const targetName = basename(opts.handoffPath);
  let watcher: FSWatcher | null = null;
  try {
    watcher = watch(
      opts.cwd,
      { persistent: true, recursive: false },
      (_eventType, filename) => {
        if (filename !== targetName) return;
        void (async () => {
          try {
            const s = await stat(opts.handoffPath);
            opts.onWritten({ path: opts.handoffPath, size_bytes: s.size });
          } catch {
            // File may have been removed between event and stat
            // (e.g., editor swap-file dance); ignore — next event
            // will surface the final state.
          }
        })();
      },
    );
  } catch {
    // cwd may not exist or fs.watch unsupported; treat as
    // a no-op watcher. Daemon continues without watch coverage
    // for this session; revisit via DAEMON-F if encountered.
  }
  return {
    close: () => watcher?.close(),
  };
}

export const defaultWatcherFactory: WatcherFactory = {
  createHandoffWatcher,
};
