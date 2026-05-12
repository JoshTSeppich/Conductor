// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB10 GREEN ·
// build-md-dispatch-trigger-ipc.ts — `workstation:build-md-dispatch-trigger`
// IPC handler.
//
// Bridges renderer button click (`window.workstationBridge.
// triggerBuildMdDispatch()`) to main-process DispatchLoop tick (WB8).
// On each invocation:
//   1. Read BUILD.md fresh via loadBuildMd (handles concurrent edits).
//   2. If load failed: return error result; do not dispatch.
//   3. Construct DispatchLoop with current DAG + injected
//      completedTaskIds, maxParallel, fireSpawn deps.
//   4. tick() once; return tick result merged with ok=true.
//
// Per Sub-Q-MBTWFT5-B=(ii) operator-arbitrated 2026-05-12: operator-
// click button is the trigger source. Per Sub-Q-MBTWFT5-C=(i) operator-
// arbitrated 2026-05-12: fireSpawn dep wraps orchestrator-fire-spawn
// (main.ts production wiring constructs the wrapper around
// orchestratorFireSpawn + OrchestratorFireSpawnDeps).
//
// Pattern mirrors build-md-ipc.ts (WB4) Controller-with-DI-seam +
// factory + payload-validation conventions.

import { loadBuildMd } from '../build-md/service.js';
import { createDispatchLoop } from '../build-md/dispatch-loop.js';
import type {
  DispatchSpawnRequest,
  DispatchSpawnResult,
} from '../build-md/dispatch-loop.js';
import type { BuildMdLoadResult } from '../build-md/types.js';
import type { TaskId } from 'dispatch-core/dist/build-doc-parser/index.js';

// ─── Dependency interfaces ─────────────────────────────────────────────

export interface BuildMdDispatchTriggerIpcMain {
  handle: (
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown,
  ) => void;
}

export interface BuildMdDispatchTriggerDeps {
  /** Resolves default BUILD.md path (called per invocation). */
  readonly defaultBuildMdPath: () => string;
  /** Fresh completed-set read (host owns mutation via spawn-result-listener wiring). */
  readonly getCompletedTaskIds: () => ReadonlySet<TaskId>;
  /** Fresh maxParallel read (Sub-Q-MBTWFT5-D source — T4 store or sibling state). */
  readonly getMaxParallel: () => number;
  /** Spawn invoker — Sub-Q-MBTWFT5-C=(i) wraps orchestrator-fire-spawn at main.ts production wiring. */
  readonly fireSpawn: (request: DispatchSpawnRequest) => Promise<DispatchSpawnResult>;
  /** Optional override of loader fn (test seam; defaults to `loadBuildMd`). */
  readonly loadBuildMd?: (path: string) => Promise<BuildMdLoadResult>;
}

// ─── Result-type discriminated union ───────────────────────────────────

export interface BuildMdDispatchTriggerSuccess {
  readonly ok: true;
  readonly spawned: number;
  readonly declined: number;
  readonly queued: number;
  readonly done: boolean;
  readonly idle: boolean;
}

export interface BuildMdDispatchTriggerError {
  readonly ok: false;
  readonly error_type: 'NotFound' | 'NotAFile' | 'IoError' | 'ParseError';
  readonly message: string;
}

export type BuildMdDispatchTriggerResult =
  | BuildMdDispatchTriggerSuccess
  | BuildMdDispatchTriggerError;

// ─── Controller ────────────────────────────────────────────────────────

export class BuildMdDispatchTriggerController {
  private readonly deps: BuildMdDispatchTriggerDeps;

  constructor(deps: BuildMdDispatchTriggerDeps) {
    this.deps = deps;
  }

  async handleTrigger(): Promise<BuildMdDispatchTriggerResult> {
    const load = this.deps.loadBuildMd ?? loadBuildMd;
    const path = this.deps.defaultBuildMdPath();
    const loadResult = await load(path);
    if (!loadResult.ok) {
      return {
        ok: false,
        error_type: loadResult.error_type,
        message: loadResult.message,
      };
    }
    const dag = loadResult.dag;
    const loop = createDispatchLoop({
      getDag: () => dag,
      getCompletedTaskIds: () => this.deps.getCompletedTaskIds(),
      maxParallel: this.deps.getMaxParallel(),
      fireSpawn: this.deps.fireSpawn,
    });
    const tickResult = await loop.tick();
    return {
      ok: true,
      spawned: tickResult.spawned,
      declined: tickResult.declined,
      queued: tickResult.queued,
      done: tickResult.done,
      idle: tickResult.idle,
    };
  }
}

// ─── Factory ───────────────────────────────────────────────────────────

export function registerBuildMdDispatchTriggerHandlers(
  ipcMain: BuildMdDispatchTriggerIpcMain,
  controller: BuildMdDispatchTriggerController,
): void {
  ipcMain.handle('workstation:build-md-dispatch-trigger', async () => {
    return controller.handleTrigger();
  });
}
