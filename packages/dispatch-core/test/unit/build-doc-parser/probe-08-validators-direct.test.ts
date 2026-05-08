/**
 * MB-T28 WB7 — direct validator probes covering edge cases not reachable
 * via integration fixtures (because parseBuildDoc short-circuits on
 * task-body errors before validators run).
 *
 * Targets:
 * - detectDuplicateBranches: empty-branch task skip, single-task-on-branch
 *   skip, sequential-chain-success branch (return true).
 * - detectCycle: empty DAG (no tasks/edges), self-loop (1-cycle).
 * - detectOrphans: dependsOn empty.
 */

import { describe, it, expect } from 'vitest';

import {
  detectCycle,
  detectDuplicateBranches,
  detectOrphans,
} from '../../../src/build-doc-parser/index.js';
import type {
  Task,
  TaskDAG,
} from '../../../src/build-doc-parser/index.js';

const baseTask = (overrides: Partial<Task>): Task => ({
  id: 'x',
  title: 'task',
  goal: 'g',
  branch: 'feat/x',
  dependsOn: [],
  acceptance: ['a'],
  sourceLine: 1,
  ...overrides,
});

const baseDag = (overrides: Partial<TaskDAG>): TaskDAG => ({
  preamble: { repo: 'r', planRev: '0' },
  tasks: [],
  groups: [],
  edges: [],
  ...overrides,
});

describe('detectDuplicateBranches — direct unit', () => {
  it('skips tasks with empty branch (early-continue)', () => {
    const tasks = [
      baseTask({ id: '1', branch: '' }),
      baseTask({ id: '2', branch: '' }),
    ];
    const errors = detectDuplicateBranches(tasks, []);
    expect(errors).toEqual([]);
  });

  it('skips branches with only one task', () => {
    const tasks = [
      baseTask({ id: '1', branch: 'feat/a' }),
      baseTask({ id: '2', branch: 'feat/b' }),
    ];
    const errors = detectDuplicateBranches(tasks, []);
    expect(errors).toEqual([]);
  });

  it('returns [] when tasks form sequential chain (returns true)', () => {
    const tasks = [
      baseTask({ id: '1', branch: 'feat/seq' }),
      baseTask({ id: '2', branch: 'feat/seq', dependsOn: ['1'] }),
    ];
    const edges = [{ from: '2', to: '1' }];
    const errors = detectDuplicateBranches(tasks, edges);
    expect(errors).toEqual([]);
  });

  it('surfaces error when two tasks share branch with no chain', () => {
    const tasks = [
      baseTask({ id: '1', branch: 'feat/par' }),
      baseTask({ id: '2', branch: 'feat/par' }),
    ];
    const errors = detectDuplicateBranches(tasks, []);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe('branch.duplicate-non-sequential');
  });

  it('reachability traverses multi-hop chains', () => {
    const tasks = [
      baseTask({ id: '1', branch: 'feat/long' }),
      baseTask({ id: '2' }),
      baseTask({ id: '3', branch: 'feat/long', dependsOn: ['2'] }),
    ];
    const edges = [
      { from: '3', to: '2' },
      { from: '2', to: '1' },
    ];
    const errors = detectDuplicateBranches(tasks, edges);
    expect(errors).toEqual([]);
  });
});

describe('detectCycle — direct unit edge cases', () => {
  it('returns null for empty DAG (no tasks, no edges)', () => {
    expect(detectCycle(baseDag({}))).toBe(null);
  });

  it('returns null for acyclic single task', () => {
    expect(detectCycle(baseDag({ tasks: [baseTask({ id: '1' })] }))).toBe(null);
  });

  it('detects self-loop (1-cycle)', () => {
    const dag = baseDag({
      tasks: [baseTask({ id: '1', dependsOn: ['1'] })],
      edges: [{ from: '1', to: '1' }],
    });
    expect(detectCycle(dag)).toEqual(['1']);
  });

  it('compareTaskIds length-tiebreaker exercised via "1" vs "1.0" sort', () => {
    // detectCycle sorts adj keys via compareTaskIds; with ids whose numeric
    // parts compare equal pairwise (e.g., "1" and "1.0" both yield [1] / [1, 0]
    // with zero-padding), the comparator falls through to the length tiebreaker.
    const dag = baseDag({
      tasks: [baseTask({ id: '1' }), baseTask({ id: '1.0' })],
      edges: [],
    });
    expect(detectCycle(dag)).toBe(null);
  });
});

describe('detectOrphans — direct unit', () => {
  it('returns [] when all dependsOn resolve to known tasks', () => {
    const dag = baseDag({
      tasks: [
        baseTask({ id: '1' }),
        baseTask({ id: '2', dependsOn: ['1'] }),
      ],
    });
    expect(detectOrphans(dag)).toEqual([]);
  });

  it('returns [] when task has empty dependsOn', () => {
    const dag = baseDag({ tasks: [baseTask({ id: '1', dependsOn: [] })] });
    expect(detectOrphans(dag)).toEqual([]);
  });

  it('resolves dependsOn against group ids too', () => {
    const dag = baseDag({
      tasks: [baseTask({ id: '5', dependsOn: ['3'] })],
      groups: [{ id: '3', title: 'g', taskIds: ['3.1', '3.2'], sourceLine: 10 }],
    });
    expect(detectOrphans(dag)).toEqual([]);
  });
});
