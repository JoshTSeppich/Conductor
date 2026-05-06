/**
 * MB-F-DAEMON-REGISTRY-FIX WB1 — readJsonWithRecovery unit tests.
 *
 * Generic JSON-read helper with two corruption-handling strategies:
 *   onCorrupt: 'rethrow'    — throw a diagnostic Error (current behavior
 *                              of readRegistryV2; preserves
 *                              backward-compat callers).
 *   onCorrupt: 'quarantine' — rename the corrupt file to
 *                              `<path>.corrupt-<ISO-timestamp>`, write a
 *                              fresh `emptyValue` via writeAtomicJson,
 *                              return the empty value.
 *
 * Probes:
 *   P1  Read-valid — happy path; validate fn invoked on parsed JSON.
 *   P2  Read-corrupt + 'rethrow' — Error includes the path; file
 *       untouched (no quarantine sidecar).
 *   P3  Read-corrupt + 'quarantine' — sidecar exists, target now
 *       contains the canonical emptyValue, return value === emptyValue.
 *   P4  ENOENT — returns emptyValue without quarantining (no source to
 *       move). Mirrors readRegistryV2's "fresh install" behavior.
 *
 * The integration-level wiring (corrupt registry on daemon startup →
 * GET /v2/sessions returns 200 with empty list) lands in WB4.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { readJsonWithRecovery } from '../../src/persist/read-with-recovery.js';

interface Box {
  version: number;
  payload: Record<string, unknown>;
}
const EMPTY: Box = { version: 1, payload: {} };
const validateBox = (v: unknown): Box => {
  const o = v as Box;
  if (typeof o?.version !== 'number' || typeof o?.payload !== 'object') {
    throw new Error('not a Box');
  }
  return o;
};

describe('WB1 — readJsonWithRecovery', () => {
  let tmpDir: string | null = null;

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      tmpDir = null;
    }
  });

  async function mkPath(): Promise<string> {
    tmpDir = await mkdtemp(join(tmpdir(), 'fd-persist-rwr-'));
    return join(tmpDir, 'value.json');
  }

  it('P1 read-valid — returns the validated parsed value', async () => {
    const path = await mkPath();
    const value: Box = { version: 1, payload: { hi: 'there' } };
    await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8');

    const got = await readJsonWithRecovery<Box>(path, {
      validate: validateBox,
      onCorrupt: 'rethrow',
      emptyValue: EMPTY,
    });
    expect(got).toEqual(value);
  });

  it('P2 read-corrupt + rethrow — Error names the path; no quarantine sidecar created', async () => {
    const path = await mkPath();
    // Reproduces operator-observed signature: valid JSON + extra `}\n`.
    await writeFile(path, '{"version":1,"payload":{}}\n}\n', 'utf8');

    await expect(
      readJsonWithRecovery<Box>(path, {
        validate: validateBox,
        onCorrupt: 'rethrow',
        emptyValue: EMPTY,
      }),
    ).rejects.toThrow(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    const entries = await readdir(dirname(path));
    expect(entries.some((e) => e.includes('.corrupt-'))).toBe(false);
  });

  it('P3 read-corrupt + quarantine — sidecar exists, target replaced with emptyValue, returns emptyValue', async () => {
    const path = await mkPath();
    const corruptBytes = '{"version":1,"payload":{}}\n}\n';
    await writeFile(path, corruptBytes, 'utf8');

    const got = await readJsonWithRecovery<Box>(path, {
      validate: validateBox,
      onCorrupt: 'quarantine',
      emptyValue: EMPTY,
    });
    expect(got).toEqual(EMPTY);

    const entries = await readdir(dirname(path));
    const sidecars = entries.filter((e) => e.startsWith('value.json.corrupt-'));
    expect(sidecars).toHaveLength(1);
    const sidecarBody = await readFile(join(dirname(path), sidecars[0]!), 'utf8');
    expect(sidecarBody).toBe(corruptBytes);
    const targetBody = await readFile(path, 'utf8');
    expect(JSON.parse(targetBody)).toEqual(EMPTY);
  });

  it('P4 ENOENT — returns emptyValue without quarantining', async () => {
    const path = await mkPath();
    // file deliberately not written
    const got = await readJsonWithRecovery<Box>(path, {
      validate: validateBox,
      onCorrupt: 'quarantine',
      emptyValue: EMPTY,
    });
    expect(got).toEqual(EMPTY);
    const entries = await readdir(dirname(path));
    expect(entries.some((e) => e.includes('.corrupt-'))).toBe(false);
  });
});
