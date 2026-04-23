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

export async function readRegistryV2(path?: string): Promise<RegistryV2> {
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
      for (const [name, raw] of Object.entries(
        rawSessions as Record<string, Record<string, unknown>>,
      )) {
        const existingState = raw.state;
        const stateValid =
          typeof existingState === 'string' &&
          StateEnum.safeParse(existingState).success;
        const state: State = stateValid ? (existingState as State) : 'armed';
        migratedSessions[name] = {
          cwd: raw.cwd,
          tmux_target: raw.tmux_target,
          handoff_path: raw.handoff_path,
          last_prompt_sent_at: raw.last_prompt_sent_at ?? null,
          last_handoff_pulled_at: raw.last_handoff_pulled_at ?? null,
          state,
          last_commit_sha: raw.last_commit_sha ?? null,
          last_status_json_at: raw.last_status_json_at ?? null,
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
