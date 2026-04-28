import type { ReactNode } from 'react';
import { useUIStore } from '../store/ui.js';

// T06 slot reservation, T07 Tailwind refactor, T21 fills in:
//   - sort: sticky renders BEFORE toast in DOM per Decision 6 +
//     spec verbatim "Toasts stack vertically, sticky alerts above
//     them". Partition + concat preserves insertion order within
//     each kind.
//   - Dismiss button on kind='sticky' per Decision 5 + spec verbatim
//     "Sticky alerts require explicit dismiss". Toasts auto-dismiss
//     via pushBanner-side setTimeout (no Dismiss button — would
//     fight the auto-dismiss timer).
//   - role="alert" for sticky, role="status" for toast (existing
//     T07 pattern preserved).
export function InBannerHost(): ReactNode {
  const banners = useUIStore((s) => s.banners);
  const dismissBanner = useUIStore((s) => s.dismissBanner);

  const stickys = banners.filter((b) => b.kind === 'sticky');
  const toasts = banners.filter((b) => b.kind === 'toast');
  const sorted = [...stickys, ...toasts];

  return (
    <section
      role="region"
      aria-label="Banners"
      className="fixed top-3 right-3 z-50 flex flex-col gap-2"
    >
      {sorted.map((b) => (
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
          {b.kind === 'sticky' ? (
            <button
              type="button"
              onClick={() => dismissBanner(b.id)}
              aria-label="Dismiss"
              className="mt-2 px-2 py-0.5 border rounded text-xs"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ))}
    </section>
  );
}
