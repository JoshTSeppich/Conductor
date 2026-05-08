/**
 * MB-T28 WB1 RED probe — spec §7.1 minimal example.
 *
 * Expects: parseBuildDoc returns { ok: true } with one task, no edges,
 * preamble correctly extracted.
 *
 * RED behavior under WB1 stub: parser returns { ok: false }; assertions
 * fail with explicit assertion errors (not module-not-found).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseBuildDoc } from '../../../src/build-doc-parser/index.js';

const fixturePath = (name: string) =>
  join(import.meta.dirname, '..', '..', 'fixtures', 'build-doc', name);

describe('parseBuildDoc — §7.1 minimal example', () => {
  const text = readFileSync(fixturePath('minimal.md'), 'utf-8');
  const result = parseBuildDoc(text);

  it('returns ok=true', () => {
    expect(result.ok).toBe(true);
  });

  it('preamble has Repo + Plan rev correctly extracted', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.preamble.repo).toBe('my-repo');
    expect(result.dag.preamble.planRev).toBe('2026-05-06.A');
  });

  it('exactly 1 task, id="1", no dependencies', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.tasks).toHaveLength(1);
    expect(result.dag.tasks[0]?.id).toBe('1');
    expect(result.dag.tasks[0]?.dependsOn).toEqual([]);
  });

  it('task fields parsed (title, branch, goal, acceptance)', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const t = result.dag.tasks[0];
    expect(t?.title).toBe('Add login endpoint');
    expect(t?.branch).toBe('feat/login');
    expect(t?.goal).toContain('POST /v1/login');
    expect(t?.acceptance).toHaveLength(3);
  });

  it('no edges (single task with no deps)', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.edges).toEqual([]);
  });

  it('no groups (no H3 subsections)', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.groups).toEqual([]);
  });
});
