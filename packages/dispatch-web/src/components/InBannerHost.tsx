import type { ReactNode } from 'react';
import { useUIStore } from '../store/ui.js';

// WEB-T06 slot reservation, T07 refactored to Tailwind. Real
// banner rendering (toast/sticky rules per DAEMON-S03 coordination,
// auto-dismiss timing) lands in WEB-T21.
export function InBannerHost(): ReactNode {
  const banners = useUIStore((s) => s.banners);
  return (
    <section
      role="region"
      aria-label="Banners"
      className="fixed top-3 right-3 z-50 flex flex-col gap-2"
    >
      {banners.map((b) => (
        <div
          key={b.id}
          role={b.kind === 'sticky' ? 'alert' : 'status'}
          className={`p-2.5 border rounded min-w-60 font-sans ${
            b.severity === 'error'
              ? 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100'
              : b.severity === 'warn'
                ? 'bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100'
                : 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100'
          }`}
        >
          <strong>{b.title}</strong>
          {b.body ? <div>{b.body}</div> : null}
        </div>
      ))}
    </section>
  );
}
