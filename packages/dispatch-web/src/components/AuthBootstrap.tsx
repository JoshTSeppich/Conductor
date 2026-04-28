import type { ReactNode } from 'react';
import { useAuthBootstrap } from '../auth/useAuthBootstrap.js';
import { TokenPrompt } from './TokenPrompt.js';
import { ConnectionStatusBanner } from './ConnectionStatusBanner.js';
import { DaemonEventsBridge } from './DaemonEventsBridge.js';

export interface AuthBootstrapProps {
  children: ReactNode;
}

export function AuthBootstrap({ children }: AuthBootstrapProps): ReactNode {
  const phase = useAuthBootstrap();

  // T18: connected branch wraps children in DaemonEventsBridge so
  // useDaemonEvents only mounts when authenticated. Bridge unmounts
  // on auth_failed/daemon_down (parent gates render).
  if (phase === 'connected')
    return <DaemonEventsBridge>{children}</DaemonEventsBridge>;
  if (phase === 'prompt') return <TokenPrompt reason="missing" />;
  if (phase === 'auth_failed') return <TokenPrompt reason="invalid" />;
  if (phase === 'daemon_down') return <ConnectionStatusBanner />;
  // bootstrapping — brief default state before effect resolves
  return (
    <div role="status" className="p-4 font-sans dark:text-gray-100">
      Connecting to daemon…
    </div>
  );
}
