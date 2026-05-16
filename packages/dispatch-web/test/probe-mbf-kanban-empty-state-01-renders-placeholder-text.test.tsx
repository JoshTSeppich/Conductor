import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KanbanEmptyState } from '../src/components/KanbanEmptyState.js';

describe('MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX WB1 KanbanEmptyState', () => {
  it('renders the placeholder text (operator-perceived-blank-rectangle fix)', () => {
    render(<KanbanEmptyState />);
    expect(
      screen.getByText(/no active sessions/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/click \+ spawn session to start/i),
    ).toBeInTheDocument();
  });

  it('exposes a data-testid="kanban-empty-state" for conditional-render assertions', () => {
    render(<KanbanEmptyState />);
    expect(screen.getByTestId('kanban-empty-state')).toBeInTheDocument();
  });
});
