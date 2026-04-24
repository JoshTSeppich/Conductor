import { useEffect, type ReactNode } from 'react';
import type {
  ComputedStatus,
  SessionResponseV2Type,
} from 'dispatch-core/src/v2/schema.js';
import { useSessions } from '../query/useSessions.js';
import { useUIStore } from '../store/ui.js';
import { KanbanColumn } from './KanbanColumn.js';

const STORAGE_KEY = 'show-archived';

// v1 sort order preserved per status.tsx:21-26 SORT_PRIORITY map:
// awaiting_review (0) > stale (1) > running (2) > idle (3).
// Daemon controls within-column order; UI renders in response order.
const COLUMNS: Array<{ status: ComputedStatus; label: string }> = [
  { status: 'awaiting_review', label: 'Awaiting review' },
  { status: 'stale', label: 'Stale' },
  { status: 'running', label: 'Running' },
  { status: 'idle', label: 'Idle' },
];

type Entry = { name: string; session: SessionResponseV2Type };

export function KanbanPanel(): ReactNode {
  const { data } = useSessions();
  const showArchived = useUIStore((s) => s.showArchived);
  const toggleArchive = useUIStore((s) => s.toggleArchive);

  // Mount-time: restore showArchived from localStorage if previously set.
  // Inline persistence per gate-3 amendment Decision 3 (T05's Zustand
  // store stays minimal; lift to persist middleware later if other
  // UI prefs accumulate).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true' && !useUIStore.getState().showArchived) {
      toggleArchive();
    }
  }, [toggleArchive]);

  function handleToggle(): void {
    toggleArchive();
    // Zustand setState is sync; getState() reflects post-toggle value.
    localStorage.setItem(
      STORAGE_KEY,
      String(useUIStore.getState().showArchived),
    );
  }

  const entries: Entry[] = data
    ? Object.entries(data.sessions).map(([name, session]) => ({ name, session }))
    : [];

  // GAP-1: filter killed from main columns; archived column collects them.
  const main = entries.filter((e) => e.session.state !== 'killed');
  const archived = showArchived
    ? entries.filter((e) => e.session.state === 'killed')
    : [];

  // GAP-3: group main entries by computed_status (orthogonal to state).
  const grouped: Record<ComputedStatus, Entry[]> = {
    awaiting_review: [],
    stale: [],
    running: [],
    idle: [],
  };
  for (const e of main) {
    grouped[e.session.computed_status].push(e);
  }

  return (
    <section
      role="region"
      aria-label="Sessions"
      className="flex flex-col overflow-hidden"
    >
      <header className="flex items-center justify-between px-3 py-2 border-b border-gray-300 dark:border-gray-700">
        <h2 className="text-base font-bold">Sessions</h2>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={handleToggle}
          />
          Show archived
        </label>
      </header>
      <div
        className={`grid flex-1 overflow-auto ${
          showArchived ? 'grid-cols-5' : 'grid-cols-4'
        }`}
      >
        {COLUMNS.map((c) => (
          <KanbanColumn
            key={c.status}
            status={c.status}
            label={c.label}
            sessions={grouped[c.status]}
          />
        ))}
        {showArchived && (
          <KanbanColumn
            status="archived"
            label="Archived"
            sessions={archived}
          />
        )}
      </div>
    </section>
  );
}
