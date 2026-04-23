import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Fresh QueryClient per test keeps isolation. Retries disabled so
// error-path tests don't wait out TanStack's retry policy.
export function createWrapper(): {
  queryClient: QueryClient;
  wrapper: (props: { children: ReactNode }) => ReactNode;
} {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}
