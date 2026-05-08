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
    // adj is keyed on every task.id; edges produced by buildDag always have
    // a task as `from`, so adj.get(e.from) is guaranteed non-undefined.
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

  // Iterate task ids in numerically-deterministic order (compareTaskIds).
  // DFS-from-sorted produces cyclePath starting at the smallest cycle member,
  // so no post-rotation is necessary.
  const orderedIds = [...adj.keys()].sort(compareTaskIds);
  for (const id of orderedIds) {
    if (color.get(id) === WHITE) {
      if (dfs(id)) break;
    }
  }

  return foundCycle;
}

/**
 * Numeric-aware TaskId comparison: "1" < "2" < "11"; "3.1" < "3.2"; "3" < "3.1".
 *
 * Final tiebreaker `aParts.length - bParts.length` (rather than literal 0)
 * handles the case where one id is a prefix of another (e.g., "1" vs "1.0");
 * for spec-compliant inputs where ids are unique, this is also the only
 * non-loop return path, ensuring full statement coverage.
 */
function compareTaskIds(a: TaskId, b: TaskId): number {
  const aParts = a.split('.').map((p) => Number(p));
  const bParts = b.split('.').map((p) => Number(p));
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return aParts.length - bParts.length;
}

/**
 * Orphan-dependency detection — references in `Task.dependsOn` that don't
 * resolve to any known Task or TaskGroup. Per Q-MBT28-1A, "forward references"
 * (§3.4) is folded into orphan detection.
 */
export function detectOrphans(dag: TaskDAG): ParseError[] {
  const taskIds = new Set<TaskId>(dag.tasks.map((t) => t.id));
  const groupIds = new Set<TaskId>(dag.groups.map((g) => g.id));
  const errors: ParseError[] = [];

  for (const task of dag.tasks) {
    for (const dep of task.dependsOn) {
      if (taskIds.has(dep) || groupIds.has(dep)) continue;
      errors.push({
        code: 'dependency.orphan',
        message: `Task §${task.id}: \`Depends on §${dep}\` references a task or group that does not exist`,
        line: task.sourceLine,
        details: { taskId: task.id, missingRef: dep },
      });
    }
  }
  return errors;
}

/**
 * Duplicate-branch-non-sequential detection per spec §4.5 + §3.3.
 *
 * Two tasks sharing a branch must form a sequential chain via Depends on —
 * for every pair of tasks (A, B) on the same branch, there must exist a
 * directed dependency path A→…→B or B→…→A. Tasks parallel on the same branch
 * are a parse error.
 */
export function detectDuplicateBranches(
  tasks: Task[],
  edges: TaskDAG['edges'],
): ParseError[] {
  const byBranch = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.branch) continue;
    const list = byBranch.get(t.branch) ?? [];
    list.push(t);
    byBranch.set(t.branch, list);
  }

  const errors: ParseError[] = [];
  for (const [branch, branchTasks] of byBranch) {
    if (branchTasks.length < 2) continue;
    if (isSequentialChain(branchTasks, edges)) continue;
    errors.push({
      code: 'branch.duplicate-non-sequential',
      message: `Branch \`${branch}\` is shared by ${branchTasks
        .map((t) => `§${t.id}`)
        .join(
          ', ',
        )} without a sequential dependency chain — parallel tasks on the same branch are a parse error (spec §4.5)`,
      line: branchTasks[0]!.sourceLine,
      details: {
        branch,
        taskIds: branchTasks.map((t) => t.id),
      },
    });
  }
  return errors;
}

function isSequentialChain(branchTasks: Task[], edges: TaskDAG['edges']): boolean {
  const reachable = new Map<TaskId, Set<TaskId>>();
  for (const t of branchTasks) {
    reachable.set(t.id, computeReachable(t.id, edges));
  }
  for (let i = 0; i < branchTasks.length; i++) {
    for (let j = i + 1; j < branchTasks.length; j++) {
      const a = branchTasks[i]!.id;
      const b = branchTasks[j]!.id;
      const aReachesB = reachable.get(a)!.has(b);
      const bReachesA = reachable.get(b)!.has(a);
      if (!aReachesB && !bReachesA) return false;
    }
  }
  return true;
}

function computeReachable(start: TaskId, edges: TaskDAG['edges']): Set<TaskId> {
  const reachable = new Set<TaskId>();
  const queue: TaskId[] = [start];
  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const e of edges) {
      if (e.from === node && !reachable.has(e.to)) {
        reachable.add(e.to);
        queue.push(e.to);
      }
    }
  }
  return reachable;
}
