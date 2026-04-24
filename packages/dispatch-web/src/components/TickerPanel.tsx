import type { ReactNode } from 'react';

// WEB-T06 placeholder. Real ticker (subscription, ring buffer,
// filters, polish) lands in W-5 (T17 + T18 + T19 + T20).
export function TickerPanel(): ReactNode {
  return (
    <section
      role="region"
      aria-label="Activity"
      style={{
        padding: 12,
        overflow: 'auto',
        borderTop: '1px solid #ddd',
        height: 160,
      }}
    >
      Activity
    </section>
  );
}
