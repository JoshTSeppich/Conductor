import type { ReactNode } from 'react';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';
import { SessionCard } from './SessionCard.js';
import { useUIStore } from '../store/ui.js';

export type KanbanColumnStatus =
  | 'awaiting_review'
  | 'stale'
  | 'running'
  | 'idle'
  | 'archived';

export interface KanbanColumnProps {
  status: KanbanColumnStatus;
  label: string;
  sessions: Array<{ name: string; session: SessionResponseV2Type }>;
}

// Single column. Empty state per WEB-T09 acceptance shows
// "No <label-lowercased> sessions". Real session card rendering
// (state badge, computed_status color accent, last action age,
// tmux target dim) lands in WEB-T10; T09 places plain name strings.
export function KanbanColumn({
  status,
  label,
  sessions,
}: KanbanColumnProps): ReactNode {
  // T11 wires real onClick: click → setFocus(name) → updates Zustand
  // focusedSessionName + writes window.location.hash via T05's
  // history.replaceState. Inbound hashchange→store sync handled by
  // useFocusFromHash mounted at App level.
  const setFocus = useUIStore((s) => s.setFocus);
  return (
    <div
      data-testid={`kanban-column-${status}`}
      className="flex flex-col p-3 border-r border-gray-300 dark:border-gray-700 last:border-r-0 min-w-0 overflow-auto"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-700 dark:text-gray-300">
        {label}
      </h3>
      {sessions.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No {label.toLowerCase()} sessions
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map(({ name, session }) => (
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
  );
}
