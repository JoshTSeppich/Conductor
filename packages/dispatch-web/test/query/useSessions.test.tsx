import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server.js';
import { createWrapper } from '../test-utils.js';
import { VALID_TEST_TOKEN } from '../msw/handlers.js';
import { useSessions } from '../../src/query/useSessions.js';

describe('WEB-T04 useSessions', () => {
  beforeEach(() => {
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
  });

  it('happy path: returns parsed SessionsListResponse', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSessions(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.sessions.sherpa).toBeDefined();
    expect(result.current.data?.sessions.sherpa.state).toBe('armed');
  });

  it('error path: 401 when token missing', async () => {
    localStorage.clear();
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({ error: 'invalid_token' }, { status: 401 }),
      ),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSessions(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
