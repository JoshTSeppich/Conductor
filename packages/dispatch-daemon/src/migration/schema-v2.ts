/**
 * v2 sessions.json read/write with v1 → v2 auto-migration.
 *
 * Cluster-closing primitive for D-1 HTTP Foundation. All daemon
 * registry I/O routes through this module — later tickets (T06+)
 * switch from dispatch-core's v1 helpers to `readRegistryV2` and
 * `writeRegistryV2`.
 *
 * Schema source: `packages/dispatch-core/src/v2/schema.ts`
 * (operator-published at commit 551c469, frozen).
 *
 * Migration behavior (readRegistryV2):
 *   version:1  → migrate in-memory; inject defaults per Blocker 1/2
 *                arbitration:
 *                  state               = 'armed'
 *                  last_commit_sha     = null
 *                  last_status_json_at = null
 *   version:2  → validate via RegistrySchemaV2, return as-is
 *   ENOENT     → return {version: 2, sessions: {}}
 *   other      → throw Error naming the path + version
 *
 * Read-only auto-migration: readRegistryV2 does NOT rewrite the file.
 * The on-disk rewrite happens when some downstream ticket calls
 * writeRegistryV2 (first write persists v2). Matches contract §7.3
 * "schema version bumps from 1 to 2 with auto-migration on first
 * daemon write".
 *
 * Edge-case semantics (operator-named):
 *   - `sessions` null or undefined in v1 → treated as empty {}, no error
 *   - Unknown top-level fields → discarded via Zod strict parse
 *     (SessionSchemaV2 does not .passthrough())
 *   - Existing `state` field on a v1 session (hand-edited registry) →
 *     honored if valid StateEnum; overwritten with 'armed' if not
 *
 * fd v1 backward-compat scope fence:
 *   T05 writes v2 format. fd v1 commands reading a v2 registry is
 *   T14/T15 scope per contract §7.2. This module is v2-only; v1
 *   read-compat logic lives elsewhere.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  RegistrySchemaV2,
  StateEnum,
  type RegistryV2,
  type State,
} from 'dispatch-core/src/v2/schema.js';
import { sessionsPath } from 'dispatch-core/src/lib/paths.js';
import { writeAtomicJson } from '../persist/atomic-write.js';

export interface ReadRegistryV2Opts {
  /**
   * What to do when the file exists but does not parse + validate.
   * - 'rethrow' (default): throw a diagnostic Error. Preserves the
   *   pre-WB4 behavior so existing callers (every route handler)
   *   continue surfacing 500s on programmer-error / hand-edit
   *   corruption.
   * - 'quarantine': rename the corrupt file to
   *   `<path>.corrupt-<ISO-timestamp>`, write a fresh empty v2
   *   registry, log at ERROR level, and return the empty registry.
   *   Used by startup so a corrupt-on-load registry does not 500-
   *   storm every subsequent route call.
   */
  onCorrupt?: 'rethrow' | 'quarantine';
  /** Optional ERROR-level logger. Used only on the quarantine path. */
  logger?: { error: (...args: unknown[]) => void };
}

export async function readRegistryV2(
  path?: string,
  opts: ReadRegistryV2Opts = {},
): Promise<RegistryV2> {
  const target = path ?? sessionsPath();

  let raw: string;
  try {
    raw = await readFile(target, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: 2, sessions: {} };
    }
    throw err;
  }

  try {
    return parseAndMigrate(raw, target);
  } catch (err) {
    if ((opts.onCorrupt ?? 'rethrow') === 'rethrow') {
      throw err;
    }
    return quarantineAndStartFresh(target, raw, err as Error, opts.logger);
  }
}

function parseAndMigrate(raw: string, target: string): RegistryV2 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Registry at ${target} is not valid JSON: ${(err as Error).message}`,
    );
  }

  const obj = parsed as { version?: unknown; sessions?: unknown };

  if (obj.version === 2) {
    try {
      return RegistrySchemaV2.parse(parsed);
    } catch (err) {
      throw new Error(
        `Registry at ${target} failed v2 schema validation: ${(err as Error).message}`,
      );
    }
  }

  if (obj.version === 1) {
    const rawSessions = obj.sessions;
    const migratedSessions: Record<string, unknown> = {};
    if (rawSessions && typeof rawSessions === 'object') {
      for (const [name, rawSession] of Object.entries(
        rawSessions as Record<string, Record<string, unknown>>,
      )) {
        const existingState = rawSession.state;
        const stateValid =
          typeof existingState === 'string' &&
          StateEnum.safeParse(existingState).success;
        const state: State = stateValid ? (existingState as State) : 'armed';
        migratedSessions[name] = {
          cwd: rawSession.cwd,
          tmux_target: rawSession.tmux_target,
          handoff_path: rawSession.handoff_path,
          last_prompt_sent_at: rawSession.last_prompt_sent_at ?? null,
          last_handoff_pulled_at: rawSession.last_handoff_pulled_at ?? null,
          state,
          last_commit_sha: rawSession.last_commit_sha ?? null,
          last_status_json_at: rawSession.last_status_json_at ?? null,
        };
      }
    }
    const migrated = { version: 2 as const, sessions: migratedSessions };
    try {
      return RegistrySchemaV2.parse(migrated);
    } catch (err) {
      throw new Error(
        `Registry at ${target} migrated from v1 but failed v2 validation: ${(err as Error).message}`,
      );
    }
  }

  throw new Error(
    `Registry at ${target} has unknown version: ${JSON.stringify(obj.version)}`,
  );
}

async function quarantineAndStartFresh(
  target: string,
  _raw: string,
  cause: Error,
  logger?: { error: (...args: unknown[]) => void },
): Promise<RegistryV2> {
  const suffix = `.corrupt-${new Date().toISOString().replace(/:/g, '-')}`;
  const sidecar = `${target}${suffix}`;
  await rename(target, sidecar);
  const empty: RegistryV2 = { version: 2, sessions: {} };
  await writeAtomicJson(target, empty, {
    validate: (v) => RegistrySchemaV2.parse(v) as RegistryV2,
  });
  logger?.error?.(
    { path: target, sidecar, err: cause.message },
    'sessions.json corrupt-on-load; quarantined and replaced with empty v2 registry',
  );
  return empty;
}

export async function writeRegistryV2(
  path: string | undefined,
  registry: RegistryV2,
): Promise<void> {
  // Validate FIRST so malformed inputs fail without touching disk.
  // No .tmp file is created if this throws.
  RegistrySchemaV2.parse(registry);

  const target = path ?? sessionsPath();
  await mkdir(dirname(target), { recursive: true });

  const tmp = `${target}.tmp`;
  const body = `${JSON.stringify(registry, null, 2)}\n`;
  await writeFile(tmp, body, 'utf8');
  await rename(tmp, target);
}
