/**
 * MB-T28 WB7 coverage probes — covers code paths not exercised by the 6
 * acceptance probes (probe-01..06).
 *
 * Targeted paths:
 * - Group ref expansion (dag-builder buildDag group-id branch)
 * - Optional task fields (Hints, Approval policy, Model, Tier, Estimate, Cap, Speculative)
 * - Optional preamble fields (Operator, Conductor profile)
 * - task.id-conflict
 * - task.malformed-heading
 * - task.missing-required-field
 * - task.malformed-field (every enum + Cap format + unknown field + empty Branch)
 * - preamble.field-malformed (unknown, duplicate, empty value)
 * - preamble.missing for non-`# BUILD` H1
 * - preamble.missing for empty document
 * - H2-with-body-fields-AND-H3-children malformed per Q-MBT28-1B
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseBuildDoc } from '../../../src/build-doc-parser/index.js';

const fixturePath = (name: string) =>
  join(import.meta.dirname, '..', '..', 'fixtures', 'build-doc', name);

const parse = (name: string) =>
  parseBuildDoc(readFileSync(fixturePath(name), 'utf-8'));

describe('parseBuildDoc — group ref expansion (groups.md)', () => {
  const result = parse('groups.md');

  it('returns ok=true', () => {
    expect(result.ok).toBe(true);
  });

  it('parses §1 as group with H3 children §1.1 + §1.2', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.groups).toHaveLength(1);
    const g = result.dag.groups[0]!;
    expect(g.id).toBe('1');
    expect(g.taskIds).toEqual(['1.1', '1.2']);
  });

  it('parses 3 tasks (§1.1, §1.2, §2)', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.tasks.map((t) => t.id)).toEqual(['1.1', '1.2', '2']);
  });

  it('§2 dependsOn retains group id "1" for round-trip fidelity', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const t2 = result.dag.tasks.find((t) => t.id === '2');
    expect(t2?.dependsOn).toEqual(['1']);
  });

  it('edges expand group ref §2→§1 into per-child §2→§1.1 and §2→§1.2', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const t2Edges = result.dag.edges.filter((e) => e.from === '2');
    expect(new Set(t2Edges.map((e) => e.to))).toEqual(new Set(['1.1', '1.2']));
  });

  it('§1.2→§1.1 direct task edge present', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const e = result.dag.edges.find((x) => x.from === '1.2' && x.to === '1.1');
    expect(e).toBeDefined();
  });
});

describe('parseBuildDoc — optional fields (all-optional-fields.md)', () => {
  const result = parse('all-optional-fields.md');

  it('returns ok=true', () => {
    expect(result.ok).toBe(true);
  });

  it('preamble carries optional Operator + Conductor profile', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.preamble.operator).toBe('Test Operator');
    expect(result.dag.preamble.conductorProfile).toBe('test-profile');
  });

  it('task hints list parsed', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.tasks[0]?.hints).toEqual(['Hint A', 'Hint B']);
  });

  it('task carries every optional enum/format field', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const t = result.dag.tasks[0]!;
    expect(t.approvalPolicy).toBe('medium');
    expect(t.model).toBe('O4.7·1M');
    expect(t.tier).toBe(2);
    expect(t.estimate).toBe('5-7 WBs');
    expect(t.cap).toBe('12.5%');
    expect(t.speculative).toBe(true);
  });

  it('multi-line goal accumulates across consecutive non-empty lines', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const goal = result.dag.tasks[0]?.goal ?? '';
    expect(goal).toContain('Tests every optional field');
    expect(goal).toContain('Multi-line goal');
    expect(goal).toContain('paragraph accumulation');
  });
});

describe('parseBuildDoc — task.id-conflict (task-id-conflict.md)', () => {
  const result = parse('task-id-conflict.md');

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces task.id-conflict for §1', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find((e) => e.code === 'task.id-conflict');
    expect(err).toBeDefined();
    expect(err?.details?.taskId).toBe('1');
    expect(typeof err?.details?.firstSourceLine).toBe('number');
  });
});

describe('parseBuildDoc — task.malformed-heading (task-malformed-heading.md)', () => {
  const result = parse('task-malformed-heading.md');

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces task.malformed-heading citing the bad heading', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find((e) => e.code === 'task.malformed-heading');
    expect(err).toBeDefined();
    expect(err?.details?.rawHeading).toContain('not-a-section-id');
  });
});

describe('parseBuildDoc — task.missing-required-field (task-missing-fields.md)', () => {
  const result = parse('task-missing-fields.md');

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces task.missing-required-field for Goal', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) => e.code === 'task.missing-required-field' && e.details?.fieldName === 'Goal',
    );
    expect(err).toBeDefined();
    expect(err?.details?.taskId).toBe('1');
  });
});

describe('parseBuildDoc — task.malformed-field (task-malformed-fields.md)', () => {
  const result = parse('task-malformed-fields.md');

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces task.malformed-field for Approval policy bad enum', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) => e.code === 'task.malformed-field' && e.details?.fieldName === 'Approval policy',
    );
    expect(err).toBeDefined();
    expect(err?.details?.rawValue).toBe('strict');
  });

  it('surfaces task.malformed-field for Model bad enum', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) => e.code === 'task.malformed-field' && e.details?.fieldName === 'Model',
    );
    expect(err).toBeDefined();
  });

  it('surfaces task.malformed-field for Tier out of range', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) => e.code === 'task.malformed-field' && e.details?.fieldName === 'Tier',
    );
    expect(err).toBeDefined();
  });

  it('surfaces task.malformed-field for Cap bad format', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) => e.code === 'task.malformed-field' && e.details?.fieldName === 'Cap',
    );
    expect(err).toBeDefined();
  });

  it('surfaces task.malformed-field for Speculative bad value', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) => e.code === 'task.malformed-field' && e.details?.fieldName === 'Speculative',
    );
    expect(err).toBeDefined();
  });

  it('surfaces task.malformed-field for unknown field "Random" (Q-MBT28-9 strict)', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) => e.code === 'task.malformed-field' && e.details?.fieldName === 'Random',
    );
    expect(err).toBeDefined();
  });
});

describe('parseBuildDoc — empty Branch (empty-branch.md)', () => {
  const result = parse('empty-branch.md');

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces task.malformed-field for Branch empty value', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) => e.code === 'task.malformed-field' && e.details?.fieldName === 'Branch',
    );
    expect(err).toBeDefined();
  });
});

describe('parseBuildDoc — preamble malformed paths (preamble-malformed.md)', () => {
  const result = parse('preamble-malformed.md');

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces preamble.field-malformed for duplicate Repo', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) =>
        e.code === 'preamble.field-malformed' &&
        e.details?.fieldName === 'Repo' &&
        e.details?.rawValue === 'duplicate-repo',
    );
    expect(err).toBeDefined();
  });

  it('surfaces preamble.field-malformed for unknown field', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) => e.code === 'preamble.field-malformed' && e.details?.fieldName === 'Unknown field',
    );
    expect(err).toBeDefined();
  });

  it('surfaces preamble.field-malformed for empty Operator value', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) =>
        e.code === 'preamble.field-malformed' &&
        e.details?.fieldName === 'Operator' &&
        e.details?.rawValue === '',
    );
    expect(err).toBeDefined();
  });
});

describe('parseBuildDoc — non-BUILD H1 (non-build-h1.md)', () => {
  const result = parse('non-build-h1.md');

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces preamble.missing citing the non-BUILD H1', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find((e) => e.code === 'preamble.missing');
    expect(err).toBeDefined();
    expect(err?.message).toContain('OTHER');
  });
});

describe('parseBuildDoc — empty document (empty.md)', () => {
  const result = parse('empty.md');

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces preamble.missing with line=1', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find((e) => e.code === 'preamble.missing');
    expect(err).toBeDefined();
    expect(err?.line).toBe(1);
  });
});

describe('parseBuildDoc — H2 with body fields AND H3 children (h2-with-body-and-h3.md)', () => {
  const result = parse('h2-with-body-and-h3.md');

  it('returns ok=false per Q-MBT28-1B', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces task.malformed-heading for the malformed H2', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) =>
        e.code === 'task.malformed-heading' &&
        typeof e.details?.rawHeading === 'string' &&
        (e.details.rawHeading as string).includes('§1'),
    );
    expect(err).toBeDefined();
  });
});

describe('parseBuildDoc — multi-line goal + Speculative=false (goal-multiline.md)', () => {
  const result = parse('goal-multiline.md');

  it('returns ok=true', () => {
    expect(result.ok).toBe(true);
  });

  it('§1 multi-line goal joined into a single paragraph', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const t1 = result.dag.tasks.find((t) => t.id === '1');
    expect(t1?.goal).toContain('First line');
    expect(t1?.goal).toContain('Second line');
    expect(t1?.goal).toContain('Third line');
  });

  it('§1 Speculative=false captured', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const t1 = result.dag.tasks.find((t) => t.id === '1');
    expect(t1?.speculative).toBe(false);
  });

  it('§2 goal flushed when next field arrives without blank-line separator', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const t2 = result.dag.tasks.find((t) => t.id === '2');
    expect(t2?.goal).toBe('Quick goal.');
    expect(t2?.branch).toBe('feat/quick');
  });
});

describe('parseBuildDoc — malformed H3 heading (malformed-h3.md)', () => {
  const result = parse('malformed-h3.md');

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces task.malformed-heading for the bad H3', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) =>
        e.code === 'task.malformed-heading' &&
        typeof e.details?.rawHeading === 'string' &&
        (e.details.rawHeading as string).includes('bad-h3'),
    );
    expect(err).toBeDefined();
  });
});

describe('parseBuildDoc — H1 meta-block mid-document (h1-mid-doc.md)', () => {
  const result = parse('h1-mid-doc.md');

  it('returns ok=true', () => {
    expect(result.ok).toBe(true);
  });

  it('parses §1 + §2 across the meta-block boundary', () => {
    if (!result.ok) throw new Error('expected ok=true');
    expect(result.dag.tasks.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('§2 dependsOn §1 — meta-block did not break dependency resolution', () => {
    if (!result.ok) throw new Error('expected ok=true');
    const t2 = result.dag.tasks.find((t) => t.id === '2');
    expect(t2?.dependsOn).toEqual(['1']);
  });
});
