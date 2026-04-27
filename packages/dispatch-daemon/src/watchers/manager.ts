/**
 * Per-session watcher lifecycle manager (DAEMON-T13).
 *
 * Owns:
 *   - Map<sessionName, WatcherHandle> — one handle per attached session
 *   - Map<sessionName, NodeJS.Timeout> — per-key trailing debounce
 *   - Map<sessionName, latestData> — coalesces burst data into the
 *     most-recent value (S02 #3: 5 writes can produce 1-5 events
 *     depending on coalescing; manager surfaces the LAST snapshot)
 *
 * Lifecycle hooks consumed by startup/routes:
 *   attachAll(registry) — startup boots watchers for non-killed
 *     sessions per arbitration 1 (T13 pre-reg)
 *   attach(name, session) — POST /v2/sessions creates a session
 *     and arms its watcher
 *   detach(name) — PATCH state→killed tears the watcher down
 *   closeAll() — shutdown closes every watcher
 *
 * attach is idempotent (returns early if already attached) so
 * concurrent registry mutations don't double-create watchers.
 *
 * Forward extension: T14 (git watcher) and T15 (STATUS.json
 * watcher) will additively extend this manager. T14 will add
 * createGitWatcher to the factory; T15 likewise. Manager's
 * Map structures generalize trivially — debounceTimers /
 * lastData maps gain a key prefix (e.g., "handoff:<name>",
 * "git:<name>", "status:<name>") so each watcher type's
 * debounce stays isolated.
 */

import type { RegistryV2, SessionV2 } from 'dispatch-core/src/v2/schema.js';
import type { EmitFn } from '../events/bus.js';
import type { WatcherFactory, WatcherHandle } from './handoff.js';

export interface WatcherManagerOpts {
  factory: WatcherFactory;
  emit: EmitFn;
  /** Trailing debounce window. Default 50ms per S02 §3.3
   *  (Round 2 Finding #20). */
  debounceMs?: number;
}

export interface WatcherManager {
  attach(name: string, session: SessionV2): void;
  detach(name: string): void;
  attachAll(registry: RegistryV2): void;
  closeAll(): void;
}

const DEFAULT_DEBOUNCE_MS = 50;

export function createWatcherManager(
  opts: WatcherManagerOpts,
): WatcherManager {
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const watchers = new Map<string, WatcherHandle>();
  const debounceTimers = new Map<string, NodeJS.Timeout>();
  const lastData = new Map<string, { path: string; size_bytes: number }>();

  function attach(name: string, session: SessionV2): void {
    if (session.state === 'killed') return;
    if (watchers.has(name)) return;

    const handle = opts.factory.createHandoffWatcher({
      cwd: session.cwd,
      handoffPath: session.handoff_path,
      onWritten: (data) => {
        lastData.set(name, data);
        const existing = debounceTimers.get(name);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          debounceTimers.delete(name);
          const finalData = lastData.get(name);
          lastData.delete(name);
          if (!finalData) return;
          opts.emit({
            session: name,
            type: 'handoff_written',
            data: finalData,
          });
        }, debounceMs);
        debounceTimers.set(name, timer);
      },
    });
    watchers.set(name, handle);
  }

  function detach(name: string): void {
    const w = watchers.get(name);
    if (w) {
      w.close();
      watchers.delete(name);
    }
    const t = debounceTimers.get(name);
    if (t) {
      clearTimeout(t);
      debounceTimers.delete(name);
    }
    lastData.delete(name);
  }

  function attachAll(registry: RegistryV2): void {
    for (const [name, session] of Object.entries(registry.sessions)) {
      attach(name, session);
    }
  }

  function closeAll(): void {
    for (const name of [...watchers.keys()]) detach(name);
  }

  return { attach, detach, attachAll, closeAll };
}
