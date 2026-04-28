import {
  useEffect,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import type { EventV2Type } from 'dispatch-core/src/v2/schema.js';
import { useUIStore } from '../store/ui.js';
import { useSessions } from '../query/useSessions.js';
import { TickerRow } from './TickerRow.js';

// T17: layout + render. T18: subscription + bounded ring. T19:
// filters (this file). T20: visual polish (TickerRow extracted to
// its own file; 30s tick lives here per Decision 6 — single timer
// at panel level bumps a counter to trigger row re-renders).
// T21 unrelated (banners overlay; separate surface).
//
// TickerFilters stays inline — Decision 9 conditional-forward-note
// discipline: T19 forward note conditioned extraction on adding a
// styled Combobox replacement for native <select>; T20 doesn't
// add Combobox so extraction deferred until a real driver.

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

export function TickerPanel(): ReactNode {
  const events = useUIStore((s) => s.events);
  // Defensive ?? {} handles loading/error from useSessions per
  // Decision 3 graceful-degradation rule. Dropdown gracefully
  // collapses to "All"-only when sessions list isn't reachable.
  const { data } = useSessions();
  const sessionNames = Object.keys(data?.sessions ?? {});

  const [filterSession, setFilterSession] = useState<FilterSession>(null);
  const [filterType, setFilterType] = useState<FilterType>(null);

  // T20 Decision 6: single setInterval(30_000) bumps a counter to
  // force row re-renders so relative timestamps refresh. Counter
  // is unused in render — its only effect is the re-render itself.
  // Cleanup on unmount via returned function (verified per
  // operator pre-reg ack note).
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

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
