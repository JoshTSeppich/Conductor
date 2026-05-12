// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB8 GREEN ·
// build-md/dispatch-loop.ts — workstation DAG traversal engine.
//
// Per Sub-Q-MBTWFT5-C=(i) operator-arbitrated 2026-05-12: spawn pathway
// reuses orchestrator-fire-spawn.ts via dependency injection. WB10
// wires production deps:
//   - fireSpawn: orchestratorFireSpawn-derived (auto/ask dispatch-mode
//     aware via SpawnConfirmGate)
//   - getCompletedTaskIds: read from spawn-result-listener state
//     (tracks terminal spawn outcomes)
//   - maxParallel: from T4 max-parallel-store (Sub-Q-D=(ii)); falls
//     back to sibling state (Sub-Q-D=(i)) if T4 not shipped
//
// This module is pure traversal logic — no electron imports — for
// unit-test isolation at WB7 RED + WB9 end-to-end at WB9 RED.

import { computeReadySet } from './service.js';
import type {
  TaskDAG,
  TaskId,
} from 'dispatch-core/dist/build-doc-parser/index.js';

/** Request shape passed to fireSpawn per ready task. */
export interface DispatchSpawnRequest {
  readonly taskId: TaskId;
  readonly branch: string;
}

/** Result of a fireSpawn call — mirrors orchestrator-fire-spawn OrchestratorSpawnResult. */
export type DispatchSpawnResult =
  | { readonly sessionName: string }
  | { readonly declined: true };

export interface DispatchLoopDeps {
  /** Fresh DAG read per tick (honors live BUILD.md re-parse). */
  readonly getDag: () => TaskDAG;
  /** Fresh completed-set read per tick (host owns mutation via spawn-result-listener). */
  readonly getCompletedTaskIds: () => ReadonlySet<TaskId>;
  /** Max concurrent spawns. Read fresh per tick to honor live toggling. */
  readonly maxParallel: number;
  /** Spawn invoker — per Sub-Q-MBTWFT5-C=(i) wraps orchestrator-fire-spawn at WB10. */
  readonly fireSpawn: (
    request: DispatchSpawnRequest,
  ) => Promise<DispatchSpawnResult>;
}

export interface DispatchLoopTickResult {
  /** Tasks for which fireSpawn returned a sessionName. */
  readonly spawned: number;
  /** Tasks for which fireSpawn returned {declined: true}. */
  readonly declined: number;
  /** Ready tasks NOT fired this tick due to maxParallel cap. */
  readonly queued: number;
  /** True when all tasks in DAG are in completedTaskIds. */
  readonly done: boolean;
  /** True when maxParallel===0 (loop is gated off). */
  readonly idle: boolean;
}

export interface DispatchLoop {
  tick: () => Promise<DispatchLoopTickResult>;
}

/**
 * Create a DispatchLoop bound to deps. Each `tick()` reads fresh state
 * (DAG + completed-set) so the loop honors live BUILD.md edits + spawn-
 * result completion updates without re-construction.
 *
 * Algorithm per tick:
 *   1. If maxParallel===0 → return idle with no spawns.
 *   2. Read fresh DAG + completedTaskIds.
 *   3. If all tasks completed → return done=true.
 *   4. Compute ready-set via service.computeReadySet.
 *   5. Slice ready to maxParallel (treats this tick as fresh — host
 *      tracks in-flight separately via completed-set updates).
 *   6. Invoke fireSpawn per sliced ready task in parallel; collect
 *      spawned/declined counts.
 *   7. Return tick result.
 */
export function createDispatchLoop(deps: DispatchLoopDeps): DispatchLoop {
  return {
    async tick(): Promise<DispatchLoopTickResult> {
      if (deps.maxParallel === 0) {
        return { spawned: 0, declined: 0, queued: 0, done: false, idle: true };
      }
      const dag = deps.getDag();
      const completed = deps.getCompletedTaskIds();

      if (dag.tasks.length > 0 && dag.tasks.every((t) => completed.has(t.id))) {
        return { spawned: 0, declined: 0, queued: 0, done: true, idle: false };
      }

      const readyIds = computeReadySet(dag, completed);
      const sliced = readyIds.slice(0, deps.maxParallel);
      const queued = readyIds.length - sliced.length;

      const taskById = new Map(dag.tasks.map((t) => [t.id, t]));
      const results = await Promise.all(
        sliced.map(async (taskId) => {
          const task = taskById.get(taskId);
          if (task === undefined) {
            // Defensive — should never happen since computeReadySet enumerates dag.tasks.
            return { declined: true } as DispatchSpawnResult;
          }
          return deps.fireSpawn({ taskId: task.id, branch: task.branch });
        }),
      );

      let spawned = 0;
      let declined = 0;
      for (const r of results) {
        if ('declined' in r) {
          declined += 1;
        } else {
          spawned += 1;
        }
      }

      return { spawned, declined, queued, done: false, idle: false };
    },
  };
}
