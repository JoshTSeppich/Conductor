/**
 * MB-F-DAEMON-REGISTRY-FIX WB1 — writeAtomicJson unit tests.
 *
 * Generic atomic-write helper for the persist module. WB6 will route
 * writeRegistryV2 through this. Tests pin the behavior the helper
 * MUST guarantee regardless of the value type:
 *
 *   P1  Round-trip — write then JSON.parse(readFile) deep-equals input.
 *   P2  Validate-fail does NOT touch disk — neither target nor .tmp
 *       exist after a throwing validator. (Defends the §1.3 invariant
 *       that bad input never leaves a sidecar.)
 *   P3  Atomic — no .tmp residue after success.
 *
 * fsync (WB2), retry-on-bad-readback (WB3), and quarantine-driven
 * readback (WB4) are layered in subsequent rungs and have their own
 * test files.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { writeAtomicJson } from '../../src/persist/atomic-write.js';

describe('WB1 — writeAtomicJson', () => {
  let tmpDir: string | null = null;

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      tmpDir = null;
    }
  });

  async function mkPath(): Promise<string> {
    tmpDir = await mkdtemp(join(tmpdir(), 'fd-persist-aw-'));
    return join(tmpDir, 'value.json');
  }

  it('P1 round-trip — writeAtomicJson then JSON.parse(readFile) deep-equals input', async () => {
    const path = await mkPath();
    const value = { a: 1, b: ['x', 'y'], c: { d: null } };
    await writeAtomicJson(path, value);
    const raw = await readFile(path, 'utf8');
    expect(JSON.parse(raw)).toEqual(value);
  });

  it('P2 validate-fail does NOT touch disk — neither target nor .tmp exists', async () => {
    const path = await mkPath();
    const validate = (): never => {
      throw new Error('intentional validate fail');
    };
    await expect(writeAtomicJson(path, { foo: 'bar' }, { validate })).rejects.toThrow(
      /intentional validate fail/,
    );
    await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(stat(`${path}.tmp`)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('P3 atomic — no .tmp residue after success', async () => {
    const path = await mkPath();
    await writeAtomicJson(path, { x: 1 });
    const entries = await readdir(dirname(path));
    expect(entries.filter((e) => e.endsWith('.tmp'))).toEqual([]);
  });
});
