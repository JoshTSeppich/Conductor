import { QueryClient } from '@tanstack/react-query';

// WEB-T01 defaults. Per TICKETS.md §2.2:
//   staleTime 30s: reasonable default; tune per-query in WEB-T04 if
//     needed (e.g., /v2/health polled every 30s with 0 staleTime).
//   retry: 1 single retry on transient failure; UI-S01 preflight
//     owns the longer reconnect/backoff loop.
//   refetchOnWindowFocus: false — WebSocket invalidation (WEB-T03) is
//     the source of truth for freshness; focus-driven refetch would
//     double-fetch and fight the WS rhythm.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
