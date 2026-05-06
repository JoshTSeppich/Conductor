/**
 * Generic atomic-JSON-write helper.
 *
 * MB-F-DAEMON-REGISTRY-FIX. Recipe (all guaranteed by this helper):
 *   1. Validate the value FIRST (default: identity). Throws before any
 *      disk operation, so a bad input never leaves a sidecar.
 *   2. mkdir -p the target directory.
 *   3. Acquire a file-lock on the target path (default-on; see opts.lock).
 *      Implemented via proper-lockfile, which mkdir-creates `<path>.lock`
 *      adjacent to the target. mkdir is atomic on POSIX, providing the
 *      mutual-exclusion primitive that eliminates FM3 sub-modes
 *      catalogued by sess-c probes (tmp collision, rename ENOENT,
 *      readback-retry-validates-other-bytes).
 *   4. Open `<path>.tmp` for write.
 *   5. Write the serialised body.
 *   6. fsync the FileHandle (unless opts.fsync === false). Guarantees
 *      data blocks are durable before the rename so power loss
 *      between rename and post-rename flush cannot leave a
 *      renamed-but-zero-content file (Phase 1 §1.3 #1).
 *   7. Close the FileHandle.
 *   8. Rename `<path>.tmp` → `<path>` (atomic at the directory entry).
 *   9. Read the target back, JSON.parse, re-validate. If parse or
 *      validate fails, retry the entire 4-8 sequence up to
 *      `opts.retries` times (default 3). Throws after exhaustion.
 *      Defends against bytes-on-disk ≠ bytes-written corner cases
 *      and concurrent writers (re-write our value).
 *  10. Release the file-lock (in finally — guaranteed even on throw).
 *
 * Lock scope: MB-F-DAEMON-CONCURRENT-RACE-FIX (sess-g) — addresses
 * FM3 sub-modes catalogued by sess-c. FM1 (lost-update across
 * read-modify-write) is NOT addressed by a write-only lock and is
 * deferred to MB-F-DAEMON-CONCURRENT-RACE-FIX-FM1.
 *
 * The same recipe already lives inline in
 * migration/schema-v2.ts:writeRegistryV2 (without fsync, without
 * readback) and dispatch-core/src/registry/write.ts:writeRegistry;
 * WB6 routes the daemon's writeRegistryV2 through this helper.
 */

import { mkdir, open, readFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import lockfile from 'proper-lockfile';

export interface WriteAtomicLockOpts {
  /**
   * Stale lock threshold (ms). proper-lockfile reclaims a `.lock`
   * directory whose mtime is older than this. Default: 10_000.
   */
  stale?: number;
  /**
   * Retry config for lock acquisition. Default exponential backoff
   * gives ~1.25s worst-case wait before throwing.
   */
  retries?: number | {
    retries: number;
    minTimeout?: number;
    maxTimeout?: number;
    factor?: number;
  };
  /**
   * Whether to follow symlinks before locking. proper-lockfile
   * default is true, which throws ENOENT on a non-existent target.
   * We default to false because the daemon's first write to
   * sessions.json runs before the file exists.
   */
  realpath?: boolean;
}

export interface WriteAtomicJsonOpts<T> {
  /** Throws to reject the input. Default: identity. */
  validate?: (v: unknown) => T;
  /** fsync the FileHandle before close + rename. Default true. */
  fsync?: boolean;
  /**
   * Re-read + re-validate after rename. On failure, repeat the entire
   * write cycle up to N times. Default 3. Pass 0 to disable readback.
   */
  retries?: number;
  /**
   * File-lock control around the write recipe.
   *   undefined → default-on with built-in defaults
   *   true      → on with built-in defaults (explicit)
   *   false     → OFF (test escape hatch; production callers should
   *               not pass this)
   *   object    → on with overrides
   *
   * Lock acquisition uses proper-lockfile, which creates a directory
   * named `<path>.lock` adjacent to the target. mkdir is the atomicity
   * primitive. Released in finally even when the write throws.
   */
  lock?: false | true | WriteAtomicLockOpts;
}

interface ResolvedLockOpts {
  stale: number;
  retries: number | {
    retries: number;
    minTimeout: number;
    maxTimeout: number;
    factor: number;
  };
  realpath: boolean;
}

const DEFAULT_LOCK_OPTS: ResolvedLockOpts = {
  stale: 10_000,
  // Worst-case acquisition budget ~6.7s under heavy contention
  // (each maxTimeout retry adds 1000ms after exponential cap).
  // Sized to comfortably absorb a burst of ~10 concurrent writers,
  // which is well above realistic operator contention (2-3 typical
  // between daemon route handlers and fd CLI invocations).
  retries: { retries: 10, minTimeout: 50, maxTimeout: 1000, factor: 2 },
  realpath: false,
};

function resolveLockOpts(
  input: false | true | WriteAtomicLockOpts | undefined,
): ResolvedLockOpts | null {
  if (input === false) return null;
  const overrides = input === undefined || input === true ? {} : input;
  return {
    stale: overrides.stale ?? DEFAULT_LOCK_OPTS.stale,
    retries: resolveRetries(overrides.retries),
    realpath: overrides.realpath ?? DEFAULT_LOCK_OPTS.realpath,
  };
}

function resolveRetries(
  input:
    | number
    | { retries: number; minTimeout?: number; maxTimeout?: number; factor?: number }
    | undefined,
): ResolvedLockOpts['retries'] {
  if (input === undefined) return DEFAULT_LOCK_OPTS.retries;
  if (typeof input === 'number') return input;
  // Object form: merge user's inner fields onto defaults so all
  // inner fields are populated. DEFAULT_LOCK_OPTS.retries is
  // constructed as the object variant; type-narrow is safe.
  const defaults = DEFAULT_LOCK_OPTS.retries as Exclude<
    ResolvedLockOpts['retries'],
    number
  >;
  return {
    retries: input.retries,
    minTimeout: input.minTimeout ?? defaults.minTimeout,
    maxTimeout: input.maxTimeout ?? defaults.maxTimeout,
    factor: input.factor ?? defaults.factor,
  };
}

export async function writeAtomicJson<T>(
  path: string,
  value: T,
  opts: WriteAtomicJsonOpts<T> = {},
): Promise<void> {
  const validate = opts.validate ?? ((v: unknown) => v as T);
  validate(value);

  await mkdir(dirname(path), { recursive: true });

  const lockOpts = resolveLockOpts(opts.lock);
  const release = lockOpts !== null ? await lockfile.lock(path, lockOpts) : null;

  try {
    const tmp = `${path}.tmp`;
    const body = `${JSON.stringify(value, null, 2)}\n`;
    const maxAttempts = (opts.retries ?? 3) + 1;
    let lastErr: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const handle = await open(tmp, 'w');
      try {
        await handle.write(body, 0, 'utf8');
        if (opts.fsync !== false) {
          await handle.sync();
        }
      } finally {
        await handle.close();
      }
      await rename(tmp, path);

      if (opts.retries === 0) {
        return;
      }

      try {
        const raw = await readFile(path, 'utf8');
        const parsed: unknown = JSON.parse(raw);
        validate(parsed);
        return;
      } catch (err) {
        lastErr = err as Error;
      }
    }

    throw new Error(
      `writeAtomicJson at ${path} failed readback after ${maxAttempts} attempts: ${lastErr?.message ?? 'unknown error'}`,
    );
  } finally {
    if (release !== null) {
      await release();
    }
  }
}
