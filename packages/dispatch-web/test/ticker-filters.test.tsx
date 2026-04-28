import { describe, it, expect, beforeEach } from 'vitest';
import {
  render,
  screen,
  within,
  fireEvent,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { TickerPanel } from '../src/components/TickerPanel.js';
import { useUIStore } from '../src/store/ui.js';
import type { EventV2Type } from 'dispatch-core/src/v2/schema.js';

// Fixture spans 3 §5.3 types and 2 sessions for filter compose
// assertions (tests 4, 5, 6). Timestamps DESC to bypass T17's
// render-time sort interfering with assertions on row content.
const fixtures: EventV2Type[] = [
  {
    type: 'state_changed',
    timestamp: '2026-04-27T12:00:02.000Z',
    session: 'sherpa',
    data: { from: 'paused', to: 'armed', triggered_by: 'operator' },
  },
  {
    type: 'commit_landed',
    timestamp: '2026-04-27T12:00:01.000Z',
    session: 'scribe',
    data: { sha: 'abc1234', subject: 'fix bug', branch: 'main' },
  },
  {
    type: 'commit_landed',
    timestamp: '2026-04-27T12:00:00.000Z',
    session: 'sherpa',
    data: { sha: 'def5678', subject: 'add feat', branch: 'main' },
  },
];

// Mock session list returned by MSW /v2/sessions handler. T19 tests
// override per-test via server.use(); default 1-session handler from
// handlers.ts works for some tests, dedicated 3-session override for
// dropdown population test.
const baseSession = {
  cwd: '/test/path',
  tmux_target: 'x:0.0',
  handoff_path: '/HANDOFF.md',
  last_prompt_sent_at: null,
  last_handoff_pulled_at: null,
  state: 'armed' as const,
  last_commit_sha: null,
  last_status_json_at: null,
  computed_status: 'idle' as const,
  status_json: null,
  recent_events: [],
};

beforeEach(() => {
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
  localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
});

describe('WEB-T19 TickerFilters', () => {
  it('renders both filter dropdowns + Clear filter button', () => {
    const { wrapper } = createWrapper();
    render(<TickerPanel />, { wrapper });
    // Native <select> elements have role="combobox" via aria. T19
    // Decision 6: native select + aria-label per accessibility +
    // happy-dom/RTL clean support.
    expect(
      screen.getByRole('combobox', { name: /filter by session/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /filter by event type/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /clear filter/i }),
    ).toBeInTheDocument();
  });

  it('session dropdown options populated from useSessions data ("All" + each session name)', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: {
            sherpa: baseSession,
            scribe: baseSession,
            atlas: baseSession,
          },
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<TickerPanel />, { wrapper });
    const sessionSelect = await screen.findByRole('combobox', {
      name: /filter by session/i,
    });
    // Wait for query to resolve and dropdown to populate.
    // 4 options: "All" + 3 sessions.
    await new Promise((r) => setTimeout(r, 50));
    const options = within(sessionSelect).getAllByRole('option');
    expect(options.length).toBe(4);
    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).toContain('All');
    expect(optionTexts).toContain('sherpa');
    expect(optionTexts).toContain('scribe');
    expect(optionTexts).toContain('atlas');
  });

  it('event-type dropdown has all 7 §5.3 frozen types as options ("All" + 7 = 8)', () => {
    const { wrapper } = createWrapper();
    render(<TickerPanel />, { wrapper });
    const typeSelect = screen.getByRole('combobox', {
      name: /filter by event type/i,
    });
    const options = within(typeSelect).getAllByRole('option');
    expect(options.length).toBe(8);
    const optionTexts = options.map((o) => o.textContent);
    // Verbatim §5.3 type strings — finding-#32 discipline at
    // test-assertion layer (operator pre-reg ack note).
    expect(optionTexts).toContain('All');
    expect(optionTexts).toContain('handoff_written');
    expect(optionTexts).toContain('commit_landed');
    expect(optionTexts).toContain('state_changed');
    expect(optionTexts).toContain('prompt_sent');
    expect(optionTexts).toContain('test_status_updated');
    expect(optionTexts).toContain('cairn_violation_detected');
    expect(optionTexts).toContain('gate_trip');
  });

  it('session filter selects single dimension — only matching events render', async () => {
    // useSessions resolves async; selecting 'scribe' on a select that
    // hasn't yet rendered the scribe option silently snaps value to ''
    // (native HTML behavior). Override MSW with both fixture sessions
    // and waitFor population before firing change.
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: { sherpa: baseSession, scribe: baseSession },
        }),
      ),
    );
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { events: fixtures } as any,
    );
    const { wrapper } = createWrapper();
    render(<TickerPanel />, { wrapper });
    const region = screen.getByRole('region', { name: /activity/i });
    const sessionSelect = screen.getByRole('combobox', {
      name: /filter by session/i,
    });

    // Wait for sessions list to populate the dropdown.
    await screen.findByRole('option', { name: 'scribe' });

    // Initial: 3 rows visible (no filter)
    expect(within(region).queryAllByTestId('ticker-row').length).toBe(3);

    // Filter by session=sherpa → 2 rows (state_changed + commit_landed for sherpa)
    fireEvent.change(sessionSelect, { target: { value: 'sherpa' } });
    expect(within(region).queryAllByTestId('ticker-row').length).toBe(2);

    // Filter by session=scribe → 1 row
    fireEvent.change(sessionSelect, { target: { value: 'scribe' } });
    expect(within(region).queryAllByTestId('ticker-row').length).toBe(1);
  });

  it('event-type filter selects single dimension', () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { events: fixtures } as any,
    );
    const { wrapper } = createWrapper();
    render(<TickerPanel />, { wrapper });
    const region = screen.getByRole('region', { name: /activity/i });

    // Filter by type=commit_landed → 2 rows (one per session)
    fireEvent.change(
      screen.getByRole('combobox', { name: /filter by event type/i }),
      { target: { value: 'commit_landed' } },
    );
    const rows = within(region).queryAllByTestId('ticker-row');
    expect(rows.length).toBe(2);
    rows.forEach((row) => {
      expect(row.textContent).toContain('commit_landed');
    });
  });

  it('both filters AND-compose — only events matching both render', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: { sherpa: baseSession, scribe: baseSession },
        }),
      ),
    );
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { events: fixtures } as any,
    );
    const { wrapper } = createWrapper();
    render(<TickerPanel />, { wrapper });
    const region = screen.getByRole('region', { name: /activity/i });

    await screen.findByRole('option', { name: 'sherpa' });

    // session=sherpa AND type=commit_landed → 1 row (sherpa's commit_landed)
    fireEvent.change(
      screen.getByRole('combobox', { name: /filter by session/i }),
      { target: { value: 'sherpa' } },
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: /filter by event type/i }),
      { target: { value: 'commit_landed' } },
    );
    const rows = within(region).queryAllByTestId('ticker-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('commit_landed');
    expect(rows[0].textContent).toContain('sherpa');
  });

  it('Clear filter button resets both filters; disabled when no filter is active', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: { sherpa: baseSession, scribe: baseSession },
        }),
      ),
    );
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { events: fixtures } as any,
    );
    const { wrapper } = createWrapper();
    render(<TickerPanel />, { wrapper });
    const region = screen.getByRole('region', { name: /activity/i });
    const clearBtn = screen.getByRole('button', { name: /clear filter/i });

    await screen.findByRole('option', { name: 'sherpa' });

    // Initially: no filter active, Clear disabled (Decision 5)
    expect((clearBtn as HTMLButtonElement).disabled).toBe(true);

    // Activate both filters
    fireEvent.change(
      screen.getByRole('combobox', { name: /filter by session/i }),
      { target: { value: 'sherpa' } },
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: /filter by event type/i }),
      { target: { value: 'commit_landed' } },
    );
    expect(within(region).queryAllByTestId('ticker-row').length).toBe(1);
    expect((clearBtn as HTMLButtonElement).disabled).toBe(false);

    // Click Clear → both reset; all rows visible; button disabled again
    fireEvent.click(clearBtn);
    expect(within(region).queryAllByTestId('ticker-row').length).toBe(3);
    expect((clearBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('empty/loading session list — dropdown renders with just "All" option, no crash', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({ sessions: {} }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<TickerPanel />, { wrapper });
    const sessionSelect = await screen.findByRole('combobox', {
      name: /filter by session/i,
    });
    // Allow query to resolve
    await new Promise((r) => setTimeout(r, 50));
    const options = within(sessionSelect).getAllByRole('option');
    expect(options.length).toBe(1);
    expect(options[0].textContent).toBe('All');
    // Component renders successfully (no thrown error reaching this assert)
    expect(
      screen.getByRole('region', { name: /activity/i }),
    ).toBeInTheDocument();
  });
});
