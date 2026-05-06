/**
 * Generic atomic-JSON-write helper.
 *
 * MB-F-DAEMON-REGISTRY-FIX WB1 — initial skeleton. The same recipe
 * already lives inline in migration/schema-v2.ts:writeRegistryV2 and
 * dispatch-core/src/registry/write.ts:writeRegistry; WB6 routes the
 * daemon's writeRegistryV2 through this helper.
 *
 * Recipe (all guaranteed by this helper):
 *   1. Validate the value FIRST (default: identity). Throws before any
 *      disk operation, so a bad input never leaves a sidecar.
 *   2. mkdir -p the target directory.
 *   3. Write the serialised body to `<path>.tmp`.
 *   4. Rename `<path>.tmp` → `<path>` (atomic at the directory entry).
 *
 * fsync between (3) and (4) lands in WB2.
 * Post-write re-read + retry-from-input lands in WB3.
 */

import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface WriteAtomicJsonOpts<T> {
  /** Throws to reject the input. Default: identity. */
  validate?: (v: unknown) => T;
  /** Reserved for WB2. Default true once WB2 lands. */
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
  await writeFile(tmp, body, 'utf8');
  await rename(tmp, path);
}
