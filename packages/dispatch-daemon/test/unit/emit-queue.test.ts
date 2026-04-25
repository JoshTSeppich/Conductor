/**
 * DAEMON-T12 — per-connection event queue unit tests.
 *
 * Covers the queue primitives that the WS handler uses:
 *   - FIFO in-order async iteration under concurrent push
 *   - Drain-after-close semantics (iterator finishes cleanly
 *     when buffer empties after close())
 *   - Backpressure check (shouldDisconnect given a
 *     bufferedAmount value)
 *
 * Separated from integration coverage per arbitration 2b
 * (backpressure test layer = unit only; integration with
 * slow-client simulation deferred as DAEMON-F-backpressure-
 * integration followup).
 *
 * Probes (2 total — P7 + P8 per pre-reg):
 *   P7 Concurrent pushes (10 sync push() calls before first
 *      read) → async iteration yields all 10 in FIFO order
 *      with no duplication
 *   P8 Backpressure: shouldDisconnect(bufferedAmount) returns
 *      true iff bufferedAmount > threshold (default 1_000_000)
 */

import { describe, expect, it } from 'vitest';
import {
  createEventQueue,
  type EventQueue,
} from '../../src/events/emit-queue.js';
import type { EventRecord } from '../../src/events/history.js';

function mkRec(n: number): EventRecord {
  return {
    event_id: `id-${n}`,
    timestamp: new Date(Date.UTC(2026, 3, 23, 10, 0, n)).toISOString(),
    session: 'sherpa',
    type: 'prompt_sent',
    data: { n },
  };
}

async function drain(queue: EventQueue): Promise<EventRecord[]> {
  const out: EventRecord[] = [];
  for await (const rec of queue) out.push(rec);
  return out;
}

describe('DAEMON-T12 — per-connection event queue', () => {
  it('P7 concurrent pushes → FIFO async iteration, no duplication', async () => {
    const queue = createEventQueue();

    // Synchronously push 10 events BEFORE starting to read.
    const pushed: EventRecord[] = [];
    for (let i = 0; i < 10; i += 1) {
      const rec = mkRec(i);
      pushed.push(rec);
      queue.push(rec);
    }
    queue.close();

    const received = await drain(queue);
    expect(received).toHaveLength(10);
    expect(received).toEqual(pushed);
    // Explicit FIFO: received[i].data.n == i
    received.forEach((r, i) => {
      expect((r.data as { n: number }).n).toBe(i);
    });
  });

  it('P8 shouldDisconnect: true iff bufferedAmount > threshold', () => {
    const custom = createEventQueue({ thresholdBytes: 1000 });
    expect(custom.shouldDisconnect(0)).toBe(false);
    expect(custom.shouldDisconnect(999)).toBe(false);
    expect(custom.shouldDisconnect(1000)).toBe(false); // strict >
    expect(custom.shouldDisconnect(1001)).toBe(true);

    // Default threshold is 1_000_000 (contract §5 MODELED default)
    const def = createEventQueue();
    expect(def.shouldDisconnect(500_000)).toBe(false);
    expect(def.shouldDisconnect(1_000_000)).toBe(false);
    expect(def.shouldDisconnect(1_000_001)).toBe(true);
  });
});
