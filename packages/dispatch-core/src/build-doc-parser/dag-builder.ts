import type { ParseError, Preamble, Task, TaskDAG, TaskGroup } from './types.js';

/**
 * Build a TaskDAG from a parsed preamble + task list + group list.
 * Resolves `Depends on` references; per Q-MBT28-1C, expands group refs
 * into per-child edges.
 *
 * WB1 RED stub: lands in WB4.
 */
export function buildDag(
  _preamble: Preamble,
  _tasks: Task[],
  _groups: TaskGroup[],
): { dag: TaskDAG | null; errors: ParseError[] } {
  return {
    dag: null,
    errors: [
      {
        code: 'preamble.missing',
        message: 'dag-builder not yet implemented (WB1 RED stub)',
        line: 0,
      },
    ],
  };
}
