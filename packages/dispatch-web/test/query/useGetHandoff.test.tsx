import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server.js';
import { createWrapper } from '../test-utils.js';
import { VALID_TEST_TOKEN } from '../msw/handlers.js';
import { useGetHandoff } from '../../src/query/useGetHandoff.js';

describe('WEB-T04 useGetHandoff', () => {
  beforeEach(() => {
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
  });

  it('happy path: GET returns parsed PullHandoffResponse', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useGetHandoff(), { wrapper });
    let data;
    await act(async () => {
      data = await result.current.mutateAsync({ name: 'sherpa' });
    });
    expect((data as { content: string }).content).toBe('handoff body');
  });

  it('error path: 404 no handoff surfaces as error', async () => {
    server.use(
      http.get('/v2/sessions/:name/handoff', () =>
        HttpResponse.json({ error: 'no_handoff' }, { status: 404 }),
      ),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useGetHandoff(), { wrapper });
    await act(async () => {
      try {
        await result.current.mutateAsync({ name: 'ghost' });
      } catch {
        // expected
      }
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
