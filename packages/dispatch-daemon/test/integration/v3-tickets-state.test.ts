/**
 * COARCH-T01 sub-task B9+B10 — /v3/tickets/state.
 *
 * Per WORKSTATION_CONTRACT.md §6.3 + ratified MB-S03 §6:
 *   - POST /v3/tickets/state — upsert one row per (ticket_id, build_doc_id)
 *     via INSERT OR REPLACE. Composite PK enforces the constraint per the
 *     migration. Audit log captures transition history; this table is
 *     current-state only.
 *   - GET /v3/tickets/state — operator-facing kanban query; optional
 *     build_doc_id filter.
 *   - GET /v3/tickets/state/:ticket_id — single-ticket lookup;
 *     `build_doc_id` REQUIRED query param per ratified §6 (a single
 *     ticket_id can exist across multiple build-doc revisions, so
 *     omitting is structurally ambiguous → 422).
 *
 * Probes (8):
 *   P1  POST valid body → 201 + persisted row.
 *   P2  POST same (ticket_id, build_doc_id) again → upsert (200 with
 *       the new state; row count stays at 1 in DB).
 *   P3  POST different (ticket_id, build_doc_id) pair → new row added.
 *   P4  GET list → all rows.
 *   P5  GET list with build_doc_id filter → only matching rows.
 *   P6  GET /:ticket_id with build_doc_id → single row.
 *   P7  GET /:ticket_id WITHOUT build_doc_id → 422 (required-param violation).
 *   P8  GET /:ticket_id with valid build_doc_id but ticket absent → 404.
 *
 * (Auth-gating is covered by auth-v3.test.ts at the suite level; not
 * re-asserted per route here.)
 *
 * RED state pre-B10: routes not registered.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';

interface TicketStateRow {
  ticket_id: string;
  build_doc_id: string;
  state: string;
  state_updated_at: string;
  superseded_by_ticket_id: string | null;
}

describe('COARCH-T01 B9+B10 — /v3/tickets/state', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort cleanup */
      });
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

  it('P1 POST valid body → 201 + persisted row', async () => {
    ts = await spawnTestServer();
    const r = await fetch(
      `${ts.url}/v3/tickets/state`,
      authedJson('POST', {
        ticket_id: 'MB-T05',
        build_doc_id: 'b1',
        state: 'pending',
        superseded_by_ticket_id: null,
      }),
    );
    expect(r.status).toBe(201);
    const row = (await r.json()) as TicketStateRow;
    expect(row.ticket_id).toBe('MB-T05');
    expect(row.build_doc_id).toBe('b1');
    expect(row.state).toBe('pending');
    expect(typeof row.state_updated_at).toBe('string');
    expect(row.superseded_by_ticket_id).toBeNull();
  });

  it('P2 POST same (ticket_id, build_doc_id) upserts (single row in DB)', async () => {
    ts = await spawnTestServer();
    await fetch(
      `${ts.url}/v3/tickets/state`,
      authedJson('POST', {
        ticket_id: 'MB-T05',
        build_doc_id: 'b1',
        state: 'pending',
        superseded_by_ticket_id: null,
      }),
    );
    const r2 = await fetch(
      `${ts.url}/v3/tickets/state`,
      authedJson('POST', {
        ticket_id: 'MB-T05',
        build_doc_id: 'b1',
        state: 'in-progress',
        superseded_by_ticket_id: null,
      }),
    );
    expect(r2.status).toBe(200);
    const row = (await r2.json()) as TicketStateRow;
    expect(row.state).toBe('in-progress');

    const count = ts.db
      .prepare(`SELECT COUNT(*) as c FROM orchestrator_ticket_state`)
      .get() as { c: number };
    expect(count.c).toBe(1);
  });

  it('P3 POST different (ticket_id, build_doc_id) adds a new row', async () => {
    ts = await spawnTestServer();
    await fetch(
      `${ts.url}/v3/tickets/state`,
      authedJson('POST', {
        ticket_id: 'MB-T05',
        build_doc_id: 'b1',
        state: 'pending',
      }),
    );
    await fetch(
      `${ts.url}/v3/tickets/state`,
      authedJson('POST', {
        ticket_id: 'MB-T05',
        build_doc_id: 'b2',
        state: 'pending',
      }),
    );
    const count = ts.db
      .prepare(`SELECT COUNT(*) as c FROM orchestrator_ticket_state`)
      .get() as { c: number };
    expect(count.c).toBe(2);
  });

  it('P4 GET list returns all rows', async () => {
    ts = await spawnTestServer();
    await fetch(`${ts.url}/v3/tickets/state`, authedJson('POST', { ticket_id: 'MB-T05', build_doc_id: 'b1', state: 'pending' }));
    await fetch(`${ts.url}/v3/tickets/state`, authedJson('POST', { ticket_id: 'MB-T06', build_doc_id: 'b1', state: 'pending' }));
    const r = await fetch(`${ts.url}/v3/tickets/state`, authedJson('GET'));
    expect(r.status).toBe(200);
    const body = (await r.json()) as { rows: TicketStateRow[] };
    expect(body.rows).toHaveLength(2);
  });

  it('P5 GET list with build_doc_id filter restricts rows', async () => {
    ts = await spawnTestServer();
    await fetch(`${ts.url}/v3/tickets/state`, authedJson('POST', { ticket_id: 'MB-T05', build_doc_id: 'b1', state: 'pending' }));
    await fetch(`${ts.url}/v3/tickets/state`, authedJson('POST', { ticket_id: 'MB-T05', build_doc_id: 'b2', state: 'pending' }));
    const r = await fetch(`${ts.url}/v3/tickets/state?build_doc_id=b2`, authedJson('GET'));
    expect(r.status).toBe(200);
    const body = (await r.json()) as { rows: TicketStateRow[] };
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].build_doc_id).toBe('b2');
  });

  it('P6 GET /:ticket_id with build_doc_id → single row', async () => {
    ts = await spawnTestServer();
    await fetch(`${ts.url}/v3/tickets/state`, authedJson('POST', { ticket_id: 'MB-T05', build_doc_id: 'b1', state: 'awaiting-approval' }));
    const r = await fetch(`${ts.url}/v3/tickets/state/MB-T05?build_doc_id=b1`, authedJson('GET'));
    expect(r.status).toBe(200);
    const row = (await r.json()) as TicketStateRow;
    expect(row.ticket_id).toBe('MB-T05');
    expect(row.build_doc_id).toBe('b1');
    expect(row.state).toBe('awaiting-approval');
  });

  it('P7 GET /:ticket_id without build_doc_id → 422', async () => {
    ts = await spawnTestServer();
    await fetch(`${ts.url}/v3/tickets/state`, authedJson('POST', { ticket_id: 'MB-T05', build_doc_id: 'b1', state: 'pending' }));
    const r = await fetch(`${ts.url}/v3/tickets/state/MB-T05`, authedJson('GET'));
    expect(r.status).toBe(422);
  });

  it('P8 GET /:ticket_id with build_doc_id but ticket absent → 404', async () => {
    ts = await spawnTestServer();
    const r = await fetch(`${ts.url}/v3/tickets/state/MB-NOT-PRESENT?build_doc_id=b1`, authedJson('GET'));
    expect(r.status).toBe(404);
  });
});
