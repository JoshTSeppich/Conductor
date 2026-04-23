import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  SessionResponseV2,
  type SessionResponseV2Type,
  type State,
} from 'dispatch-core/src/v2/schema.js';
import { defaultClient, fetchAndParse } from './internal.js';

export interface PatchStateArgs {
  name: string;
  state: State;
}

async function patchState({
  name,
  state,
}: PatchStateArgs): Promise<SessionResponseV2Type> {
  return fetchAndParse(
    defaultClient(),
    `/v2/sessions/${encodeURIComponent(name)}/state`,
    SessionResponseV2,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    },
  );
}

// Per TICKETS.md §2.2: invalidates ['sessions'] + ['session', name].
export function usePatchState(): UseMutationResult<
  SessionResponseV2Type,
  Error,
  PatchStateArgs
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchState,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', variables.name] });
    },
  });
}
