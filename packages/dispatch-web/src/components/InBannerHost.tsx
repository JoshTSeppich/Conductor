import type { ReactNode } from 'react';
import { useUIStore } from '../store/ui.js';

// WEB-T06 slot reservation. Real banner rendering (toast/sticky
// rules per DAEMON-S03 coordination, auto-dismiss timing) lands
// in WEB-T21. T06 ensures the slot exists, reads from the
// Zustand banner queue (T05), and renders zero children when
// the queue is empty.
export function InBannerHost(): ReactNode {
  const banners = useUIStore((s) => s.banners);
  return (
    <section
      role="region"
      aria-label="Banners"
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {banners.map((b) => (
        <div
          key={b.id}
          role={b.kind === 'sticky' ? 'alert' : 'status'}
          style={{
            padding: 10,
            background:
              b.severity === 'error'
                ? '#fee'
                : b.severity === 'warn'
                  ? '#fef'
                  : '#eff',
            border: '1px solid #ccc',
            fontFamily: 'system-ui',
            minWidth: 240,
          }}
        >
          <strong>{b.title}</strong>
          {b.body ? <div>{b.body}</div> : null}
        </div>
      ))}
    </section>
  );
}
