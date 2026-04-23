import type { EventShape } from './event-shape.js';

// Ported from UI-S01 spike. Key is insertion-order-independent for
// event.data so that JSON serialization quirks (object-key order)
// don't produce false-new events under worst-case replay.
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) {
    return '[' + v.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return (
    '{' +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ':' +
          stableStringify((v as Record<string, unknown>)[k]),
      )
      .join(',') +
    '}'
  );
}

export function dedupeKey(e: EventShape): string {
  return `${e.timestamp}|${e.session}|${e.type}|${stableStringify(e.data)}`;
}
