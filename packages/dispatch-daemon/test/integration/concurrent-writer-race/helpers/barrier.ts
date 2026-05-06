/**
 * MB-F-DAEMON-CONCURRENT-RACE — barrier file primitive.
 *
 * Tightens the timing window between two child writers so probe-03's
 * simultaneous race fires reliably. Children block on the barrier
 * file's existence before issuing their write; parent signals by
 * creating the file once both children print READY.
 *
 * Confidence: KNOWN — fs.access poll + fs.writeFile signal is a
 * standard cross-process barrier on POSIX. Polling interval 5ms
 * keeps the detect-window short without burning CPU.
 */

import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface Barrier {
  /** Absolute path to the barrier file. Children poll this. */
  path: string;
  /** Parent calls signal() to release blocked children. */
  signal(): Promise<void>;
}

export function createBarrier(tmpDir: string): Barrier {
  const path = join(tmpDir, 'barrier');
  return {
    path,
    signal: async () => writeFile(path, 'go', 'utf8'),
  };
}

/**
 * Children call awaitBarrier(path) after printing READY. Polls every
 * 5ms until the file exists. Throws after `timeoutMs` (default 30s).
 */
export async function awaitBarrier(
  path: string,
  timeoutMs = 30_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await access(path);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 5));
    }
  }
  throw new Error(`awaitBarrier: timed out after ${timeoutMs}ms waiting for ${path}`);
}
