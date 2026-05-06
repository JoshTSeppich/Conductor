import type { ReactNode } from 'react';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';
import { useSessions } from '../query/useSessions.js';
import { useUIStore } from '../store/ui.js';
import type { SessionListFilter } from '../store/ui.js';
import { FilterChips } from './FilterChips.js';
import { SessionCard } from './SessionCard.js';

// Phase 2 Step 7 (parallel-batch-2 / sess-1/dispatch-web-ui).
// Wireframe variant C session list with M2 grouping (operator-
// arbitrated taxonomy per /tmp/sess-1-dispatch-web-ui-diagnose.md §7.1):
//   Active = computed_status in (running, awaiting_review)
//   Done   = state === 'killed'
//   Idle   = computed_status in (idle, stale)
// Coexists with KanbanPanel.tsx — path (b). Step 8 swaps Layout's
// mount from KanbanPanel to SessionListPanel; KanbanPanel.tsx
// remains importable + tested via test/kanban.test.tsx direct render.

type Group = 'active' | 'done' | 'idle';
type Entry = { name: string; session: SessionResponseV2Type };

function bucketize(session: SessionResponseV2Type): Group {
  // state === 'killed' takes precedence over computed_status. Killed
  // sessions can have any computed_status (deriveState still runs);
  // M2 says they belong in Done regardless.
  if (session.state === 'killed') return 'done';
  if (
    session.computed_status === 'running' ||
    session.computed_status === 'awaiting_review'
  ) {
    return 'active';
  }
  return 'idle';
}

function passesFilter(
  session: SessionResponseV2Type,
  filter: SessionListFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'running') return session.computed_status === 'running';
  if (filter === 'trouble') return session.computed_status === 'stale';
  return true;
}

const GROUP_LABELS: Record<Group, string> = {
  active: 'Active',
  done: 'Done',
  idle: 'Idle',
};

const GROUPS: ReadonlyArray<Group> = ['active', 'done', 'idle'];

export interface SessionListPanelProps {
  /** Optional slot for cross-session mounts (e.g. MB-T07
   *  OrchestratorCardsLane). Renders at the top of the scrollable
   *  body, above the session groups. Single ReactNode by design —
   *  consumer owns the rendering decision. */
  extras?: ReactNode;
}

export function SessionListPanel({
  extras,
}: SessionListPanelProps = {}): ReactNode {
  const { data } = useSessions();
  const filter = useUIStore((s) => s.sessionListFilter);
  const setFocus = useUIStore((s) => s.setFocus);

  const entries: Entry[] = data
    ? Object.entries(data.sessions).map(([name, session]) => ({
        name,
        session,
      }))
    : [];

  const filtered = entries.filter((e) => passesFilter(e.session, filter));
  const grouped: Record<Group, Entry[]> = { active: [], done: [], idle: [] };
  for (const e of filtered) {
    grouped[bucketize(e.session)].push(e);
  }

  return (
    <section
      role="region"
      aria-label="Sessions"
      className="flex flex-col overflow-hidden"
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-300 dark:border-gray-700">
        <h2 className="text-base font-bold">Sessions</h2>
        <FilterChips />
      </header>
      <div className="flex-1 overflow-auto p-3 flex flex-col gap-4">
        {extras}
        {GROUPS.map((g) => (
          <div key={g} data-testid={`session-group-${g}`}>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-700 dark:text-gray-300">
              {GROUP_LABELS[g]} · {grouped[g].length}
            </h3>
            {grouped[g].length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No {GROUP_LABELS[g].toLowerCase()} sessions
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {grouped[g].map(({ name, session }) => (
                  <SessionCard
                    key={name}
                    name={name}
                    session={session}
                    onClick={() => setFocus(name)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
