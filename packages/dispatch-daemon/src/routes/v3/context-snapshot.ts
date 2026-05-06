/**
 * MB-T10 — `/v3/sessions/:name/context-snapshot` route.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §3.5 lines 117-136 + §4 lines 195-201.
 * Returns a per-session observability slice for the workstation context-
 * builder's Tier 4 (spawnedSessions). v3.0 surface honors
 * Q-MBT10-{1..7} arbitrations (2026-05-06).
 *
 * Read-only endpoint. Auth gated via the consolidated onRequest hook
 * registered in lifecycle/auth.ts (`/v3/*` branch).
 *
 * Response body shape per dispatch-core/src/v3/schema.ts §11:
 *   {
 *     recent_handoff: string | null,        // last 4096 chars if mtime within 60s
 *     recent_console_tail: string | null,    // ≤2KB whole-line accumulation
 *     pending_intents: PendingIntent[],     // [] in v3.0; MB-T11 populates
 *     last_action_fired_at: string | null,  // null in v3.0; MB-T11 populates
 *     last_operator_typed_at: string | null // always null in v3.0
 *   }
 *
 * Failure modes:
 *   - Session unknown          → 404 + {"error": "no session registered as \"<name>\""}
 *                                (verbatim convention matching handoff.ts:52 +
 *                                sessions.ts:129)
 *   - HANDOFF.md absent        → recent_handoff: null + 200 (best-effort
 *                                observability; diverges from /v2/handoff
 *                                which 404s on ENOENT — handoff.ts:64-67)
 *   - HANDOFF.md older than 60s → recent_handoff: null + 200 (freshness
 *                                threshold per CONDUCTOR_V3_RESCOPE.md
 *                                §3.5 line 128)
 *   - No console buffer rows   → recent_console_tail: null + 200
 *
 * Tail semantics (Q-MBT10-{5,6}=a):
 *   - recent_handoff: `content.slice(-4096)` string-char slice. Acceptable
 *     for v3.0 because HANDOFF.md is operator-authored markdown, dominantly
 *     ASCII. Followup if non-ASCII content surfaces.
 *   - recent_console_tail: whole-line accumulation, oldest-fully-included-
 *     first. Walks console buffer rows from newest backward, accumulating
 *     until adding the next line would push total bytes past 2048. May
 *     return <2048 bytes when the next line in line would exceed remaining
 *     budget. Output is chronological (oldest-included first → newest).
 *
 *     Edge case: if even the newest single line exceeds 2048 bytes, the
 *     handler returns that line as-is rather than null — the alternative
 *     would deny the orchestrator any signal at all when console is
 *     producing very long lines (e.g., minified JS log lines). Acceptable
 *     for a best-effort observability surface; revisit if dogfood
 *     surfaces a concern.
 */

import type { FastifyInstance } from 'fastify';
import { readFile, stat } from 'node:fs/promises';
import type Database from 'better-sqlite3';
import { readRegistryV2 } from '../../migration/schema-v2.js';
import { getLinesBefore } from '../../console/buffer.js';

/** Per CONDUCTOR_V3_RESCOPE.md §3.5 line 128 ("if newer than 60s"). */
const HANDOFF_FRESHNESS_MS = 60_000;
/** Per CONDUCTOR_V3_RESCOPE.md §3.5 line 128 ("last 4KB of HANDOFF.md"). */
const HANDOFF_TAIL_CHARS = 4096;
/** Per CONDUCTOR_V3_RESCOPE.md §3.5 line 129 ("last 2KB of console output"). */
const CONSOLE_TAIL_BYTES = 2048;
/**
 * Cap on console rows pulled from SQLite per request. 256 rows × ~50
 * bytes/line = ~13KB ceiling on read amplification, well above the 2KB
 * tail budget so whole-line accumulation always sees enough rows to
 * fill the budget. Tunable; surfaced to operator if dogfood reveals
 * thrash.
 */
const CONSOLE_ROW_FETCH_CAP = 256;

export interface ContextSnapshotRoutesDeps {
  registryPath?: string;
  db: Database.Database;
}

/**
 * Read the last `HANDOFF_TAIL_CHARS` chars of `path` if its mtime is
 * within `HANDOFF_FRESHNESS_MS` of now. Returns null if the file is
 * absent OR stale OR if any other read error fires (best-effort
 * observability per Q-MBT10-7=a graceful-failure semantics extended to
 * the per-field path).
 */
async function readRecentHandoff(path: string, now: number): Promise<string | null> {
  let mtimeMs: number;
  try {
    const s = await stat(path);
    mtimeMs = s.mtimeMs;
  } catch {
    return null; // ENOENT or any stat error
  }
  if (now - mtimeMs >= HANDOFF_FRESHNESS_MS) {
    return null; // stale
  }
  try {
    const content = await readFile(path, 'utf8');
    return content.slice(-HANDOFF_TAIL_CHARS);
  } catch {
    return null; // race: file removed between stat and read
  }
}

/**
 * Read the last ≤`CONSOLE_TAIL_BYTES` bytes of cc_console_buffer for
 * `sessionName` via whole-line accumulation. Returns null when no rows
 * exist for the session.
 *
 * Algorithm: getLinesBefore returns rows DESC by stdout_seq (newest
 * first). Walk newest→oldest, accumulating whole lines while
 * `accumulated + nextLine ≤ CONSOLE_TAIL_BYTES`. Reverse the included
 * lines to chronological order, concat their bytes, decode utf-8.
 *
 * If even the newest single line exceeds the budget, return that one
 * line as-is (relaxation — see file-header docblock).
 */
function readRecentConsoleTail(db: Database.Database, sessionName: string): string | null {
  const rows = getLinesBefore(db, sessionName, null, CONSOLE_ROW_FETCH_CAP);
  if (rows.length === 0) return null;

  const includedDescending: Buffer[] = [];
  let total = 0;
  for (const row of rows) {
    if (total + row.bytes.length > CONSOLE_TAIL_BYTES) {
      // If this is the very newest row and it ALONE exceeds the budget,
      // include it anyway so the orchestrator gets some signal.
      if (includedDescending.length === 0) {
        includedDescending.push(row.bytes);
        total += row.bytes.length;
      }
      break;
    }
    includedDescending.push(row.bytes);
    total += row.bytes.length;
  }

  // Chronological order: reverse the newest-first accumulator.
  includedDescending.reverse();
  return Buffer.concat(includedDescending).toString('utf8');
}

export async function registerContextSnapshotRoutes(
  app: FastifyInstance,
  deps: ContextSnapshotRoutesDeps,
): Promise<void> {
  app.get<{ Params: { name: string } }>(
    '/v3/sessions/:name/context-snapshot',
    async (request, reply) => {
      const { name } = request.params;

      const registry = await readRegistryV2(deps.registryPath);
      const session = registry.sessions[name];
      if (!session) {
        reply.code(404).send({ error: `no session registered as "${name}"` });
        return;
      }

      const now = Date.now();
      const recent_handoff = await readRecentHandoff(session.handoff_path, now);
      const recent_console_tail = readRecentConsoleTail(deps.db, name);

      // pending_intents / last_action_fired_at populated by MB-T11.
      // last_operator_typed_at always null in v3.0 per
      // CONDUCTOR_V3_RESCOPE.md §4 line 199 (deferred to v3.0.x).
      return {
        recent_handoff,
        recent_console_tail,
        pending_intents: [],
        last_action_fired_at: null,
        last_operator_typed_at: null,
      };
    },
  );
}
