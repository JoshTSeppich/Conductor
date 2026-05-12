// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB7 RED · MBTWFT5-04
//
// Probes the `DispatchLoop` factory + `tick()` method — the workstation-
// side DAG traversal engine that:
//   (a) computes ready-set from the parsed BUILD.md TaskDAG
//   (b) respects max-parallel cap (slices ready to maxParallel - in-flight)
//   (c) invokes the injected `fireSpawn` per ready task
//   (d) tracks in-flight via spawn-result callback
//   (e) surfaces idle state when nothing to dispatch
//
// Per Sub-Q-MBTWFT5-C=(i) operator-arbitrated 2026-05-12, spawn pathway
// reuses `orchestrator-fire-spawn.ts` via dependency injection at WB10;
// this WB tests the loop with a mock `fireSpawn` to verify traversal
// semantics in isolation.
//
// At WB7 RED time `src/build-md/dispatch-loop.ts` does not exist;
// vitest fails the suite at module-resolve. WB8 GREEN ships the loop
// and flips RED → GREEN.

import { describe, it, expect } from 'vitest';

// @ts-expect-error — WB7 RED: import target absent until WB8 GREEN ships dispatch-loop.ts.
import { createDispatchLoop } from '../../../src/build-md/dispatch-loop.js';

import type { TaskDAG } from 'dispatch-core/dist/build-doc-parser/index.js';

// Hand-rolled TaskDAG fixtures for traversal-only testing.
function makeDag(
  tasks: Array<{ id: string; branch: string; dependsOn?: string[] }>,
): TaskDAG {
  return {
    preamble: { repo: 'test', planRev: '2026-05-12.A' },
    tasks: tasks.map((t, idx) => ({
      id: t.id,
      title: `Task ${t.id}`,
      goal: `goal ${t.id}`,
      branch: t.branch,
      dependsOn: t.dependsOn ?? [],
      acceptance: [`acc ${t.id}`],
      sourceLine: 10 + idx * 5,
    })),
    groups: [],
    edges: tasks.flatMap((t) =>
      (t.dependsOn ?? []).map((dep) => ({ from: t.id, to: dep })),
    ),
  };
}

interface MockSpawnRequest {
  readonly taskId: string;
  readonly branch: string;
}

function makeMockFireSpawn(): {
  fired: MockSpawnRequest[];
  fn: (req: MockSpawnRequest) => Promise<{ sessionName: string } | { declined: true }>;
  setDeclineForAll: (decline: boolean) => void;
} {
  const fired: MockSpawnRequest[] = [];
  let decline = false;
  return {
    fired,
    setDeclineForAll: (d: boolean) => {
      decline = d;
    },
    async fn(req) {
      fired.push(req);
      if (decline) return { declined: true };
      return { sessionName: `session-${req.taskId}` };
    },
  };
}

