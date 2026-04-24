import type { ReactNode } from 'react';

// WEB-T06 placeholder. Real kanban (4 columns + cards + sort) lands
// in W-3 (T09 + T10 + T11).
export function KanbanPanel(): ReactNode {
  return (
    <section
      role="region"
      aria-label="Sessions"
      style={{ padding: 12, overflow: 'auto', borderRight: '1px solid #ddd' }}
    >
      Sessions
    </section>
  );
}
