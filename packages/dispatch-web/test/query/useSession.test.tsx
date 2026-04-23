import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server.js';
import { createWrapper } from '../test-utils.js';
import { VALID_TEST_TOKEN } from '../msw/handlers.js';
import { useSession } from '../../src/query/useSession.js';

describe('WEB-T04 useSession', () => {
  beforeEach(() => {
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
  });

  it('happy path: returns parsed SessionResponseV2', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSession('sherpa'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.tmux_target).toBe('sherpa:0.0');
    expect(result.current.data?.computed_status).toBe('idle');
  });

  it('error path: 404 surfaces as error state', async () => {
    server.use(
      http.get('/v2/sessions/:name', () =>
        HttpResponse.json({ error: 'not_found' }, { status: 404 }),
      ),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSession('ghost'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
