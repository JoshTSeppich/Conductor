import type { ReactNode } from 'react';
import type { EventV2Type } from 'dispatch-core/src/v2/schema.js';
import { useUIStore } from '../store/ui.js';

// T17: layout + render. T18 wires subscription + bounded ring buffer.
// T19 adds filters. T20 polishes visual treatment (per-event-type
// colors, icons, relative timestamps, click-to-focus). T21 unrelated
// (banners overlay, separate surface).
//
// TickerRow is a sibling component for T17 — T20 expected to extract
// to src/components/TickerRow.tsx when adding visual polish, since
// the row is where color tokens + icons + relative timestamps land.

function TickerRow({ event }: { event: EventV2Type }): ReactNode {
  return (
    <div
      data-testid="ticker-row"
      className="text-sm py-1 border-b border-gray-200 dark:border-gray-800 font-mono"
    >
      <span>{event.type}</span>
      {' · '}
      <span>{event.session}</span>
      {' · '}
      <span>{event.timestamp}</span>
    </div>
  );
}

export function TickerPanel(): ReactNode {
  const events = useUIStore((s) => s.events);

  // Render-time sort by timestamp desc. ISO-8601 strings sort
  // lexicographically; correct for §5.2 envelope's
  // timestamp: z.string().datetime(). Decouples display order from
  // T18's storage order — robust to upstream changes.
  const ordered = [...events].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );

  return (
    <section
      role="region"
      aria-label="Activity"
      className="overflow-auto p-3 border-t border-gray-300 dark:border-gray-700 h-40"
    >
      {ordered.map((event, i) => (
        // Insertion-order index is stable enough for T17's needs;
        // T18 may switch to event-id-based key when ring buffer
        // semantics demand stable identity across re-orderings.
        <TickerRow key={i} event={event} />
      ))}
    </section>
  );
}
