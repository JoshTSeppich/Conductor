/**
 * Per-connection event queue. One queue per live WS subscriber;
 * push() is called by the bus on every emit; the WS handler
 * drains via async iteration and calls socket.send().
 *
 * Pattern characterized by DAEMON-S01 spike + DAEMON-F03
 * (per-connection serialized queue → in-order delivery
 * regardless of concurrent emit). Decoupling rationale:
 * a slow consumer doesn't block the bus or block other
 * subscribers.
 *
 * Backpressure (per arbitration 2a Option C on T12 pre-reg):
 * the queue exposes shouldDisconnect(bufferedAmount) as a
 * pure check; the WS handler reads socket.bufferedAmount on
 * each iteration tick and force-closes (1009 Message Too Big)
 * when the threshold is exceeded. Client recovers via
 * reconnect + GET /v2/events?since=<last>.
 *
 * Iterator semantics: iteration completes cleanly after
 * close() once the buffer is drained (drain-then-end).
 * Push after close is a no-op.
 */

import type { EventRecord } from './history.js';

export interface EventQueueOpts {
  thresholdBytes?: number;
}

export interface EventQueue extends AsyncIterable<EventRecord> {
  push(rec: EventRecord): void;
  close(): void;
  shouldDisconnect(bufferedAmount: number): boolean;
}

const DEFAULT_THRESHOLD = 1_000_000;

export function createEventQueue(opts: EventQueueOpts = {}): EventQueue {
  const threshold = opts.thresholdBytes ?? DEFAULT_THRESHOLD;
  const buffer: EventRecord[] = [];
  const waiters: Array<(result: IteratorResult<EventRecord>) => void> = [];
  let closed = false;

  function push(rec: EventRecord): void {
    if (closed) return;
    const w = waiters.shift();
    if (w) {
      w({ value: rec, done: false });
    } else {
      buffer.push(rec);
    }
  }

  function close(): void {
    if (closed) return;
    closed = true;
    while (waiters.length > 0) {
      const w = waiters.shift()!;
      w({ value: undefined as unknown as EventRecord, done: true });
    }
  }

  async function* iter(): AsyncGenerator<EventRecord> {
    while (true) {
      if (buffer.length > 0) {
        yield buffer.shift()!;
        continue;
      }
      if (closed) return;
      const result = await new Promise<IteratorResult<EventRecord>>(
        (resolve) => {
          waiters.push(resolve);
        },
      );
      if (result.done) return;
      yield result.value;
    }
  }

  return {
    push,
    close,
    shouldDisconnect: (bufferedAmount: number) => bufferedAmount > threshold,
    [Symbol.asyncIterator]: iter,
  };
}
