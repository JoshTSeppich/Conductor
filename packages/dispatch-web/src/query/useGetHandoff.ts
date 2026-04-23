import {
  useMutation,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  PullHandoffResponse,
  type PullHandoffResponseType,
} from 'dispatch-core/src/v2/schema.js';
import { defaultClient, fetchAndParse } from './internal.js';

export interface GetHandoffArgs {
  name: string;
}

async function getHandoff({
  name,
}: GetHandoffArgs): Promise<PullHandoffResponseType> {
  return fetchAndParse(
    defaultClient(),
    `/v2/sessions/${encodeURIComponent(name)}/handoff`,
    PullHandoffResponse,
  );
}

// Modeled as a mutation (not a query) because the caller triggers it
// explicitly via the re-pull button (WEB-T16). Per TICKETS.md §2.2:
// NO invalidation — reading the handoff is a pure side-effect from
// the UI state's perspective; the daemon's archive is server-side.
export function useGetHandoff(): UseMutationResult<
  PullHandoffResponseType,
  Error,
  GetHandoffArgs
> {
  return useMutation({
    mutationFn: getHandoff,
  });
}
