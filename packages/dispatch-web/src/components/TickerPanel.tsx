import { useState, type ChangeEvent, type ReactNode } from 'react';
import type { EventV2Type } from 'dispatch-core/src/v2/schema.js';
import { useUIStore } from '../store/ui.js';
import { useSessions } from '../query/useSessions.js';

// T17: layout + render. T18: subscription + bounded ring. T19:
// filters (this file). T20: visual polish (per-event-type colors,
// icons, relative timestamps, click-to-focus). T21 unrelated
// (banners overlay; separate surface).
//
// TickerRow + TickerFilters are sibling components for now — T20
// expected to extract TickerRow to src/components/TickerRow.tsx
// and may also extract TickerFilters to its own file when adding
// a styled Combobox replacement for the native <select> elements.

// Per CONDUCTOR_API_CONTRACT.md §5.3 "Event types (frozen at v2
// ship)". Hardcoded list mirrors the schema's discriminated union.
// `as const` tuple typed against EventV2Type['type'] gives compile-
// time exhaustive check vs the schema — if the schema gains a new
// type without updating this list, TS errors at the type assertion
// below. Schema is operator-frozen so the duplication is safe.
const EVENT_TYPES = [
  'handoff_written',
  'commit_landed',
  'state_changed',
  'prompt_sent',
  'test_status_updated',
  'cairn_violation_detected',
  'gate_trip',
] as const satisfies readonly EventV2Type['type'][];

type FilterSession = string | null;
type FilterType = EventV2Type['type'] | null;

interface TickerFiltersProps {
  sessionNames: string[];
  filterSession: FilterSession;
  filterType: FilterType;
  onSessionChange: (s: FilterSession) => void;
  onTypeChange: (t: FilterType) => void;
  onClear: () => void;
}

function TickerFilters({
  sessionNames,
  filterSession,
  filterType,
  onSessionChange,
  onTypeChange,
  onClear,
}: TickerFiltersProps): ReactNode {
  const noneActive = filterSession === null && filterType === null;

  function handleSessionChange(e: ChangeEvent<HTMLSelectElement>): void {
    const v = e.target.value;
    onSessionChange(v === '' ? null : v);
  }

  function handleTypeChange(e: ChangeEvent<HTMLSelectElement>): void {
    const v = e.target.value;
    onTypeChange(v === '' ? null : (v as EventV2Type['type']));
  }

  return (
    <div className="flex gap-2 mb-2 text-xs">
      <select
        aria-label="Filter by session"
        value={filterSession ?? ''}
        onChange={handleSessionChange}
        className="border rounded px-1 py-0.5 bg-white dark:bg-gray-900"
      >
        <option value="">All</option>
        {sessionNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by event type"
        value={filterType ?? ''}
        onChange={handleTypeChange}
        className="border rounded px-1 py-0.5 bg-white dark:bg-gray-900"
      >
        <option value="">All</option>
        {EVENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onClear}
        disabled={noneActive}
        className="px-2 py-0.5 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Clear filter"
      >
        Clear filter
      </button>
    </div>
  );
}

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
  // Defensive ?? {} handles loading/error from useSessions per
  // Decision 3 graceful-degradation rule. Dropdown gracefully
  // collapses to "All"-only when sessions list isn't reachable.
  const { data } = useSessions();
  const sessionNames = Object.keys(data?.sessions ?? {});

  const [filterSession, setFilterSession] = useState<FilterSession>(null);
  const [filterType, setFilterType] = useState<FilterType>(null);

  // Filter THEN sort per Decision 8: smaller array to sort = perf-
  // positive default at minimal complexity. AND-composition per
  // Decision 4: null/"All" on either dimension = no constraint.
  const filtered = events.filter((e) => {
    if (filterSession !== null && e.session !== filterSession) return false;
    if (filterType !== null && e.type !== filterType) return false;
    return true;
  });
  const ordered = [...filtered].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );

  function handleClear(): void {
    setFilterSession(null);
    setFilterType(null);
  }

  return (
    <section
      role="region"
      aria-label="Activity"
      className="overflow-auto p-3 border-t border-gray-300 dark:border-gray-700 h-40"
    >
      <TickerFilters
        sessionNames={sessionNames}
        filterSession={filterSession}
        filterType={filterType}
        onSessionChange={setFilterSession}
        onTypeChange={setFilterType}
        onClear={handleClear}
      />
      {ordered.map((event, i) => (
        // Insertion-order index is stable enough for T19's needs;
        // T18+ may switch to event-id-based key when ring buffer
        // semantics demand stable identity across re-orderings.
        <TickerRow key={i} event={event} />
      ))}
    </section>
  );
}
