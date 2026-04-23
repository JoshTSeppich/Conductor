import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server.js';
import { createWrapper } from '../test-utils.js';
import { VALID_TEST_TOKEN } from '../msw/handlers.js';
import { usePostPrompt } from '../../src/query/usePostPrompt.js';

describe('WEB-T04 usePostPrompt', () => {
  beforeEach(() => {
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
  });

  it('happy path: POST returns parsed SendPromptResponse', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostPrompt(), { wrapper });
    let data;
    await act(async () => {
      data = await result.current.mutateAsync({
        name: 'sherpa',
        body: 'hello from test',
      });
    });
    expect((data as { sent_at: string }).sent_at).toBeDefined();
  });

  it('error path: 422 non-armed surfaces as error', async () => {
    server.use(
      http.post('/v2/sessions/:name/prompts', () =>
        HttpResponse.json(
          { error: 'session_not_armed' },
          { status: 422 },
        ),
      ),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostPrompt(), { wrapper });
    await act(async () => {
      try {
        await result.current.mutateAsync({ name: 'sherpa', body: 'x' });
      } catch {
        // expected
      }
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
