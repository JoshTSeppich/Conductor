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
  // §4 recommendation 1. Mock-marker on the cluster wrapper, NOT on
  // the primitives themselves (those are pure props-in components).
  describe('Phase 2 Step 5 — header mock cluster', () => {
    it('renders PlanRing as progressbar in header', () => {
      render(<Layout />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders CostPill with mock USD amount', () => {
      render(<Layout />);
      // Mock fixture: 0.42 — matches operator wireframe example.
      expect(screen.getByText(/api · \$0\.42 today/)).toBeInTheDocument();
    });

    it('marks the mock cluster with data-mock="true" for dev visibility', () => {
      const { container } = render(<Layout />);
      const mockCluster = container.querySelector('[data-mock="true"]');
      expect(mockCluster).not.toBeNull();
    });

    it('keeps the Conductor wordmark in header', () => {
      render(<Layout />);
      expect(screen.getByText(/Foxworks Dispatch Conductor/i)).toBeInTheDocument();
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
