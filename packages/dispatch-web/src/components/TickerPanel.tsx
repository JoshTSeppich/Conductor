import type { ReactNode } from 'react';

// WEB-T06 placeholder, T07 refactored to Tailwind. Real ticker
// (subscription, ring buffer, filters, polish) lands in W-5
// (T17 + T18 + T19 + T20).
export function TickerPanel(): ReactNode {
  return (
    <section
      role="region"
      aria-label="Activity"
      className="overflow-auto p-3 border-t border-gray-300 dark:border-gray-700 h-40"
    >
      Activity
    </section>
  );
}
