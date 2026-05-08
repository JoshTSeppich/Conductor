/**
 * mb-t11a — OrchestratorCard: assign-task render (MB-T11-A WB1 RED)
 *
 * RED: OrchestratorCard does not handle assign-task type variant yet.
 * GREEN: Renders target session name + task description + parameter table when provided.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrchestratorCard } from '../src/orchestrator-cards/orchestrator-card.js';

const assignTaskVariant = {
  type: 'assign-task',
  sessionName: 'sherpa-001',
  taskDescription: 'Implement the JWT authentication middleware.',
  rationale: 'Auth is the unblocking dependency for all session work.',
} as const;

const assignTaskWithParams = {
  type: 'assign-task',
  sessionName: 'atlas-001',
  taskDescription: 'Write comprehensive tests for the payment service.',
  parameters: {
    target_coverage: '90%',
    deadline: '2026-05-10',
    priority: 'high',
  },
  rationale: 'Payment tests are a ship gate per MB-T07 acceptance.',
} as const;

describe('MB-T11-A — OrchestratorCard assign-task variant', () => {
  it('renders without crashing when given an assign-task card', () => {
    render(
      <OrchestratorCard
        card_id="at-001"
        card={assignTaskVariant as any}
      />,
    );
    expect(screen.getByTestId('orchestrator-card')).toBeInTheDocument();
  });

  it('renders the action type identifier', () => {
    render(
      <OrchestratorCard
        card_id="at-001"
        card={assignTaskVariant as any}
      />,
    );
    expect(
      screen.getByTestId('orchestrator-card-action-type'),
    ).toHaveTextContent('assign-task');
  });

  it('renders the target session name', () => {
    render(
      <OrchestratorCard
        card_id="at-001"
        card={assignTaskVariant as any}
      />,
    );
    expect(screen.getByTestId('orchestrator-card-session-name')).toHaveTextContent(
      'sherpa-001',
    );
  });

  it('renders the task description', () => {
    render(
      <OrchestratorCard
        card_id="at-001"
        card={assignTaskVariant as any}
      />,
    );
    expect(
      screen.getByTestId('orchestrator-card-task-description'),
    ).toHaveTextContent('Implement the JWT authentication middleware.');
  });

  it('does NOT render a parameter table when parameters is absent', () => {
    render(
      <OrchestratorCard
        card_id="at-001"
        card={assignTaskVariant as any}
      />,
    );
    expect(
      screen.queryByTestId('orchestrator-card-parameters-table'),
    ).not.toBeInTheDocument();
  });

  it('renders a parameter table when parameters are provided', () => {
    render(
      <OrchestratorCard
        card_id="at-002"
        card={assignTaskWithParams as any}
      />,
    );
    expect(
      screen.getByTestId('orchestrator-card-parameters-table'),
    ).toBeInTheDocument();
  });

  it('renders each parameter key-value row in the table', () => {
    render(
      <OrchestratorCard
        card_id="at-002"
        card={assignTaskWithParams as any}
      />,
    );
    expect(screen.getByText('target_coverage')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('deadline')).toBeInTheDocument();
    expect(screen.getByText('2026-05-10')).toBeInTheDocument();
    expect(screen.getByText('priority')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('renders the rationale', () => {
    render(
      <OrchestratorCard
        card_id="at-001"
        card={assignTaskVariant as any}
      />,
    );
    expect(
      screen.getByText(/auth is the unblocking dependency/i),
    ).toBeInTheDocument();
  });
});
