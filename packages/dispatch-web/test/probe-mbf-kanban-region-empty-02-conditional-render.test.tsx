import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { KanbanPanel } from '../src/components/KanbanPanel.js';
import { useUIStore } from '../src/store/ui.js';

const baseSession = {
  cwd: '/test/path',
  tmux_target: 'sherpa:0.0',
  handoff_path: '/test/HANDOFF.md',
  last_prompt_sent_at: null,
  last_handoff_pulled_at: null,
  state: 'armed' as const,
  last_commit_sha: null,
  last_status_json_at: null,
  status_json: null,
  recent_events: [],
};

beforeEach(() => {
  localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
  useUIStore.setState(
    {
      showArchived: false,
      focusedSessionName: null,
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
});

describe('MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX WB2 KanbanPanel conditional render', () => {
  it('renders KanbanEmptyState when zero non-killed sessions in sessions.json', async () => {
    server.use(
      http.get('/v2/sessions', () => HttpResponse.json({ sessions: {} })),
    );
    const { wrapper } = createWrapper();
    render(<KanbanPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('kanban-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText(/no active sessions/i)).toBeInTheDocument();
    // Column grid should NOT render in empty state.
    expect(
      screen.queryByTestId('kanban-column-awaiting_review'),
    ).not.toBeInTheDocument();
  });

  it('renders KanbanEmptyState when only killed sessions present (zero non-killed)', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: {
            'dead-session': {
              ...baseSession,
              state: 'killed' as const,
              computed_status: 'idle',
            },
          },
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<KanbanPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('kanban-empty-state')).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId('kanban-column-awaiting_review'),
    ).not.toBeInTheDocument();
  });

  it('renders the column grid (not empty-state) when at least one non-killed session present', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: {
            'live-session': { ...baseSession, computed_status: 'idle' },
          },
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<KanbanPanel />, { wrapper });

    // Wait for actual data resolution (column scaffolding renders before
    // useSessions resolves; a sync getByText after waitFor-on-column races
    // the still-loading data).
    await waitFor(() => {
      expect(screen.getByText('live-session')).toBeInTheDocument();
    });
    expect(screen.getByTestId('kanban-column-awaiting_review')).toBeInTheDocument();
    expect(screen.queryByTestId('kanban-empty-state')).not.toBeInTheDocument();
  });

  it('preserves the Sessions header (title + Show archived checkbox) in empty state', async () => {
    server.use(
      http.get('/v2/sessions', () => HttpResponse.json({ sessions: {} })),
    );
    const { wrapper } = createWrapper();
    render(<KanbanPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('kanban-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /sessions/i })).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /show archived/i }),
    ).toBeInTheDocument();
  });
});
