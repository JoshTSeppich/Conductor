import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanRing } from '../src/components/PlanRing.js';

// Phase 2 Step 3 — PlanRing presentational primitive. Mock-data
// source lives in Layout (Step 5); this component is pure visual.
// Wireframe variant C header: circular progress + reset countdown.

describe('Phase 2 Step 3 — PlanRing', () => {
  it('renders an SVG element', () => {
    const { container } = render(<PlanRing usagePct={47} resetMs={8040000} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders usagePct as text inside the ring', () => {
    render(<PlanRing usagePct={47} resetMs={8040000} />);
    expect(screen.getByText('47%')).toBeInTheDocument();
  });

  it('formats resetMs as "Xh Ym" when both hours and minutes present', () => {
    // 2h 14m = 2*3600000 + 14*60000 = 8040000
    render(<PlanRing usagePct={47} resetMs={8040000} />);
    expect(screen.getByText(/resets in 2h 14m/)).toBeInTheDocument();
  });

  it('formats resetMs as "Ym" when hours = 0', () => {
    // 23m = 23 * 60000 = 1380000
    render(<PlanRing usagePct={10} resetMs={1380000} />);
    expect(screen.getByText(/resets in 23m/)).toBeInTheDocument();
  });

  it('formats resetMs as "<1m" when sub-minute', () => {
    render(<PlanRing usagePct={10} resetMs={30000} />);
    expect(screen.getByText(/resets in <1m/)).toBeInTheDocument();
  });

  it('exposes role=progressbar with aria-valuenow/min/max', () => {
    render(<PlanRing usagePct={73} resetMs={3600000} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '73');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps usagePct above 100 to 100 for arc rendering and aria', () => {
    render(<PlanRing usagePct={150} resetMs={3600000} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps usagePct below 0 to 0', () => {
    render(<PlanRing usagePct={-5} resetMs={3600000} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
