/**
 * MB-T28 WB1 RED probe — orphan-deps fixture (references §99 which doesn't exist).
 *
 * Expects: parseBuildDoc returns { ok: false } with at least one
 * dependency.orphan error carrying missingRef in details.
 *
 * Per Q-MBT28-1A, "forward references" (§3.4) is aliased to orphan;
 * any §X reference that doesn't resolve is dependency.orphan.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseBuildDoc } from '../../../src/build-doc-parser/index.js';

const fixturePath = (name: string) =>
  join(import.meta.dirname, '..', '..', 'fixtures', 'build-doc', name);

describe('parseBuildDoc — orphan-deps fixture', () => {
  const text = readFileSync(fixturePath('orphan-deps.md'), 'utf-8');
  const result = parseBuildDoc(text);

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces at least one dependency.orphan error', () => {
    if (result.ok) throw new Error('expected ok=false');
    const orphanErrors = result.errors.filter((e) => e.code === 'dependency.orphan');
    expect(orphanErrors.length).toBeGreaterThanOrEqual(1);
  });

  it('orphan error carries missingRef="99" + taskId="1" in details', () => {
    if (result.ok) throw new Error('expected ok=false');
    const orphanErr = result.errors.find((e) => e.code === 'dependency.orphan');
    expect(orphanErr).toBeDefined();
    expect(orphanErr?.details?.missingRef).toBe('99');
    expect(orphanErr?.details?.taskId).toBe('1');
  });
});
