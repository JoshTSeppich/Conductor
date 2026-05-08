/**
 * Type spine for the BUILD.md parser per spec §3.1-§3.5.
 *
 * Operator-supervised mechanical translation per project §3.4.
 * Schema acked at HALT 0 (2026-05-08, MB-T28 Phase 1).
 */

/** §N (H2) or §N.M (H3) per spec §3.4. Stored without `§` prefix internally; error messages prepend § for display. */
export type TaskId = string;

export type ApprovalPolicy = 'tight' | 'medium' | 'loose';
export type ModelHint = 'S4.6' | 'O4.6' | 'O4.7·1M' | 'H';
export type Tier = 1 | 2 | 3;

export interface Task {
  /** TaskId without `§` prefix, e.g. "1", "3.1", "11". */
  id: TaskId;
  /** Heading text after "— ". */
  title: string;
  /** §3.3 required. One paragraph. */
  goal: string;
  /** §3.3 required. Git branch name. Multiple tasks may share a branch (must be sequential — see validators). */
  branch: string;
  /**
   * §3.3 required. Resolved §N references as TaskIds (without § prefix).
   * Empty array for "—". May contain group ids (per Q-MBT28-1C; round-trip fidelity).
   */
  dependsOn: TaskId[];
  /** §3.3 required. Bulleted list — one string per bullet (bullet character + leading whitespace stripped). */
  acceptance: string[];
  /** §3.3 optional. Bulleted list. */
  hints?: string[];
  approvalPolicy?: ApprovalPolicy;
  model?: ModelHint;
  tier?: Tier;
  /** Free text per spec §3.3 ("rough WB count"). */
  estimate?: string;
  /** e.g., "5%". */
  cap?: string;
  speculative?: boolean;
  /** 1-indexed line of the heading in source. */
  sourceLine: number;
}

/**
 * H2 section that contains H3 subsections per spec §3.2.
 * Acts as a group reference target per spec §3.4 ("all tasks in §N must be done").
 * Not itself a task.
 */
export interface TaskGroup {
  /** §N (without § prefix). */
  id: TaskId;
  title: string;
  /** Child H3 task ids (without § prefix). */
  taskIds: TaskId[];
  /** 1-indexed line of the group heading. */
  sourceLine: number;
}

export interface Preamble {
  /** §3.1 required. */
  repo: string;
  /** §3.1 required. */
  planRev: string;
  /** §3.1 optional. */
  operator?: string;
  /** §3.1 optional. */
  conductorProfile?: string;
}

/**
 * Resolved DAG.
 * - `tasks` ordered as in source.
 * - `edges` represent `from depends on to`. Per Q-MBT28-1C, group refs are
 *   expanded into per-child edges (uniform task-only graph for traversal).
 */
export interface TaskDAG {
  preamble: Preamble;
  tasks: Task[];
  groups: TaskGroup[];
  edges: Array<{ from: TaskId; to: TaskId }>;
}

/**
 * Discriminator for ParseError.
 * Per Q-MBT28-2 = (a) flat list with code-discriminated `details`.
 */
export type ParseErrorCode =
  | 'preamble.missing'
  | 'preamble.field-missing'
  | 'preamble.field-malformed'
  | 'task.missing-required-field'
  | 'task.malformed-field'
  | 'task.id-conflict'
  | 'task.malformed-heading'
  | 'dependency.orphan'
  | 'dependency.cycle'
  | 'branch.duplicate-non-sequential';

/**
 * Per-code `details` shape (documented; not type-enforced — see Q-MBT28-2).
 *
 * - 'preamble.missing':                {}
 * - 'preamble.field-missing':          { fieldName: string }
 * - 'preamble.field-malformed':        { fieldName: string; rawValue: string }
 * - 'task.missing-required-field':     { taskId: TaskId; fieldName: string }
 * - 'task.malformed-field':            { taskId: TaskId; fieldName: string; rawValue: string }
 * - 'task.id-conflict':                { taskId: TaskId; firstSourceLine: number }
 * - 'task.malformed-heading':          { rawHeading: string }
 * - 'dependency.orphan':               { taskId: TaskId; missingRef: TaskId }
 * - 'dependency.cycle':                { cyclePath: TaskId[] }
 * - 'branch.duplicate-non-sequential': { branch: string; taskIds: TaskId[] }
 */
export interface ParseError {
  code: ParseErrorCode;
  message: string;
  /** 1-indexed line in source; 0 if not attributable. */
  line: number;
  details?: Record<string, unknown>;
}

export type ParseResult =
  | { ok: true; dag: TaskDAG }
  | { ok: false; errors: ParseError[] };
