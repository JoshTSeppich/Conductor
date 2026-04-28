/**
 * Per-session watcher lifecycle manager.
 *
 * T13 introduced handoff watching; T14 extends to git log
 * watching with the same lifecycle. T15 will add STATUS.json
 * watching following the same pattern.
 *
 * Owns:
 *   - Map<sessionName, AggregateWatcherHandle> — one wrapper
 *     per session that closes ALL of that session's underlying
 *     watchers (handoff, git, future status)
 *   - Map<debounceKey, NodeJS.Timeout> — per-key trailing
 *     debounce so different event types or branches don't
 *     collide
 *   - Map<debounceKey, unknown> — last-data per key; closure
 *     reading this knows the concrete type per key prefix
 *
 * Debounce key prefixing:
 *   - handoff:<name>            (handoff_written, T13)
 *   - git:<name>:<branch>       (commit_landed, T14;
 *                                per-branch isolation lets
 *                                rapid branch-switch+commit
 *                                preserve both snapshots)
 *   - status:<name>             (test_status_updated, T15)
 *
 * Lifecycle hooks consumed by startup/routes:
 *   attachAll(registry) — startup boots watchers for non-
 *     killed sessions per arbitration 1 (T13 pre-reg)
 *   attach(name, session) — POST /v2/sessions creates session
 *     and arms its watchers
 *   detach(name) — PATCH state→killed tears down ALL of the
 *     session's watchers; clears any of its in-flight debounce
 *     timers + lastData entries
 *   closeAll() — shutdown closes every watcher
 *
 * attach is idempotent (returns early if already attached) so
 * concurrent registry mutations don't double-create watchers.
 *
 * T14 scope (arbitration 5 = B): commit_landed emit only.
 * Manager does NOT update last_commit_sha registry field.
 * Concurrent-write race window between manager + routes
 * (T07/T08) without a proper mutex was scope-violating;
 * stale-field cleanup filed as DAEMON-F-last-commit-sha-update
 * for post-MVP refinement.
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

interface SessionWatcherWrap {
  close: () => void;
}

function isKeyForSession(key: string, name: string): boolean {
  return (
    key === `handoff:${name}` ||
    key.startsWith(`git:${name}:`) ||
    key === `status:${name}`
  );
}

export function createWatcherManager(
  opts: WatcherManagerOpts,
): WatcherManager {
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const sessionWatchers = new Map<string, SessionWatcherWrap>();
  const debounceTimers = new Map<string, NodeJS.Timeout>();
  const lastData = new Map<string, unknown>();

  function scheduleEmit(
    key: string,
    sessionName: string,
    type: string,
    data: unknown,
  ): void {
    lastData.set(key, data);
    const existing = debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      debounceTimers.delete(key);
      const finalData = lastData.get(key);
      lastData.delete(key);
      if (finalData === undefined) return;
      opts.emit({
        session: sessionName,
        type,
        data: finalData,
      });
    }, debounceMs);
    debounceTimers.set(key, timer);
  }

  function attach(name: string, session: SessionV2): void {
    if (session.state === 'killed') return;
    if (sessionWatchers.has(name)) return;

    const handoffHandle: WatcherHandle = opts.factory.createHandoffWatcher({
      cwd: session.cwd,
      handoffPath: session.handoff_path,
      onWritten: (data) => {
        scheduleEmit(`handoff:${name}`, name, 'handoff_written', data);
      },
    });

    const gitHandle: WatcherHandle = opts.factory.createGitWatcher({
      cwd: session.cwd,
      onCommit: (data) => {
        scheduleEmit(
          `git:${name}:${data.branch}`,
          name,
          'commit_landed',
          data,
        );
      },
    });

    // T15 status watcher: read on-disk StatusJsonSchema, project
    // to TestStatusUpdatedEvent.data. Skip emit if any of the 3
    // event-required fields is null (Round 2 Finding #26: schemas
    // serve different domains, daemon bridges via projection +
    // null-skip).
    const statusHandle: WatcherHandle = opts.factory.createStatusWatcher({
      cwd: session.cwd,
      onUpdate: (data) => {
        if (
          data.tests_passing === null ||
          data.tests_failing === null ||
          data.phase === null
        ) {
          // Silent skip per arb 2b — CC's incremental-write
          // pattern legitimately produces nullable values
          // pre-test-run; warn-logging would clutter output.
          return;
        }
        const eventData = {
          tests_passing: data.tests_passing,
          tests_failing: data.tests_failing,
          phase: data.phase,
        };
        scheduleEmit(`status:${name}`, name, 'test_status_updated', eventData);
      },
    });

    sessionWatchers.set(name, {
      close: () => {
        handoffHandle.close();
        gitHandle.close();
        statusHandle.close();
      },
    });
  }

  function detach(name: string): void {
    const wrap = sessionWatchers.get(name);
    if (wrap) {
      wrap.close();
      sessionWatchers.delete(name);
    }
    // Clear any in-flight debounce timers + lastData for ALL
    // of this session's keys (handoff, git per branch).
    for (const key of [...debounceTimers.keys()]) {
      if (isKeyForSession(key, name)) {
        clearTimeout(debounceTimers.get(key)!);
        debounceTimers.delete(key);
        lastData.delete(key);
      }
    }
    // Also drop any lastData that was queued without an active
    // timer (defensive; should be empty in practice).
    for (const key of [...lastData.keys()]) {
      if (isKeyForSession(key, name)) lastData.delete(key);
    }
  }

  function attachAll(registry: RegistryV2): void {
    for (const [name, session] of Object.entries(registry.sessions)) {
      attach(name, session);
    }
  }

  function closeAll(): void {
    for (const name of [...sessionWatchers.keys()]) detach(name);
  }

  return { attach, detach, attachAll, closeAll };
}
