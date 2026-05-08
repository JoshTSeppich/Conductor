import type { ParseError, Task, TaskDAG, TaskId } from './types.js';

/**
 * DFS-based cycle detection per Q-MBT28-3 = (a) DFS w/ white/gray/black coloring.
 * Returns first cycle path found (rotated to start at the smallest TaskId for
 * determinism), or null if acyclic.
 *
 * WB1 RED stub: lands in WB5.
 */
export function detectCycle(_dag: TaskDAG): TaskId[] | null {
  return null;
}

/**
 * Orphan-dependency detection — references to TaskIds not present in tasks/groups.
 *
 * WB1 RED stub: lands in WB6.
 */
export function detectOrphans(_dag: TaskDAG): ParseError[] {
  return [];
}

/**
 * Duplicate-branch-non-sequential detection per spec §4.5 + §3.3.
 * Two tasks sharing a branch must form a sequential chain via `Depends on`.
 * Tasks sharing a branch without a directed path between them are an error.
 *
 * WB1 RED stub: lands in WB6.
 */
export function detectDuplicateBranches(
  _tasks: Task[],
  _edges: TaskDAG['edges'],
): ParseError[] {
  return [];
}
