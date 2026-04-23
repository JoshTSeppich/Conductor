import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { createHttpClient } from '../src/http-client.js';

describe('WEB-T02 http-client', () => {
  it('injects X-Conductor-Token header on /v2/* requests when token is present', async () => {
    let receivedToken: string | null | undefined;
    server.use(
      http.get('/v2/health', ({ request }) => {
        receivedToken = request.headers.get('x-conductor-token');
        return HttpResponse.json({
          status: 'ok',
          version: '2.0.0',
          uptime_seconds: 1,
        });
      }),
    );
    const client = createHttpClient(() => 'my-token');
    const res = await client.fetch('/v2/health');
    expect(res.ok).toBe(true);
    expect(receivedToken).toBe('my-token');
  });
});
