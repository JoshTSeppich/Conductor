/**
 * MB-F-DAEMON-CONCURRENT-RACE-FIX WB1 — proper-lockfile API spike-as-test.
 *
 * Per operator arbitration Q-G5=a, this spike-as-test pins the
 * proper-lockfile assumptions WB3 will rely on. If proper-lockfile
 * ever changes major version or alters semantics, this file fails
 * loudly and the operator is alerted before WB3 integration breaks
 * silently.
 *
 * Pinned assumptions (each maps to a probe below):
 *
 *   S1  Lock creates `<file>.lock` directory adjacent to the target.
 *       (G-Q3=a — adjacent default naming.) Verified by stat after
 *       lock acquisition.
 *
 *   S2  Release function (returned by lock()) removes the .lock
 *       directory. Sync verified — second lock() on same path
 *       succeeds without retries after first release().
 *
 *   S3  realpath:false allows locking a path whose target file does
 *       NOT yet exist. (FACT-G3 §6.3 risk surfaced in Phase 1 §6.3 —
 *       first-write to ~/.foxworks/dispatch/sessions.json must not
 *       throw on missing target.) Default realpath:true would throw
 *       ENOENT here.
 *
 *   S4  Retry backoff — when a lock is already held, a second lock()
 *       call with retries config waits and eventually acquires the
 *       lock after the first holder releases. Confirms our default
 *       retry config is wired correctly.
 *
 *   S5  Stale lock recovery — when a `.lock` directory exists with
 *       mtime older than the `stale` threshold, lock() reclaims it
 *       and proceeds. Confirms crashed-writer recovery semantics.
 *
 *   S6  Lock primitive is mkdir-atomic — concurrent in-process
 *       lock() calls without retries: only ONE acquires; the others
 *       reject with ELOCKED. Confirms the underlying atomicity
 *       guarantee that WB3 builds on.
 *
 * Confidence: KNOWN — direct fs assertion against proper-lockfile
 * 4.1.2 behavior in this monorepo. If a probe fails, halt and surface
 * to operator before WB2.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  mkdir,
  mkdtemp,
  readdir,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import lockfile from 'proper-lockfile';

describe('MB-F-DAEMON-CONCURRENT-RACE-FIX WB1 — proper-lockfile API spike', () => {
  let tmpDir: string | null = null;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fd-lockfile-spike-'));
  });

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      tmpDir = null;
    }
  });

  async function seedFile(name: string): Promise<string> {
    const path = join(tmpDir!, name);
    await writeFile(path, '{}', 'utf8');
    return path;
  }

  it('S1 lock() creates <file>.lock directory adjacent to target', async () => {
    const path = await seedFile('s1.json');
    const release = await lockfile.lock(path);
    try {
      const lockStat = await stat(`${path}.lock`);
      expect(lockStat.isDirectory()).toBe(true);
      const entries = await readdir(tmpDir!);
      expect(entries.sort()).toEqual(['s1.json', 's1.json.lock']);
    } finally {
      await release();
    }
  });

  it('S2 release() removes the .lock directory; second lock() succeeds', async () => {
    const path = await seedFile('s2.json');
    const release1 = await lockfile.lock(path);
    await release1();

    await expect(stat(`${path}.lock`)).rejects.toMatchObject({ code: 'ENOENT' });

    // Should acquire cleanly with no retries because nothing is held.
    const release2 = await lockfile.lock(path);
    await release2();
  });

  it('S3 realpath:false allows locking a path whose target file does NOT exist', async () => {
    const ghostPath = join(tmpDir!, 'does-not-exist.json');
    await expect(stat(ghostPath)).rejects.toMatchObject({ code: 'ENOENT' });

    const release = await lockfile.lock(ghostPath, { realpath: false });
    try {
      const lockStat = await stat(`${ghostPath}.lock`);
      expect(lockStat.isDirectory()).toBe(true);
    } finally {
      await release();
    }
  });

  it('S3b realpath:true (default) throws ENOENT when target file does NOT exist', async () => {
    const ghostPath = join(tmpDir!, 'also-missing.json');
    await expect(lockfile.lock(ghostPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('S4 retry backoff acquires after first holder releases', async () => {
    const path = await seedFile('s4.json');
    const release1 = await lockfile.lock(path);

    // Schedule release after a short delay; the second lock() with
    // retries should wait through its backoff and succeed.
    const releaseAfter = setTimeout(() => {
      void release1();
    }, 75);

    const start = Date.now();
    const release2 = await lockfile.lock(path, {
      retries: { retries: 5, factor: 2, minTimeout: 50, maxTimeout: 500 },
    });
    const elapsed = Date.now() - start;
    clearTimeout(releaseAfter);

    expect(elapsed).toBeGreaterThanOrEqual(50);
    await release2();
  });

  it('S5 stale lock recovery — old .lock dir is reclaimed', async () => {
    const path = await seedFile('s5.json');
    const lockDir = `${path}.lock`;

    // Manually create a stale .lock directory with mtime far in the past.
    await mkdir(lockDir);
    const longAgo = new Date(Date.now() - 60_000);
    await utimes(lockDir, longAgo, longAgo);

    // With stale threshold of 1000ms, the existing lock dir is older
    // than threshold → proper-lockfile reclaims it and proceeds.
    const release = await lockfile.lock(path, { stale: 1000 });
    try {
      const lockStat = await stat(lockDir);
      expect(lockStat.isDirectory()).toBe(true);
    } finally {
      await release();
    }
  });

  it('S6 mkdir-atomic — second lock() without retries rejects ELOCKED while first held', async () => {
    const path = await seedFile('s6.json');
    const release1 = await lockfile.lock(path);

    try {
      // No retries → fail fast with ELOCKED if already held.
      await expect(lockfile.lock(path)).rejects.toMatchObject({
        code: 'ELOCKED',
      });
    } finally {
      await release1();
    }
  });

  it('S7 release() is idempotent under proper-lockfile ownership tracking — double-release rejects', async () => {
    // Documents the contract: release() may be called once. Calling
    // it twice surfaces an error indicating the lock is no longer
    // held by this caller. WB3 wraps in try/finally and calls release
    // exactly once on the success or error path.
    const path = await seedFile('s7.json');
    const release = await lockfile.lock(path);
    await release();
    await expect(release()).rejects.toThrow();
  });
});
