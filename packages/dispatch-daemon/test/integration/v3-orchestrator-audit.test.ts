/**
 * COARCH-T01 sub-task B7+B8 — POST + GET /v3/orchestrator/audit.
 *
 * Per WORKSTATION_CONTRACT.md §6.2 + ratified MB-S03 §6.1/§6.2/§6.4:
 *   - POST: body is OrchestratorAuditWriteRequestSchema (full row minus
 *           id). Server assigns UUIDv7 id. JSON-encoded payloads stored
 *           as TEXT per ratified §6.4. Response: 201 + persisted row.
 *   - GET:  filter axes are date-range (since/until), build_doc_id,
 *           output_type, operator_response. Response is
 *           { rows: [...], next_since: string | null } mirroring v2
 *           events pagination per ratified §6.1.
 *
 * Probes (7):
 *   P1  POST valid body → 201 + persisted row including server id.
 *   P2  POST without auth → 401.
 *   P3  POST malformed body (missing trigger_event) → 422.
 *   P4  GET empty audit log → 200 + { rows: [], next_since: null }.
 *   P5  GET with output_type=card filter returns only matching rows.
 *   P6  GET with limit + since pagination produces stable cursor
 *       (next_since is the last returned row's timestamp; passing it
 *       back as since returns the next-older-than-cursor page).
 *   P7  GET without auth → 401.
 *
 * RED state pre-B8: route not registered; POST and GET return 404.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';

interface AuditPostBody {
  timestamp: string;
  trigger_event: string;
  build_doc_id: string;
  build_doc_commit_sha: string;
  output_type:
    | 'action'
    | 'card'
    | 'multi-choice-card'
    | 'escape-block'
    | 'noop';
  output_payload: unknown;
  operator_response:
    | 'approve'
    | 'decline'
    | 'multi-choice-A'
    | 'multi-choice-B'
    | 'multi-choice-C'
    | 'multi-choice-D'
    | 'copied-escape-block'
    | 'pending';
  final_fired_payload: unknown;
  execution_outcome: 'success' | 'failure' | 'n/a';
  free_form_text: string | null;
  staleness_status: 'current' | 'stale' | 'superseded';
  superseded_card_ids: string[];
}

function basicAuditBody(overrides: Partial<AuditPostBody> = {}): AuditPostBody {
  return {
    timestamp: '2026-04-30T10:00:00Z',
    trigger_event: 'cc-session-output',
    build_doc_id: 'v3-tickets-2026-04-30',
    build_doc_commit_sha: 'abc123def456',
    output_type: 'card',
    output_payload: null,
    operator_response: 'pending',
    final_fired_payload: null,
    execution_outcome: 'n/a',
    free_form_text: null,
    staleness_status: 'current',
    superseded_card_ids: [],
    ...overrides,
  };
}

describe('COARCH-T01 B7+B8 — POST + GET /v3/orchestrator/audit', () => {
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
    const body = basicAuditBody();
    const r = await fetch(
      `${ts.url}/v3/orchestrator/audit`,
      authedJson('POST', body),
    );
    expect(r.status).toBe(201);
    const persisted = (await r.json()) as Record<string, unknown>;
    expect(typeof persisted.id).toBe('string');
    expect((persisted.id as string).length).toBeGreaterThan(0);
    expect(persisted.timestamp).toBe(body.timestamp);
    expect(persisted.trigger_event).toBe(body.trigger_event);
    expect(persisted.output_type).toBe('card');
  });

  it('P2 POST without auth → 401', async () => {
    ts = await spawnTestServer();
    const r = await fetch(`${ts.url}/v3/orchestrator/audit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(basicAuditBody()),
    });
    expect(r.status).toBe(401);
  });

  it('P3 POST missing required trigger_event → 422', async () => {
    ts = await spawnTestServer();
    const malformed = basicAuditBody();
    delete (malformed as Partial<AuditPostBody>).trigger_event;
    const r = await fetch(
      `${ts.url}/v3/orchestrator/audit`,
      authedJson('POST', malformed),
    );
    expect(r.status).toBe(422);
  });

  it('P4 GET empty audit log → 200 + { rows: [], next_since: null }', async () => {
    ts = await spawnTestServer();
    const r = await fetch(`${ts.url}/v3/orchestrator/audit`, authedJson('GET'));
    expect(r.status).toBe(200);
    const body = (await r.json()) as { rows: unknown[]; next_since: string | null };
    expect(body.rows).toEqual([]);
    expect(body.next_since).toBeNull();
  });

  it('P5 GET with output_type=card filter returns only matching rows', async () => {
    ts = await spawnTestServer();
    await fetch(`${ts.url}/v3/orchestrator/audit`, authedJson('POST', basicAuditBody({ output_type: 'card', timestamp: '2026-04-30T10:00:00Z' })));
    await fetch(`${ts.url}/v3/orchestrator/audit`, authedJson('POST', basicAuditBody({ output_type: 'escape-block', timestamp: '2026-04-30T10:01:00Z' })));
    await fetch(`${ts.url}/v3/orchestrator/audit`, authedJson('POST', basicAuditBody({ output_type: 'card', timestamp: '2026-04-30T10:02:00Z' })));

    const r = await fetch(
      `${ts.url}/v3/orchestrator/audit?output_type=card`,
      authedJson('GET'),
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as { rows: Array<{ output_type: string }>; next_since: string | null };
    expect(body.rows).toHaveLength(2);
    expect(body.rows.every((row) => row.output_type === 'card')).toBe(true);
  });

  it('P6 GET with limit + since pagination produces stable cursor', async () => {
    ts = await spawnTestServer();
    for (let i = 0; i < 5; i += 1) {
      await fetch(
        `${ts.url}/v3/orchestrator/audit`,
        authedJson(
          'POST',
          basicAuditBody({
            timestamp: `2026-04-30T10:0${i}:00Z`,
            trigger_event: `event-${i}`,
          }),
        ),
      );
    }
    const first = await fetch(
      `${ts.url}/v3/orchestrator/audit?limit=2`,
      authedJson('GET'),
    );
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as {
      rows: Array<{ timestamp: string; trigger_event: string }>;
      next_since: string | null;
    };
    expect(firstBody.rows).toHaveLength(2);
    expect(firstBody.rows[0].trigger_event).toBe('event-0');
    expect(firstBody.rows[1].trigger_event).toBe('event-1');
    expect(firstBody.next_since).toBe(firstBody.rows[1].timestamp);

    const next = await fetch(
      `${ts.url}/v3/orchestrator/audit?limit=2&since=${encodeURIComponent(firstBody.next_since ?? '')}`,
      authedJson('GET'),
    );
    expect(next.status).toBe(200);
    const nextBody = (await next.json()) as {
      rows: Array<{ trigger_event: string }>;
      next_since: string | null;
    };
    expect(nextBody.rows).toHaveLength(2);
    expect(nextBody.rows[0].trigger_event).toBe('event-2');
    expect(nextBody.rows[1].trigger_event).toBe('event-3');
  });

  it('P7 GET without auth → 401', async () => {
    ts = await spawnTestServer();
    const r = await fetch(`${ts.url}/v3/orchestrator/audit`);
    expect(r.status).toBe(401);
  });
});
