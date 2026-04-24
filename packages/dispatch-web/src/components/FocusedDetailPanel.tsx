import type { ReactNode } from 'react';

// WEB-T06 placeholder. Real focused-detail (state badges, last
// commit, status_json, send/pull/state controls) lands in W-4
// (T12 + T13 + T14 + T15 + T16).
export function FocusedDetailPanel(): ReactNode {
  return (
    <section
      role="region"
      aria-label="Session detail"
      style={{ padding: 12, overflow: 'auto' }}
    >
      Session detail
    </section>
  );
}
