import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { wsApi } from './msw/ws-handlers.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import {
  useDaemonEvents,
  type ClientStatus,
} from '../src/daemon-client/useDaemonEvents.js';
import type { EventShape } from '../src/daemon-client/event-shape.js';

// Fast-scaled backoff for test runtime (shape identical to
// DEFAULT_BACKOFF; see UI-S01 ADR S4b for the precedent).
const TEST_BACKOFF = {
  baseMs: 50,
  multiplier: 2,
  capMs: 500,
  jitter: 0.25,
};

describe('WEB-T03 useDaemonEvents', () => {
  beforeEach(() => {
    localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
  });

  it('opens WS on mount and dispatches onEvent for received events', async () => {
    const events: EventShape[] = [];

    server.use(
      wsApi.addEventListener('connection', ({ client }) => {
        client.send(
          JSON.stringify({
            type: 'handoff_written',
            timestamp: '2026-04-23T12:00:00.000Z',
            session: 'sherpa',
            data: { path: '/x/HANDOFF.md', size_bytes: 10 },
          }),
        );
      }),
    );

    renderHook(() =>
      useDaemonEvents({
        token: VALID_TEST_TOKEN,
        backoff: TEST_BACKOFF,
        onEvent: (e) => events.push(e),
      }),
    );

    await waitFor(() => expect(events).toHaveLength(1));
    expect(events[0].session).toBe('sherpa');
  });

  it('re-runs preflight and reopens WS after close; gap-fills missed events', async () => {
    const events: EventShape[] = [];
    let connectionCount = 0;

    server.use(
      http.get('/v2/events', ({ request }) => {
        const url = new URL(request.url);
        const since = url.searchParams.get('since');
        const token = request.headers.get('x-conductor-token');
        if (token !== VALID_TEST_TOKEN) {
          return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
        }
        // If since> epoch, this is a gap-fill fetch — return the
        // missed event that was "emitted" during disconnect.
        if (since && new Date(since).getTime() > 1000) {
          return HttpResponse.json({
            events: [
              {
                type: 'handoff_written',
                timestamp: new Date().toISOString(),
                session: 'sherpa',
                data: { path: '/gap-filled', size_bytes: 5 },
              },
            ],
            next_since: new Date().toISOString(),
          });
        }
        return HttpResponse.json({
          events: [],
          next_since: new Date(0).toISOString(),
        });
      }),
      wsApi.addEventListener('connection', ({ client }) => {
        connectionCount += 1;
        if (connectionCount === 1) {
          client.send(
            JSON.stringify({
              type: 'handoff_written',
              timestamp: new Date(Date.now() + 10).toISOString(),
              session: 'sherpa',
              data: { path: '/live', size_bytes: 1 },
            }),
          );
          // Close after emitting to trigger reconnect cycle
          setTimeout(() => client.close(), 50);
        }
      }),
    );

    renderHook(() =>
      useDaemonEvents({
        token: VALID_TEST_TOKEN,
        backoff: TEST_BACKOFF,
        onEvent: (e) => events.push(e),
      }),
    );

    await waitFor(
      () => expect(events.length).toBeGreaterThanOrEqual(2),
      { timeout: 3000 },
    );
  });

  it('transitions to auth_failed when preflight returns 401 on reconnect', async () => {
    const statuses: ClientStatus[] = [];
    let preflightCallCount = 0;

    server.use(
      http.get('/v2/events', ({ request }) => {
        preflightCallCount += 1;
        const token = request.headers.get('x-conductor-token');
        // Second preflight onward: return 401 (simulates token
        // rotated by operator elsewhere mid-session).
        if (preflightCallCount >= 2 || token !== VALID_TEST_TOKEN) {
          return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
        }
        return HttpResponse.json({
          events: [],
          next_since: new Date(0).toISOString(),
        });
      }),
      wsApi.addEventListener('connection', ({ client }) => {
        // Close immediately to force reconnect
        setTimeout(() => client.close(), 50);
      }),
    );

    renderHook(() =>
      useDaemonEvents({
        token: VALID_TEST_TOKEN,
        backoff: TEST_BACKOFF,
        onStatusChange: (s) => statuses.push(s),
      }),
    );

    await waitFor(
      () => expect(statuses).toContain('auth_failed'),
      { timeout: 3000 },
    );
    expect(localStorage.getItem('x-conductor-token')).toBeNull();
  });

  it('dedupes events that appear via both gap-fill and WS replay', async () => {
    const events: EventShape[] = [];
    const replayEvent = {
      type: 'handoff_written',
      timestamp: '2026-04-23T12:00:00.000Z',
      session: 'sherpa',
      data: { path: '/replay', size_bytes: 10 },
    };
    let connectionCount = 0;

    server.use(
      http.get('/v2/events', ({ request }) => {
        const url = new URL(request.url);
        const since = url.searchParams.get('since');
        const token = request.headers.get('x-conductor-token');
        if (token !== VALID_TEST_TOKEN) {
          return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
        }
        // Gap-fill replays the same event that the reconnected WS
        // will also replay (worst-case server re-delivery).
        if (since && new Date(since).getTime() > 1000) {
          return HttpResponse.json({
            events: [replayEvent],
            next_since: replayEvent.timestamp,
          });
        }
        return HttpResponse.json({
          events: [],
          next_since: new Date(0).toISOString(),
        });
      }),
      wsApi.addEventListener('connection', ({ client }) => {
        connectionCount += 1;
        // Every connection emits the same event (server doesn't
        // track per-client delivery).
        client.send(JSON.stringify(replayEvent));
        if (connectionCount === 1) {
          setTimeout(() => client.close(), 50);
        }
      }),
    );

    renderHook(() =>
      useDaemonEvents({
        token: VALID_TEST_TOKEN,
        backoff: TEST_BACKOFF,
        onEvent: (e) => events.push(e),
      }),
    );

    // Wait for reconnect + gap-fill + WS replay to all settle
    await waitFor(() => expect(events.length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 300));
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual(replayEvent.data);
  });
});
