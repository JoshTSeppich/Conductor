/**
 * POST /v3/orchestrator/audit — append an audit row.
 * GET  /v3/orchestrator/audit — filtered + paginated read.
 *
 * Per WORKSTATION_CONTRACT.md §6.2 + ratified MB-S03 §6.1/§6.2/§6.4:
 *   - POST: body is OrchestratorAuditWriteRequestSchema (full vision §7.8
 *           field set minus id). Server assigns UUIDv7 id. JSON-encoded
 *           payloads (output_payload, final_fired_payload) stored as
 *           SQLite TEXT and re-parsed at the GET boundary.
 *           superseded_card_ids round-trips as comma-separated TEXT
 *           (audit row ids are UUIDv7 hex; no comma collision).
 *   - GET:  filter axes per §6.2 (since, until, build_doc_id, output_type,
 *           operator_response). Response: { rows, next_since: string | null }
 *           per ratified §6.1 timestamp-cursor pagination mirroring v2.
 */

import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import {
  OrchestratorAuditQuerySchema,
  OrchestratorAuditWriteRequestSchema,
} from 'dispatch-core/src/v3/schema.js';
import { uuidv7 } from '../../events/history.js';

export interface OrchestratorAuditRoutesDeps {
  db: Database.Database;
}

interface AuditRowPersisted {
  id: string;
  timestamp: string;
  trigger_event: string;
  build_doc_id: string;
  build_doc_commit_sha: string;
  output_type: string;
  output_payload: string | null;
  operator_response: string;
  final_fired_payload: string | null;
  execution_outcome: string;
  free_form_text: string | null;
  staleness_status: string;
  superseded_card_ids: string | null;
}

function decodeRow(r: AuditRowPersisted): Record<string, unknown> {
  return {
    id: r.id,
    timestamp: r.timestamp,
    trigger_event: r.trigger_event,
    build_doc_id: r.build_doc_id,
    build_doc_commit_sha: r.build_doc_commit_sha,
    output_type: r.output_type,
    output_payload: r.output_payload === null ? null : JSON.parse(r.output_payload),
    operator_response: r.operator_response,
    final_fired_payload:
      r.final_fired_payload === null ? null : JSON.parse(r.final_fired_payload),
    execution_outcome: r.execution_outcome,
    free_form_text: r.free_form_text,
    staleness_status: r.staleness_status,
    superseded_card_ids:
      r.superseded_card_ids === null || r.superseded_card_ids.length === 0
        ? []
        : r.superseded_card_ids.split(','),
  };
}

export async function registerOrchestratorAuditRoutes(
  app: FastifyInstance,
  deps: OrchestratorAuditRoutesDeps,
): Promise<void> {
  const insert = deps.db.prepare(
    `INSERT INTO orchestrator_audit
       (id, timestamp, trigger_event, build_doc_id, build_doc_commit_sha,
        output_type, output_payload, operator_response, final_fired_payload,
        execution_outcome, free_form_text, staleness_status, superseded_card_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  app.post('/v3/orchestrator/audit', async (request, reply) => {
    const parsed = OrchestratorAuditWriteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(422).send({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const id = uuidv7();

    insert.run(
      id,
      d.timestamp,
      d.trigger_event,
      d.build_doc_id,
      d.build_doc_commit_sha,
      d.output_type,
      d.output_payload === null ? null : JSON.stringify(d.output_payload),
      d.operator_response,
      d.final_fired_payload === null ? null : JSON.stringify(d.final_fired_payload),
      d.execution_outcome,
      d.free_form_text,
      d.staleness_status,
      d.superseded_card_ids.length > 0 ? d.superseded_card_ids.join(',') : null,
    );

    reply.code(201).send({ id, ...d });
  });

  app.get('/v3/orchestrator/audit', async (request, reply) => {
    const parsed = OrchestratorAuditQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(422).send({ error: parsed.error.message });
      return;
    }
    const { since, until, build_doc_id, output_type, operator_response, limit } =
      parsed.data;

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (since) {
      conditions.push('timestamp > ?');
      params.push(since);
    }
    if (until) {
      conditions.push('timestamp <= ?');
      params.push(until);
    }
    if (build_doc_id) {
      conditions.push('build_doc_id = ?');
      params.push(build_doc_id);
    }
    if (output_type) {
      conditions.push('output_type = ?');
      params.push(output_type);
    }
    if (operator_response) {
      conditions.push('operator_response = ?');
      params.push(operator_response);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `SELECT id, timestamp, trigger_event, build_doc_id, build_doc_commit_sha,
                        output_type, output_payload, operator_response, final_fired_payload,
                        execution_outcome, free_form_text, staleness_status, superseded_card_ids
                 FROM orchestrator_audit
                 ${whereClause}
                 ORDER BY timestamp ASC, id ASC
                 LIMIT ?`;
    params.push(limit);

    const raw = deps.db.prepare(sql).all(...params) as AuditRowPersisted[];
    const rows = raw.map(decodeRow);
    const next_since =
      raw.length === limit && raw.length > 0 ? raw[raw.length - 1].timestamp : null;

    return { rows, next_since };
  });
}
