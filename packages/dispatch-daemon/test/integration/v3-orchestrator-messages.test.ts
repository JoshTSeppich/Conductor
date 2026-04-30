/**
 * COARCH-T01 sub-task B3+B4 — POST /v3/orchestrator/messages.
 *
 * Per WORKSTATION_CONTRACT.md §6.1 + ratified MB-S03 §6.3 (UUIDv7 ids).
 * Append-only chat message persistence backed by the v3 SQLite layer
 * (orchestrator_messages table) per amended §8.1. Read endpoints
 * (GET /v3/orchestrator/history + DELETE /v3/orchestrator/history) land
 * separately in B5+B6.
 *
 * Probes (5):
 *   P1  Valid POST → 201 + persisted row in body (id, created_at,
 *       echoed role/content/build_doc_id/build_doc_commit_sha).
 *   P2  POST without auth → 401 (regression guard against A1 bypass
 *       being undone — the auth-v3 suite covers this for the broader
 *       /v3/* surface; included here for per-route fidelity).
 *   P3  POST with malformed body (missing required `role`) → 422.
 *   P4  POST landed row schema-validates against OrchestratorMessageRowSchema
 *       (id is non-empty TEXT, created_at is ISO timestamp).
 *   P5  Round-trip: response row matches the row read directly from
 *       the test fixture's TestServer.db handle.
 *
 * RED state pre-B4: route not registered; POST returns 404 (JSON 404
 * shape per A2 patch).
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  OrchestratorMessageRowSchema,
} from 'dispatch-core/src/v3/schema.js';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';

describe('COARCH-T01 B3+B4 — POST /v3/orchestrator/messages', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort cleanup */
      });
      ts = null;
    }
  });

  function authedJson(body: unknown): RequestInit {
    return {
      method: 'POST',
      headers: {
        'x-conductor-token': ts?.token ?? '',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    };
  }

  it('P1 valid POST → 201 + persisted row in body', async () => {
    ts = await spawnTestServer();
    const r = await fetch(
      `${ts.url}/v3/orchestrator/messages`,
      authedJson({
        role: 'user',
        content: 'hello orchestrator',
        build_doc_id: 'v3-tickets-2026-04-30',
        build_doc_commit_sha: 'abc123def456',
      }),
    );
    expect(r.status).toBe(201);
    const body = (await r.json()) as Record<string, unknown>;
    expect(typeof body.id).toBe('string');
    expect((body.id as string).length).toBeGreaterThan(0);
    expect(typeof body.created_at).toBe('string');
    expect(body.role).toBe('user');
    expect(body.content).toBe('hello orchestrator');
    expect(body.build_doc_id).toBe('v3-tickets-2026-04-30');
    expect(body.build_doc_commit_sha).toBe('abc123def456');
  });

  it('P2 POST without X-Conductor-Token → 401', async () => {
    ts = await spawnTestServer();
    const r = await fetch(`${ts.url}/v3/orchestrator/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'user', content: 'hi', build_doc_id: null, build_doc_commit_sha: null }),
    });
    expect(r.status).toBe(401);
  });

  it('P3 POST with malformed body (missing role) → 422', async () => {
    ts = await spawnTestServer();
    const r = await fetch(
      `${ts.url}/v3/orchestrator/messages`,
      authedJson({
        content: 'orphan',
        build_doc_id: null,
        build_doc_commit_sha: null,
      }),
    );
    expect(r.status).toBe(422);
  });

  it('P4 response row validates against OrchestratorMessageRowSchema', async () => {
    ts = await spawnTestServer();
    const r = await fetch(
      `${ts.url}/v3/orchestrator/messages`,
      authedJson({
        role: 'assistant',
        content: '{"type":"card"}',
        build_doc_id: null,
        build_doc_commit_sha: null,
      }),
    );
    expect(r.status).toBe(201);
    const body = await r.json();
    const parse = OrchestratorMessageRowSchema.safeParse(body);
    expect(parse.success).toBe(true);
  });

  it('P5 round-trip: posted row appears in DB via TestServer.db', async () => {
    ts = await spawnTestServer();
    const r = await fetch(
      `${ts.url}/v3/orchestrator/messages`,
      authedJson({
        role: 'user',
        content: 'ground truth message',
        build_doc_id: 'b1',
        build_doc_commit_sha: 'sha1',
      }),
    );
    expect(r.status).toBe(201);
    const body = (await r.json()) as { id: string };

    const row = ts.db
      .prepare(
        `SELECT id, role, content, build_doc_id, build_doc_commit_sha
         FROM orchestrator_messages WHERE id = ?`,
      )
      .get(body.id) as
      | {
          id: string;
          role: string;
          content: string;
          build_doc_id: string | null;
          build_doc_commit_sha: string | null;
        }
      | undefined;
    expect(row).toBeDefined();
    expect(row?.role).toBe('user');
    expect(row?.content).toBe('ground truth message');
    expect(row?.build_doc_id).toBe('b1');
    expect(row?.build_doc_commit_sha).toBe('sha1');
  });
});
