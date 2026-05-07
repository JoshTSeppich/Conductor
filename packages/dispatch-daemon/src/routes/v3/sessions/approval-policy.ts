/**
 * MB-T13 — GET + PUT /v3/sessions/:name/approval-policy.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §3.2 + Phase 2 brief WB5 + operator-arbitrated
 * Q-MBT13-{1..13} 2026-05-06 + WB5 routing note (operator preference:
 * sessions/:name/approval-policy as the route for read/write of per-
 * session policy; routes/v3/audit/ reserved for swarm-audit endpoints).
 *
 *   - GET /v3/sessions/:name/approval-policy
 *       SELECT FROM session_policies WHERE session_name = :name.
 *       No-row response per Q-MBT13-4=c (defense-in-depth):
 *         { session_name, approval_policy: 'medium', updated_at: null }
 *       — workstation-side resolver ALSO defaults to 'medium' on no-row,
 *       so the wire-level null is observability (not correctness load-
 *       bearing).
 *       Row-exists response: { session_name, approval_policy, updated_at }
 *       per ApprovalPolicyGetResponseSchema (§13).
 *
 *   - PUT /v3/sessions/:name/approval-policy
 *       Body: ApprovalPolicyPutRequestSchema { approval_policy }.
 *       Server-assigned updated_at = new Date().toISOString() (ISO-8601
 *       with milliseconds + Z suffix, matches z.string().datetime() at
 *       the Get response schema).
 *       INSERT OR REPLACE INTO session_policies. Reply: 200 + the
 *       resulting row shape (matches ApprovalPolicyGetResponseSchema).
 *
 * Coexistence with sessions.json (KNOWN — WORKSTATION_CONTRACT.md §8.1):
 * `:name` is NOT validated against the v2 sessions.json registry. The
 * v3 SQLite layer is independent of the v2 JSON-file registry per the
 * coexistence-without-sync rule. PUT for an unknown session creates a
 * policy row that becomes effective when (or if) the session is
 * registered. Workstation-side flow normally PUTs after spawn-success,
 * so the unknown-session race is not a production concern.
 */

import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { ApprovalPolicyPutRequestSchema } from 'dispatch-core/src/v3/schema.js';

export interface ApprovalPolicyRoutesDeps {
  db: Database.Database;
}

interface PolicyRowPersisted {
  session_name: string;
  approval_policy: string;
  updated_at: string;
}

interface ParamsHolder {
  name: string;
}

export async function registerApprovalPolicyRoutes(
  app: FastifyInstance,
  deps: ApprovalPolicyRoutesDeps,
): Promise<void> {
  const select = deps.db.prepare(
    `SELECT session_name, approval_policy, updated_at
     FROM session_policies WHERE session_name = ?`,
  );
  const upsert = deps.db.prepare(
    `INSERT OR REPLACE INTO session_policies
       (session_name, approval_policy, updated_at)
     VALUES (?, ?, ?)`,
  );

  app.get<{ Params: ParamsHolder }>(
    '/v3/sessions/:name/approval-policy',
    async (request, reply) => {
      const { name } = request.params;
      if (!name) {
        reply.code(400).send({ error: 'session name required' });
        return;
      }
      const row = select.get(name) as PolicyRowPersisted | undefined;
      if (!row) {
        // Q-MBT13-4=c: no-row → structural default 'medium' + null
        // updated_at as observability sentinel.
        return {
          session_name: name,
          approval_policy: 'medium',
          updated_at: null,
        };
      }
      return {
        session_name: row.session_name,
        approval_policy: row.approval_policy,
        updated_at: row.updated_at,
      };
    },
  );

  app.put<{ Params: ParamsHolder }>(
    '/v3/sessions/:name/approval-policy',
    async (request, reply) => {
      const { name } = request.params;
      if (!name) {
        reply.code(400).send({ error: 'session name required' });
        return;
      }
      const parsed = ApprovalPolicyPutRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(422).send({ error: parsed.error.message });
        return;
      }
      const updated_at = new Date().toISOString();
      upsert.run(name, parsed.data.approval_policy, updated_at);
      return {
        session_name: name,
        approval_policy: parsed.data.approval_policy,
        updated_at,
      };
    },
  );
}
