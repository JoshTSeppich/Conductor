import { describe, it, expect, beforeEach } from 'vitest';
import {
  render,
  screen,
  within,
  waitFor,
  fireEvent,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { KanbanPanel } from '../src/components/KanbanPanel.js';
import { useUIStore } from '../src/store/ui.js';

const STORAGE_KEY = 'show-archived';

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

describe('WEB-T09 KanbanPanel', () => {
  it('renders 4 main columns in v1 sort order (awaiting_review > stale > running > idle)', async () => {
    // Seed ≥1 non-killed session so the column grid renders (post-WB2
    // conditional: 0 non-killed → KanbanEmptyState, not columns). The
    // sort-order assertion is independent of which column the seeded
    // session lands in.
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: {
            'seed-session': { ...baseSession, computed_status: 'idle' },
          },
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<KanbanPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('seed-session')).toBeInTheDocument();
    });
    const cols = screen.getAllByTestId(/^kanban-column-/);
    const ids = cols.map((c) => c.getAttribute('data-testid'));
    expect(ids).toEqual([
      'kanban-column-awaiting_review',
      'kanban-column-stale',
      'kanban-column-running',
      'kanban-column-idle',
    ]);
  });

  it('groups sessions by computed_status into the correct column', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: {
            'session-aw': { ...baseSession, computed_status: 'awaiting_review' },
            'session-st': { ...baseSession, computed_status: 'stale' },
            'session-ru': { ...baseSession, computed_status: 'running' },
            'session-id': { ...baseSession, computed_status: 'idle' },
          },
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<KanbanPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('session-aw')).toBeInTheDocument();
    });

    const colAw = screen.getByTestId('kanban-column-awaiting_review');
    expect(within(colAw).getByText('session-aw')).toBeInTheDocument();
    const colSt = screen.getByTestId('kanban-column-stale');
    expect(within(colSt).getByText('session-st')).toBeInTheDocument();
    const colRu = screen.getByTestId('kanban-column-running');
    expect(within(colRu).getByText('session-ru')).toBeInTheDocument();
    const colId = screen.getByTestId('kanban-column-idle');
    expect(within(colId).getByText('session-id')).toBeInTheDocument();
  });

  it('hides killed sessions by default (showArchived=false); no Archived column rendered', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: {
            'live-session': { ...baseSession, computed_status: 'idle' },
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
      expect(screen.getByText('live-session')).toBeInTheDocument();
    });
    expect(screen.queryByText('dead-session')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kanban-column-archived')).not.toBeInTheDocument();
  });

  it('shows Archived 5th column with killed sessions when showArchived=true', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { showArchived: true } as any,
    );
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: {
            'live-session': { ...baseSession, computed_status: 'idle' },
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

    // Combined waitFor: archived column exists AND data has loaded
    // into it. Single sync assertion can race the async useSessions
    // query which initially renders empty-state placeholder before
    // data arrives.
    await waitFor(() => {
      const archived = screen.getByTestId('kanban-column-archived');
      expect(within(archived).getByText('dead-session')).toBeInTheDocument();
    });
    // Now sync-safe: data resolved, all columns rendered.
    const idle = screen.getByTestId('kanban-column-idle');
    expect(within(idle).queryByText('dead-session')).not.toBeInTheDocument();
  });

  it('archive toggle checkbox exists in header; click toggles Zustand state and writes localStorage', async () => {
    server.use(
      http.get('/v2/sessions', () => HttpResponse.json({ sessions: {} })),
    );
    const { wrapper } = createWrapper();
    render(<KanbanPanel />, { wrapper });

    const checkbox = await screen.findByRole('checkbox', {
      name: /show archived/i,
    });
    expect(checkbox).toBeInTheDocument();
    expect((checkbox as HTMLInputElement).checked).toBe(false);

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(useUIStore.getState().showArchived).toBe(true);
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('on mount with localStorage="true", restores showArchived (Archived column visible)', async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
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
      expect(screen.getByTestId('kanban-column-archived')).toBeInTheDocument();
    });
    expect(useUIStore.getState().showArchived).toBe(true);
  });
});
