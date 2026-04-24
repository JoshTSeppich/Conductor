import type { ReactNode } from 'react';

// WEB-T06 placeholder, T07 refactored to Tailwind. Real kanban
// (4 columns + cards + sort) lands in W-3 (T09 + T10 + T11).
export function KanbanPanel(): ReactNode {
  return (
    <section
      role="region"
      aria-label="Sessions"
      className="overflow-auto p-3 lg:border-r border-gray-300 dark:border-gray-700"
    >
      Sessions
    </section>
  );
}
