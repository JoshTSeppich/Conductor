/**
 * MB-T13 WB4 — Probe 01: POST /v3/audit/swarm-audit success path.
 *
 * Verifies POST with a valid body returns 201 + persisted row including
 * a server-assigned UUIDv7 id, with all caller-supplied fields preserved.
 *
 * RED at WB4 pre-route: route absent; setNotFoundHandler returns 404
 * `{"error": "Not found"}`.
 * GREEN at WB4 post-route: route registered in startup.ts; INSERT
 * succeeds; response shape matches OrchestratorSwarmAuditRowSchema.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';

interface SwarmAuditPostBody {
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

function basicSwarmAuditBody(
  overrides: Partial<SwarmAuditPostBody> = {},
): SwarmAuditPostBody {
  return {
    ts: '2026-05-06T10:00:00.000Z',
    session_name: 'test-session',
    action_type: 'send',
    intent_id: null,
    step: null,
    total_steps: null,
    approval_required: false,
    approval_status: 'not-required',
    payload_hash: 'a'.repeat(64),
    result_status: 'fired',
    operator_loop_state: 'manual',
    ...overrides,
  };
}

describe('MB-T13 WB4 — probe-01 — POST /v3/audit/swarm-audit success', () => {
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

  it('POST valid body → 201 + persisted row with server-assigned id', async () => {
    ts = await spawnTestServer();
    const body = basicSwarmAuditBody();
    const r = await fetch(
      `${ts.url}/v3/audit/swarm-audit`,
      authedJson('POST', body),
    );
    expect(r.status).toBe(201);
    const persisted = (await r.json()) as Record<string, unknown>;

    expect(typeof persisted.id).toBe('string');
    // UUIDv7 is RFC-4122 UUID format: 8-4-4-4-12 hex.
    expect(persisted.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    expect(persisted.ts).toBe(body.ts);
    expect(persisted.session_name).toBe(body.session_name);
    expect(persisted.action_type).toBe(body.action_type);
    expect(persisted.approval_required).toBe(body.approval_required);
    expect(persisted.approval_status).toBe(body.approval_status);
    expect(persisted.payload_hash).toBe(body.payload_hash);
    expect(persisted.result_status).toBe(body.result_status);
    expect(persisted.operator_loop_state).toBe(body.operator_loop_state);
    expect(persisted.intent_id).toBeNull();
    expect(persisted.step).toBeNull();
    expect(persisted.total_steps).toBeNull();
  });
});
