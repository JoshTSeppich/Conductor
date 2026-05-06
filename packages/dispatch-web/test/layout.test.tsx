import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// vi.hoisted shares state across vi.mock factories so per-test
// behavior toggles work. mockState.throwIn = 'kanban' makes the
// KanbanPanel mock throw; null returns the placeholder element.
const mockState = vi.hoisted(() => ({
  throwIn: null as null | 'kanban' | 'focused' | 'ticker',
}));

vi.mock('../src/components/KanbanPanel.js', () => ({
  KanbanPanel: () => {
    if (mockState.throwIn === 'kanban') {
      throw new Error('kanban panel test error');
    }
    return (
      <section role="region" aria-label="Sessions">
        Sessions
      </section>
    );
  },
}));

// Phase 2 Step 8 — coexist-with-distinct-mock pattern. Layout's
// session-list mount is the SessionListPanel after the swap; before
// the swap Layout still imports KanbanPanel. The data-testid
// distinguishes which one actually rendered.
vi.mock('../src/components/SessionListPanel.js', () => ({
  SessionListPanel: () => {
    if (mockState.throwIn === 'kanban') {
      // Reuse the 'kanban' throwIn channel — error-isolation test
      // asserts on "Sessions failed to render", which is the panel-
      // name-derived fallback regardless of which component threw.
      throw new Error('session list panel test error');
    }
    return (
      <section
        role="region"
        aria-label="Sessions"
        data-testid="session-list-panel-mount"
      >
        Sessions
      </section>
    );
  },
}));

vi.mock('../src/components/FocusedDetailPanel.js', () => ({
  FocusedDetailPanel: () => {
    if (mockState.throwIn === 'focused') {
      throw new Error('focused panel test error');
    }
    return (
      <section role="region" aria-label="Session detail">
        Session detail
      </section>
    );
  },
}));

vi.mock('../src/components/TickerPanel.js', () => ({
  TickerPanel: () => {
    if (mockState.throwIn === 'ticker') {
      throw new Error('ticker panel test error');
    }
    return (
      <section role="region" aria-label="Activity">
        Activity
      </section>
    );
  },
}));

// SendModal mounted at Layout level (T15) calls useQueryClient via
// usePostPrompt. Layout-shape tests don't provide a QueryClient
// wrapper, so mock SendModal to a no-op. SendModal's own behavior is
// covered by test/send-modal.test.tsx with proper wrapper.
vi.mock('../src/components/SendModal.js', () => ({
  SendModal: () => null,
}));

import { Layout } from '../src/components/Layout.js';
import { useUIStore } from '../src/store/ui.js';

beforeEach(() => {
  mockState.throwIn = null;
  useUIStore.setState(
    {
      connectionStatus: 'connected',
      banners: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
});

describe('WEB-T06 Layout', () => {
  it('renders all 4 panel regions at default viewport', () => {
    render(<Layout />);
    expect(
      screen.getByRole('region', { name: /sessions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /session detail/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /activity/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /banners/i }),
    ).toBeInTheDocument();
  });

  it('shows ConnectionStatusBanner above the grid when status === daemon_down', () => {
    useUIStore.setState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { connectionStatus: 'daemon_down' } as any,
    );
    render(<Layout />);
    expect(screen.getByText(/daemon unreachable/i)).toBeInTheDocument();
    // Grid panels still present
    expect(
      screen.getByRole('region', { name: /sessions/i }),
    ).toBeInTheDocument();
  });

  it('InBannerHost slot renders empty (zero children) when banner queue is empty', () => {
    render(<Layout />);
    const banners = screen.getByRole('region', { name: /banners/i });
    expect(banners).toBeInTheDocument();
    expect(banners.children.length).toBe(0);
  });

  // Phase 2 Step 5 — header restructure: PlanRing + CostPill mounted
  // with mock constants per /tmp/sess-1-dispatch-web-ui-diagnose.md
  // §4 recommendation 1. Per-field data-mock markers live on PlanRing
  // + CostPill roots (sess-b finding #140 §Followups #2, closed by
  // sess-e batch-5) — mirrors FocusedDetailPanel's per-field pattern.
  // The cluster <div> wrapping them carries no data-mock (no redundancy).
  describe('Phase 2 Step 5 — header per-field mock markers', () => {
    it('renders PlanRing as progressbar in header', () => {
      render(<Layout />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders CostPill with mock USD amount', () => {
      render(<Layout />);
      // Mock fixture: 0.42 — matches operator wireframe example.
      expect(screen.getByText(/api · \$0\.42 today/)).toBeInTheDocument();
    });

    it('cluster wrapper does NOT carry data-mock; per-field markers live on PlanRing + CostPill roots', () => {
      render(<Layout />);
      // PlanRing + CostPill roots carry the marker (per-field pattern)
      expect(screen.getByTestId('header-plan-ring')).toHaveAttribute('data-mock', 'true');
      expect(screen.getByTestId('header-cost-pill')).toHaveAttribute('data-mock', 'true');
      // The cluster div wrapping them does not (no redundant marker)
      const planRoot = screen.getByTestId('header-plan-ring');
      const cluster = planRoot.parentElement;
      expect(cluster).not.toBeNull();
      expect(cluster).not.toHaveAttribute('data-mock');
    });

    it('keeps the Conductor wordmark in header', () => {
      render(<Layout />);
      expect(screen.getByText(/Foxworks Dispatch Conductor/i)).toBeInTheDocument();
    });
  });

  // Phase 2 Step 8 — Layout swaps mount from KanbanPanel to
  // SessionListPanel. Pre-swap: testid absent (KanbanPanel mock has
  // no testid). Post-swap: testid present.
  describe('Phase 2 Step 8 — SessionListPanel mount swap', () => {
    it('mounts SessionListPanel (not KanbanPanel) for the Sessions region', () => {
      render(<Layout />);
      expect(
        screen.getByTestId('session-list-panel-mount'),
      ).toBeInTheDocument();
    });
  });

  it('per-panel error isolation: error in one panel renders panel fallback; siblings still render', () => {
    // cleanup() between sub-cases removes the prior render's
    // container from document.body. unmount() alone leaves the
    // empty container, which makes subsequent screen.* queries
    // see DOM from prior renders.
    // Sub-case 1: error in KanbanPanel
    mockState.throwIn = 'kanban';
    render(<Layout />);
    expect(screen.getByText(/sessions failed to render/i)).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /session detail/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /activity/i }),
    ).toBeInTheDocument();
    cleanup();

    // Sub-case 2: error in FocusedDetailPanel
    mockState.throwIn = 'focused';
    render(<Layout />);
    expect(
      screen.getByRole('region', { name: /sessions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/session detail failed to render/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /activity/i }),
    ).toBeInTheDocument();
    cleanup();

    // Sub-case 3: error in TickerPanel
    mockState.throwIn = 'ticker';
    render(<Layout />);
    expect(
      screen.getByRole('region', { name: /sessions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /session detail/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/activity failed to render/i)).toBeInTheDocument();
  });
});
