import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server.js';
import { createWrapper } from '../test-utils.js';
import { VALID_TEST_TOKEN } from '../msw/handlers.js';
import { useEventsSince } from '../../src/query/useEventsSince.js';

describe('WEB-T04 useEventsSince', () => {
  beforeEach(() => {
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
  });

  it('happy path: returns parsed EventsHistoryResponse', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useEventsSince(new Date(0).toISOString()),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data?.events)).toBe(true);
  });

  it('error path: 401 surfaces as error state', async () => {
    localStorage.clear();
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useEventsSince(new Date(0).toISOString()),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
