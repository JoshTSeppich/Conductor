// MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB1 (green) — pure-fn
// derivation of TileStatus from daemon GET /v2/sessions per-session
// response fields + workstation-side daemon-reachability flag.
//
// Ticket body anchor: CONDUCTOR_MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW
// _BUILD.md (commit 832c03b) §1.1 row 1 + §4 WB1. Mapping rule
// operator-acked 2026-05-13 Sub-Q-1 option A.
//
// Reads (READ-ONLY consumed):
//   - StateEnum:           dispatch-core/src/v2/schema.ts:32
//                          ('armed' | 'paused' | 'held' | 'killed')
//   - ComputedStatusEnum:  dispatch-core/src/v2/schema.ts:40-45
//                          ('idle' | 'running' | 'awaiting_review' | 'stale')
//   - TileStatus:          tile-grid/types.ts:39-45
//                          ('idle' | 'open' | 'killed' | 'detached'
//                                | 'error' | 'warning')
//
// Mapping is a strict-order switch (precedence highest-to-lowest):
//   1. !daemonReachable     → 'error'  (daemon down trumps every state)
//   2. state === 'killed'   → 'killed' (statusToColor returns null →
//                                      renderer hides indicator)
//   3. state === 'held'     → 'error'  (cairn-violation halt is red)
//   4. computed_status ===
//        'running'           → 'open'   (green)
//        'idle'              → 'idle'   (grey)
//        'stale'             → 'warning'(amber; daemon stale heuristic)
//        'awaiting_review'   → 'detached' (amber; kanban surface)
//   5. !computed_status &&
//      hasSpawnResult       → 'idle'   (pre-poll grey window)
//   6. fallback              → 'idle'   (defensive; never-cast guard
//                                       on exhaustiveness)

import type { TileStatus } from '../tile-grid/types.js';

/**
 * Input to the pure-fn derivation. Fields mirror a SUBSET of the
 * daemon's per-session response (SessionResponseV2 at
 * dispatch-core/src/v2/schema.ts:329-340) plus workstation-side
 * augmentation fields.
 *
 * `state` + `computed_status` are optional because:
 *   - Pre-poll window: daemon has not yet been hit for this session,
 *     so neither field is known. `hasSpawnResult: true` signals the
 *     pre-poll grey state.
 *   - Daemon-unreachable: poll failed; workstation only knows
 *     `daemonReachable: false` and falls back to 'error' regardless.
 */
export interface SessionStatusInput {
  readonly state?: 'armed' | 'paused' | 'held' | 'killed';
  readonly computed_status?: 'idle' | 'running' | 'awaiting_review' | 'stale';
  /** True iff the last daemon poll succeeded within the active window. */
  readonly daemonReachable: boolean;
  /** True iff workstation has observed a successful spawn-result for
   *  this session name. Drives the pre-poll grey window. */
  readonly hasSpawnResult: boolean;
}

export function deriveTileStatus(input: SessionStatusInput): TileStatus {
  // Precedence 1: daemon-unreachable trumps everything.
  if (!input.daemonReachable) {
    return 'error';
  }

  // Precedence 2: state-machine terminal/halt states.
  if (input.state === 'killed') {
    return 'killed';
  }
  if (input.state === 'held') {
    return 'error';
  }

  // Precedence 3: daemon's activity-derived computed_status.
  switch (input.computed_status) {
    case 'running':
      return 'open';
    case 'idle':
      return 'idle';
    case 'stale':
      return 'warning';
    case 'awaiting_review':
      return 'detached';
    case undefined:
      // Pre-poll window: daemon hasn't returned a computed_status yet,
      // but we know the session was spawned. Render grey.
      if (input.hasSpawnResult) {
        return 'idle';
      }
      // No spawn-result + no computed_status: defensive grey fallback.
      return 'idle';
    default: {
      // Exhaustiveness guard: if ComputedStatusEnum gains new values
      // upstream, this `never` cast flags via tsc; runtime falls back
      // to grey.
      const _exhaustive: never = input.computed_status;
      void _exhaustive;
      return 'idle';
    }
  }
}
