/**
 * MB-T28 WB1 RED probe — missing-preamble fixture.
 *
 * Preamble has `Plan rev` but lacks the required `Repo` field.
 * Per spec §3.1: parser must report preamble.field-missing for Repo.
 *
 * Expects: parseBuildDoc returns { ok: false } with at least one
 * preamble.field-missing error citing Repo.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseBuildDoc } from '../../../src/build-doc-parser/index.js';

const fixturePath = (name: string) =>
  join(import.meta.dirname, '..', '..', 'fixtures', 'build-doc', name);

describe('parseBuildDoc — missing-preamble fixture', () => {
  const text = readFileSync(fixturePath('missing-preamble.md'), 'utf-8');
  const result = parseBuildDoc(text);

  it('returns ok=false', () => {
    expect(result.ok).toBe(false);
  });

  it('surfaces preamble.field-missing for Repo', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) => e.code === 'preamble.field-missing' && e.details?.fieldName === 'Repo',
    );
    expect(err).toBeDefined();
  });

  it('error has a non-zero line number (preamble lives near top of file)', () => {
    if (result.ok) throw new Error('expected ok=false');
    const err = result.errors.find(
      (e) => e.code === 'preamble.field-missing' && e.details?.fieldName === 'Repo',
    );
    expect(err?.line).toBeGreaterThan(0);
  });
});
