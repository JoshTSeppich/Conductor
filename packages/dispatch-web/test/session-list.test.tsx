import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { SessionListPanel } from '../src/components/SessionListPanel.js';
import { useUIStore } from '../src/store/ui.js';

// Phase 2 Step 7 — wireframe variant C session list with M2 grouping
// (operator-arbitrated taxonomy). M2:
//   Active = computed_status in (running, awaiting_review)
//   Done   = state === 'killed'
//   Idle   = computed_status in (idle, stale)
// Filter chips:
//   all      = no filter
//   running  = computed_status === 'running'
//   trouble  = computed_status === 'stale' (default §7.3)

const baseSession = {
  cwd: '/test/repo',
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
  useUIStore.setState({
    sessionListFilter: 'all',
    commitBySession: {},
  });
});

describe('Phase 2 Step 7 — SessionListPanel (M2 grouping)', () => {
  it('renders three group headers: Active · N, Done · N, Idle · N', async () => {
    server.use(
      http.get('/v2/sessions', () => HttpResponse.json({ sessions: {} })),
    );
    const { wrapper } = createWrapper();
    render(<SessionListPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Active · 0/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Done · 0/)).toBeInTheDocument();
    expect(screen.getByText(/Idle · 0/)).toBeInTheDocument();
  });

  it('buckets per M2: running+awaiting_review → Active; killed → Done; idle+stale → Idle', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: {
            'run-1': { ...baseSession, computed_status: 'running' },
            'aw-1': { ...baseSession, computed_status: 'awaiting_review' },
            'kill-1': {
              ...baseSession,
              state: 'killed' as const,
              computed_status: 'idle',
            },
            'idle-1': { ...baseSession, computed_status: 'idle' },
            'stale-1': { ...baseSession, computed_status: 'stale' },
          },
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<SessionListPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Active · 2/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Done · 1/)).toBeInTheDocument();
    expect(screen.getByText(/Idle · 2/)).toBeInTheDocument();

    // Sessions appear in their correct group's region
    const active = screen.getByTestId('session-group-active');
    expect(active).toHaveTextContent('run-1');
    expect(active).toHaveTextContent('aw-1');

    const done = screen.getByTestId('session-group-done');
    expect(done).toHaveTextContent('kill-1');

    const idle = screen.getByTestId('session-group-idle');
    expect(idle).toHaveTextContent('idle-1');
    expect(idle).toHaveTextContent('stale-1');
  });

  it('filter=running narrows to computed_status running only', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: {
            'run-1': { ...baseSession, computed_status: 'running' },
            'aw-1': { ...baseSession, computed_status: 'awaiting_review' },
            'idle-1': { ...baseSession, computed_status: 'idle' },
            'stale-1': { ...baseSession, computed_status: 'stale' },
          },
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<SessionListPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('run-1')).toBeInTheDocument();
    });

    act(() => {
      useUIStore.getState().setSessionListFilter('running');
    });

    expect(screen.getByText('run-1')).toBeInTheDocument();
    expect(screen.queryByText('aw-1')).not.toBeInTheDocument();
    expect(screen.queryByText('idle-1')).not.toBeInTheDocument();
    expect(screen.queryByText('stale-1')).not.toBeInTheDocument();
    // Counts reflect filtered set
    expect(screen.getByText(/Active · 1/)).toBeInTheDocument();
    expect(screen.getByText(/Idle · 0/)).toBeInTheDocument();
  });

  it('filter=trouble narrows to computed_status stale only', async () => {
    server.use(
      http.get('/v2/sessions', () =>
        HttpResponse.json({
          sessions: {
            'run-1': { ...baseSession, computed_status: 'running' },
            'stale-1': { ...baseSession, computed_status: 'stale' },
            'idle-1': { ...baseSession, computed_status: 'idle' },
          },
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<SessionListPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('stale-1')).toBeInTheDocument();
    });

    act(() => {
      useUIStore.getState().setSessionListFilter('trouble');
    });

    expect(screen.getByText('stale-1')).toBeInTheDocument();
    expect(screen.queryByText('run-1')).not.toBeInTheDocument();
    expect(screen.queryByText('idle-1')).not.toBeInTheDocument();
    expect(screen.getByText(/Idle · 1/)).toBeInTheDocument();
    expect(screen.getByText(/Active · 0/)).toBeInTheDocument();
  });

  it('mounts FilterChips above the list', async () => {
    server.use(
      http.get('/v2/sessions', () => HttpResponse.json({ sessions: {} })),
    );
    const { wrapper } = createWrapper();
    render(<SessionListPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Running' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trouble' })).toBeInTheDocument();
  });

  it('region role for AT exposure with name="Sessions"', async () => {
    server.use(
      http.get('/v2/sessions', () => HttpResponse.json({ sessions: {} })),
    );
    const { wrapper } = createWrapper();
    render(<SessionListPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /sessions/i })).toBeInTheDocument();
    });
  });
});
