import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  HealthResponse,
  type HealthResponseType,
} from 'dispatch-core/src/v2/schema.js';
import { defaultClient, fetchAndParse } from './internal.js';

async function fetchHealth(): Promise<HealthResponseType> {
  return fetchAndParse(defaultClient(), '/v2/health', HealthResponse);
}

// Key = ['health']. Polled every 30s per TICKETS.md §2.2.
// No auth required (contract §4.1).
export function useHealth(): UseQueryResult<HealthResponseType> {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });
}
