// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB2 GREEN ·
// build-md/types.ts
//
// Discriminated-union result types for the workstation-side BUILD.md
// driver. Mirrors the Wave C #3 frame-c-ipc Result-type pattern per
// WORKSTATION_CONTRACT.md §6.6 Result-type discriminated unions
// (`DiffResult`, `MergeResult`, `FocusResult` precedent at
// `packages/dispatch-workstation/src/main/frame-c-ipc.ts`).
//
// Sub-Q-MBTWFT5-A=(i) operator-arbitrated 2026-05-12: BUILD.md lives
// at repo-root by default; this type spine does NOT encode the path
// default — caller (loadBuildMd) resolves the path.

import type {
  ParseError,
  TaskDAG,
} from 'dispatch-core/dist/build-doc-parser/index.js';

/**
 * Serializable form of MB-T28 `TaskDAG`. Re-exported as a workstation-side
 * alias so callers don't need to reach across the package boundary for
 * the import; payload is IPC-safe (no functions; only data).
 */
export type SerializableTaskDAG = TaskDAG;

export interface BuildMdStatus {
  /** Total tasks parsed from BUILD.md (`dag.tasks.length`). */
  readonly taskCount: number;
  /** Tasks NOT yet completed AND with at least one un-completed dependency. */
  readonly blockedCount: number;
  /** Tasks NOT yet completed AND with all dependencies completed (== ready-set size). */
  readonly readyCount: number;
  /** Validator/parser error count surfaced at load time (0 on ok=true path). */
  readonly errorCount: number;
}

export interface BuildMdLoadSuccess {
  readonly ok: true;
  /** Absolute path the BUILD.md was read from. */
  readonly path: string;
  /** Optional git HEAD sha of BUILD.md at read time. Best-effort; omitted if not in git OR git not available. */
  readonly revSha?: string;
  readonly dag: SerializableTaskDAG;
  readonly status: BuildMdStatus;
}

export interface BuildMdLoadError {
  readonly ok: false;
  readonly error_type: 'NotFound' | 'NotAFile' | 'IoError' | 'ParseError';
  readonly message: string;
  /** Present only when `error_type === 'ParseError'`. */
  readonly parseErrors?: readonly ParseError[];
}

export type BuildMdLoadResult = BuildMdLoadSuccess | BuildMdLoadError;
