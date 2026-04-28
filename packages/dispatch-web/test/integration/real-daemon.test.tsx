import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server.js';
import { startFixture, type FixtureHandle } from '../fixtures/ws-server.js';
import { DaemonEventsBridge } from '../../src/components/DaemonEventsBridge.js';
import { InBannerHost } from '../../src/components/InBannerHost.js';
import { useUIStore } from '../../src/store/ui.js';
import { writeToken, readToken } from '../../src/auth/token-storage.js';

// Z-3 web-side integration tests. Per pre-reg Decision 3b:
// boots fixture (real Node ws + HTTP) + happy-dom + MSW for
// non-fixture HTTP. Verifies the full real-environment binding
// surface for the web UI side: full lifecycle, WS reconnect
// across daemon restart, token persistence, banner-rule wiring
// under real WS.
//
// Decision 4 fixture extension: ws-server.restart() helper added
// in this red commit (stub throw); green lands the implementation.

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
});

afterEach(() => {
  // Test isolation: clear token between tests so localStorage
  // state doesn't leak across test ordering.
  localStorage.removeItem('x-conductor-token');
});

describe('Z-3 real-daemon integration (web side)', () => {
  it('T1 full lifecycle: Bridge mounts, completes preflight, opens WS, dispatches event', async () => {
    // Pre-set token in localStorage (simulates persisted-from-
    // prior-visit; also used by Bridge via tokenOverride here for
    // explicit test seam).
    writeToken(fixture.validToken);

    // MSW intercepts /v2/health relative-path call from the Bridge's
    // health-fetch (Decision 7 of T18 — bridge does its own health
    // fetch via defaultClient relative path; useDaemonEvents'
    // preflight uses httpBaseOverride absolute URL → fixture).
    server.use(
      http.get('/v2/health', () =>
        HttpResponse.json({
          status: 'ok',
          version: '0.0.0-fixture',
          uptime_seconds: 0,
          notifications_available: false,
        }),
      ),
    );

    // Schedule one event on first connection
    fixture.setOnConnection((connectionIndex) => {
      if (connectionIndex === 1) {
        fixture.emit({
          type: 'commit_landed',
          timestamp: '2026-04-28T12:00:00.000Z',
          session: 'sherpa',
          data: { sha: 'abc1234', subject: 'fix bug', branch: 'main' },
        });
      }
    });

    render(
      <DaemonEventsBridge
        backoff={TEST_BACKOFF}
        wsUrlOverride={fixture.wsUrl}
        httpBaseOverride={fixture.httpBase}
      >
        <div>app-content</div>
      </DaemonEventsBridge>,
    );

    // Children render through Bridge pass-through
    expect(screen.getByText('app-content')).toBeInTheDocument();

    // Event flows from fixture WS → Bridge applyEvent → UIState.events
    await waitFor(() => {
      expect(useUIStore.getState().events).toHaveLength(1);
    });

    // Health fetch resolved + flag plumbed
    await waitFor(() => {
      expect(useUIStore.getState().notificationsAvailable).toBe(false);
    });
  });

  it('T2 WS reconnect across daemon restart: connection cycles; events post-restart still flow', async () => {
    writeToken(fixture.validToken);
    server.use(
      http.get('/v2/health', () =>
        HttpResponse.json({
          status: 'ok',
          version: '0.0.0-fixture',
          uptime_seconds: 0,
        }),
      ),
    );
    fixture.setOnConnection((connectionIndex) => {
      // First connection: emit event A
      if (connectionIndex === 1) {
        fixture.emit({
          type: 'commit_landed',
          timestamp: '2026-04-28T12:00:00.000Z',
          session: 'sherpa',
          data: { sha: 'pre1', subject: 'pre-restart', branch: 'main' },
        });
      }
      // Second connection (post-restart): emit event B
      if (connectionIndex === 2) {
        fixture.emit({
          type: 'commit_landed',
          timestamp: '2026-04-28T12:01:00.000Z',
          session: 'sherpa',
          data: { sha: 'post1', subject: 'post-restart', branch: 'main' },
        });
      }
    });

    render(
      <DaemonEventsBridge
        backoff={TEST_BACKOFF}
        wsUrlOverride={fixture.wsUrl}
        httpBaseOverride={fixture.httpBase}
      >
        <div>app</div>
      </DaemonEventsBridge>,
    );

    // Wait for first event to flow
    await waitFor(() => {
      expect(useUIStore.getState().events).toHaveLength(1);
    });

    // Simulate daemon restart — closes HTTP+WS, rebinds same port.
    // Z-3 fixture extension; green-only implementation.
    await fixture.restart();

    // After restart, second connection emits post-restart event.
    // Bridge's UI-S01 reconnect cycle: WS close → preflight cycles
    // through daemon_down (HTTP unreachable during restart window)
    // → connecting → connected → WS reopens → applyEvent fires.
    await waitFor(
      () => {
        expect(useUIStore.getState().events).toHaveLength(2);
      },
      { timeout: 3000 },
    );
  });

  it('T3 token persistence: persisted token recovered on Bridge mount; no re-prompt; WS connects', async () => {
    // Step 1: persist a token (simulates "previous browser session")
    writeToken(fixture.validToken);
    expect(readToken()).toBe(fixture.validToken);

    server.use(
      http.get('/v2/health', () =>
        HttpResponse.json({
          status: 'ok',
          version: '0.0.0-fixture',
          uptime_seconds: 0,
        }),
      ),
    );
    fixture.setOnConnection((connectionIndex) => {
      if (connectionIndex === 1) {
        fixture.emit({
          type: 'state_changed',
          timestamp: '2026-04-28T12:00:00.000Z',
          session: 'sherpa',
          data: { from: 'paused', to: 'armed', triggered_by: 'operator' },
        });
      }
    });

    // Bridge reads token via readToken() when no override given
    // (production path). Verify the persisted token successfully
    // authenticates the WS connection (event would not flow if
    // fixture rejected the token).
    render(
      <DaemonEventsBridge
        backoff={TEST_BACKOFF}
        wsUrlOverride={fixture.wsUrl}
        httpBaseOverride={fixture.httpBase}
      >
        <div>app</div>
      </DaemonEventsBridge>,
    );

    await waitFor(() => {
      expect(useUIStore.getState().events).toHaveLength(1);
    });
    // Event arrived → token was accepted → persistence works
    expect(useUIStore.getState().events[0].type).toBe('state_changed');
  });

  it('T4 banner-rule wiring under real WS: handoff_written + flag=false → toast renders in InBannerHost DOM', async () => {
    writeToken(fixture.validToken);
    // Default health handler omits notifications_available →
    // defaults to false per DAEMON-S03 graceful-degradation.
    fixture.setOnConnection((connectionIndex) => {
      if (connectionIndex === 1) {
        fixture.emit({
          type: 'handoff_written',
          timestamp: '2026-04-28T12:00:00.000Z',
          session: 'sherpa',
          data: { path: '/HANDOFF.md', size_bytes: 42 },
        });
      }
    });

    render(
      <>
        <DaemonEventsBridge
          backoff={TEST_BACKOFF}
          wsUrlOverride={fixture.wsUrl}
          httpBaseOverride={fixture.httpBase}
        >
          <div>app</div>
        </DaemonEventsBridge>
        <InBannerHost />
      </>,
    );

    // Full-stack: WS event → Bridge.onEvent → applyEvent (T18) +
    // evaluateBannerRule (T21) → pushBanner → InBannerHost renders
    // toast in DOM.
    await waitFor(() => {
      const region = screen.getByRole('region', { name: /banners/i });
      expect(
        within(region).getByText(/handoff written for sherpa/i),
      ).toBeInTheDocument();
    });
    // Toast — no Dismiss button (auto-dismiss-only path)
    const region = screen.getByRole('region', { name: /banners/i });
    expect(
      within(region).queryByRole('button', { name: /dismiss/i }),
    ).toBeNull();
  });
});
