import type { ReactNode } from 'react';

// Phase 2 Step 4 (parallel-batch-2 / sess-1/dispatch-web-ui).
// Wireframe variant C header primitive: rounded badge "api · $X today".
// Pure presentational; mock-data is sourced from Layout, with
// data-mock="true" on this root as the per-field marker
// (sess-b finding #140 §Followups #2, closed by sess-e batch-5).

export interface CostPillProps {
  usdToday: number;
}

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function CostPill({ usdToday }: CostPillProps): ReactNode {
  const formatted = USD_FORMATTER.format(usdToday);
  return (
    <span
      data-mock="true"
      data-testid="header-cost-pill"
      aria-label={`API cost today: ${formatted}`}
      className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
    >
      api · {formatted} today
    </span>
  );
}
