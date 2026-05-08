import type { ParseError, Preamble, Task, TaskDAG, TaskGroup, TaskId } from './types.js';

/**
 * Build a TaskDAG from parsed preamble + tasks + groups.
 *
 * Edge construction (Q-MBT28-1C ack=expand): for every Task.dependsOn[] entry,
 * - If it resolves to a Task, emit a single edge `{from: task.id, to: dep}`.
 * - If it resolves to a TaskGroup, expand into per-child edges
 *   `{from: task.id, to: childId}` for every taskId in the group.
 * - If it does NOT resolve, skip silently (orphan detection runs in
 *   validators.detectOrphans at WB6).
 *
 * Per Q-MBT28-1A ack=alias-for-orphan: forward references (refs to
 * not-yet-defined ids) are folded into orphan detection.
 */
export function buildDag(
  preamble: Preamble,
  tasks: Task[],
  groups: TaskGroup[],
): { dag: TaskDAG; errors: ParseError[] } {
  const taskIds = new Set<TaskId>(tasks.map((t) => t.id));
  const groupMap = new Map<TaskId, TaskGroup>(groups.map((g) => [g.id, g]));
  const edges: Array<{ from: TaskId; to: TaskId }> = [];

  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      if (taskIds.has(dep)) {
        edges.push({ from: task.id, to: dep });
      } else if (groupMap.has(dep)) {
        const group = groupMap.get(dep)!;
        for (const childId of group.taskIds) {
          edges.push({ from: task.id, to: childId });
        }
      }
      // else: unresolved ref. Surfaced by validators.detectOrphans (WB6).
    }
  }

  return {
    dag: { preamble, tasks, groups, edges },
    errors: [],
  };
}
