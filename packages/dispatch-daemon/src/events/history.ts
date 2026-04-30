/**
 * In-memory event ring buffer. Pulled forward from D-5 → D-3 as
 * T11's sole data source per operator arbitration 1 on T11
 * pre-reg.
 *
 * Ring buffer is bounded (default 10000 events total across all
 * sessions per contract §4.5 MODELED default). Push is O(1);
 * oldest events are evicted silently once capacity is exceeded
 * (events older than the cap are not retrievable — documented
 * behavior per X2 T17 acceptance).
 *
 * Consumers:
 *   T11: GET /v2/events paginated history (this is the sole source)
 *   T12: WS /v2/events/stream real-time broadcast (future; shares emit())
 *   T06: GET /v2/sessions/:name recent_events (filter by session)
 *   T17a: POST /v2/sessions/:name/violations (needs event_id in response)
 *
 * UUIDv7 choice (MODELED per operator arbitration 2):
 * v7 is time-sortable — same-millisecond events get a stable
 * secondary sort key via the random tail, and chronological
 * log debugging is easier than v4. Hand-rolled using Node's
 * built-in crypto.randomBytes to avoid adding a new npm dep
 * (lockfile cross-contamination risk per C2 Finding).
 */

import { randomBytes } from 'node:crypto';

export interface EventRecord {
  event_id: string;
  timestamp: string;
  session: string;
  type: string;
  data: unknown;
}

export interface EmitInput {
  session: string;
  type: string;
  data: unknown;
  /** Optional pre-assigned id — T17a needs this so the endpoint
   *  can return the event_id in its 202 response body. */
  event_id?: string;
  /** Optional explicit timestamp — tests use this for
   *  deterministic ordering; production callers let emit()
   *  fill it with Date.now(). */
  timestamp?: string;
}

export interface QueryOpts {
  /** ISO 8601. Exclusive: returned events satisfy timestamp > since. */
  since?: string;
  /** Max events to return. Default: return everything buffered.
   *  T11's 100-default is applied at the HTTP layer, not here. */
  limit?: number;
  /** Filter by session name. */
  session?: string;
}

export interface EventRing {
  emit(input: EmitInput): EventRecord;
  query(opts?: QueryOpts): EventRecord[];
  size(): number;
  capacity(): number;
}

const DEFAULT_CAPACITY = 10_000;

export function createEventRing(capacity: number = DEFAULT_CAPACITY): EventRing {
  if (capacity <= 0 || !Number.isInteger(capacity)) {
    throw new Error(`event ring capacity must be a positive integer, got ${capacity}`);
  }

  const buf: (EventRecord | undefined)[] = new Array(capacity);
  let head = 0; // next write index
  let count = 0; // number of live records (<= capacity)

  function emit(input: EmitInput): EventRecord {
    const rec: EventRecord = {
      event_id: input.event_id ?? uuidv7(),
      timestamp: input.timestamp ?? new Date().toISOString(),
      session: input.session,
      type: input.type,
      data: input.data,
    };
    buf[head] = rec;
    head = (head + 1) % capacity;
    if (count < capacity) count += 1;
    return rec;
  }

  function* liveRecords(): Generator<EventRecord> {
    // Iterate oldest-first. Oldest index when at capacity is `head`;
    // when not-yet-wrapped it's index 0.
    const start = count < capacity ? 0 : head;
    for (let i = 0; i < count; i += 1) {
      const rec = buf[(start + i) % capacity];
      if (rec) yield rec;
    }
  }

  function query(opts: QueryOpts = {}): EventRecord[] {
    const out: EventRecord[] = [];
    for (const rec of liveRecords()) {
      if (opts.session && rec.session !== opts.session) continue;
      if (opts.since && rec.timestamp <= opts.since) continue;
      out.push(rec);
      if (opts.limit !== undefined && out.length >= opts.limit) break;
    }
    return out;
  }

  return {
    emit,
    query,
    size: () => count,
    capacity: () => capacity,
  };
}

/**
 * Hand-rolled UUIDv7 per RFC 9562 §5.7.
 *
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                           unix_ts_ms                          |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |          unix_ts_ms           |  ver  |       rand_a          |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |var|                        rand_b                             |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                            rand_b                             |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 */
export function uuidv7(): string {
  const bytes = randomBytes(16);
  const now = BigInt(Date.now());
  bytes[0] = Number((now >> 40n) & 0xffn);
  bytes[1] = Number((now >> 32n) & 0xffn);
  bytes[2] = Number((now >> 24n) & 0xffn);
  bytes[3] = Number((now >> 16n) & 0xffn);
  bytes[4] = Number((now >> 8n) & 0xffn);
  bytes[5] = Number(now & 0xffn);
  // Version 7 in high nibble of byte 6
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // Variant 10xx in top 2 bits of byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-' +
    hex.slice(12, 16) +
    '-' +
    hex.slice(16, 20) +
    '-' +
    hex.slice(20, 32)
  );
}
