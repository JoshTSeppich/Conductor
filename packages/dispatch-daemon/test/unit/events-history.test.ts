/**
 * DAEMON-T17 — In-memory event ring buffer unit tests.
 *
 * T17 is T11's data source (pulled forward from D-5 → D-3 per
 * operator arbitration; see T11 pre-reg ack). Also feeds T12
 * WS broadcast and T06 `recent_events` consumer.
 *
 * Probes (5 total):
 *   P1 emit() auto-fills event_id (UUIDv7 shape) + timestamp
 *      (ISO 8601) when absent; returns the fully-formed record;
 *      query({limit}) returns emitted records
 *   P2 bounded: after capacity+1 emits, size() == capacity;
 *      oldest is evicted (verified by content)
 *   P3 query({since}) — exclusive filter, oldest-first ordering
 *   P4 query({session}) — session name filter (for T06
 *      `recent_events` on GET /v2/sessions/:name)
 *   P5 emit({event_id, timestamp}) — explicit values preserved
 *      (enables T17a to return event_id in its 202 response)
 *
 * API shape (frozen here per T17 pre-reg):
 *   createEventRing(capacity?) → EventRing
 *   EventRing.emit({session, type, data, event_id?, timestamp?})
 *     → EventRecord
 *   EventRing.query({since?, limit?, session?}) → EventRecord[]
 *   EventRing.size() → number
 *   EventRing.capacity() → number
 *
 * Event shape: {event_id, timestamp, session, type, data}
 * per operator arbitration 2 (event shape MODELED default).
 */

import { describe, expect, it } from 'vitest';
import {
  createEventRing,
  type EventRecord,
} from '../../src/events/history.js';

describe('DAEMON-T17 — in-memory event ring buffer', () => {
  it('P1 emit auto-fills event_id (UUIDv7) + timestamp; query returns records', () => {
    const ring = createEventRing(100);
    const rec = ring.emit({
      session: 'sherpa',
      type: 'prompt_sent',
      data: { size_chars: 42 },
    });

    // Returned record has all fields populated
    expect(rec.session).toBe('sherpa');
    expect(rec.type).toBe('prompt_sent');
    expect(rec.data).toEqual({ size_chars: 42 });
    expect(typeof rec.event_id).toBe('string');
    expect(typeof rec.timestamp).toBe('string');

    // UUIDv7 shape: 8-4-4-4-12 hex; version nibble = 7; variant bits = 10xx
    expect(rec.event_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    // Timestamp parses as valid ISO-8601
    expect(Number.isFinite(new Date(rec.timestamp).getTime())).toBe(true);

    // query({limit}) surfaces it
    const out = ring.query({ limit: 10 });
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(rec);
  });

  it('P2 bounded at capacity; oldest evicted once over cap', () => {
    const cap = 3;
    const ring = createEventRing(cap);

    const r0 = ring.emit({ session: 's', type: 't', data: { n: 0 } });
    ring.emit({ session: 's', type: 't', data: { n: 1 } });
    ring.emit({ session: 's', type: 't', data: { n: 2 } });
    ring.emit({ session: 's', type: 't', data: { n: 3 } }); // evicts r0

    expect(ring.size()).toBe(cap);
    expect(ring.capacity()).toBe(cap);

    const all = ring.query({});
    expect(all).toHaveLength(cap);
    // r0 evicted; r1-r3 retained (oldest-first)
    const ns = all.map((r) => (r.data as { n: number }).n);
    expect(ns).toEqual([1, 2, 3]);
    // r0 no longer queryable
    expect(all.find((r) => r.event_id === r0.event_id)).toBeUndefined();
  });

  it('P3 query({since}) is exclusive; returns oldest-first', async () => {
    const ring = createEventRing(100);

    const t1 = '2026-04-23T10:00:00.000Z';
    const t2 = '2026-04-23T10:00:01.000Z';
    const t3 = '2026-04-23T10:00:02.000Z';

    ring.emit({ session: 'a', type: 'e', data: null, timestamp: t1 });
    ring.emit({ session: 'a', type: 'e', data: null, timestamp: t2 });
    ring.emit({ session: 'a', type: 'e', data: null, timestamp: t3 });

    // since=t1 → returns t2 and t3 (exclusive: t1 itself excluded)
    const out = ring.query({ since: t1 });
    expect(out.map((r) => r.timestamp)).toEqual([t2, t3]);

    // since=t3 → empty (nothing strictly newer)
    expect(ring.query({ since: t3 })).toEqual([]);

    // No since → all events, oldest-first
    const all = ring.query({});
    expect(all.map((r) => r.timestamp)).toEqual([t1, t2, t3]);
  });

  it('P4 query({session}) filters by session name', () => {
    const ring = createEventRing(100);

    ring.emit({ session: 'sherpa', type: 'prompt_sent', data: null });
    ring.emit({ session: 'loopmaster', type: 'handoff_written', data: null });
    ring.emit({ session: 'sherpa', type: 'state_changed', data: null });

    const sherpaOnly = ring.query({ session: 'sherpa' });
    expect(sherpaOnly).toHaveLength(2);
    expect(sherpaOnly.map((r) => r.type)).toEqual([
      'prompt_sent',
      'state_changed',
    ]);

    const lm = ring.query({ session: 'loopmaster' });
    expect(lm).toHaveLength(1);
    expect(lm[0].type).toBe('handoff_written');

    // Unknown session → empty
    expect(ring.query({ session: 'nope' })).toEqual([]);
  });

  it('P5 explicit event_id + timestamp preserved by emit()', () => {
    const ring = createEventRing(10);
    const pinned: Pick<EventRecord, 'event_id' | 'timestamp'> = {
      event_id: '01234567-89ab-7cde-8f01-234567890abc',
      timestamp: '2026-04-23T18:00:00.000Z',
    };

    const rec = ring.emit({
      session: 'sherpa',
      type: 'cairn_violation_detected',
      data: { violation_type: 'drift' },
      event_id: pinned.event_id,
      timestamp: pinned.timestamp,
    });

    expect(rec.event_id).toBe(pinned.event_id);
    expect(rec.timestamp).toBe(pinned.timestamp);

    // And queryable by those values
    const out = ring.query({ since: '2026-04-23T17:59:59.999Z' });
    expect(out).toHaveLength(1);
    expect(out[0].event_id).toBe(pinned.event_id);
  });
});
