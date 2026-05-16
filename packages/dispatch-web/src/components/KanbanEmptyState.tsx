import type { ReactNode } from 'react';

export function KanbanEmptyState(): ReactNode {
  return (
    <div
      data-testid="kanban-empty-state"
      className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-gray-500 dark:text-gray-400"
    >
      <p className="text-base font-medium">No active sessions</p>
      <p className="text-sm">Click + Spawn Session to start.</p>
    </div>
  );
}
