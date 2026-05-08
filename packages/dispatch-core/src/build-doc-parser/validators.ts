import type { ParseError, Task, TaskDAG, TaskId } from './types.js';

/**
 * DFS cycle detection per Q-MBT28-3 = (a) DFS w/ white/gray/black coloring.
 *
 * Returns the first cycle path found, rotated to start at the
 * numerically-smallest TaskId for deterministic output. Returns null
 * if the DAG is acyclic.
 *
 * Multiple-cycle reporting (when several disjoint SCCs exist) is v3.1
 * polish — single-cycle surfacing is sufficient for spec §4.3 acceptance.
 */
export function detectCycle(dag: TaskDAG): TaskId[] | null {
  const adj = new Map<TaskId, TaskId[]>();
  for (const t of dag.tasks) adj.set(t.id, []);
  for (const e of dag.edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e.to);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<TaskId, number>();
  for (const id of adj.keys()) color.set(id, WHITE);

  const stack: TaskId[] = [];
  let foundCycle: TaskId[] | null = null;

  const dfs = (node: TaskId): boolean => {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of adj.get(node) ?? []) {
      const c = color.get(next);
      if (c === GRAY) {
        const idx = stack.indexOf(next);
        foundCycle = stack.slice(idx);
        return true;
      }
      if (c === WHITE) {
        if (dfs(next)) return true;
      }
    }
    color.set(node, BLACK);
    stack.pop();
    return false;
  };

  // Sort task ids for deterministic DFS order.
  const orderedIds = [...adj.keys()].sort(compareTaskIds);
  for (const id of orderedIds) {
    if (color.get(id) === WHITE) {
      if (dfs(id)) break;
    }
  }

  if (foundCycle === null) return null;
  return rotateCycleToSmallestId(foundCycle);
}

/**
 * Numeric-aware TaskId comparison: "1" < "2" < "11"; "3.1" < "3.2"; "3" < "3.1".
 */
function compareTaskIds(a: TaskId, b: TaskId): number {
  const aParts = a.split('.').map((p) => Number(p));
  const bParts = b.split('.').map((p) => Number(p));
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function rotateCycleToSmallestId(cycle: TaskId[]): TaskId[] {
  if (cycle.length <= 1) return cycle;
  let minIdx = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (compareTaskIds(cycle[i]!, cycle[minIdx]!) < 0) minIdx = i;
  }
  return [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
}

/**
 * Orphan-dependency detection — references in `Task.dependsOn` that don't
 * resolve to any known Task or TaskGroup. Per Q-MBT28-1A, "forward references"
 * (§3.4) is folded into orphan detection.
 *
 * WB6 land.
 */
export function detectOrphans(_dag: TaskDAG): ParseError[] {
  return [];
}

/**
 * Duplicate-branch-non-sequential detection per spec §4.5 + §3.3.
 * Two tasks sharing a branch must form a sequential chain via Depends on.
 *
 * WB6 land.
 */
export function detectDuplicateBranches(
  _tasks: Task[],
  _edges: TaskDAG['edges'],
): ParseError[] {
  return [];
}
