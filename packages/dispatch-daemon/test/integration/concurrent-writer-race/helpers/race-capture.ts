/**
 * MB-F-DAEMON-CONCURRENT-RACE — post-race state inspection.
 *
 * Captures the on-disk state of the registry after a race so probes
 * can assert on which writer's bytes survived, whether daemon and CLI
 * readers can subsequently parse the file, and whether tmp/sidecar
 * artefacts leaked.
 *
 * Confidence: KNOWN — straightforward fs read + Zod parse round-trip.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, basename } from 'node:path';
import { RegistrySchema } from 'dispatch-core/src/registry/schema.js';
import { RegistrySchemaV2 } from 'dispatch-core/src/v2/schema.js';

export interface RaceCapture {
  /** Raw bytes on disk at the registry path, or null if the file is missing. */
  bodyOnDisk: string | null;
  /**
   * What the file parses as:
   *   - 'v2'  : RegistrySchemaV2.parse succeeded
   *   - 'v1'  : RegistrySchemaV2 failed but RegistrySchema (v1) succeeded
   *   - 'unparseable' : neither parse succeeded
   *   - 'missing' : file does not exist
   */
  parsedAs: 'v2' | 'v1' | 'unparseable' | 'missing';
  /** Daemon-side readability — RegistrySchemaV2 parse + post-migrate validate. */
  daemonReadOK: boolean;
  /** CLI-side readability — v1 RegistrySchema parse with passthrough. */
  cliReadOK: boolean;
  /** Files matching `<basename>.corrupt-*` in the registry's directory. */
  sidecarsPresent: string[];
  /** Whether `<registryPath>.tmp` is still present (signals an aborted/partial write). */
  tmpExists: boolean;
}

export async function captureRaceState(registryPath: string): Promise<RaceCapture> {
  let bodyOnDisk: string | null = null;
  try {
    bodyOnDisk = await readFile(registryPath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      bodyOnDisk = null;
    } else {
      throw err;
    }
  }

  let parsedAs: RaceCapture['parsedAs'] = 'missing';
  let daemonReadOK = false;
  let cliReadOK = false;

  if (bodyOnDisk !== null) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(bodyOnDisk);
      parsedAs = 'unparseable';
    } catch {
      parsedAs = 'unparseable';
    }
    if (parsed !== null) {
      try {
        RegistrySchemaV2.parse(parsed);
        parsedAs = 'v2';
        daemonReadOK = true;
      } catch {
        // Not v2; try v1.
      }
      try {
        RegistrySchema.parse(parsed);
        cliReadOK = true;
        if (parsedAs !== 'v2') parsedAs = 'v1';
      } catch {
        // Neither.
      }
    }
  }

  const dir = dirname(registryPath);
  const base = basename(registryPath);
  let sidecarsPresent: string[] = [];
  try {
    const entries = await readdir(dir);
    sidecarsPresent = entries.filter((e) => e.startsWith(`${base}.corrupt-`));
  } catch {
    // dir missing — leave empty
  }

  let tmpExists = false;
  try {
    await stat(`${registryPath}.tmp`);
    tmpExists = true;
  } catch {
    tmpExists = false;
  }

  return { bodyOnDisk, parsedAs, daemonReadOK, cliReadOK, sidecarsPresent, tmpExists };
}
