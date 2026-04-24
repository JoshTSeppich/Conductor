import type { ReactNode } from 'react';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';

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
        <ul className="flex flex-col gap-1">
          {sessions.map(({ name }) => (
            <li
              key={name}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
