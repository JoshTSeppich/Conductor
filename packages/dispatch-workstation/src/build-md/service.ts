// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB2 GREEN ·
// build-md/service.ts
//
// Workstation-side facade over the MB-T28 BUILD.md parser library
// (shipped at merge `7ce34b4` 2026-05-08; frozen at
// `packages/dispatch-core/src/build-doc-parser/`). T5 is the FIRST
// workstation consumer of the parser; this module is the boundary.
//
// Pure-fn-on-path: `loadBuildMd(path)` takes an explicit absolute
// path so the lib stays testable in vitest without electron mocks.
// IPC layer at WB4 (`build-md-ipc.ts`) handles default-path resolution
// via electron `app.getAppPath()` per Sub-Q-MBTWFT5-A=(i).

import { readFile, stat } from 'node:fs/promises';
import { parseBuildDoc } from 'dispatch-core/dist/build-doc-parser/index.js';
import type {
  TaskDAG,
  TaskId,
} from 'dispatch-core/dist/build-doc-parser/index.js';
import type { BuildMdLoadResult, BuildMdStatus } from './types.js';

/**
 * Read `path` as UTF-8, parse via `parseBuildDoc`, compute status,
 * return discriminated-union result.
 *
 * Failure modes (in evaluation order):
 *   - ENOENT on stat → { ok: false, error_type: 'NotFound', ... }
 *   - Other stat error → { ok: false, error_type: 'IoError', ... }
 *   - Path is not a regular file → { ok: false, error_type: 'NotAFile', ... }
 *   - Read error → { ok: false, error_type: 'IoError', ... }
 *   - Parser returns ok=false → { ok: false, error_type: 'ParseError', parseErrors }
 *
 * Success: returns { ok: true, path, dag, status } with initial
 * `completedTaskIds = new Set()` (all tasks treated as ready-or-blocked
 * pending dispatch loop completion tracking; WB8 dispatch-loop owns
 * `completedTaskIds` state).
 */
export async function loadBuildMd(path: string): Promise<BuildMdLoadResult> {
  let info;
  try {
    info = await stat(path);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') {
      return {
        ok: false,
        error_type: 'NotFound',
        message: `No BUILD.md at ${path}`,
      };
    }
    return {
      ok: false,
      error_type: 'IoError',
      message: `Failed to stat ${path}: ${e.message ?? String(err)}`,
    };
  }
  if (!info.isFile()) {
    return {
      ok: false,
      error_type: 'NotAFile',
      message: `${path} is not a regular file`,
    };
  }

  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return {
      ok: false,
      error_type: 'IoError',
      message: `Failed to read ${path}: ${e.message ?? String(err)}`,
    };
  }

  const parsed = parseBuildDoc(text);
  if (!parsed.ok) {
    return {
      ok: false,
      error_type: 'ParseError',
      message: `BUILD.md parse failed (${parsed.errors.length} error${parsed.errors.length === 1 ? '' : 's'})`,
      parseErrors: parsed.errors,
    };
  }

  const completed = new Set<TaskId>();
  const status = computeBuildMdStatus(parsed.dag, completed);
  return { ok: true, path, dag: parsed.dag, status };
}

/**
 * Compute the ready-set: tasks whose `dependsOn` ⊆ `completedTaskIds`
 * AND that are NOT themselves in `completedTaskIds`.
 *
 * Pure fn — no side effects. WB7 dispatch-loop probe asserts traversal
 * semantics + max-parallel slicing behavior.
 */
export function computeReadySet(
  dag: TaskDAG,
  completedTaskIds: ReadonlySet<TaskId>,
): TaskId[] {
  const result: TaskId[] = [];
  for (const task of dag.tasks) {
    if (completedTaskIds.has(task.id)) continue;
    let allDepsComplete = true;
    for (const dep of task.dependsOn) {
      if (!completedTaskIds.has(dep)) {
        allDepsComplete = false;
        break;
      }
    }
    if (allDepsComplete) result.push(task.id);
  }
  return result;
}

/**
 * Compute load-status metrics for status-line rendering (WB6) and
 * for downstream dispatch-loop decision-making (WB8).
 *
 * `errorCount` is 0 on the ok=true path (parser already filtered);
 * caller surfaces parser errors via the BuildMdLoadError variant.
 */
export function computeBuildMdStatus(
  dag: TaskDAG,
  completedTaskIds: ReadonlySet<TaskId>,
): BuildMdStatus {
  const taskCount = dag.tasks.length;
  const readyIds = computeReadySet(dag, completedTaskIds);
  const readyCount = readyIds.length;
  const completedCount = countCompletedInDag(dag, completedTaskIds);
  const blockedCount = Math.max(0, taskCount - completedCount - readyCount);
  return {
    taskCount,
    blockedCount,
    readyCount,
    errorCount: 0,
  };
}

function countCompletedInDag(
  dag: TaskDAG,
  completedTaskIds: ReadonlySet<TaskId>,
): number {
  let n = 0;
  for (const task of dag.tasks) {
    if (completedTaskIds.has(task.id)) n += 1;
  }
  return n;
}
