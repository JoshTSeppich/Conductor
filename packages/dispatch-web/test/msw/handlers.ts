import { http, HttpResponse } from 'msw';

// Valid token used by MSW fixture for happy-path tests. Tests that need
// 401 behavior use a different token value in localStorage.
export const VALID_TEST_TOKEN = 'test-valid-token';

function requireToken(token: string | null): boolean {
  return token === VALID_TEST_TOKEN;
}

// A valid SessionResponseV2 shape, reused across happy-path handlers.
// Single definition keeps shape sync with schema easy.
const mockSession = {
  cwd: '/Users/test/code/sherpa',
  tmux_target: 'sherpa:0.0',
  handoff_path: '/Users/test/code/sherpa/HANDOFF.md',
  last_prompt_sent_at: null,
  last_handoff_pulled_at: null,
  state: 'armed' as const,
  last_commit_sha: null,
  last_status_json_at: null,
  computed_status: 'idle' as const,
  status_json: null,
  recent_events: [],
};

export const defaultHandlers = [
  // §4.1 health — no auth required
  http.get('/v2/health', () => {
    return HttpResponse.json({
      status: 'ok',
      version: '2.0.0',
      uptime_seconds: 1,
    });
  }),

  // §4.2 sessions list
  http.get('/v2/sessions', ({ request }) => {
    const token = request.headers.get('x-conductor-token');
    if (!requireToken(token)) {
      return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
    }
    return HttpResponse.json({
      sessions: { sherpa: mockSession },
    });
  }),

  // §4.2 single session
  http.get('/v2/sessions/:name', ({ request, params }) => {
    const token = request.headers.get('x-conductor-token');
    if (!requireToken(token)) {
      return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
    }
    return HttpResponse.json({ ...mockSession });
  }),

  // §4.5 events history
  http.get('/v2/events', ({ request }) => {
    const token = request.headers.get('x-conductor-token');
    if (!requireToken(token)) {
      return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
    }
    return HttpResponse.json({
      events: [],
      next_since: new Date(0).toISOString(),
    });
  }),

  // §4.3 PATCH state
  http.patch('/v2/sessions/:name/state', async ({ request, params }) => {
    const token = request.headers.get('x-conductor-token');
    if (!requireToken(token)) {
      return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
    }
    const body = (await request.json()) as { state: string };
    return HttpResponse.json({ ...mockSession, state: body.state });
  }),

  // §4.4 POST prompt
  http.post('/v2/sessions/:name/prompts', async ({ request }) => {
    const token = request.headers.get('x-conductor-token');
    if (!requireToken(token)) {
      return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
    }
    return HttpResponse.json({
      sent_at: '2026-04-23T12:00:00.000Z',
      archived_to:
        '/Users/test/.foxworks-dispatch/archive/sherpa/20260423T120000Z.prompt.md',
    });
  }),

  // §4.4 GET handoff
  http.get('/v2/sessions/:name/handoff', ({ request }) => {
    const token = request.headers.get('x-conductor-token');
    if (!requireToken(token)) {
      return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
    }
    return HttpResponse.json({
      content: 'handoff body',
      written_at: '2026-04-23T12:00:00.000Z',
      archived_to:
        '/Users/test/.foxworks-dispatch/archive/sherpa/20260423T120000Z.handoff.md',
    });
  }),
];
