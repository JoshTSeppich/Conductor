import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { TickerPanel } from '../src/components/TickerPanel.js';
import { useUIStore } from '../src/store/ui.js';
import type { EventV2Type } from 'dispatch-core/src/v2/schema.js';

// Three fixture events spanning three of the seven §5.3 types and
// three sessions. Timestamps deliberately out of insertion order to
// verify Decision 3 render-time sort (newest at top, lexicographic
// desc on ISO-8601 strings).
const fixtureEvents: EventV2Type[] = [
  {
    type: 'state_changed',
    timestamp: '2026-04-27T10:00:00.000Z',
    session: 'sherpa',
    data: { from: 'paused', to: 'armed', triggered_by: 'operator' },
  },
  {
    type: 'commit_landed',
    timestamp: '2026-04-27T12:00:00.000Z',
    session: 'scribe',
    data: { sha: 'abc1234', subject: 'fix bug', branch: 'main' },
  },
  {
    type: 'handoff_written',
    timestamp: '2026-04-27T11:00:00.000Z',
    session: 'sherpa',
    data: { path: '/HANDOFF.md', size_bytes: 1024 },
  },
];

beforeEach(() => {
  useUIStore.setState(
    {
      focusedSessionName: null,
      showArchived: false,
      sendModalOpen: false,
      killConfirmOpen: false,
      killConfirmTarget: null,
      connectionStatus: 'connected',
      commitBySession: {},
      banners: [],
      authRetryNonce: 0,
      events: [],
      notificationsAvailable: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
  // T19 retrofit: TickerPanel now consumes useSessions via the
  // <TickerFilters> sibling. Default MSW /v2/sessions handler
  // requires VALID_TEST_TOKEN; pre-populate so the dropdown gets
  // populated cleanly. Tests below don't query the dropdown but
  // need the Query call to not error/loop.
  localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
});

describe('WEB-T17 TickerPanel', () => {
  it('renders panel region with role + aria-label preserved (T06 contract)', () => {
    render(<TickerPanel />, { wrapper: createWrapper().wrapper });
    const region = screen.getByRole('region', { name: /activity/i });
    expect(region).toBeInTheDocument();
  });

  it('section element has fixed-height class (h-40 per Decision 4)', () => {
    render(<TickerPanel />, { wrapper: createWrapper().wrapper });
    const region = screen.getByRole('region', { name: /activity/i });
    expect(region.className).toMatch(/\bh-40\b/);
  });

  it('section element has scrollable class (overflow-auto per Decision 5)', () => {
    render(<TickerPanel />, { wrapper: createWrapper().wrapper });
    const region = screen.getByRole('region', { name: /activity/i });
    expect(region.className).toMatch(/\boverflow-auto\b/);
  });

  it('0 events → no TickerRow rendered (region still mounts)', () => {
    render(<TickerPanel />, { wrapper: createWrapper().wrapper });
    const region = screen.getByRole('region', { name: /activity/i });
    expect(region).toBeInTheDocument();
    expect(within(region).queryAllByTestId('ticker-row').length).toBe(0);
  });

  it('N events → N TickerRow rendered', () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { events: fixtureEvents } as any,
    );
    render(<TickerPanel />, { wrapper: createWrapper().wrapper });
    const region = screen.getByRole('region', { name: /activity/i });
    expect(within(region).queryAllByTestId('ticker-row').length).toBe(3);
  });

  it('newest at top — render-time sort by timestamp desc', () => {
    // Insertion order: T0 (10:00) → T2 (12:00) → T1 (11:00).
    // Expected DOM order: T2 (12:00) → T1 (11:00) → T0 (10:00).
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { events: fixtureEvents } as any,
    );
    render(<TickerPanel />, { wrapper: createWrapper().wrapper });
    const region = screen.getByRole('region', { name: /activity/i });
    const rows = within(region).queryAllByTestId('ticker-row');
    expect(rows.length).toBe(3);
    // Row 0 = newest (12:00 commit_landed)
    expect(rows[0].textContent).toContain('commit_landed');
    expect(rows[0].textContent).toContain('scribe');
    // Row 1 = middle (11:00 handoff_written)
    expect(rows[1].textContent).toContain('handoff_written');
    // Row 2 = oldest (10:00 state_changed)
    expect(rows[2].textContent).toContain('state_changed');
  });

  it('each row renders type + session + timestamp (basic content; visual polish is T20)', () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { events: [fixtureEvents[1]] } as any,
    );
    render(<TickerPanel />, { wrapper: createWrapper().wrapper });
    const region = screen.getByRole('region', { name: /activity/i });
    const row = within(region).getByTestId('ticker-row');
    expect(row.textContent).toContain('commit_landed');
    expect(row.textContent).toContain('scribe');
    // Raw ISO timestamp acceptable for T17; T20 may swap to relative.
    expect(row.textContent).toContain('2026-04-27T12:00:00.000Z');
  });

  it('no layout shift — section className identical across 0 / N / N+overflow events', () => {
    // Sub-case 1: 0 events
    const { unmount: u0 } = render(<TickerPanel />, { wrapper: createWrapper().wrapper });
    const className0 = screen
      .getByRole('region', { name: /activity/i })
      .className;
    u0();

    // Sub-case 2: N events (small)
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { events: fixtureEvents } as any,
    );
    const { unmount: uN } = render(<TickerPanel />, { wrapper: createWrapper().wrapper });
    const classNameN = screen
      .getByRole('region', { name: /activity/i })
      .className;
    uN();

    // Sub-case 3: N events larger than visible window (50)
    const many: EventV2Type[] = Array.from({ length: 50 }, (_, i) => ({
      type: 'commit_landed' as const,
      timestamp: new Date(Date.UTC(2026, 3, 27, 12, 0, i)).toISOString(),
      session: 'sherpa',
      data: { sha: `sha${i}`, subject: `s${i}`, branch: 'main' },
    }));
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { events: many } as any,
    );
    render(<TickerPanel />, { wrapper: createWrapper().wrapper });
    const classNameOverflow = screen
      .getByRole('region', { name: /activity/i })
      .className;

    // Section className stable across event counts: fixed h-40 +
    // overflow-auto means container size never grows. Per operator
    // pre-reg ack note: assertion targets section element className
    // only, not aggregate classes across inner content.
    expect(classNameN).toBe(className0);
    expect(classNameOverflow).toBe(className0);
  });
});
