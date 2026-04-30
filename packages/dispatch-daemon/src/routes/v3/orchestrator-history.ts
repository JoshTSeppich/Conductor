/**
 * GET /v3/orchestrator/history — paginated read.
 * DELETE /v3/orchestrator/history — full clear.
 *
 * Per WORKSTATION_CONTRACT.md §6.1 + ratified MB-S03 §6:
 *   - GET: cursor pagination via before_id/since_id, optional
 *          build_doc_id filter, limit (default 100, max 500). Newest
 *          first. UUIDv7 ids are lexicographically time-sortable so
 *          string comparison on `id` is the canonical chronological
 *          comparator (single column index supports both ordering
 *          and pagination).
 *   - DELETE: full clear (no scoping by build_doc_id or date range
 *             per ratified §6 decision). Returns { deleted: number }.
 *
 * Auth-gated via the consolidated onRequest hook (extended to /v3/* in
 * COARCH-T01 A1, commit 8c286cd).
 */

import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { OrchestratorHistoryQuerySchema } from 'dispatch-core/src/v3/schema.js';

export interface OrchestratorHistoryRoutesDeps {
  db: Database.Database;
}

interface MessageRow {
  id: string;
  created_at: string;
  role: string;
  content: string;
  build_doc_id: string | null;
  build_doc_commit_sha: string | null;
}

export async function registerOrchestratorHistoryRoutes(
  app: FastifyInstance,
  deps: OrchestratorHistoryRoutesDeps,
): Promise<void> {
  const deleteAll = deps.db.prepare(`DELETE FROM orchestrator_messages`);

  app.get('/v3/orchestrator/history', async (request, reply) => {
    const parsed = OrchestratorHistoryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(422).send({ error: parsed.error.message });
      return;
    }
    const { limit, before_id, since_id, build_doc_id } = parsed.data;

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (before_id) {
      conditions.push('id < ?');
      params.push(before_id);
    }
    if (since_id) {
      conditions.push('id > ?');
      params.push(since_id);
    }
    if (build_doc_id) {
      conditions.push('build_doc_id = ?');
      params.push(build_doc_id);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `SELECT id, created_at, role, content, build_doc_id, build_doc_commit_sha
                 FROM orchestrator_messages
                 ${whereClause}
                 ORDER BY id DESC
                 LIMIT ?`;
    params.push(limit);

    const rows = deps.db.prepare(sql).all(...params) as MessageRow[];
    const next_before_id =
      rows.length === limit && rows.length > 0 ? rows[rows.length - 1].id : null;

    return { messages: rows, next_before_id };
  });

  app.delete('/v3/orchestrator/history', async () => {
    const result = deleteAll.run();
    return { deleted: result.changes };
  });
}
