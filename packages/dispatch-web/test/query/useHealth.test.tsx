import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server.js';
import { createWrapper } from '../test-utils.js';
import { useHealth } from '../../src/query/useHealth.js';

describe('WEB-T04 useHealth', () => {
  it('happy path: returns parsed HealthResponse', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHealth(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('ok');
    expect(result.current.data?.version).toBe('2.0.0');
  });

  it('error path: surfaces HTTP error state', async () => {
    server.use(http.get('/v2/health', () => HttpResponse.error()));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHealth(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
