import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client.js';
import { AuthBootstrap } from './components/AuthBootstrap.js';
import { Layout } from './components/Layout.js';

function AppFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}): ReactNode {
  return (
    <div
      role="alert"
      className="p-4 font-sans bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100"
    >
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap">
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        type="button"
        className="mt-2 px-2 py-1 border rounded"
      >
        Reload
      </button>
    </div>
  );
}

export interface AppProps {
  children?: ReactNode;
}

export function App({ children }: AppProps): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={AppFallback}>
        <AuthBootstrap>{children ?? <Layout />}</AuthBootstrap>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
