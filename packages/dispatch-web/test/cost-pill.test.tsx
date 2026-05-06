import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostPill } from '../src/components/CostPill.js';

// Phase 2 Step 4 — CostPill presentational primitive.
// Wireframe variant C header: "api · $0.42 today" rounded badge.

describe('Phase 2 Step 4 — CostPill', () => {
  it('renders the api·$X today pattern with two-decimal USD', () => {
    render(<CostPill usdToday={0.42} />);
    expect(screen.getByText(/api · \$0\.42 today/)).toBeInTheDocument();
  });

  it('renders thousands separator for large amounts', () => {
    render(<CostPill usdToday={1234.56} />);
    expect(screen.getByText(/\$1,234\.56/)).toBeInTheDocument();
  });

  it('renders $0.00 for zero spend', () => {
    render(<CostPill usdToday={0} />);
    expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
  });

  it('has aria-label exposing the cost for assistive tech', () => {
    render(<CostPill usdToday={42.5} />);
    expect(screen.getByLabelText(/API cost today/i)).toBeInTheDocument();
  });

  it('always shows two decimals (no $42 truncation)', () => {
    render(<CostPill usdToday={42} />);
    expect(screen.getByText(/\$42\.00/)).toBeInTheDocument();
  });
});
