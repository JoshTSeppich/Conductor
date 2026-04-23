import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  EventsHistoryResponse,
  type EventsHistoryResponseType,
} from 'dispatch-core/src/v2/schema.js';
import { defaultClient, fetchAndParse } from './internal.js';

async function fetchEventsSince(
  since: string,
): Promise<EventsHistoryResponseType> {
  return fetchAndParse(
    defaultClient(),
    `/v2/events?since=${encodeURIComponent(since)}`,
    EventsHistoryResponse,
  );
}

// Key = ['events', since]. Manual backfill fetch (ticker uses on
// mount for ring-buffer prefill; WS stream takes over thereafter).
export function useEventsSince(
  since: string,
): UseQueryResult<EventsHistoryResponseType> {
  return useQuery({
    queryKey: ['events', since],
    queryFn: () => fetchEventsSince(since),
  });
}