describe('MBTWFT5-04 DispatchLoop ready-set traversal + max-parallel + dispatch-mode', () => {
  it('fires spawns for all ready tasks when maxParallel >= readyCount', async () => {
    const dag = makeDag([
      { id: '1', branch: 'feat/1' },
      { id: '2', branch: 'feat/2' },
      { id: '3', branch: 'feat/3' },
    ]);
    const mock = makeMockFireSpawn();
    const loop = createDispatchLoop({
      getDag: () => dag,
      getCompletedTaskIds: () => new Set(),
      maxParallel: 5,
      fireSpawn: mock.fn,
    });

    const result = await loop.tick();
    expect(result.spawned).toBe(3);
    expect(mock.fired.map((r) => r.taskId).sort()).toEqual(['1', '2', '3']);
    expect(mock.fired.map((r) => r.branch).sort()).toEqual([
      'feat/1',
      'feat/2',
      'feat/3',
    ]);
  });

  it('respects maxParallel cap — slices ready-set to fit', async () => {
    const dag = makeDag([
      { id: '1', branch: 'feat/1' },
      { id: '2', branch: 'feat/2' },
      { id: '3', branch: 'feat/3' },
      { id: '4', branch: 'feat/4' },
      { id: '5', branch: 'feat/5' },
    ]);
    const mock = makeMockFireSpawn();
    const loop = createDispatchLoop({
      getDag: () => dag,
      getCompletedTaskIds: () => new Set(),
      maxParallel: 2,
      fireSpawn: mock.fn,
    });

    const result = await loop.tick();
    expect(result.spawned).toBe(2);
    expect(result.queued).toBe(3);
    expect(mock.fired.length).toBe(2);
  });

  it('skips blocked tasks (dependsOn not yet completed)', async () => {
    const dag = makeDag([
      { id: '1', branch: 'feat/1' },
      { id: '2', branch: 'feat/2', dependsOn: ['1'] },
      { id: '3', branch: 'feat/3', dependsOn: ['1', '2'] },
    ]);
    const mock = makeMockFireSpawn();
    const loop = createDispatchLoop({
      getDag: () => dag,
      getCompletedTaskIds: () => new Set(),
      maxParallel: 10,
      fireSpawn: mock.fn,
    });

    const result = await loop.tick();
    expect(result.spawned).toBe(1);
    expect(mock.fired[0]!.taskId).toBe('1');
  });

  it('after marking §1 complete, §2 becomes ready (re-tick semantics)', async () => {
    const dag = makeDag([
      { id: '1', branch: 'feat/1' },
      { id: '2', branch: 'feat/2', dependsOn: ['1'] },
    ]);
    const mock = makeMockFireSpawn();
    const completed = new Set<string>();
    const loop = createDispatchLoop({
      getDag: () => dag,
      getCompletedTaskIds: () => completed,
      maxParallel: 10,
      fireSpawn: mock.fn,
    });

    await loop.tick();
    expect(mock.fired.map((r) => r.taskId)).toEqual(['1']);

    completed.add('1');
    mock.fired.length = 0;
    await loop.tick();
    expect(mock.fired.map((r) => r.taskId)).toEqual(['2']);
  });

  it('returns done=true when all tasks completed', async () => {
    const dag = makeDag([
      { id: '1', branch: 'feat/1' },
      { id: '2', branch: 'feat/2' },
    ]);
    const mock = makeMockFireSpawn();
    const loop = createDispatchLoop({
      getDag: () => dag,
      getCompletedTaskIds: () => new Set(['1', '2']),
      maxParallel: 10,
      fireSpawn: mock.fn,
    });

    const result = await loop.tick();
    expect(result.done).toBe(true);
    expect(result.spawned).toBe(0);
    expect(mock.fired.length).toBe(0);
  });

  it('returns idle when maxParallel === 0', async () => {
    const dag = makeDag([{ id: '1', branch: 'feat/1' }]);
    const mock = makeMockFireSpawn();
    const loop = createDispatchLoop({
      getDag: () => dag,
      getCompletedTaskIds: () => new Set(),
      maxParallel: 0,
      fireSpawn: mock.fn,
    });

    const result = await loop.tick();
    expect(result.idle).toBe(true);
    expect(result.spawned).toBe(0);
    expect(mock.fired.length).toBe(0);
  });

  it('handles fireSpawn returning {declined: true} (dispatch-mode ask)', async () => {
    const dag = makeDag([
      { id: '1', branch: 'feat/1' },
      { id: '2', branch: 'feat/2' },
    ]);
    const mock = makeMockFireSpawn();
    mock.setDeclineForAll(true);
    const loop = createDispatchLoop({
      getDag: () => dag,
      getCompletedTaskIds: () => new Set(),
      maxParallel: 5,
      fireSpawn: mock.fn,
    });

    const result = await loop.tick();
    expect(result.spawned).toBe(0);
    expect(result.declined).toBe(2);
    expect(mock.fired.length).toBe(2);
  });
});
