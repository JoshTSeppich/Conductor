import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  SessionResponseV2,
  type SessionResponseV2Type,
} from 'dispatch-core/src/v2/schema.js';
import { defaultClient, fetchAndParse } from './internal.js';

async function fetchSession(name: string): Promise<SessionResponseV2Type> {
  return fetchAndParse(
    defaultClient(),
    `/v2/sessions/${encodeURIComponent(name)}`,
    SessionResponseV2,
  );
}

// Key = ['session', name]. Includes status_json + recent_events
// that the list endpoint does not, so focused-detail panel (T12)
// uses this hook.
export function useSession(
  name: string,
): UseQueryResult<SessionResponseV2Type> {
  return useQuery({
    queryKey: ['session', name],
    queryFn: () => fetchSession(name),
    enabled: name.length > 0,
  });
}
