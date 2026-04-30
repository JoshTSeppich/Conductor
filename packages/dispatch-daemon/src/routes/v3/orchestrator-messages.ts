/**
 * POST /v3/orchestrator/messages — append a chat message.
 *
 * Per WORKSTATION_CONTRACT.md §6.1 + ratified MB-S03 §6.3 (UUIDv7 ids).
 * Auth-gated via the consolidated onRequest hook (extended to /v3/* in
 * COARCH-T01 A1, commit 8c286cd). Body validates against
 * OrchestratorMessageSchema; row persists to the orchestrator_messages
 * SQLite table per amended §8.1.
 *
 * GET /v3/orchestrator/history + DELETE /v3/orchestrator/history land
 * separately in B5+B6 to keep route-file responsibility narrow.
 */

import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { OrchestratorMessageSchema } from 'dispatch-core/src/v3/schema.js';
import { uuidv7 } from '../../events/history.js';

export interface OrchestratorMessagesRoutesDeps {
  db: Database.Database;
}

export async function registerOrchestratorMessagesRoutes(
  app: FastifyInstance,
  deps: OrchestratorMessagesRoutesDeps,
): Promise<void> {
  const insert = deps.db.prepare(
    `INSERT INTO orchestrator_messages
       (id, created_at, role, content, build_doc_id, build_doc_commit_sha)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  app.post('/v3/orchestrator/messages', async (request, reply) => {
    const parsed = OrchestratorMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(422).send({ error: parsed.error.message });
      return;
    }
    const { role, content, build_doc_id, build_doc_commit_sha } = parsed.data;
    const id = uuidv7();
    const created_at = new Date().toISOString();

    insert.run(id, created_at, role, content, build_doc_id, build_doc_commit_sha);

    reply.code(201).send({
      id,
      created_at,
      role,
      content,
      build_doc_id,
      build_doc_commit_sha,
    });
  });
}
