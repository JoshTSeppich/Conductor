import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { FocusedDetailPanel } from '../src/components/FocusedDetailPanel.js';
import { useUIStore } from '../src/store/ui.js';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';

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

describe('WEB-T12 FocusedDetailPanel', () => {
  it('renders placeholder "Click a session card" when no focus', () => {
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    expect(screen.getByText(/click a session card/i)).toBeInTheDocument();
  });

  it('renders state, computed_status, and last action age when focused with complete data', async () => {
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
      expect(screen.getByText('ARMED')).toBeInTheDocument();
    });
    expect(screen.getByText(/awaiting_review/i)).toBeInTheDocument();
    // last action age = 5m (last_prompt_sent_at is 5min ago)
    expect(screen.getByText('5m')).toBeInTheDocument();
  });

  it('renders status_json fields when present + populated', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () =>
        HttpResponse.json({
          ...baseSession,
          status_json: {
            phase: 'WEB-T12 implementation',
            tests_passing: 23,
            tests_failing: 0,
            unknowns: [],
            last_action: 'green commit',
            updated_at: new Date().toISOString(),
          },
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/WEB-T12 implementation/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/23 passing/i)).toBeInTheDocument();
    expect(screen.getByText(/0 failing/i)).toBeInTheDocument();
  });

  it('renders em dash placeholders when status_json is absent (null)', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () =>
        HttpResponse.json({ ...baseSession, status_json: null }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('ARMED')).toBeInTheDocument();
    });
    // Both Tests row and Phase row render with em dash for null status_json
    const phaseRow = screen.getByTestId('detail-row-phase');
    const testsRow = screen.getByTestId('detail-row-tests');
    expect(phaseRow.textContent).toMatch(/—/);
    expect(testsRow.textContent).toMatch(/—/);
  });

  it('renders per-field em dash when status_json present but tests_passing is null', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () =>
        HttpResponse.json({
          ...baseSession,
          status_json: {
            phase: 'mid-implementation',
            tests_passing: null,
            tests_failing: 5,
            last_action: null,
            updated_at: new Date().toISOString(),
          },
        }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/mid-implementation/i)).toBeInTheDocument();
    });
    const testsRow = screen.getByTestId('detail-row-tests');
    // tests_passing is null → "—"; tests_failing is 5 → "5 failing" still renders
    expect(testsRow.textContent).toMatch(/—/);
    expect(testsRow.textContent).toMatch(/5 failing/);
  });

  it('renders sha + subject + branch when commitBySession[name] entry present (GAP-2)', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {
        focusedSessionName: 'sherpa',
        commitBySession: {
          sherpa: {
            sha: 'abc123',
            subject: 'feat(WEB-T12): green',
            branch: 'main',
            at: '2026-04-23T12:00:00.000Z',
          },
        },
      } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () => HttpResponse.json(baseSession)),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('ARMED')).toBeInTheDocument();
    });
    const commitRow = screen.getByTestId('detail-row-commit');
    expect(commitRow.textContent).toMatch(/abc123/);
    expect(commitRow.textContent).toMatch(/feat\(WEB-T12\): green/);
    expect(commitRow.textContent).toMatch(/main/);
  });

  it('renders sha alone when commitBySession lacks entry but session.last_commit_sha present', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa', commitBySession: {} } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () =>
        HttpResponse.json({ ...baseSession, last_commit_sha: 'def456' }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('ARMED')).toBeInTheDocument();
    });
    const commitRow = screen.getByTestId('detail-row-commit');
    expect(commitRow.textContent).toMatch(/def456/);
    // No subject / branch text since fallback path
    expect(commitRow.textContent).not.toMatch(/feat\(/);
  });

  it('renders em dash when both commitBySession entry and session.last_commit_sha absent', async () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa', commitBySession: {} } as any,
    );
    server.use(
      http.get('/v2/sessions/:name', () =>
        HttpResponse.json({ ...baseSession, last_commit_sha: null }),
      ),
    );
    const { wrapper } = createWrapper();
    render(<FocusedDetailPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('ARMED')).toBeInTheDocument();
    });
    const commitRow = screen.getByTestId('detail-row-commit');
    expect(commitRow.textContent).toMatch(/—/);
  });

  it('shows loading state while useSession is fetching', () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { focusedSessionName: 'sherpa' } as any,
    );
    // Default MSW handler responds eventually; first synchronous render
    // catches isLoading=true.
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
});
