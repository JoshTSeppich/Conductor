/**
 * DAEMON-T11 — GET /v2/events integration tests.
 *
 * Cluster-closing ticket for D-3. Reads from the T17 ring buffer
 * (shared test fixture seam: tests pass a pre-seeded ring via
 * spawnTestServer({eventRing})).
 *
 * Probes (5 total per T11 pre-reg):
 *   P1 no params → last 100 events, oldest-first;
 *      next_since = timestamp of last event returned
 *   P2 ?since=<ts> → events strictly newer (exclusive);
 *      oldest-first; next_since = last returned timestamp
 *   P3 ?limit=600 → clamped to 500;
 *      response carries `X-Dispatch-Limit-Clamped: true` header
 *   P4 malformed ?since (not ISO-8601) → 422 + {error: ...}
 *   P5 empty buffer → {events: [], next_since: null}
 *
 * Response envelope (per contract §4.5):
 *   {events: EventRecord[], next_since: string | null}
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import {
  createEventRing,
  type EventRing,
} from '../../src/events/history.js';

describe('DAEMON-T11 — GET /v2/events', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort */
      });
      ts = null;
    }
  });

  function authHeaders(token: string | undefined): Record<string, string> {
    return { 'x-conductor-token': token ?? '' };
  }

  function seedRing(
    ring: EventRing,
    count: number,
    opts: { session?: string; baseIso?: string } = {},
  ): { firstTs: string; lastTs: string } {
    const session = opts.session ?? 'sherpa';
    const base = new Date(opts.baseIso ?? '2026-04-23T10:00:00.000Z').getTime();
    let lastTs = '';
    let firstTs = '';
    for (let i = 0; i < count; i += 1) {
      const ts = new Date(base + i * 1000).toISOString();
      if (i === 0) firstTs = ts;
      lastTs = ts;
      ring.emit({
        session,
        type: 'prompt_sent',
        data: { seq: i },
        timestamp: ts,
      });
    }
    return { firstTs, lastTs };
  }

  it('P1 no params → default-100 events, oldest-first, next_since = last ts', async () => {
    const ring = createEventRing(200);
    // 120 events, so default 100 should return the OLDEST 100
    // (since we return oldest-first within the buffer; T11 default
    // ordering is oldest-first per X2 MODELED).
    const { firstTs } = seedRing(ring, 120);

    ts = await spawnTestServer({ eventRing: ring });
    const r = await fetch(`${ts.url}/v2/events`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      events: Array<{ timestamp: string; event_id: string; data: unknown }>;
      next_since: string | null;
    };
    expect(body.events).toHaveLength(100);
    // Oldest-first: first event is the first we emitted
    expect(body.events[0].timestamp).toBe(firstTs);
    // next_since is the last timestamp in the returned batch
    expect(body.next_since).toBe(body.events[99].timestamp);
    // Strict monotonic non-decreasing order
    for (let i = 1; i < body.events.length; i += 1) {
      expect(
        body.events[i].timestamp >= body.events[i - 1].timestamp,
      ).toBe(true);
    }
  });

  it('P2 ?since=<ts> → strictly newer events, oldest-first', async () => {
    const ring = createEventRing(50);
    // Emit 5 events spaced 1s apart starting at 10:00:00
    seedRing(ring, 5);
    const tCutoff = '2026-04-23T10:00:02.000Z'; // exclude events at or before this

    ts = await spawnTestServer({ eventRing: ring });
    const r = await fetch(
      `${ts.url}/v2/events?since=${encodeURIComponent(tCutoff)}`,
      { headers: authHeaders(ts.token) },
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      events: Array<{ timestamp: string }>;
      next_since: string | null;
    };
    // Should return the 3 events strictly after 10:00:02
    // (10:00:03, 10:00:04 — wait, 5 events = 10:00:00..10:00:04 inclusive)
    expect(body.events.map((e) => e.timestamp)).toEqual([
      '2026-04-23T10:00:03.000Z',
      '2026-04-23T10:00:04.000Z',
    ]);
    expect(body.next_since).toBe('2026-04-23T10:00:04.000Z');
  });

  it('P3 ?limit=600 → clamped to 500 + X-Dispatch-Limit-Clamped header', async () => {
    const ring = createEventRing(1000);
    seedRing(ring, 800);

    ts = await spawnTestServer({ eventRing: ring });
    const r = await fetch(`${ts.url}/v2/events?limit=600`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    expect(r.headers.get('x-dispatch-limit-clamped')).toBe('true');
    const body = (await r.json()) as { events: unknown[] };
    expect(body.events).toHaveLength(500);
  });

  it('P4 malformed ?since (not ISO-8601) → 422 + {error: ...}', async () => {
    const ring = createEventRing(10);
    seedRing(ring, 1);

    ts = await spawnTestServer({ eventRing: ring });
    const r = await fetch(`${ts.url}/v2/events?since=not-a-date`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error: string };
    expect(body.error).toMatch(/since/i);
  });

  it('P5 empty buffer → {events: [], next_since: null}', async () => {
    const ring = createEventRing(10);

    ts = await spawnTestServer({ eventRing: ring });
    const r = await fetch(`${ts.url}/v2/events`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      events: unknown[];
      next_since: string | null;
    };
    expect(body.events).toEqual([]);
    expect(body.next_since).toBeNull();
  });
});
