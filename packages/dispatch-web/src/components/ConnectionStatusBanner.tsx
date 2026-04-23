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

  return (
    <div
      role="status"
      style={{
        padding: 8,
        backgroundColor: status === 'daemon_down' ? '#fee' : '#fef',
        borderBottom: '1px solid #ccc',
        fontFamily: 'system-ui',
      }}
    >
      {label}
    </div>
  );
}
