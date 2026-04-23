import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server.js';
import { createWrapper } from '../test-utils.js';
import { VALID_TEST_TOKEN } from '../msw/handlers.js';
import { usePatchState } from '../../src/query/usePatchState.js';

describe('WEB-T04 usePatchState', () => {
  beforeEach(() => {
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
  });

  it('happy path: PATCH returns updated SessionResponseV2', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePatchState(), { wrapper });
    let data;
    await act(async () => {
      data = await result.current.mutateAsync({
        name: 'sherpa',
        state: 'paused',
      });
    });
    expect((data as { state: string }).state).toBe('paused');
  });

  it('error path: 422 invalid transition surfaces as error', async () => {
    server.use(
      http.patch('/v2/sessions/:name/state', () =>
        HttpResponse.json({ error: 'invalid_transition' }, { status: 422 }),
      ),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePatchState(), { wrapper });
    await act(async () => {
      try {
        await result.current.mutateAsync({ name: 'sherpa', state: 'armed' });
      } catch {
        // expected
      }
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
