import { describe, it, expect } from 'vitest';
import {
  dedupeKey,
  stableStringify,
} from '../src/daemon-client/dedupe.js';
import type { EventShape } from '../src/daemon-client/event-shape.js';

describe('WEB-T03 dedupe', () => {
  it('dedupeKey is stable across object-key order and varies with payload', () => {
    const a: EventShape = {
      type: 'handoff_written',
      timestamp: '2026-04-23T12:00:00.000Z',
      session: 'sherpa',
      data: { path: '/x/HANDOFF.md', size_bytes: 10 },
    };
    const b: EventShape = {
      type: 'handoff_written',
      timestamp: '2026-04-23T12:00:00.000Z',
      session: 'sherpa',
      // same content, different key insertion order
      data: { size_bytes: 10, path: '/x/HANDOFF.md' },
    };
    const c: EventShape = {
      type: 'handoff_written',
      timestamp: '2026-04-23T12:00:00.000Z',
      session: 'sherpa',
      data: { path: '/x/HANDOFF.md', size_bytes: 20 }, // different size
    };

    expect(dedupeKey(a)).toBe(dedupeKey(b));
    expect(dedupeKey(a)).not.toBe(dedupeKey(c));

    // stableStringify sanity on nested structures
    expect(stableStringify({ a: 1, b: { x: 2, y: 3 } })).toBe(
      stableStringify({ b: { y: 3, x: 2 }, a: 1 }),
    );
  });
});
