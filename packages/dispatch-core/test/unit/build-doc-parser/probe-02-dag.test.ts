/**
 * MB-T28 WB1 RED probe — spec §7.2 DAG with dependencies.
 *
 * Expects: parseBuildDoc returns { ok: true } with three tasks (§1, §2, §3),
 * edges §2→§1 and §3→§2 (where edge `from` depends on `to`).
 *
 * RED behavior under WB1 stub: parser returns { ok: false }.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseBuildDoc } from '../../../src/build-doc-parser/index.js';

const fixturePath = (name: string) =>
  join(import.meta.dirname, '..', '..', 'fixtures', 'build-doc', name);

describe('parseBuildDoc — §7.2 DAG example', () => {
  const text = readFileSync(fixturePath('dag.md'), 'utf-8');
  const result = parseBuildDoc(text);

  it('returns ok=true', () => {
    expect(result.ok).toBe(true);
  });

  it('parses 3 tasks in document order (§1, §2, §3)', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.tasks.map((t) => t.id)).toEqual(['1', '2', '3']);
  });

  it('edges: §2→§1 and §3→§2 (from depends on to)', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.edges).toEqual(
      expect.arrayContaining([
        { from: '2', to: '1' },
        { from: '3', to: '2' },
      ]),
    );
    expect(result.dag.edges).toHaveLength(2);
  });

  it('§1 has empty dependsOn', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const t1 = result.dag.tasks.find((t) => t.id === '1');
    expect(t1?.dependsOn).toEqual([]);
  });

  it('§2 dependsOn includes "1"', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const t2 = result.dag.tasks.find((t) => t.id === '2');
    expect(t2?.dependsOn).toEqual(['1']);
  });

  it('§3 dependsOn includes "2"', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const t3 = result.dag.tasks.find((t) => t.id === '3');
    expect(t3?.dependsOn).toEqual(['2']);
  });

  it('preamble extracted (repo=dispatch-workstation)', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.preamble.repo).toBe('dispatch-workstation');
  });
});
