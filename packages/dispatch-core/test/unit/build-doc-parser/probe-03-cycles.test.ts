/**
 * MB-T28 WB1 RED probe — cyclic fixture (§1→§3→§2→§1).
 *
 * Expects: parseBuildDoc returns { ok: false } with at least one
 * dependency.cycle error carrying cyclePath in details.
 *
 * RED behavior under WB1 stub: parser returns { ok: false } with
 * preamble.missing, NOT dependency.cycle. Probe assertions on
 * cycle code + cyclePath shape fail.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseBuildDoc } from '../../../src/build-doc-parser/index.js';

const fixturePath = (name: string) =>
  join(import.meta.dirname, '..', '..', 'fixtures', 'build-doc', name);

describe('parseBuildDoc — cyclic fixture', () => {
  const text = readFileSync(fixturePath('cyclic.md'), 'utf-8');
  const result = parseBuildDoc(text);

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces at least one dependency.cycle error', () => {
    if (result.ok) throw new Error('expected ok=false');
    const cycleErrors = result.errors.filter((e) => e.code === 'dependency.cycle');
    expect(cycleErrors.length).toBeGreaterThanOrEqual(1);
  });

  it('cycle error carries cyclePath array in details', () => {
    if (result.ok) throw new Error('expected ok=false');
    const cycleErr = result.errors.find((e) => e.code === 'dependency.cycle');
    expect(cycleErr).toBeDefined();
    expect(cycleErr?.details).toBeDefined();
    expect(Array.isArray(cycleErr?.details?.cyclePath)).toBe(true);
  });

  it('cyclePath contains all 3 cycle members', () => {
    if (result.ok) throw new Error('expected ok=false');
    const cycleErr = result.errors.find((e) => e.code === 'dependency.cycle');
    const path = cycleErr?.details?.cyclePath as string[] | undefined;
    expect(path).toBeDefined();
    expect(new Set(path)).toEqual(new Set(['1', '2', '3']));
  });
});
