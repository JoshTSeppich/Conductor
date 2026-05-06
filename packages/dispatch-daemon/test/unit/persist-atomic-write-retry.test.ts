/**
 * MB-F-DAEMON-REGISTRY-FIX WB3 — post-write re-parse + retry-from-input.
 *
 * After rename, writeAtomicJson reads the target back and re-parses
 * (using the same validate fn). If parse or validate fails — meaning
 * the bytes that landed on disk do not round-trip what was intended —
 * the helper retries the entire write-then-readback cycle up to
 * `opts.retries` times (default 3). Final failure throws with
 * diagnostic.
 *
 * Defends against:
 *   - Filesystem corner cases that produce different bytes than were
 *     written (e.g., the operator's observed extra-`}\n` signature, if
 *     it were producible by writeFile + rename).
 *   - Concurrent writers replacing the file between rename and the
 *     next read (next attempt re-writes our value).
 *
 * Probes:
 *   P1 — first readback returns truncated bytes; second succeeds.
 *        Retry count = 1 actually consumed; helper returns without
 *        throwing.
 *   P2 — all readbacks return bad bytes; helper throws after
 *        opts.retries attempts; error names the path + the underlying
 *        parse error.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { state } = vi.hoisted(() => ({
  state: {
    badReadsRemaining: 0,
    readCount: 0,
  },
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: vi.fn(async (...args: Parameters<typeof actual.readFile>) => {
      state.readCount++;
      if (state.badReadsRemaining > 0) {
        state.badReadsRemaining--;
        // Return a definitely-not-JSON byte sequence in place of the
        // real file contents — emulates "rename succeeded but the
        // bytes that landed on disk are wrong."
        return '{not-json-on-purpose';
      }
      return actual.readFile(...args);
    }),
  };
});

const { writeAtomicJson } = await import('../../src/persist/atomic-write.js');

describe('WB3 — writeAtomicJson post-write re-parse + retry-from-input', () => {
  let tmpDir: string | null = null;

  beforeEach(() => {
    state.badReadsRemaining = 0;
    state.readCount = 0;
  });

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      tmpDir = null;
    }
  });

  async function mkPath(): Promise<string> {
    tmpDir = await mkdtemp(join(tmpdir(), 'fd-persist-retry-'));
    return join(tmpDir, 'value.json');
  }

  it('P1 first readback returns truncated bytes; second succeeds → no throw, two reads observed', async () => {
    const path = await mkPath();
    state.badReadsRemaining = 1;

    await writeAtomicJson(path, { a: 1 }, { retries: 3 });

    expect(state.readCount).toBeGreaterThanOrEqual(2);
  });

  it('P2 all readbacks return bad bytes — throws after retries; error names the path', async () => {
    const path = await mkPath();
    state.badReadsRemaining = 999;

    await expect(
      writeAtomicJson(path, { a: 1 }, { retries: 2 }),
    ).rejects.toThrow(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});
