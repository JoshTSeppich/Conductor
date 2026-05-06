/**
 * Generic JSON-read helper with two corruption-handling strategies.
 *
 * MB-F-DAEMON-REGISTRY-FIX WB1 — initial implementation. WB6 routes
 * migration/schema-v2.ts:readRegistryV2 through this helper.
 *
 * Strategies:
 *
 *   onCorrupt: 'rethrow'
 *     Throws an Error whose message includes the path and the
 *     parse/validate failure detail. Mirrors today's readRegistryV2
 *     behavior.
 *
 *   onCorrupt: 'quarantine'
 *     Renames `<path>` to `<path>.corrupt-<ISO-timestamp>` (preserving
 *     the original bytes for forensics), writes a fresh `emptyValue`
 *     via writeAtomicJson, and returns the empty value. Logs at ERROR
 *     level if a logger is provided. The daemon's startup path uses
 *     this so a corrupt file at cold start does not 500-storm every
 *     subsequent route call (see WB7 startup amendment).
 *
 * ENOENT is NOT corruption — both strategies return `emptyValue`
 * without renaming or logging. Mirrors readRegistryV2's
 * "fresh install" semantics.
 */

import { readFile, rename, stat } from 'node:fs/promises';
import { writeAtomicJson, type WriteAtomicJsonOpts } from './atomic-write.js';

export interface ReadJsonWithRecoveryOpts<T> {
  /** Throws to reject parsed JSON. */
  validate: (v: unknown) => T;
  /** What to do when the file exists but does not parse + validate. */
  onCorrupt: 'rethrow' | 'quarantine';
  /** Required when onCorrupt is 'quarantine' or when ENOENT may occur. */
  emptyValue: T;
  /**
   * ISO-timestamp suffix produced once per call. Override only for
   * deterministic tests; default uses `new Date().toISOString()`
   * with `:` replaced by `-` so the suffix is path-safe on all
   * filesystems.
   */
  quarantineSuffix?: string;
  /** Optional ERROR-level logger. */
  logger?: { error: (...args: unknown[]) => void };
  /** Pass through to writeAtomicJson when quarantining. */
  writeOpts?: WriteAtomicJsonOpts<T>;
}

function defaultQuarantineSuffix(): string {
  return `.corrupt-${new Date().toISOString().replace(/:/g, '-')}`;
}

export async function readJsonWithRecovery<T>(
  path: string,
  opts: ReadJsonWithRecoveryOpts<T>,
): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return opts.emptyValue;
    }
    throw err;
  }

  let parseErr: Error | null = null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return opts.validate(parsed);
  } catch (err) {
    parseErr = err as Error;
  }

  if (opts.onCorrupt === 'rethrow') {
    throw new Error(
      `Registry at ${path} is not valid JSON or failed validation: ${parseErr.message}`,
    );
  }

  // quarantine path
  const suffix = opts.quarantineSuffix ?? defaultQuarantineSuffix();
  const sidecar = `${path}${suffix}`;
  await rename(path, sidecar);
  await writeAtomicJson(path, opts.emptyValue, opts.writeOpts);
  opts.logger?.error?.(
    { path, sidecar, err: parseErr.message },
    'registry corrupt-on-load; quarantined and replaced with empty value',
  );

  // surface to silent-suppression checkers
  void stat;

  return opts.emptyValue;
}
