import type { ReactNode } from 'react';
import { useUIStore } from '../store/ui.js';

export function ConnectionStatusBanner(): ReactNode {
  const status = useUIStore((s) => s.connectionStatus);
  if (status === 'connected') return null;

  const label =
    status === 'daemon_down'
      ? 'Daemon unreachable. Retrying…'
      : status === 'auth_failed'
        ? 'Authentication failed. Paste a new token.'
        : 'Connecting to daemon…';

  const colorClasses =
    status === 'daemon_down'
      ? 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100'
      : status === 'auth_failed'
        ? 'bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100'
        : 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100';

  return (
    <div
      role="status"
      className={`p-2 border-b font-sans ${colorClasses}`}
    >
      {label}
    </div>
  );
}
