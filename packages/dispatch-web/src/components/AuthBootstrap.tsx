import type { ReactNode } from 'react';
import { useAuthBootstrap } from '../auth/useAuthBootstrap.js';
import { TokenPrompt } from './TokenPrompt.js';
import { ConnectionStatusBanner } from './ConnectionStatusBanner.js';

export interface AuthBootstrapProps {
  children: ReactNode;
}

export function AuthBootstrap({ children }: AuthBootstrapProps): ReactNode {
  const phase = useAuthBootstrap();

  if (phase === 'connected') return <>{children}</>;
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
