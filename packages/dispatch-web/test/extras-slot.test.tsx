import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { createWrapper } from './test-utils.js';
import { VALID_TEST_TOKEN } from './msw/handlers.js';
import { SessionListPanel } from '../src/components/SessionListPanel.js';
import { useUIStore } from '../src/store/ui.js';

// Cooperative cross-session follow-up. Session 2 (MB-T07) needs a
// mount target for OrchestratorCardsLane. Session 1's swap from
// KanbanPanel → SessionListPanel (commit 387ed6d) invalidated the
// original target (KanbanColumn extras slot per scaffold §8.4 A2).
//
// New target: SessionListPanel `extras` slot — a single ReactNode
// prop. Session 1 provides the slot; Session 2 owns the rendering
// decision (operator-arbitrated separation per CLEANUP 1 resolution).

beforeEach(() => {
  localStorage.setItem('x-conductor-token', VALID_TEST_TOKEN);
  useUIStore.setState({
    sessionListFilter: 'all',
    commitBySession: {},
  });
});

describe('SessionListPanel extras slot', () => {
  it('renders extras content within the Sessions region when prop provided', async () => {
    server.use(
      http.get('/v2/sessions', () => HttpResponse.json({ sessions: {} })),
    );
    const { wrapper } = createWrapper();
    render(
      <SessionListPanel
        extras={<div data-testid="ext">orchestrator lane mount</div>}
      />,
      { wrapper },
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /sessions/i })).toBeInTheDocument();
    });
    const region = screen.getByRole('region', { name: /sessions/i });
    expect(within(region).getByTestId('ext')).toBeInTheDocument();
  });

  it('renders no extras DOM when prop omitted (backwards-compat)', async () => {
    server.use(
      http.get('/v2/sessions', () => HttpResponse.json({ sessions: {} })),
    );
    const { wrapper } = createWrapper();
    render(<SessionListPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /sessions/i })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('ext')).not.toBeInTheDocument();
  });

  it('extras renders alongside session groups (does not replace them)', async () => {
    server.use(
      http.get('/v2/sessions', () => HttpResponse.json({ sessions: {} })),
    );
    const { wrapper } = createWrapper();
    render(
      <SessionListPanel
        extras={<div data-testid="ext">lane</div>}
      />,
      { wrapper },
    );
    await waitFor(() => {
      expect(screen.getByTestId('ext')).toBeInTheDocument();
    });
    // Group regions still present — extras is additive, not replacement
    expect(screen.getByTestId('session-group-active')).toBeInTheDocument();
    expect(screen.getByTestId('session-group-done')).toBeInTheDocument();
    expect(screen.getByTestId('session-group-idle')).toBeInTheDocument();
  });
});
