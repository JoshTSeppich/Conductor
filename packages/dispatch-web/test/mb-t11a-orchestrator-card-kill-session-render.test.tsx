/**
 * mb-t11a — OrchestratorCard: kill-session render (MB-T11-A WB1 RED)
 *
 * RED: OrchestratorCard does not handle kill-session type variant yet.
 * GREEN: Renders target session name + optional reason.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrchestratorCard } from '../src/orchestrator-cards/orchestrator-card.js';

const killVariant = {
  type: 'kill-session',
  sessionName: 'sherpa-001',
  rationale: 'Task complete; session no longer needed.',
} as const;

const killWithReason = {
  type: 'kill-session',
  sessionName: 'atlas-002',
  reason: 'Session produced conflicting changes; manual resolution needed.',
  rationale: 'Conflict detected between sessions on the same file.',
} as const;

describe('MB-T11-A — OrchestratorCard kill-session variant', () => {
  it('renders without crashing when given a kill-session card', () => {
    render(
      <OrchestratorCard
        card_id="kill-001"
        card={killVariant as any}
      />,
    );
    expect(screen.getByTestId('orchestrator-card')).toBeInTheDocument();
  });

  it('renders the action type identifier', () => {
    render(
      <OrchestratorCard
        card_id="kill-001"
        card={killVariant as any}
      />,
    );
    expect(
      screen.getByTestId('orchestrator-card-action-type'),
    ).toHaveTextContent('kill-session');
  });

  it('renders the target session name', () => {
    render(
      <OrchestratorCard
        card_id="kill-001"
        card={killVariant as any}
      />,
    );
    expect(screen.getByTestId('orchestrator-card-session-name')).toHaveTextContent(
      'sherpa-001',
    );
  });

  it('does NOT render a reason element when reason is absent', () => {
    render(
      <OrchestratorCard
        card_id="kill-001"
        card={killVariant as any}
      />,
    );
    expect(
      screen.queryByTestId('orchestrator-card-kill-reason'),
    ).not.toBeInTheDocument();
  });

  it('renders the reason when reason is provided', () => {
    render(
      <OrchestratorCard
        card_id="kill-002"
        card={killWithReason as any}
      />,
    );
    const reasonEl = screen.getByTestId('orchestrator-card-kill-reason');
    expect(reasonEl).toBeInTheDocument();
    expect(reasonEl.textContent).toContain(
      'Session produced conflicting changes',
    );
  });

  it('renders the rationale', () => {
    render(
      <OrchestratorCard
        card_id="kill-001"
        card={killVariant as any}
      />,
    );
    expect(screen.getByText(/task complete; session no longer needed/i)).toBeInTheDocument();
  });
});
