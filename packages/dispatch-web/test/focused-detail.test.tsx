import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { FocusedDetailPanel } from '../src/components/FocusedDetailPanel.js';
import { useUIStore } from '../src/store/ui.js';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';

// Standard bundle refactor (MB-F-DETAIL-PANE-STANDARD-BUNDLE).
// Real fields surfaced: status (computed_status), last activity
// timestamp (max of last_prompt_sent_at / last_handoff_pulled_at).
// Mock fields per Phase 1 §2: model chip, plan summary, cost
// summary, recent stdout snippet (10 lines). Each mock field
// carries data-mock="true" on its wrapper per operator Q3 / Q6
// arbitration. State / Last commit / Tests / Phase rows from the
// pre-refactor 6-field set are removed (not in Standard bundle).
const baseSession: SessionResponseV2Type = {
  cwd: '/test/path',
  tmux_target: 'sherpa:0.0',
  handoff_path: '/test/HANDOFF.md',
  last_prompt_sent_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  last_handoff_pulled_at: null,
  state: 'armed',
  last_commit_sha: null,
  last_status_json_at: null,
  computed_status: 'awaiting_review',
  status_json: null,
  recent_events: [],
};

beforeEach(() => {
  // commitBySession reset preserved per operator Q4 — harmless after
  // refactor (FocusedDetailPanel no longer subscribes) and avoids
  // gratuitous test-isolation pattern churn.
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
  localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
});

describe('FocusedDetailPanel — Standard bundle', () => {
  it('renders placeholder "Click a session card" when no focus', () => {
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    expect(screen.getByText(/click a session card/i)).toBeInTheDocument();
  });

  it('shows loading state while useSession is fetching', () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    expect(
      screen.getByText(/loading session details/i),
    ).toBeInTheDocument();
  });

  it('shows error message when useSession fetch fails', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'ghost' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () => HttpResponse.error()),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(
        screen.getByText(/couldn't load session details/i),
      ).toBeInTheDocument();
    });
  });

  it('renders status (computed_status) and last activity age in success branch', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () => HttpResponse.json(baseSession)),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/awaiting_review/i)).toBeInTheDocument();
    });
    const lastActivity = screen.getByTestId('detail-row-last-activity');
    // last_prompt_sent_at is 5 min ago → formatAge → "5m"
    expect(lastActivity.textContent).toMatch(/5m/);
    expect(lastActivity.textContent).toMatch(/Last activity/i);
  });

  it('renders em dash for last activity when both timestamps are null', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () =>
        HttpResponse.json({
          ...baseSession,
          last_prompt_sent_at: null,
          last_handoff_pulled_at: null,
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/awaiting_review/i)).toBeInTheDocument();
    });
    const lastActivity = screen.getByTestId('detail-row-last-activity');
    expect(lastActivity.textContent).toMatch(/—/);
  });

  it('renders mock model chip with data-mock="true"', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () => HttpResponse.json(baseSession)),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/awaiting_review/i)).toBeInTheDocument();
    });
    const chip = screen.getByTestId('detail-row-model');
    expect(chip).toHaveAttribute('data-mock', 'true');
    expect(chip.textContent).toMatch(/claude-/i);
  });

  it('renders mock plan summary with data-mock="true"', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () => HttpResponse.json(baseSession)),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/awaiting_review/i)).toBeInTheDocument();
    });
    const plan = screen.getByTestId('detail-row-plan');
    expect(plan).toHaveAttribute('data-mock', 'true');
  });

  it('renders mock cost summary with data-mock="true"', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () => HttpResponse.json(baseSession)),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/awaiting_review/i)).toBeInTheDocument();
    });
    const cost = screen.getByTestId('detail-row-cost');
    expect(cost).toHaveAttribute('data-mock', 'true');
  });

  it('renders mock stdout snippet with exactly 10 lines and data-mock="true"', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () => HttpResponse.json(baseSession)),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/awaiting_review/i)).toBeInTheDocument();
    });
    const snippet = screen.getByTestId('detail-stdout-snippet');
    expect(snippet).toHaveAttribute('data-mock', 'true');
    const pre = snippet.querySelector('pre');
    expect(pre).not.toBeNull();
    const lines = pre!.textContent!.split('\n');
    expect(lines.length).toBe(10);
  });

  it('regression: StateControlCluster Arm/Pause/Hold/Kill buttons render in success branch', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () => HttpResponse.json(baseSession)),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/awaiting_review/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Arm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kill' })).toBeInTheDocument();
  });

  it('regression: SendButton + PullButton render in success branch', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () => HttpResponse.json(baseSession)),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/awaiting_review/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pull' })).toBeInTheDocument();
  });
});
