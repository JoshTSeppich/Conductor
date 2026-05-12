// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB9 RED · MBTWFT5-05
//
// Probes the end-to-end main-process integration of the BUILD.md
// dispatch chain:
//   renderer triggers `workstation:build-md-dispatch-trigger` IPC →
//   main-process handler invokes DispatchLoop.tick() →
//   DispatchLoop computes ready-set + invokes fireSpawn per task →
//   returns tick result to renderer
//
// Per Sub-Q-MBTWFT5-B=(ii) operator-arbitrated 2026-05-12: operator-click
// button is the trigger source. Per Sub-Q-MBTWFT5-C=(i) operator-
// arbitrated 2026-05-12: spawn pathway reuses orchestrator-fire-spawn
// (mocked here as DI seam to verify integration without electron).
//
// This probe asserts the WHOLE main-process chain composes correctly:
// IPC handler registration + payload → BuildMdIpcController →
// BuildMdDispatchTriggerController → DispatchLoop → fireSpawn (mock).
//
// At WB9 RED time `src/main/build-md-dispatch-trigger-ipc.ts` does NOT
// exist; vitest fails at module-resolve. WB10 GREEN ships the trigger
// controller + main.ts wiring + WORKSTATION_CONTRACT.md §6.6 Channel #6
// amendment (HALT-WB10-PRE-COMMIT mandatory).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// @ts-expect-error — WB9 RED: import target absent until WB10 GREEN ships build-md-dispatch-trigger-ipc.ts.
import {
  BuildMdDispatchTriggerController,
  registerBuildMdDispatchTriggerHandlers,
} from '../../../src/main/build-md-dispatch-trigger-ipc.js';

import { BuildMdIpcController, registerBuildMdIpcHandlers } from '../../../src/main/build-md-ipc.js';

// Fake ipcMain with invoke testbed (matches WB3 pattern).
function createFakeIpcMain() {
  const registered = new Map<string, (...args: unknown[]) => unknown>();
  return {
    registered,
    handle(channel: string, fn: (...args: unknown[]) => unknown) {
      registered.set(channel, fn);
    },
    async invoke(channel: string, payload?: unknown): Promise<unknown> {
      const fn = registered.get(channel);
      if (!fn) throw new Error(`no handler for ${channel}`);
      return fn({}, payload);
    },
  };
}

const THREE_TASK_FIXTURE = `# BUILD

**Repo:** mbtwft5-e2e-test
**Plan rev:** 2026-05-12.C

## §1 — Task A (ready)

**Goal:** First ready task — no deps.

**Branch:** feat/task-a

**Depends on:** —

**Acceptance:**
- Task A

## §2 — Task B (ready)

**Goal:** Second ready task — no deps.

**Branch:** feat/task-b

**Depends on:** —

**Acceptance:**
- Task B

## §3 — Task C (blocked)

**Goal:** Blocked task — depends on §1 and §2.

**Branch:** feat/task-c

**Depends on:** §1, §2

**Acceptance:**
- Task C
`;

interface FiredSpawn {
  readonly taskId: string;
  readonly branch: string;
}

function makeFireSpawn(opts: { declineAll?: boolean } = {}): {
  fired: FiredSpawn[];
  fn: (req: { taskId: string; branch: string }) => Promise<{ sessionName: string } | { declined: true }>;
} {
  const fired: FiredSpawn[] = [];
  return {
    fired,
    async fn(req) {
      fired.push({ taskId: req.taskId, branch: req.branch });
      if (opts.declineAll) return { declined: true };
      return { sessionName: `session-${req.taskId}` };
    },
  };
}

