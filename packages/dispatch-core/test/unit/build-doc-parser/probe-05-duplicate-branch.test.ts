/**
 * MB-T28 WB1 RED probe — duplicate-branch-non-sequential fixture.
 *
 * Two tasks (§1, §2) share the branch `feat/parallel-branch` but neither
 * depends on the other. Per spec §4.5: parallel tasks on same branch =
 * parse error.
 *
 * Expects: parseBuildDoc returns { ok: false } with at least one
 * branch.duplicate-non-sequential error carrying branch + taskIds.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseBuildDoc } from '../../../src/build-doc-parser/index.js';

const fixturePath = (name: string) =>
  join(import.meta.dirname, '..', '..', 'fixtures', 'build-doc', name);

describe('parseBuildDoc — duplicate-branch-non-sequential fixture', () => {
  const text = readFileSync(fixturePath('duplicate-branch-non-sequential.md'), 'utf-8');
  const result = parseBuildDoc(text);

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces at least one branch.duplicate-non-sequential error', () => {
    if (result.ok) throw new Error('expected ok=false');
    const branchErrors = result.errors.filter(
      (e) => e.code === 'branch.duplicate-non-sequential',
    );
    expect(branchErrors.length).toBeGreaterThanOrEqual(1);
  });

  it('error carries branch + offending task ids in details', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find((e) => e.code === 'branch.duplicate-non-sequential');
    expect(err).toBeDefined();
    expect(err?.details?.branch).toBe('feat/parallel-branch');
    const taskIds = err?.details?.taskIds as string[] | undefined;
    expect(taskIds).toBeDefined();
    expect(new Set(taskIds)).toEqual(new Set(['1', '2']));
  });
});
