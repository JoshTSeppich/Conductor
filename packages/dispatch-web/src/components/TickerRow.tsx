import type { ReactNode } from 'react';
import type { EventV2Type } from 'dispatch-core/src/v2/schema.js';
import { useUIStore } from '../store/ui.js';
import { formatRelativeTime } from '../utils/format-relative.js';

// T20 visual polish. Extracted from TickerPanel.tsx per Decision 1
// (forward note from T17/T19). Three concerns:
//   - color affordance (left border, T07 token reuse)
//   - glyph icon (single character; not emoji per project guideline
//     "avoid emoji unless asked")
//   - relative timestamp ("Xm ago"; raw ISO preserved as
//     <time title=…>)
//
// Color mapping per Decision 3 — 2 KNOWN from spec verbatim, 5
// MODELED. UI-F-color-audit followup territory for post-MVP
// palette refinement (operator pre-reg ack).
//
// gate_trip + cairn_violation_detected both map to status-stale
// (red) — same semantic family, loses inter-type distinction within
// red. Operator may differentiate via UI-F-color-audit (e.g.
// gate_trip → warning-orange) post-MVP. Deliberate same-family
// choice for T20 MVP.
const COLOR_CLASS: Record<EventV2Type['type'], string> = {
  handoff_written: 'border-l-status-running', // MODELED — activity signal
  commit_landed: 'border-l-status-idle', // KNOWN — spec verbatim "neutral"
  state_changed: 'border-l-accent', // MODELED — spec hint ambiguous
  prompt_sent: 'border-l-status-running', // MODELED — operator activity
  test_status_updated: 'border-l-status-awaiting-review', // MODELED
  cairn_violation_detected: 'border-l-status-stale', // KNOWN — spec "→ red"
  gate_trip: 'border-l-status-stale', // MODELED — same family as violation
};

// Per Decision 4: character glyphs, not emoji. Operator confirmed
// happy-dom + RTL handle Unicode (↻ U+21BB, ⏸ U+23F8) cleanly.
const ICON_GLYPH: Record<EventV2Type['type'], string> = {
  handoff_written: 'H',
  commit_landed: '✓',
  state_changed: '↻',
  prompt_sent: '→',
  test_status_updated: 'T',
  cairn_violation_detected: '!',
  gate_trip: '⏸',
};

export interface TickerRowProps {
  event: EventV2Type;
}

export function TickerRow({ event }: TickerRowProps): ReactNode {
  const setFocus = useUIStore((s) => s.setFocus);
  const ageMs = Date.now() - Date.parse(event.timestamp);
  const colorClass = COLOR_CLASS[event.type];
  const icon = ICON_GLYPH[event.type];

  return (
    <div
      data-testid="ticker-row"
      className={`text-sm py-1 pl-2 border-b border-l-4 border-gray-200 dark:border-gray-800 font-mono ${colorClass}`}
    >
      <span aria-hidden="true">{icon}</span>
      {' '}
      <span>{event.type}</span>
      {' · '}
      <button
        type="button"
        onClick={() => setFocus(event.session)}
        className="underline text-blue-600 dark:text-blue-400 hover:no-underline"
      >
        {event.session}
      </button>
      {' · '}
      <time dateTime={event.timestamp} title={event.timestamp}>
        {formatRelativeTime(ageMs)}
      </time>
    </div>
  );
}
