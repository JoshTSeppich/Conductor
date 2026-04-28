/**
 * STATUS.json watcher per DAEMON-T15.
 *
 * Watches <cwd>/STATUS.json (arbitration 1A — symmetric with
 * HANDOFF.md fd v1 convention; one watch dir per session
 * covers both files via filename filter). On a non-noise
 * event for STATUS.json, reads the file, parses + validates
 * via the operator-published StatusJsonSchema (rich on-disk
 * shape, dispatch-core/v2/schema.ts:126), forwards the
 * parsed data to onUpdate.
 *
 * The manager is responsible for projecting the on-disk
 * shape to the §5.3 wire-event shape and applying null-skip
 * semantics (Round 2 Finding #26: schemas serve different
 * domains, daemon bridges via projection logic). The
 * watcher is data-faithful to on-disk; manager owns event
 * semantics.
 *
 * Failure handling (per arbitration 2b — strict Zod):
 *   - Construction failure (missing cwd, fs.watch unsupported)
 *     → warn-log + no-op watcher. close() is safe; onUpdate
 *     never fires.
 *   - readFile / JSON.parse / Zod parse failure → warn-log +
 *     skip update. Don't forward malformed data; debounce
 *     window absorbs partial-write race windows (FSEvents
 *     can fire mid-write before atomic rename completes).
 *
 * Missing initial STATUS.json (arbitration 5A): normal. The
 * fs.watch fires when the file appears; first valid parse
 * triggers first onUpdate. No special handling.
 */

import { watch, type FSWatcher } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  StatusJsonSchema,
  type StatusJson,
} from 'dispatch-core/src/v2/schema.js';

export interface StatusWatcherOpts {
  /** Session cwd; the watcher binds to <cwd> and filters
   *  events by basename === 'STATUS.json'. */
  cwd: string;
  /** Called with the validated on-disk StatusJson on each
   *  successful read. Manager debounces; manager projects
   *  to the 3-field event shape and applies null-skip. */
  onUpdate: (data: StatusJson) => void;
  /** Optional logger for warn-log on construction or read/
   *  parse failures. Tests omit; production passes the
   *  Fastify request.log shape. */
  logger?: { warn: (...args: unknown[]) => void };
}

export interface StatusWatcherHandle {
  close: () => void;
}

const TARGET_NAME = 'STATUS.json';

export function createStatusWatcher(
  opts: StatusWatcherOpts,
): StatusWatcherHandle {
  const statusPath = join(opts.cwd, TARGET_NAME);
  let watcher: FSWatcher | null = null;
  try {
    watcher = watch(
      opts.cwd,
      { persistent: true, recursive: false },
      (_eventType, filename) => {
        if (filename !== TARGET_NAME) return;
        void (async () => {
          try {
            const content = await readFile(statusPath, 'utf8');
            const parsed = StatusJsonSchema.safeParse(JSON.parse(content));
            if (!parsed.success) {
              opts.logger?.warn?.(
                { err: parsed.error.message, path: statusPath },
                'STATUS.json failed Zod validation; skipping update per T15 arb 2b',
              );
              return;
            }
            opts.onUpdate(parsed.data);
          } catch (err) {
            opts.logger?.warn?.(
              { err: (err as Error).message, path: statusPath },
              'STATUS.json read/parse failed; skipping update (debounce will absorb partial-write race)',
            );
          }
        })();
      },
    );
  } catch (err) {
    // Missing cwd or fs.watch unsupported — warn-log + no-op
    // watcher. Symmetric with T13 handoff + T14 git
    // construction-failure tolerance.
    opts.logger?.warn?.(
      { err: (err as Error).message, cwd: opts.cwd },
      'createStatusWatcher could not bind cwd; test_status_updated will not fire for this session',
    );
  }
  return {
    close: () => watcher?.close(),
  };
}
