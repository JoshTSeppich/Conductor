/**
 * MB-T13 — POST + GET /v3/audit/swarm-audit.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §3.8 + Phase 2 brief WB4 + operator-arbitrated
 * Q-MBT13-{1..13} 2026-05-06:
 *
 *   - POST /v3/audit/swarm-audit
 *       Body: OrchestratorSwarmAuditWriteRequestSchema (full row minus id).
 *       Server assigns UUIDv7 id at write time (matches orchestrator_audit
 *       precedent — uuidv7() helper from events/history.ts).
 *       INSERT INTO orchestrator_swarm_audit. Response: 201 + persisted row.
 *
 *   - GET /v3/audit/swarm-audit
 *       Query params:
 *         session_name (optional): filter to one session's audit rows
 *           (per Q-MBT13-5=b — uses idx_swarm_audit_session_ts index)
 *         limit (optional, 1..unbounded, default 100, CLAMPED to 100):
 *           result-set cap. Per Q-MBT13-9=a (LIMIT 100 ORDER BY ts DESC),
 *           v3.0 ships single-page modal; rich pagination deferred to
 *           v3.1 followup MB-F-T13-AUDIT-MODAL-FILTERS.
 *       SELECT ORDER BY ts DESC LIMIT N. Response:
 *         { rows: OrchestratorSwarmAuditRow[], total: number }
 *
 * Distinct from /v3/orchestrator/audit (operator-facing chat-output
 * approve/decline log per WORKSTATION_CONTRACT.md §6.2 + MB-S03).
 */

import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import {
  OrchestratorSwarmAuditQuerySchema,
  OrchestratorSwarmAuditWriteRequestSchema,
} from 'dispatch-core/src/v3/schema.js';
import { uuidv7 } from '../../../events/history.js';

export interface SwarmAuditRoutesDeps {
  db: Database.Database;
}

/**
 * Hard upper bound on rows returned by GET /v3/audit/swarm-audit per
 * Q-MBT13-9=a. The Zod query schema accepts any positive integer for
 * `limit` (no Zod .max), and the route-layer Math.min(parsed.limit,
 * HARD_LIMIT) clamps to 100 — defense-in-depth against accidental
 * large-N reads (probe-08 verifies caller passes limit=999 → 100 rows).
 */
const HARD_LIMIT = 100;

interface SwarmAuditRowPersisted {
  id: string;
  ts: string;
  session_name: string;
  action_type: string;
  intent_id: string | null;
  step: number | null;
  total_steps: number | null;
  approval_required: number;
  approval_status: string;
  payload_hash: string;
  result_status: string;
  operator_loop_state: string;
}

function decodeRow(r: SwarmAuditRowPersisted): Record<string, unknown> {
  return {
    id: r.id,
    ts: r.ts,
    session_name: r.session_name,
    action_type: r.action_type,
    intent_id: r.intent_id,
    step: r.step,
    total_steps: r.total_steps,
    // SQLite stores boolean as INTEGER 0/1; surface as boolean at the
    // wire boundary to match OrchestratorSwarmAuditRowSchema.
    approval_required: r.approval_required === 1,
    approval_status: r.approval_status,
    payload_hash: r.payload_hash,
    result_status: r.result_status,
    operator_loop_state: r.operator_loop_state,
  };
}

export async function registerSwarmAuditRoutes(
  app: FastifyInstance,
  deps: SwarmAuditRoutesDeps,
): Promise<void> {
  const insert = deps.db.prepare(
    `INSERT INTO orchestrator_swarm_audit
       (id, ts, session_name, action_type, intent_id, step, total_steps,
        approval_required, approval_status, payload_hash, result_status,
        operator_loop_state)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  app.post('/v3/audit/swarm-audit', async (request, reply) => {
    const parsed = OrchestratorSwarmAuditWriteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(422).send({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const id = uuidv7();

    insert.run(
      id,
      d.ts,
      d.session_name,
      d.action_type,
      d.intent_id,
      d.step,
      d.total_steps,
      // SQLite has no BOOLEAN; coerce to 0/1 INTEGER for the
      // CHECK (approval_required IN (0, 1)) constraint.
      d.approval_required ? 1 : 0,
      d.approval_status,
      d.payload_hash,
      d.result_status,
      d.operator_loop_state,
    );

    reply.code(201).send({ id, ...d });
  });

  app.get('/v3/audit/swarm-audit', async (request, reply) => {
    const parsed = OrchestratorSwarmAuditQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(422).send({ error: parsed.error.message });
      return;
    }
    const { session_name } = parsed.data;
    // Clamp to HARD_LIMIT (100) per Phase 2 brief WB4 probe-08
    // expectation (caller may pass limit=999, route returns 100 rows).
    const effectiveLimit = Math.min(parsed.data.limit, HARD_LIMIT);

    const params: unknown[] = [];
    let whereClause = '';
    if (session_name) {
      whereClause = 'WHERE session_name = ?';
      params.push(session_name);
    }
    params.push(effectiveLimit);

    const sql = `SELECT id, ts, session_name, action_type, intent_id, step,
                        total_steps, approval_required, approval_status,
                        payload_hash, result_status, operator_loop_state
                 FROM orchestrator_swarm_audit
                 ${whereClause}
                 ORDER BY ts DESC, id DESC
                 LIMIT ?`;

    const raw = deps.db.prepare(sql).all(...params) as SwarmAuditRowPersisted[];
    const rows = raw.map(decodeRow);

    return { rows, total: rows.length };
  });
}
