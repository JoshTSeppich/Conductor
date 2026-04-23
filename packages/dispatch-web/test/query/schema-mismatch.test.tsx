import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server.js';
import { createWrapper } from '../test-utils.js';
import { VALID_TEST_TOKEN } from '../msw/handlers.js';
import { useSessions } from '../../src/query/useSessions.js';

describe('WEB-T04 schema-mismatch', () => {
  beforeEach(() => {
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
  });

  it('Zod parse fails when response body does not match SessionsListResponse shape', async () => {
    // Server returns a 200 with a body that does not match the schema
    // (missing sessions map). Hook must detect the mismatch via Zod
    // parse and surface an error, not silently pass invalid data.
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({ wrong_key: [] }),
      ),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSessions(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
