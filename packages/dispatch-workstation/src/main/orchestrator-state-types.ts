// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB2 (RED) — types
// skeleton for the unified orchestrator-state read-side surface.
//
// Authored verbatim from WORKSTATION_CONTRACT.md §6.6 amendment
// (committed at 5a782f4; operator-STAMPED 2026-05-18). Per Q4
// pre-authorization arbitration: workstation-local TypeScript
// interface — NOT a Zod schema in dispatch-core/src/v3/schema.ts §14.
// Rationale: the snapshot is workstation-internal (daemon does not
// know about it; CLI does not consume it). Matches BuildMdLoadResult
// precedent at WORKSTATION_CONTRACT.md §6.6 Channel #5
// (packages/dispatch-workstation/src/build-md/types.ts).
//
// These types are the wire-payload shape for IPC Channels #8 + #9:
//   - Channel #8: orchestrator-state:get-snapshot (renderer → main
//                 invoke/handle; returns Promise<OrchestratorState-
//                 Snapshot>)
//   - Channel #9: orchestrator-state:update (main → renderer broadcast;
//                 payload OrchestratorStateSnapshot)
//
// Frozen at 5a782f4. Per operator STAMP: no further amendments to
// these interfaces without explicit re-arbitration under CLAUDE.md
// §1 + §2.10.

/**
 * Lite session shape — projection of daemon session record to the
 * fields the orchestrator-state consumers need. Matches the subset of
 * SessionRecord fields used by Topbar / OrchestratorStrip / Conductor-
 * Chat for paneCount / runningCount / queuedCount / etc.
 */
export interface OrchestratorSessionLite {
  readonly name: string;
  readonly state?: 'armed' | 'paused' | 'held' | 'killed';
  readonly computed_status?: 'idle' | 'running' | 'awaiting_review' | 'stale';
}

/**
 * Orchestrator narration log entry. Mirrors the design's 5-variant
 * role surface from conductor-message.tsx (ConductorMessageVariant at
 * src/conductor-chat/conductor-message.tsx:39-56). Per Q1=(c) pre-
 * authorization: the narration log is a workstation-local persisted
 * JSON file (<userData>/orchestrator-narration.json) appended by
 * orchestrator-action-handler at each spawn / dispatch-tick / terminal-
 * spawn-result / attach / detach event; aggregator reads + replays on
 * startup and includes the resulting array in every snapshot.
 */
export interface OrchestratorMessage {
  readonly role: 'user' | 'assistant' | 'dispatch' | 'system' | 'typing';
  readonly text?: string;
  /** typing-variant only: number of agents currently producing tokens. */
  readonly running?: number;
  readonly id?: string;
}

/**
 * Attached build.md state — derived from the workstation-side
 * attached-build-md-state-store (Q3=(a) arbitration). Aggregator
 * reads <userData>/attached-build-md-state.json on startup; if a path
 * is set, eagerly calls loadBuildMd(path) and seeds these counts from
 * the resulting BuildMdStatus via computeBuildMdStatus(dag,
 * completedTaskIds). Null when nothing is attached.
 */
export interface AttachedBuildMdState {
  /** file basename for chip rendering */
  readonly name: string;
  /** absolute path (resolved at attach time) */
  readonly path: string;
  /** task count from DAG */
  readonly steps: number;
  /** ready-set size */
  readonly queue: number;
  /** completed-task-set size */
  readonly done: number;
  /** in-flight dispatch count */
  readonly running: number;
  /** errorCount from BuildMdStatus */
  readonly errored: number;
}

/**
 * The unified orchestrator-state snapshot. Single payload shape
 * broadcast across both IPC Channel #8 (get-snapshot response) and
 * Channel #9 (update broadcast). All three EXPANSION-2 consuming
 * surfaces (Topbar / OrchestratorStrip / ConductorChat) map this
 * shape to their component-specific props via in-renderer derivation.
 */
export interface OrchestratorStateSnapshot {
  /** Monotonic counter; renderer may ignore out-of-order broadcasts. */
  readonly seq: number;
  /** Wall-clock ISO of last successful poll; null until first poll completes. */
  readonly polledAt: string | null;
  /** Live daemon-sessions snapshot per latest GET /v2/sessions. */
  readonly sessions: ReadonlyArray<OrchestratorSessionLite>;
  /** Build-md attach state OR null when nothing attached. */
  readonly attached: AttachedBuildMdState | null;
  /** Orchestrator narration log (Q1=(c) persisted append-only JSON). */
  readonly messages: ReadonlyArray<OrchestratorMessage>;
  /** Pause/resume gate (Q2=(a) workstation-side OrchestratorPauseStateStore). */
  readonly paused: boolean;
  /** Daemon-reachability — false when last poll rejected (drives Topbar error banner). */
  readonly daemonReachable: boolean;
}
