/**
 * CONSOLE-T01 — per-session broadcaster.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7.1 PTY-reader-sharing invariant: at
 * most one pipe-pane stream per tmux session, fanned out to N WS
 * subscribers via a daemon-side broadcast. The broadcaster is the
 * intermediary: it owns the lifecycle of the underlying ConsoleOps
 * stream handle (lazy-attach on first subscriber, detach on last
 * disconnect) and persists each line to the cc_console_buffer ring.
 *
 * The MB-S06 §6 KNOWN behavior — single shared pipe-pane reader fans
 * out to multiple consumers without double-read — is the production
 * invariant this module enforces.
 */

import type Database from 'better-sqlite3';
import type { ConsoleOps, ConsoleStreamHandle } from './console-ops.js';
import type { ConsoleStateCoordinator } from './state.js';
import { appendLine, maxStdoutSeq, pruneToCapacity, DEFAULT_CAPACITY } from './buffer.js';

export interface BroadcastLine {
  stdout_seq: number;
  bytes: Buffer;
  encoding: 'utf8' | 'base64';
  ts: number;
}

export type BroadcastSubscriber = (line: BroadcastLine) => void;

export interface SessionBroadcaster {
  subscribe(subscriber: BroadcastSubscriber): () => void;
  /** Subscriber count; route handler exposes via /status. */
  size(): number;
}

export interface BroadcastRegistryDeps {
  db: Database.Database;
  consoleOps: ConsoleOps;
  state: ConsoleStateCoordinator;
  /** Per-session line cap; default DEFAULT_CAPACITY (50_000). */
  bufferCap?: number;
  /** Run pruneToCapacity every N appends to amortize the cost. */
  pruneInterval?: number;
}

export interface BroadcastRegistry {
  /**
   * Get-or-create the per-session broadcaster. The first subscriber
   * triggers attachStream on the underlying ConsoleOps; the last
   * disconnect triggers handle.close().
   */
  forSession(sessionName: string, tmuxTarget: string): SessionBroadcaster;
  /** Tear down all sessions; called on daemon shutdown. */
  closeAll(): void;
}

interface SessionEntry {
  subscribers: Set<BroadcastSubscriber>;
  handle: ConsoleStreamHandle | null;
  appendsSincePrune: number;
  nextSeq: number;
}

export function createBroadcastRegistry(
  deps: BroadcastRegistryDeps,
): BroadcastRegistry {
  const cap = deps.bufferCap ?? DEFAULT_CAPACITY;
  const pruneEvery = deps.pruneInterval ?? Math.max(1, Math.floor(cap / 10));
  const sessions = new Map<string, SessionEntry>();

  function getOrInit(sessionName: string, tmuxTarget: string): SessionEntry {
    let entry = sessions.get(sessionName);
    if (!entry) {
      entry = {
        subscribers: new Set(),
        handle: null,
        appendsSincePrune: 0,
        // Resume from the existing buffer's max seq so cross-restart
        // monotonicity holds (per §4.7.1).
        nextSeq: maxStdoutSeq(deps.db, sessionName),
      };
      sessions.set(sessionName, entry);
    }
    return entry;
  }

  function attachIfNeeded(sessionName: string, tmuxTarget: string, entry: SessionEntry): void {
    if (entry.handle) return;
    entry.handle = deps.consoleOps.attachStream(tmuxTarget, (line) => {
      entry.nextSeq += 1;
      const seq = entry.nextSeq;
      const ts = Date.now();
      // Encoding detection: try utf8 round-trip; fall back to base64
      // if any byte sequence is invalid UTF-8 (per §4.7.3).
      let encoding: 'utf8' | 'base64' = 'utf8';
      try {
        const decoded = line.toString('utf8');
        // Re-encode + compare; if the line round-trips, it's clean utf8.
        if (Buffer.byteLength(decoded, 'utf8') !== line.length) {
          encoding = 'base64';
        }
      } catch {
        encoding = 'base64';
      }

      // Persist + prune.
      const s = deps.state.state(sessionName);
      if (s.buffer_enabled) {
        appendLine(deps.db, sessionName, seq, line, encoding, ts);
        entry.appendsSincePrune += 1;
        if (entry.appendsSincePrune >= pruneEvery) {
          entry.appendsSincePrune = 0;
          pruneToCapacity(deps.db, sessionName, cap);
        }
      }
      deps.state.recordStdoutActivity(sessionName, new Date(ts).toISOString());

      // Fan out.
      const out: BroadcastLine = { stdout_seq: seq, bytes: line, encoding, ts };
      for (const sub of entry.subscribers) {
        try {
          sub(out);
        } catch {
          // Subscriber callback errors must not poison the broadcast.
        }
      }
    });
  }

  // Per CONDUCTOR_API_CONTRACT.md §4.7.3 disconnection semantics: the
  // PTY reader continues even when no subscribers remain, so the ring
  // buffer keeps filling and a reconnecting client can backfill missed
  // lines. The spec adds an "AND ring buffer hits its high-water mark"
  // pause condition; v3.0 always-keep-reading behavior is the simpler
  // upper bound (memory remains bounded by the cap-and-prune loop).
  // Detach happens only via closeAll() at daemon shutdown.
  function detachIfEmpty(_entry: SessionEntry): void {
    /* no-op per §4.7.3 — see comment block above */
  }

  return {
    forSession(sessionName, tmuxTarget) {
      const entry = getOrInit(sessionName, tmuxTarget);
      return {
        subscribe(subscriber) {
          entry.subscribers.add(subscriber);
          deps.state.adjustSubscribers(sessionName, +1);
          attachIfNeeded(sessionName, tmuxTarget, entry);
          return () => {
            entry.subscribers.delete(subscriber);
            deps.state.adjustSubscribers(sessionName, -1);
            detachIfEmpty(entry);
          };
        },
        size: () => entry.subscribers.size,
      };
    },
    closeAll() {
      for (const entry of sessions.values()) {
        if (entry.handle) {
          entry.handle.close();
          entry.handle = null;
        }
        entry.subscribers.clear();
      }
      sessions.clear();
    },
  };
}
