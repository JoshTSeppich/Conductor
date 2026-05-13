/**
 * MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW WB2 GREEN —
 * Workstation main-process aggregator tracking per-spawn
 * bypass-perms state.
 *
 * Round 11 §3.9 SPECULATIVE Wave 4 — manifest at
 * phase4-t9-bypass-perms.txt scopes daemon FORBIDDEN, dispatch-core
 * FORBIDDEN, sibling components FORBIDDEN. This module is the
 * workstation main-process source-of-truth aggregator over per-
 * spawn permissionMode events.
 *
 * Architectural pattern: T9 rate-limit-aggregator pluggable-source
 * skeleton (3fef80d) applied to bypass-perms domain. The source
 * owns an in-memory Map<sessionName, 'auto' | 'ask'>; integrator
 * (spawn-handler.ts at WB4) pushes events via recordSpawn();
 * subscribers (deferred consumer wiring per MB-F-BYPASS-PERMS-
 * CONSUMER-WIRING Tier 2 follow-on) receive aggregated count via
 * onUpdate.
 *
 * Why per-spawn-record (not per-session-query): the source-of-truth
 * for "is bypass-perms active" is the operator's permissionMode
 * choice at spawn time, captured at SpawnSessionRequest construction
 * and projected through SpawnSessionResult.spawnMode (closure (a)
 * work at 5328a97). Querying daemon /v2/sessions would require
 * adding a permissionMode field to SessionResponseV2 (frozen
 * schema.ts §1 — FORBIDDEN). Workstation-side aggregation keeps
 * the data flow entirely within manifest-allowed paths.
 *
 * Future ticket plug-points:
 *   - chat-shell/mount.ts (FORBIDDEN by current manifest): wire
 *     source.onUpdate → broadcast via existing or new IPC channel;
 *     BypassPermsIndicator consumes count via bridge subscription.
 *   - New IPC channel under WORKSTATION_CONTRACT.md §6.6
 *     amendment (also FORBIDDEN by current manifest): push channel
 *     dedicated to bypass-perms count.
 * Both paths plug into the same source.onUpdate(cb) seam.
 *
 * Frozen-contract awareness: this module DOES NOT touch any frozen
 * surface. State is in-memory only (no persistence); no IPC; no
 * schema.
 */

/**
 * Permission mode mirrors SpawnPermissionMode at spawn-handler.ts:91.
 * Duplicating the literal-union type instead of importing keeps this
 * module loosely coupled to spawn-handler's evolution (spawn-handler
 * may extend the union with 'review' or other modes in the future
 * without forcing this aggregator to change).
 */
export type BypassPermsMode = 'auto' | 'ask';

/**
 * Public surface of the aggregator. Integrator (spawn-handler) calls
 * recordSpawn(); consumer reads getActiveBypassCount() or subscribes
 * via onUpdate.
 */
export interface BypassPermsSource {
  /**
   * Record that a session was spawned with the given permission mode.
   * Idempotent under same-name same-mode: re-recording the same name
   * with the same mode is a no-op. Re-recording the same name with a
   * different mode replaces the entry (so the aggregator reflects
   * the most-recent operator choice for that session name).
   */
  recordSpawn(sessionName: string, mode: BypassPermsMode): void;
  /**
   * Count of recorded sessions with mode === 'auto'. The "active
   * bypass count" — the operator-visible signal that bypass-perms
   * is engaged. Returns 0 when no sessions recorded OR all are 'ask'.
   */
  getActiveBypassCount(): number;
  /**
   * Subscribe to count updates. Callback fires after EACH recordSpawn
   * invocation (regardless of whether the count actually changed —
   * this lets subscribers observe "operator confirmed bypass" events
   * even when the numeric count is stable). Returns dispose function;
   * after dispose, the callback no longer fires but the aggregator
   * state continues advancing for other subscribers.
   */
  onUpdate(cb: (activeBypassCount: number) => void): () => void;
}

/**
 * Construct a fresh bypass-perms aggregator. State is contained in
 * the closure; multiple createBypassPermsSource() calls produce
 * independent sources (useful for tests + future multi-tenant
 * scenarios).
 *
 * No external dependencies — pure in-memory state. This is the
 * minimal-cost architectural seam: integrator pushes; subscribers
 * pull-or-subscribe; no I/O.
 */
export function createBypassPermsSource(): BypassPermsSource {
  const sessions = new Map<string, BypassPermsMode>();
  const subscribers = new Set<(count: number) => void>();

  function getActiveBypassCount(): number {
    let count = 0;
    for (const mode of sessions.values()) {
      if (mode === 'auto') count += 1;
    }
    return count;
  }

  return {
    recordSpawn(sessionName: string, mode: BypassPermsMode): void {
      sessions.set(sessionName, mode);
      const count = getActiveBypassCount();
      for (const cb of subscribers) {
        cb(count);
      }
    },
    getActiveBypassCount,
    onUpdate(cb): () => void {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  };
}
