import { http, HttpResponse } from 'msw';

// Valid token used by MSW fixture for happy-path tests. Tests that need
// 401 behavior use a different token value in localStorage.
export const VALID_TEST_TOKEN = 'test-valid-token';

export const defaultHandlers = [
  http.get('/v2/health', () => {
    return HttpResponse.json({
      status: 'ok',
      version: '2.0.0',
      uptime_seconds: 1,
    });
  }),

  http.get('/v2/events', ({ request }) => {
    const token = request.headers.get('x-conductor-token');
    if (token !== VALID_TEST_TOKEN) {
      return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
    }
    return HttpResponse.json({
      events: [],
      next_since: new Date(0).toISOString(),
    });
  }),
];
