/**
 * mb-t11a — OrchestratorCard: pull-handoff-from-session render (MB-T11-A WB1 RED)
 *
 * RED: OrchestratorCard does not handle pull-handoff-from-session type variant yet.
 * GREEN: Renders target session name only (no payload preview per §1 spec).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrchestratorCard } from '../src/orchestrator-cards/orchestrator-card.js';

const pullHandoffVariant = {
  type: 'pull-handoff-from-session',
  sessionName: 'sherpa-001',
  rationale: 'Reading HANDOFF.md to understand current session state before deciding next action.',
} as const;

describe('MB-T11-A — OrchestratorCard pull-handoff-from-session variant', () => {
  it('renders without crashing when given a pull-handoff-from-session card', () => {
    render(
      <OrchestratorCard
        card_id="pull-001"
        card={pullHandoffVariant as any}
      />,
    );
    expect(screen.getByTestId('orchestrator-card')).toBeInTheDocument();
  });

  it('renders the action type identifier', () => {
    render(
      <OrchestratorCard
        card_id="pull-001"
        card={pullHandoffVariant as any}
      />,
    );
    expect(
      screen.getByTestId('orchestrator-card-action-type'),
    ).toHaveTextContent('pull-handoff-from-session');
  });

  it('renders the target session name', () => {
    render(
      <OrchestratorCard
        card_id="pull-001"
        card={pullHandoffVariant as any}
      />,
    );
    expect(screen.getByTestId('orchestrator-card-session-name')).toHaveTextContent(
      'sherpa-001',
    );
  });

  it('does NOT render a payload preview (pull-handoff has no payload content per §1 spec)', () => {
    render(
      <OrchestratorCard
        card_id="pull-001"
        card={pullHandoffVariant as any}
      />,
    );
    // pull-handoff is a read-only endpoint call; the card shows session name only.
    // No prompt, no reason, no initial-prompt — per §1 spec "no payload preview".
    expect(
      screen.queryByTestId('orchestrator-card-prompt-preview'),
    ).not.toBeInTheDocument();
  });

  it('renders the rationale', () => {
    render(
      <OrchestratorCard
        card_id="pull-001"
        card={pullHandoffVariant as any}
      />,
    );
    expect(
      screen.getByText(/reading handoff\.md to understand current session state/i),
    ).toBeInTheDocument();
  });
});
