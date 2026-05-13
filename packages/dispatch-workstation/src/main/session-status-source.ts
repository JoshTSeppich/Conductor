// MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB3 (green) — public-facing
// facade composing WB1 deriveTileStatus + WB2 startStatusPoll into a
// subscribe/getSnapshot/dispose API per ticket body §1.1 row 3 +
// §4 WB3 (commit 832c03b).
//
// The facade owns:
//   - A snapshot Map<string, TileStatus> reflecting the latest
//     daemon-derived status per session name.
//   - A subscriber Set<callback> broadcast on every actual status
//     change (delegated to startStatusPoll's per-session dedup —
//     onStatusChange fires only on real transitions).
//   - The PollHandle returned by startStatusPoll, disposed when
//     the facade is disposed.
//
// Dispose semantics:
//   - dispose() is idempotent (calling twice is a no-op the second
//     time).
//   - Post-dispose:
//       * subscribe() returns a no-op unsubscribe (callback never
//         invoked; nothing to clean up).
//       * getSnapshot() continues to return the last-known Map
//         (frozen at dispose time).
//
// Consumed:
//   - StatusListClient + PollDeps + startStatusPoll from
//     session-status-source-poll.ts (17aa384).
//   - TileStatus type from tile-grid/types.ts.

import type { TileStatus } from '../tile-grid/types.js';
import {
  startStatusPoll,
  type StatusListClient,
} from './session-status-source-poll.js';

export type { StatusListClient } from './session-status-source-poll.js';

export interface SessionStatusSourceDeps {
  readonly listClient: StatusListClient;
  /** Default 3000ms; passes through to startStatusPoll. */
  readonly intervalMs?: number;
}

export interface SessionStatusSource {
  /** Register a subscriber. Returns an unsubscribe fn. Calling
   *  unsubscribe is idempotent. Post-dispose, returns no-op. */
  subscribe(
    cb: (snapshot: ReadonlyMap<string, TileStatus>) => void,
  ): () => void;
  /** Current snapshot. Returns the live internal Map; consumers
   *  should NOT mutate. Initially empty; grows as polls complete. */
  getSnapshot(): ReadonlyMap<string, TileStatus>;
  /** Cleanup. Cancels the underlying poll timer + drops subscribers.
   *  Idempotent. Post-dispose, getSnapshot still returns last-known. */
  dispose(): void;
}

export function createSessionStatusSource(
  deps: SessionStatusSourceDeps,
): SessionStatusSource {
  const snapshot = new Map<string, TileStatus>();
  const subscribers = new Set<
    (snap: ReadonlyMap<string, TileStatus>) => void
  >();
  let disposed = false;

  const pollHandle = startStatusPoll({
    listClient: deps.listClient,
    intervalMs: deps.intervalMs,
    onStatusChange(sessionName, status) {
      // Mutate the snapshot Map in place. startStatusPoll already
      // dedups — onStatusChange fires only on real transitions — so
      // every callback IS a broadcast trigger.
      snapshot.set(sessionName, status);
      if (disposed) return;
      for (const sub of subscribers) {
        sub(snapshot);
      }
    },
  });

  return {
    subscribe(cb) {
      if (disposed) {
        // No-op subscribe; return no-op unsubscribe. Don't add to set
        // because we'll never fire after dispose.
        return () => {
          /* no-op */
        };
      }
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    getSnapshot() {
      return snapshot;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      pollHandle.dispose();
      subscribers.clear();
    },
  };
}
