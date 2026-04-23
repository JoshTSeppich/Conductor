import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  SessionsListResponse,
  type SessionsListResponseType,
} from 'dispatch-core/src/v2/schema.js';
import { defaultClient, fetchAndParse } from './internal.js';

async function fetchSessions(): Promise<SessionsListResponseType> {
  return fetchAndParse(defaultClient(), '/v2/sessions', SessionsListResponse);
}

// Key = ['sessions']. Invalidated by every session-scoped WS event
// via T03's useDaemonEvents onInvalidate callback (wired in T05+).
export function useSessions(): UseQueryResult<SessionsListResponseType> {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  });
}
