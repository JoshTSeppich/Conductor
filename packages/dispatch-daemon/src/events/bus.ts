/**
 * Event bus: write-through to the T17 ring buffer + fan-out to
 * all subscribed per-connection queues (T12 WS subscribers).
 *
 * Single emit() call:
 *   1. ring.emit(input) — appends to ring (auto-fills event_id +
 *      timestamp via T17 if absent), returns the fully-formed
 *      EventRecord
 *   2. push(rec) to every subscribed queue
 *   3. returns the EventRecord (callers like T17a need event_id
 *      in their HTTP response)
 *
 * subscribe() yields a queue + unsubscribe handle. The WS handler
 * calls subscribe() on socket open and unsubscribe() on socket
 * close. unsubscribe() removes the queue from the fan-out set
 * AND closes the queue (its async iterator drains-then-ends).
 *
 * Bus is a thin wrapper; this file is intentionally small. Bus
 * exists as a seam so production routes don't import emit-queue
 * (queue lifecycle belongs to ws.ts).
 */

import { createEventQueue, type EventQueue } from './emit-queue.js';
import type { EmitInput, EventRecord, EventRing } from './history.js';

export type EmitFn = (input: EmitInput) => EventRecord;

export interface Subscription {
  queue: EventQueue;
  unsubscribe: () => void;
}

export interface EventBus {
  emit: EmitFn;
  subscribe(): Subscription;
}

export function createEventBus(ring: EventRing): EventBus {
  const queues = new Set<EventQueue>();

  const emit: EmitFn = (input) => {
    const rec = ring.emit(input);
    for (const q of queues) {
      q.push(rec);
    }
    return rec;
  };

  function subscribe(): Subscription {
    const queue = createEventQueue();
    queues.add(queue);
    return {
      queue,
      unsubscribe: () => {
        queues.delete(queue);
        queue.close();
      },
    };
  }

  return { emit, subscribe };
}
