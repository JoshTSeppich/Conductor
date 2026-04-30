/**
 * COARCH-T01 sub-task B5+B6 — GET /v3/orchestrator/history +
 * DELETE /v3/orchestrator/history.
 *
 * Per WORKSTATION_CONTRACT.md §6.1 + ratified MB-S03 §6:
 *   - GET: paginated read with optional build_doc_id filter (the
 *          orchestrator P-0.4 Q4 TIERED chat-history fetch use case).
 *          Pagination: limit (default 100 max 500), before_id, since_id.
 *          Response: { messages: [...], next_before_id: string | null }
 *          where next_before_id is the oldest returned message's id when
 *          a page is full, else null.
 *   - DELETE: full clear (no scoping by build_doc_id or date range per
 *             MB-S03 ratified decision). Response: { deleted: <number> }.
 *
 * Auth-gated via the same hook as POST. Seeding happens through the
 * already-green POST endpoint (B4) so the tests round-trip through the
 * same code path operators will use.
 *
 * Probes (7):
 *   P1  Empty history GET → 200 + { messages: [], next_before_id: null }.
 *   P2  GET after seeding 5 messages → 5 messages, newest first,
 *       next_before_id null when limit > seeded count.
 *   P3  GET with limit=2 → 2 messages, next_before_id = oldest of those 2.
 *   P4  GET with before_id from P3 result → returns the older messages.
 *   P5  GET with build_doc_id filter → returns only matching rows.
 *   P6  DELETE → returns { deleted: <count> }; subsequent GET is empty.
 *   P7  GET without auth → 401.
 *
 * RED state pre-B6: route not registered; GET returns 404 (JSON 404
 * shape per A2 patch).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';

interface HistoryResponse {
  messages: Array<{
    id: string;
    created_at: string;
    role: string;
    content: string;
    build_doc_id: string | null;
    build_doc_commit_sha: string | null;
  }>;
  next_before_id: string | null;
}

describe('COARCH-T01 B5+B6 — GET + DELETE /v3/orchestrator/history', () => {
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

  async function seedMessages(count: number, build_doc_id: string | null = null): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const r = await fetch(
        `${ts!.url}/v3/orchestrator/messages`,
        authedJson('POST', {
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `seed message ${i}`,
          build_doc_id,
          build_doc_commit_sha: build_doc_id ? `sha-${i}` : null,
        }),
      );
      expect(r.status).toBe(201);
      const body = (await r.json()) as { id: string };
      ids.push(body.id);
      // 2ms gap so UUIDv7 timestamps differ; ordering deterministic
      await new Promise((res) => setTimeout(res, 2));
    }
    return ids;
  }

  async function getHistory(query: string = ''): Promise<{ status: number; body: HistoryResponse }> {
    const r = await fetch(
      `${ts!.url}/v3/orchestrator/history${query}`,
      authedJson('GET'),
    );
    return { status: r.status, body: r.status === 200 ? ((await r.json()) as HistoryResponse) : ({} as HistoryResponse) };
  }

  it('P1 empty history GET → 200 + empty messages + next_before_id null', async () => {
    ts = await spawnTestServer();
    const { status, body } = await getHistory();
    expect(status).toBe(200);
    expect(body.messages).toEqual([]);
    expect(body.next_before_id).toBeNull();
  });

  it('P2 GET after seeding 5 → 5 messages, newest first, next_before_id null', async () => {
    ts = await spawnTestServer();
    await seedMessages(5);
    const { status, body } = await getHistory();
    expect(status).toBe(200);
    expect(body.messages).toHaveLength(5);
    // Newest first: contents in reverse seed order
    expect(body.messages[0].content).toBe('seed message 4');
    expect(body.messages[4].content).toBe('seed message 0');
    expect(body.next_before_id).toBeNull();
  });

  it('P3 GET with limit=2 → 2 newest, next_before_id = oldest of returned', async () => {
    ts = await spawnTestServer();
    await seedMessages(5);
    const { status, body } = await getHistory('?limit=2');
    expect(status).toBe(200);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].content).toBe('seed message 4');
    expect(body.messages[1].content).toBe('seed message 3');
    expect(body.next_before_id).toBe(body.messages[1].id);
  });

  it('P4 GET with before_id continues pagination to older messages', async () => {
    ts = await spawnTestServer();
    await seedMessages(5);
    const first = await getHistory('?limit=2');
    const next = await getHistory(
      `?limit=2&before_id=${encodeURIComponent(first.body.next_before_id ?? '')}`,
    );
    expect(next.status).toBe(200);
    expect(next.body.messages).toHaveLength(2);
    expect(next.body.messages[0].content).toBe('seed message 2');
    expect(next.body.messages[1].content).toBe('seed message 1');
  });

  it('P5 GET with build_doc_id filter returns only matching rows', async () => {
    ts = await spawnTestServer();
    await seedMessages(3, 'b1');
    await seedMessages(2, 'b2');
    const { status, body } = await getHistory('?build_doc_id=b2');
    expect(status).toBe(200);
    expect(body.messages).toHaveLength(2);
    expect(body.messages.every((m) => m.build_doc_id === 'b2')).toBe(true);
  });

  it('P6 DELETE clears all messages; subsequent GET returns empty', async () => {
    ts = await spawnTestServer();
    await seedMessages(4);
    const r = await fetch(
      `${ts!.url}/v3/orchestrator/history`,
      authedJson('DELETE'),
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as { deleted: number };
    expect(body.deleted).toBe(4);

    const after = await getHistory();
    expect(after.body.messages).toEqual([]);
  });

  it('P7 GET without X-Conductor-Token → 401', async () => {
    ts = await spawnTestServer();
    const r = await fetch(`${ts.url}/v3/orchestrator/history`);
    expect(r.status).toBe(401);
  });
});
