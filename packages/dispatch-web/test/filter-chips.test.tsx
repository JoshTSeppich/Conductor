import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterChips } from '../src/components/FilterChips.js';
import { useUIStore } from '../src/store/ui.js';

// Per-test reset of just the slot under test. Other store fields
// untouched to keep the diff focused on FilterChips behavior.
beforeEach(() => {
  useUIStore.setState({ sessionListFilter: 'all' });
});

describe('Phase 2 Step 2 — FilterChips', () => {
  it('renders three chips: All, Running, Trouble', () => {
    render(<FilterChips />);
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Running' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trouble' })).toBeInTheDocument();
  });

  it('marks the chip matching sessionListFilter via aria-pressed=true', () => {
    render(<FilterChips />);
    const all = screen.getByRole('button', { name: 'All' });
    const running = screen.getByRole('button', { name: 'Running' });
    const trouble = screen.getByRole('button', { name: 'Trouble' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(running).toHaveAttribute('aria-pressed', 'false');
    expect(trouble).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a chip calls setSessionListFilter and updates aria-pressed', () => {
    render(<FilterChips />);
    fireEvent.click(screen.getByRole('button', { name: 'Running' }));
    expect(useUIStore.getState().sessionListFilter).toBe('running');
    expect(screen.getByRole('button', { name: 'Running' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('reflects external store changes (e.g. URL hash, future deeplink)', () => {
    render(<FilterChips />);
    useUIStore.getState().setSessionListFilter('trouble');
    expect(screen.getByRole('button', { name: 'Trouble' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
