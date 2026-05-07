/**
 * MB-T13 WB9 — End-to-end audit-write acceptance test.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §4 lines 223-231 (MB-T13 ticket body
 * acceptance):
 *   "Audit-write integration test: fire 5 actions of varying types via
 *    the orchestrator → assert 5 audit rows with correct fields."
 *
 * Higher-level than the WB4 unit-style probes (which exercise individual
 * route behaviors in isolation): this test fires the full POST→GET flow
 * end-to-end, varying action_type across all 5 ApprovalActionTypeEnum
 * values per Q-MBT13-12=a (send / spawn-new-session / kill / pull /
 * assign-task), and confirms:
 *
 *   1. All 5 POSTs succeed with 201 + UUIDv7 ids.
 *   2. GET returns exactly 5 rows.
 *   3. Each row preserves all 12 caller-supplied fields verbatim
 *      (no silent drops, no SQLite-INTEGER boolean leakage at wire).
 *   4. Rows arrive ordered by ts DESC (newest first per Q-MBT13-9=a).
 *
 * Distinct from WB4 probe-05 (which inserts via direct DB and tests
 * route GET behavior alone): this probe goes through the actual POST
 * route for ingestion, exercising the full Zod-validate → INSERT →
 * Zod-decode round-trip.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

interface AuditPostBody {
  ts: string;
  session_name: string;
  action_type: 'send' | 'spawn-new-session' | 'kill' | 'pull' | 'assign-task';
  intent_id: string | null;
  step: number | null;
  total_steps: number | null;
  approval_required: boolean;
  approval_status: 'not-required' | 'pending' | 'approved' | 'declined';
  payload_hash: string;
  result_status: 'fired' | 'failed' | 'pending';
  operator_loop_state: 'autopilot' | 'manual' | 'paused';
}

describe('MB-T13 WB9 — end-to-end: 5 varying actions → 5 rows', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  function authedJson(method: string, body?: unknown): RequestInit {
    return {
      method,
      headers: {
        'x-conductor-token': ts?.token ?? '',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };
  }

  it('POST 5 actions of varying type → GET returns 5 rows ordered by ts DESC', async () => {
    ts = await spawnTestServer();

    // Construct 5 rows, each with a distinct action_type, distinct
    // ts (1-second spacing), and distinct payload_hash (so the
    // collision-detection hash invariant remains observable).
    const bodies: AuditPostBody[] = [
      {
        ts: '2026-05-06T10:00:00.000Z',
        session_name: 'sherpa',
        action_type: 'send',
        intent_id: null,
        step: null,
        total_steps: null,
        approval_required: false,
        approval_status: 'not-required',
        payload_hash: 'a'.repeat(64),
        result_status: 'fired',
        operator_loop_state: 'manual',
      },
      {
        ts: '2026-05-06T10:00:01.000Z',
        session_name: 'sherpa',
        action_type: 'spawn-new-session',
        intent_id: '01890e0d-7c61-7a4a-8f4e-bbbbbbbbbbbb',
        step: 1,
        total_steps: 1,
        approval_required: true,
        approval_status: 'approved',
        payload_hash: 'b'.repeat(64),
        result_status: 'fired',
        operator_loop_state: 'autopilot',
      },
      {
        ts: '2026-05-06T10:00:02.000Z',
        session_name: 'sherpa-2',
        action_type: 'kill',
        intent_id: null,
        step: null,
        total_steps: null,
        approval_required: true,
        approval_status: 'declined',
        payload_hash: 'c'.repeat(64),
        result_status: 'pending',
        operator_loop_state: 'paused',
      },
      {
        ts: '2026-05-06T10:00:03.000Z',
        session_name: 'sherpa',
        action_type: 'pull',
        intent_id: null,
        step: null,
        total_steps: null,
        approval_required: false,
        approval_status: 'not-required',
        payload_hash: 'd'.repeat(64),
        result_status: 'fired',
        operator_loop_state: 'autopilot',
      },
      {
        ts: '2026-05-06T10:00:04.000Z',
        session_name: 'sherpa-2',
        action_type: 'assign-task',
        intent_id: '01890e0d-7c61-7a4a-8f4e-eeeeeeeeeeee',
        step: 2,
        total_steps: 4,
        approval_required: true,
        approval_status: 'pending',
        payload_hash: 'e'.repeat(64),
        result_status: 'pending',
        operator_loop_state: 'autopilot',
      },
    ];

    // Phase 1: POST each row, capturing the server-assigned ids.
    const ids: string[] = [];
    for (const body of bodies) {
      const r = await fetch(
        `${ts.url}/v3/audit/swarm-audit`,
        authedJson('POST', body),
      );
      expect(r.status).toBe(201);
      const persisted = (await r.json()) as Record<string, unknown>;
      expect(typeof persisted.id).toBe('string');
      expect(persisted.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      ids.push(persisted.id as string);
    }
    expect(ids).toHaveLength(5);
    // All ids unique (UUIDv7 collision is astronomically unlikely; any
    // collision here would indicate id-generation reuse).
    expect(new Set(ids).size).toBe(5);

    // Phase 2: GET → assert 5 rows returned, ordered by ts DESC.
    const r = await fetch(`${ts.url}/v3/audit/swarm-audit`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      rows: Array<AuditPostBody & { id: string }>;
      total: number;
    };
    expect(body.total).toBe(5);
    expect(body.rows).toHaveLength(5);

    // ts DESC: rows[0] is the newest (10:00:04), rows[4] is oldest (10:00:00).
    expect(body.rows.map((r) => r.ts)).toEqual([
      '2026-05-06T10:00:04.000Z',
      '2026-05-06T10:00:03.000Z',
      '2026-05-06T10:00:02.000Z',
      '2026-05-06T10:00:01.000Z',
      '2026-05-06T10:00:00.000Z',
    ]);

    // action_type ordering follows ts DESC (assign-task first, send last).
    expect(body.rows.map((r) => r.action_type)).toEqual([
      'assign-task',
      'pull',
      'kill',
      'spawn-new-session',
      'send',
    ]);
  });

  it('POST→GET round-trip preserves all 12 fields verbatim', async () => {
    ts = await spawnTestServer();

    const golden: AuditPostBody = {
      ts: '2026-05-06T12:34:56.789Z',
      session_name: 'round-trip-test',
      action_type: 'assign-task',
      intent_id: '01890e0d-7c61-7a4a-8f4e-cafecafecafe',
      step: 3,
      total_steps: 7,
      approval_required: true,
      approval_status: 'approved',
      payload_hash: 'f'.repeat(64),
      result_status: 'fired',
      operator_loop_state: 'autopilot',
    };

    const post = await fetch(
      `${ts.url}/v3/audit/swarm-audit`,
      authedJson('POST', golden),
    );
    expect(post.status).toBe(201);

    const get = await fetch(`${ts.url}/v3/audit/swarm-audit`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    const body = (await get.json()) as {
      rows: Array<AuditPostBody & { id: string }>;
    };
    expect(body.rows).toHaveLength(1);
    const row = body.rows[0];

    expect(row.ts).toBe(golden.ts);
    expect(row.session_name).toBe(golden.session_name);
    expect(row.action_type).toBe(golden.action_type);
    expect(row.intent_id).toBe(golden.intent_id);
    expect(row.step).toBe(golden.step);
    expect(row.total_steps).toBe(golden.total_steps);
    // boolean: round-trips correctly (not leaking SQLite INTEGER 1).
    expect(row.approval_required).toBe(true);
    expect(typeof row.approval_required).toBe('boolean');
    expect(row.approval_status).toBe(golden.approval_status);
    expect(row.payload_hash).toBe(golden.payload_hash);
    expect(row.result_status).toBe(golden.result_status);
    expect(row.operator_loop_state).toBe(golden.operator_loop_state);
  });

  it('intent_id/step/total_steps null fields round-trip as null (not undefined)', async () => {
    ts = await spawnTestServer();

    const noEnvelope: AuditPostBody = {
      ts: '2026-05-06T13:00:00.000Z',
      session_name: 'no-envelope-session',
      action_type: 'send',
      intent_id: null,
      step: null,
      total_steps: null,
      approval_required: false,
      approval_status: 'not-required',
      payload_hash: '0'.repeat(64),
      result_status: 'fired',
      operator_loop_state: 'manual',
    };

    await fetch(
      `${ts.url}/v3/audit/swarm-audit`,
      authedJson('POST', noEnvelope),
    );

    const get = await fetch(`${ts.url}/v3/audit/swarm-audit`, {
      headers: { 'x-conductor-token': ts.token ?? '' },
    });
    const body = (await get.json()) as {
      rows: Array<AuditPostBody & { id: string }>;
    };
    const row = body.rows[0];
    expect(row.intent_id).toBeNull();
    expect(row.step).toBeNull();
    expect(row.total_steps).toBeNull();
  });
});
