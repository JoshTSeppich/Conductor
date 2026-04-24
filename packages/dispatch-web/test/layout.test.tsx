import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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

  it('per-panel error isolation: error in one panel renders panel fallback; siblings still render', () => {
    // Sub-case 1: error in KanbanPanel
    mockState.throwIn = 'kanban';
    const r1 = render(<Layout />);
    expect(screen.getByText(/sessions failed to render/i)).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /session detail/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /activity/i }),
    ).toBeInTheDocument();
    r1.unmount();

    // Sub-case 2: error in FocusedDetailPanel
    mockState.throwIn = 'focused';
    const r2 = render(<Layout />);
    expect(
      screen.getByRole('region', { name: /sessions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/session detail failed to render/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /activity/i }),
    ).toBeInTheDocument();
    r2.unmount();

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
