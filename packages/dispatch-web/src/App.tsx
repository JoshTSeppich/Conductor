import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client.js';

function AppFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}): ReactNode {
  return (
    <div role="alert" style={{ padding: 16, fontFamily: 'system-ui' }}>
      <h2>Something went wrong</h2>
      <pre style={{ color: 'tomato', whiteSpace: 'pre-wrap' }}>{error.message}</pre>
      <button onClick={resetErrorBoundary} type="button">
        Reload
      </button>
    </div>
  );
}

function DashboardPlaceholder(): ReactNode {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Foxworks Dispatch Conductor</h1>
      <p>Awaiting daemon connection…</p>
    </main>
  );
}

export interface AppProps {
  children?: ReactNode;
}

export function App({ children }: AppProps): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={AppFallback}>
        {children ?? <DashboardPlaceholder />}
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
