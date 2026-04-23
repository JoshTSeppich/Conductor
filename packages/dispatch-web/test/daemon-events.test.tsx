import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { startFixture, type FixtureHandle } from './fixtures/ws-server.js';
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

let fixture: FixtureHandle;

beforeAll(async () => {
  fixture = await startFixture();
});

afterAll(async () => {
  await fixture.stop();
});

afterEach(() => {
  fixture.reset();
});

describe('WEB-T03 useDaemonEvents', () => {
  it('opens WS on mount and dispatches onEvent for received events', async () => {
    const events: EventShape[] = [];

    fixture.setOnConnection((connectionIndex) => {
      if (connectionIndex === 1) {
        fixture.emit({
          type: 'handoff_written',
          timestamp: '2026-04-23T12:00:00.000Z',
          session: 'sherpa',
          data: { path: '/x/HANDOFF.md', size_bytes: 10 },
        });
      }
    });

    renderHook(() =>
      useDaemonEvents({
        token: fixture.validToken,
        backoff: TEST_BACKOFF,
        wsUrlOverride: fixture.wsUrl,
        httpBaseOverride: fixture.httpBase,
        onEvent: (e) => events.push(e),
      }),
    );

    await waitFor(() => expect(events).toHaveLength(1));
    expect(events[0].session).toBe('sherpa');
  });

  it('re-runs preflight and reopens WS after close; gap-fills missed events', async () => {
    const events: EventShape[] = [];

    fixture.setOnConnection((connectionIndex) => {
      if (connectionIndex === 1) {
        fixture.emit({
          type: 'handoff_written',
          timestamp: new Date(Date.now() + 10).toISOString(),
          session: 'sherpa',
          data: { path: '/live', size_bytes: 1 },
        });
        // Add a second event to the log while WS is about to drop —
        // it won't reach the closing WS but will be returned by the
        // reconnect's /v2/events?since= gap-fill fetch.
        setTimeout(() => {
          fixture.closeAllWs();
          fixture.emit({
            type: 'handoff_written',
            timestamp: new Date(Date.now() + 20).toISOString(),
            session: 'sherpa',
            data: { path: '/gap-filled', size_bytes: 5 },
          });
        }, 30);
      }
    });

    renderHook(() =>
      useDaemonEvents({
        token: fixture.validToken,
        backoff: TEST_BACKOFF,
        wsUrlOverride: fixture.wsUrl,
        httpBaseOverride: fixture.httpBase,
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

    fixture.setOnConnection((connectionIndex) => {
      if (connectionIndex === 1) {
        // Rotate token so the client's next preflight (after WS
        // close + reconnect) returns 401. Simulates mid-session
        // token rotation.
        fixture.setValidToken('rotated-to-new-token');
        setTimeout(() => fixture.closeAllWs(), 30);
      }
    });

    renderHook(() =>
      useDaemonEvents({
        token: fixture.validToken,
        backoff: TEST_BACKOFF,
        wsUrlOverride: fixture.wsUrl,
        httpBaseOverride: fixture.httpBase,
        onStatusChange: (s) => statuses.push(s),
      }),
    );

    await waitFor(
      () => expect(statuses).toContain('auth_failed'),
      { timeout: 3000 },
    );
  });

  it('dedupes events that appear via both gap-fill and WS replay', async () => {
    const events: EventShape[] = [];
    const replayEvent: EventShape = {
      type: 'handoff_written',
      timestamp: '2026-04-23T12:00:00.000Z',
      session: 'sherpa',
      data: { path: '/replay', size_bytes: 10 },
    };

    // Worst-case: server re-delivers the entire event log on every
    // new WS connection. Both gap-fill HTTP response and WS replay
    // carry the same event; client dedupe must collapse to 1.
    fixture.setReplayAllOnConnect(true);
    fixture.emit(replayEvent);

    fixture.setOnConnection((connectionIndex) => {
      if (connectionIndex === 1) {
        setTimeout(() => fixture.closeAllWs(), 30);
      }
    });

    renderHook(() =>
      useDaemonEvents({
        token: fixture.validToken,
        backoff: TEST_BACKOFF,
        wsUrlOverride: fixture.wsUrl,
        httpBaseOverride: fixture.httpBase,
        onEvent: (e) => events.push(e),
      }),
    );

    // Wait for reconnect cycle to fully settle: first WS replay,
    // disconnect, gap-fill fetch, second WS replay. Dedupe should
    // keep the final count at 1.
    await waitFor(() => expect(events.length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 400));
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual(replayEvent.data);
  });
});
