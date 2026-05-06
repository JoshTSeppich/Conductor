/**
 * MB-F-DAEMON-CONCURRENT-RACE-FIX WB2 — RED probes for writeAtomicJson
 * lock integration.
 *
 * Six probes (P1-P6 per Phase 1 §3.6 + mandatory P6 per Phase 2 brief).
 * At HEAD pre-WB3, writeAtomicJson does NOT integrate proper-lockfile,
 * so probes that observe lock side-effects (P1, P3, P4, P5, P6's spy
 * assertion) FAIL. P2 (opt-out) trivially passes at RED because no
 * lock is acquired with or without `lock: false`. WB3 makes all six
 * probes pass.
 *
 * Probe taxonomy (each maps to Phase 1 §3.6):
 *
 *   P1  Default-on. writeAtomicJson(path, value) (no `lock` opt)
 *       acquires <path>.lock via proper-lockfile.lock, releases after
 *       success. Verified by spying on proper-lockfile.lock.
 *
 *   P2  Explicit opt-out. writeAtomicJson(path, value, { lock: false })
 *       does NOT call proper-lockfile.lock. Test escape hatch for
 *       callers that want to bypass locking.
 *
 *   P3  Concurrent calls serialise — N=10 concurrent writeAtomicJson
 *       calls all resolve without throwing; final on-disk state is
 *       parseable JSON matching ONE of the values written; no .tmp
 *       residue. At RED, FM3b (rename ENOENT) fires for some calls
 *       under default-retry semantics and at least one promise
 *       rejects. At GREEN, the lock serialises all 10.
 *
 *   P4  Lock acquisition waits when lock is held externally. Test
 *       pre-acquires <path>.lock via proper-lockfile.lock, schedules
 *       release after a delay, then calls writeAtomicJson with retry
 *       config. The call should wait through backoff and succeed.
 *       Elapsed time > 50ms confirms waiting. At RED, no lock is
 *       acquired so writeAtomicJson completes immediately (elapsed
 *       ~0ms).
 *
 *   P5  Stale lock recovery. Pre-create a <path>.lock directory with
 *       mtime older than the configured `stale` threshold; call
 *       writeAtomicJson; the helper reclaims the stale lock,
 *       completes the write, and releases. After the call, <path>.lock
 *       does NOT exist. At RED, writeAtomicJson ignores the .lock
 *       directory entirely, so it remains after the call.
 *
 *   P6  Lock released on exception (Phase 2 brief mandatory). Mock
 *       fs.rename to throw; writeAtomicJson rejects; the lock MUST
 *       be released. Verified by (a) spy confirms lock() was called
 *       before throw and (b) <path>.lock does not exist after.
 *       Demonstrates try/finally semantics WB3 must implement.
 *
 * Confidence: KNOWN — probes derived from Phase 1 §3.6 + Q-G3
 * arbitration. RED expectation labeled per probe.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import lockfile from 'proper-lockfile';

const lockSpy = vi.spyOn(lockfile, 'lock');

const { renameOverride } = vi.hoisted(() => ({
  renameOverride: { value: null as Error | null },
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    rename: vi.fn(async (...args: Parameters<typeof actual.rename>) => {
      if (renameOverride.value !== null) {
        throw renameOverride.value;
      }
      return actual.rename(...args);
    }),
  };
});

const { writeAtomicJson } = await import('../../src/persist/atomic-write.js');

describe('MB-F-DAEMON-CONCURRENT-RACE-FIX WB2 — atomic-write-lock probes', () => {
  let tmpDir: string | null = null;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fd-aw-lock-'));
    lockSpy.mockClear();
    renameOverride.value = null;
  });

  afterEach(async () => {
    renameOverride.value = null;
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      tmpDir = null;
    }
  });

  function pathIn(name: string): string {
    return join(tmpDir!, name);
  }

  it('P1 default-on — writeAtomicJson with no opts acquires the lock for the target path', async () => {
    const path = pathIn('p1.json');
    await writeAtomicJson(path, { a: 1 });

    expect(lockSpy).toHaveBeenCalled();
    const firstCallPath = lockSpy.mock.calls[0]?.[0];
    expect(firstCallPath).toBe(path);

    // Lock dir cleaned up after release.
    await expect(stat(`${path}.lock`)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('P2 opt-out — writeAtomicJson with { lock: false } does NOT acquire the lock', async () => {
    const path = pathIn('p2.json');
    await writeAtomicJson(path, { a: 1 }, { lock: false });

    expect(lockSpy).not.toHaveBeenCalled();
    await expect(stat(`${path}.lock`)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('P3 concurrent calls serialise — N=10 concurrent writes all succeed; no .tmp residue; final state is one of the values', async () => {
    const path = pathIn('p3.json');
    // Seed file so realpath resolution succeeds (default behavior is
    // realpath:true for proper-lockfile; WB3 will set realpath:false
    // by default, but starting with the file present keeps the test
    // robust to either choice).
    await writeFile(path, '{}', 'utf8');

    const N = 10;
    const values = Array.from({ length: N }, (_, i) => ({ writer: i }));
    const results = await Promise.allSettled(
      values.map((v) => writeAtomicJson(path, v)),
    );

    const rejections = results.filter((r) => r.status === 'rejected');
    expect(rejections, `expected 0 rejections, got ${rejections.length}: ${rejections.map((r) => (r as PromiseRejectedResult).reason?.message).join(' | ')}`).toHaveLength(0);

    // No leftover .tmp file.
    const entries = await readdir(dirname(path));
    expect(entries.filter((e) => e.endsWith('.tmp'))).toEqual([]);

    // Final on-disk state is parseable JSON matching one of the values.
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as { writer: number };
    expect(values).toContainEqual(parsed);
  });

  it('P4 lock acquisition waits — held lock released after delay; writeAtomicJson succeeds after waiting', async () => {
    const path = pathIn('p4.json');
    await writeFile(path, '{}', 'utf8');

    // Externally hold the lock; release it after 75ms.
    const externalRelease = await lockfile.lock(path, { realpath: false });
    const releaseTimer = setTimeout(() => {
      void externalRelease();
    }, 75);

    const start = Date.now();
    await writeAtomicJson(path, { v: 1 }, {
      lock: {
        retries: { retries: 5, factor: 2, minTimeout: 50, maxTimeout: 500 },
        realpath: false,
      },
    });
    const elapsed = Date.now() - start;
    clearTimeout(releaseTimer);

    expect(elapsed).toBeGreaterThanOrEqual(50);
    // After writeAtomicJson finishes, lock dir should be gone.
    await expect(stat(`${path}.lock`)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('P5 stale lock recovery — pre-existing stale .lock dir is reclaimed and released', async () => {
    const path = pathIn('p5.json');
    await writeFile(path, '{}', 'utf8');

    const lockDir = `${path}.lock`;
    await mkdir(lockDir);
    const longAgo = new Date(Date.now() - 60_000);
    await utimes(lockDir, longAgo, longAgo);

    await writeAtomicJson(path, { v: 1 }, {
      lock: { stale: 1000, realpath: false },
    });

    // After successful reclaim + write + release, the lock dir is gone.
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('P6 lock released on exception — fs.rename throws; lock acquired then released; .lock dir gone', async () => {
    const path = pathIn('p6.json');
    await writeFile(path, '{}', 'utf8');

    renameOverride.value = Object.assign(new Error('synthetic rename fail'), {
      code: 'EACCES',
    });

    await expect(writeAtomicJson(path, { v: 1 })).rejects.toThrow();

    // Lock was acquired (entered the locked region before rename) ...
    expect(lockSpy).toHaveBeenCalled();
    // ... and released even though the write threw.
    await expect(stat(`${path}.lock`)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
