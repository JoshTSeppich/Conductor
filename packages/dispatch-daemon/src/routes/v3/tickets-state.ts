/**
 * /v3/tickets/state — orchestrator ticket-state surface.
 *
 * Per WORKSTATION_CONTRACT.md §6.3 + ratified MB-S03 §6:
 *   - POST: upsert one row per (ticket_id, build_doc_id) via
 *     INSERT OR REPLACE. Composite PRIMARY KEY in
 *     orchestrator_ticket_state enforces the constraint.
 *     Status code is 201 on first write, 200 on upsert (RFC 9110
 *     conventional shape — 201 created vs 200 updated). Audit log
 *     captures transition history; this table is current-state only.
 *   - GET (list): operator-facing kanban query. Optional build_doc_id
 *     filter; omitting returns all rows across all build docs.
 *   - GET /:ticket_id: single-ticket lookup. `build_doc_id` REQUIRED
 *     query param per ratified §6 — a single ticket_id can exist
 *     across multiple build-doc revisions, so omitting is structurally
 *     ambiguous (422). Absent ticket → 404.
 *
 * Auth-gated via the consolidated onRequest hook (extended to /v3/* in
 * COARCH-T01 A1).
 */

import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import {
  TicketStateGetQuerySchema,
  TicketStateListQuerySchema,
  TicketStateUpsertRequestSchema,
} from 'dispatch-core/src/v3/schema.js';

export interface TicketsStateRoutesDeps {
  db: Database.Database;
}

interface TicketStateRow {
  ticket_id: string;
  build_doc_id: string;
  state: string;
  state_updated_at: string;
  superseded_by_ticket_id: string | null;
}

export async function registerTicketsStateRoutes(
  app: FastifyInstance,
  deps: TicketsStateRoutesDeps,
): Promise<void> {
  const existsStmt = deps.db.prepare(
    `SELECT 1 AS x FROM orchestrator_ticket_state
     WHERE ticket_id = ? AND build_doc_id = ?`,
  );
  const upsertStmt = deps.db.prepare(
    `INSERT OR REPLACE INTO orchestrator_ticket_state
       (ticket_id, build_doc_id, state, state_updated_at, superseded_by_ticket_id)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const selectOneStmt = deps.db.prepare(
    `SELECT ticket_id, build_doc_id, state, state_updated_at, superseded_by_ticket_id
     FROM orchestrator_ticket_state
     WHERE ticket_id = ? AND build_doc_id = ?`,
  );
  const selectAllStmt = deps.db.prepare(
    `SELECT ticket_id, build_doc_id, state, state_updated_at, superseded_by_ticket_id
     FROM orchestrator_ticket_state
     ORDER BY build_doc_id, ticket_id`,
  );
  const selectByBuildDocStmt = deps.db.prepare(
    `SELECT ticket_id, build_doc_id, state, state_updated_at, superseded_by_ticket_id
     FROM orchestrator_ticket_state
     WHERE build_doc_id = ?
     ORDER BY ticket_id`,
  );

  app.post('/v3/tickets/state', async (request, reply) => {
    const parsed = TicketStateUpsertRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(422).send({ error: parsed.error.message });
      return;
    }
    const { ticket_id, build_doc_id, state, superseded_by_ticket_id } = parsed.data;
    const wasExisting = existsStmt.get(ticket_id, build_doc_id) !== undefined;
    const state_updated_at = new Date().toISOString();
    upsertStmt.run(
      ticket_id,
      build_doc_id,
      state,
      state_updated_at,
      superseded_by_ticket_id,
    );
    reply.code(wasExisting ? 200 : 201).send({
      ticket_id,
      build_doc_id,
      state,
      state_updated_at,
      superseded_by_ticket_id,
    });
  });

  app.get('/v3/tickets/state', async (request, reply) => {
    const parsed = TicketStateListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(422).send({ error: parsed.error.message });
      return;
    }
    const { build_doc_id } = parsed.data;
    const rows = (
      build_doc_id ? selectByBuildDocStmt.all(build_doc_id) : selectAllStmt.all()
    ) as TicketStateRow[];
    return { rows };
  });

  app.get<{ Params: { ticket_id: string } }>(
    '/v3/tickets/state/:ticket_id',
    async (request, reply) => {
      const parsed = TicketStateGetQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(422).send({ error: parsed.error.message });
        return;
      }
      const { build_doc_id } = parsed.data;
      const { ticket_id } = request.params;
      const row = selectOneStmt.get(ticket_id, build_doc_id) as
        | TicketStateRow
        | undefined;
      if (!row) {
        reply.code(404).send({
          error: `ticket "${ticket_id}" not found in build doc "${build_doc_id}"`,
        });
        return;
      }
      return row;
    },
  );
}
