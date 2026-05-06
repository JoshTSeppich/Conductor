import type { ReactNode } from 'react';

// Phase 2 Step 4 (parallel-batch-2 / sess-1/dispatch-web-ui).
// Wireframe variant C header primitive: rounded badge "api · $X today".
// Pure presentational; mock-data orchestration in Layout (Step 5).

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
      aria-label={`API cost today: ${formatted}`}
      className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
    >
      api · {formatted} today
    </span>
  );
}