describe('MBTWFT5-05 end-to-end spawn-trigger main-process integration', () => {
  let tmpDir: string;
  let buildMdPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mbtwft5-05-'));
    buildMdPath = join(tmpDir, 'BUILD.md');
    writeFileSync(buildMdPath, THREE_TASK_FIXTURE, 'utf8');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('registers workstation:build-md-dispatch-trigger handler', () => {
    const ipcMain = createFakeIpcMain();
    const spawn = makeFireSpawn();
    const triggerController = new BuildMdDispatchTriggerController({
      defaultBuildMdPath: () => buildMdPath,
      getCompletedTaskIds: () => new Set<string>(),
      getMaxParallel: () => 10,
      fireSpawn: spawn.fn,
    });
    registerBuildMdDispatchTriggerHandlers(ipcMain, triggerController);

    expect(ipcMain.registered.has('workstation:build-md-dispatch-trigger')).toBe(true);
  });

  it('triggers DispatchLoop tick → fires 2 spawns (§1 + §2 ready; §3 blocked)', async () => {
    const ipcMain = createFakeIpcMain();
    const spawn = makeFireSpawn();
    const triggerController = new BuildMdDispatchTriggerController({
      defaultBuildMdPath: () => buildMdPath,
      getCompletedTaskIds: () => new Set<string>(),
      getMaxParallel: () => 10,
      fireSpawn: spawn.fn,
    });
    registerBuildMdDispatchTriggerHandlers(ipcMain, triggerController);

    const result = (await ipcMain.invoke('workstation:build-md-dispatch-trigger')) as {
      ok: boolean;
      spawned: number;
      declined: number;
      queued: number;
    };

    expect(result.ok).toBe(true);
    expect(result.spawned).toBe(2);
    expect(result.declined).toBe(0);
    expect(result.queued).toBe(0);

    const firedSorted = [...spawn.fired].sort((a, b) => a.taskId.localeCompare(b.taskId));
    expect(firedSorted.map((f) => f.taskId)).toEqual(['1', '2']);
    expect(firedSorted.map((f) => f.branch)).toEqual(['feat/task-a', 'feat/task-b']);
  });

  it('respects maxParallel cap (= 1) — 1 spawned, 1 queued', async () => {
    const ipcMain = createFakeIpcMain();
    const spawn = makeFireSpawn();
    const triggerController = new BuildMdDispatchTriggerController({
      defaultBuildMdPath: () => buildMdPath,
      getCompletedTaskIds: () => new Set<string>(),
      getMaxParallel: () => 1,
      fireSpawn: spawn.fn,
    });
    registerBuildMdDispatchTriggerHandlers(ipcMain, triggerController);

    const result = (await ipcMain.invoke('workstation:build-md-dispatch-trigger')) as {
      ok: boolean;
      spawned: number;
      queued: number;
    };
    expect(result.spawned).toBe(1);
    expect(result.queued).toBe(1);
    expect(spawn.fired.length).toBe(1);
  });

  it('returns ok=false when BUILD.md not found', async () => {
    const ipcMain = createFakeIpcMain();
    const spawn = makeFireSpawn();
    const triggerController = new BuildMdDispatchTriggerController({
      defaultBuildMdPath: () => join(tmpDir, 'never-existed-BUILD.md'),
      getCompletedTaskIds: () => new Set<string>(),
      getMaxParallel: () => 10,
      fireSpawn: spawn.fn,
    });
    registerBuildMdDispatchTriggerHandlers(ipcMain, triggerController);

    const result = (await ipcMain.invoke('workstation:build-md-dispatch-trigger')) as {
      ok: false;
      error_type: string;
    };
    expect(result.ok).toBe(false);
    expect(result.error_type).toBe('NotFound');
    expect(spawn.fired.length).toBe(0);
  });

  it('honors dispatch-mode ask path — all spawns declined cleanly', async () => {
    const ipcMain = createFakeIpcMain();
    const spawn = makeFireSpawn({ declineAll: true });
    const triggerController = new BuildMdDispatchTriggerController({
      defaultBuildMdPath: () => buildMdPath,
      getCompletedTaskIds: () => new Set<string>(),
      getMaxParallel: () => 10,
      fireSpawn: spawn.fn,
    });
    registerBuildMdDispatchTriggerHandlers(ipcMain, triggerController);

    const result = (await ipcMain.invoke('workstation:build-md-dispatch-trigger')) as {
      ok: boolean;
      spawned: number;
      declined: number;
    };
    expect(result.ok).toBe(true);
    expect(result.spawned).toBe(0);
    expect(result.declined).toBe(2);
    expect(spawn.fired.length).toBe(2);
  });

  it('composes with BuildMdIpcController (renderer can read status before triggering dispatch)', async () => {
    const ipcMain = createFakeIpcMain();
    const spawn = makeFireSpawn();
    const readController = new BuildMdIpcController({
      defaultBuildMdPath: () => buildMdPath,
    });
    const triggerController = new BuildMdDispatchTriggerController({
      defaultBuildMdPath: () => buildMdPath,
      getCompletedTaskIds: () => new Set<string>(),
      getMaxParallel: () => 10,
      fireSpawn: spawn.fn,
    });
    registerBuildMdIpcHandlers(ipcMain, readController);
    registerBuildMdDispatchTriggerHandlers(ipcMain, triggerController);

    // Renderer step 1: read status.
    const readResult = (await ipcMain.invoke('workstation:read-build-md', undefined)) as {
      ok: boolean;
      status?: { readyCount: number; blockedCount: number; taskCount: number };
    };
    expect(readResult.ok).toBe(true);
    expect(readResult.status!.taskCount).toBe(3);
    expect(readResult.status!.readyCount).toBe(2);
    expect(readResult.status!.blockedCount).toBe(1);

    // Renderer step 2: trigger dispatch.
    const triggerResult = (await ipcMain.invoke('workstation:build-md-dispatch-trigger')) as {
      ok: boolean;
      spawned: number;
    };
    expect(triggerResult.spawned).toBe(2);
  });
});
