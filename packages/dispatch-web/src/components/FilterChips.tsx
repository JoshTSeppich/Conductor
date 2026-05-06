import type { ReactNode } from 'react';
import { useUIStore } from '../store/ui.js';
import type { SessionListFilter } from '../store/ui.js';

// Phase 2 Step 2 (parallel-batch-2 / sess-1/dispatch-web-ui).
// Wireframe variant C "All / Running / Trouble" filter chips above
// the session list. Toggle-button semantics (aria-pressed), not
// radio-group, because the visual language is rounded pills with
// background-state distinction, not a traditional radio.
//
// Filter resolution lives in SessionList (Step 7), not here. This
// component is purely presentational + dispatches via the store.

const CHIPS: ReadonlyArray<{ value: SessionListFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'trouble', label: 'Trouble' },
];

export function FilterChips(): ReactNode {
  const filter = useUIStore((s) => s.sessionListFilter);
  const setFilter = useUIStore((s) => s.setSessionListFilter);

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Filter sessions">
      {CHIPS.map((c) => {
        const pressed = filter === c.value;
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => setFilter(c.value)}
            className={
              pressed
                ? 'px-2.5 py-1 text-xs rounded-full bg-blue-600 text-white border border-blue-600'
                : 'px-2.5 py-1 text-xs rounded-full bg-transparent text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
            }
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
