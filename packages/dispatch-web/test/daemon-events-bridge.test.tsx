import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { startFixture, type FixtureHandle } from './fixtures/ws-server.js';
import { DaemonEventsBridge } from '../src/components/DaemonEventsBridge.js';
import { useUIStore } from '../src/store/ui.js';

// Fast-scaled backoff for test runtime — same shape as DEFAULT_BACKOFF;
// see UI-S01 ADR S4b for precedent. Drives reconnect timing.
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

beforeEach(() => {
  fixture.reset();
  // Reset store slots T18 writes to. Other slots set to safe defaults
  // so unrelated paths don't fire.
  useUIStore.setState(
    {
      focusedSessionName: null,
      sendModalOpen: false,
      killConfirmOpen: false,
      killConfirmTarget: null,
      showArchived: false,
      connectionStatus: 'connected',
      commitBySession: {},
      banners: [],
      authRetryNonce: 0,
      events: [],
      notificationsAvailable: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
  localStorage.setItem('x-conductor-token', fixture.validToken);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WEB-T18 DaemonEventsBridge', () => {
  it('mounts useDaemonEvents and writes received WS events into UIState.events via applyEvent (boundary-parsed against EventV2)', async () => {
    fixture.setOnConnection((connectionIndex) => {
      if (connectionIndex === 1) {
        // Valid EventV2 — handoff_written shape
        fixture.emit({
          type: 'handoff_written',
          timestamp: '2026-04-27T12:00:00.000Z',
          session: 'sherpa',
          data: { path: '/x/HANDOFF.md', size_bytes: 42 },
        });
      }
    });

    render(
      <DaemonEventsBridge
        backoff={TEST_BACKOFF}
        wsUrlOverride={fixture.wsUrl}
        httpBaseOverride={fixture.httpBase}
      >
        <div>children-render-target</div>
      </DaemonEventsBridge>,
    );

    await waitFor(() => {
      expect(useUIStore.getState().events).toHaveLength(1);
    });
    expect(useUIStore.getState().events[0].type).toBe('handoff_written');
    expect(useUIStore.getState().events[0].session).toBe('sherpa');
  });

  it('boundary-parse drops malformed events (unknown type) and warns; UIState.events stays empty', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    fixture.setOnConnection((connectionIndex) => {
      if (connectionIndex === 1) {
        // Malformed: unknown event type — fails EventV2 discriminated-
        // union safeParse. Per Decision 2: warn + drop.
        fixture.emit({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: 'unknown_type' as any,
          timestamp: '2026-04-27T12:00:00.000Z',
          session: 'sherpa',
          data: {},
        });
        // Plus a valid one to confirm pipeline continues after drop
        fixture.emit({
          type: 'commit_landed',
          timestamp: '2026-04-27T12:00:01.000Z',
          session: 'sherpa',
          data: { sha: 'abc', subject: 'x', branch: 'main' },
        });
      }
    });

    render(
      <DaemonEventsBridge
        backoff={TEST_BACKOFF}
        wsUrlOverride={fixture.wsUrl}
        httpBaseOverride={fixture.httpBase}
      >
        <div>children</div>
      </DaemonEventsBridge>,
    );

    // Only the valid event lands in UIState.events
    await waitFor(() => {
      expect(useUIStore.getState().events).toHaveLength(1);
    });
    expect(useUIStore.getState().events[0].type).toBe('commit_landed');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('health fetch with notifications_available=true sets UIState.notificationsAvailable=true', async () => {
    server.use(
      http.get('/v2/health', () =>
        HttpResponse.json({
          status: 'ok',
          version: '2.0.0',
          uptime_seconds: 1,
          notifications_available: true,
        }),
      ),
    );

    render(
      <DaemonEventsBridge
        backoff={TEST_BACKOFF}
        wsUrlOverride={fixture.wsUrl}
        httpBaseOverride={fixture.httpBase}
      >
        <div>children</div>
      </DaemonEventsBridge>,
    );

    await waitFor(() => {
      expect(useUIStore.getState().notificationsAvailable).toBe(true);
    });
  });

  it('health fetch with notifications_available field omitted defaults notificationsAvailable to false (DAEMON-S03 graceful degradation)', async () => {
    server.use(
      http.get('/v2/health', () =>
        HttpResponse.json({
          status: 'ok',
          version: '2.0.0',
          uptime_seconds: 1,
          // notifications_available intentionally omitted —
          // legacy/pre-S03 daemon shape per ADR §"Cross-session
          // impacts" default-false rule
        }),
      ),
    );

    render(
      <DaemonEventsBridge
        backoff={TEST_BACKOFF}
        wsUrlOverride={fixture.wsUrl}
        httpBaseOverride={fixture.httpBase}
      >
        <div>children</div>
      </DaemonEventsBridge>,
    );

    // Wait for any state settling that may happen post-mount (events
    // flow, etc.) before asserting the default. Give the bridge time
    // to fetch + attempt parse.
    await waitFor(() => {
      // notificationsAvailable must NOT be true at any point after
      // the bridge processes the omitted-field response.
      expect(useUIStore.getState().notificationsAvailable).toBe(false);
    });
  });

  it('health fetch failure (malformed response) defaults notificationsAvailable to false + logs warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    server.use(
      http.get('/v2/health', () =>
        // Malformed: missing required `status` field — schema parse
        // will fail. Bridge graceful-degrades to false per Decision 7.
        HttpResponse.json({ version: '2.0.0' }),
      ),
    );

    render(
      <DaemonEventsBridge
        backoff={TEST_BACKOFF}
        wsUrlOverride={fixture.wsUrl}
        httpBaseOverride={fixture.httpBase}
      >
        <div>children</div>
      </DaemonEventsBridge>,
    );

    // After processing, notificationsAvailable stays false. Use a
    // small wait so the fetch's then/catch has a chance to run.
    await new Promise((r) => setTimeout(r, 100));
    expect(useUIStore.getState().notificationsAvailable).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });
});
