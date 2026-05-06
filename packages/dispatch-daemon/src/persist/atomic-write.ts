/**
 * Generic atomic-JSON-write helper.
 *
 * MB-F-DAEMON-REGISTRY-FIX. Recipe (all guaranteed by this helper):
 *   1. Validate the value FIRST (default: identity). Throws before any
 *      disk operation, so a bad input never leaves a sidecar.
 *   2. mkdir -p the target directory.
 *   3. Open `<path>.tmp` for write.
 *   4. Write the serialised body.
 *   5. fsync the FileHandle (unless opts.fsync === false). Guarantees
 *      data blocks are durable before the rename so power loss
 *      between rename and post-rename flush cannot leave a
 *      renamed-but-zero-content file (Phase 1 §1.3 #1).
 *   6. Close the FileHandle.
 *   7. Rename `<path>.tmp` → `<path>` (atomic at the directory entry).
 *
 * Post-write re-read + retry-from-input lands in WB3.
 *
 * The same recipe already lives inline in
 * migration/schema-v2.ts:writeRegistryV2 (without fsync) and
 * dispatch-core/src/registry/write.ts:writeRegistry; WB6 routes the
 * daemon's writeRegistryV2 through this helper.
 */

import { mkdir, open, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface WriteAtomicJsonOpts<T> {
  /** Throws to reject the input. Default: identity. */
  validate?: (v: unknown) => T;
  /** fsync the FileHandle before close + rename. Default true. */
  fsync?: boolean;
  /** Reserved for WB3. Default 3 once WB3 lands. */
  retries?: number;
}

export async function writeAtomicJson<T>(
  path: string,
  value: T,
  opts: WriteAtomicJsonOpts<T> = {},
): Promise<void> {
  const validate = opts.validate ?? ((v: unknown) => v as T);
  validate(value);

  await mkdir(dirname(path), { recursive: true });

  const tmp = `${path}.tmp`;
  const body = `${JSON.stringify(value, null, 2)}\n`;
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
}
