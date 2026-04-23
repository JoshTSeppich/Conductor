import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  SendPromptResponse,
  type SendPromptResponseType,
} from 'dispatch-core/src/v2/schema.js';
import { defaultClient, fetchAndParse } from './internal.js';

export interface PostPromptArgs {
  name: string;
  body: string;
}

async function postPrompt({
  name,
  body,
}: PostPromptArgs): Promise<SendPromptResponseType> {
  return fetchAndParse(
    defaultClient(),
    `/v2/sessions/${encodeURIComponent(name)}/prompts`,
    SendPromptResponse,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    },
  );
}

// Per TICKETS.md §2.2: invalidates ['sessions'] + ['session', name].
export function usePostPrompt(): UseMutationResult<
  SendPromptResponseType,
  Error,
  PostPromptArgs
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postPrompt,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', variables.name] });
    },
  });
}
