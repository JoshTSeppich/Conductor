/**
 * mb-t11a — OrchestratorCard: spawn-session render (MB-T11-A WB1 RED)
 *
 * RED: OrchestratorCard does not handle spawn-session type variant yet.
 * GREEN: Renders repo path + session name + optional initial-prompt preview.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrchestratorCard } from '../src/orchestrator-cards/orchestrator-card.js';

const spawnVariant = {
  type: 'spawn-session',
  sessionName: 'sherpa-003',
  repoPath: '/Users/operator/projects/my-api',
  rationale: 'Need a dedicated session for the API refactor task.',
} as const;

const spawnWithInitialPrompt = {
  type: 'spawn-session',
  sessionName: 'atlas-002',
  repoPath: '/Users/operator/projects/frontend',
  initialPrompt: 'Please read HANDOFF.md and continue the component migration.',
  rationale: 'Frontend session needed for the UI task.',
} as const;

describe('MB-T11-A — OrchestratorCard spawn-session variant', () => {
  it('renders without crashing when given a spawn-session card', () => {
    render(
      <OrchestratorCard
        card_id="spawn-001"
        card={spawnVariant as any}
      />,
    );
    expect(screen.getByTestId('orchestrator-card')).toBeInTheDocument();
  });

  it('renders the action type identifier', () => {
    render(
      <OrchestratorCard
        card_id="spawn-001"
        card={spawnVariant as any}
      />,
    );
    expect(
      screen.getByTestId('orchestrator-card-action-type'),
    ).toHaveTextContent('spawn-session');
  });

  it('renders the target session name', () => {
    render(
      <OrchestratorCard
        card_id="spawn-001"
        card={spawnVariant as any}
      />,
    );
    expect(screen.getByTestId('orchestrator-card-session-name')).toHaveTextContent(
      'sherpa-003',
    );
  });

  it('renders the repo path', () => {
    render(
      <OrchestratorCard
        card_id="spawn-001"
        card={spawnVariant as any}
      />,
    );
    expect(screen.getByTestId('orchestrator-card-repo-path')).toHaveTextContent(
      '/Users/operator/projects/my-api',
    );
  });

  it('does NOT render initial-prompt preview when initialPrompt is absent', () => {
    render(
      <OrchestratorCard
        card_id="spawn-001"
        card={spawnVariant as any}
      />,
    );
    expect(
      screen.queryByTestId('orchestrator-card-initial-prompt-preview'),
    ).not.toBeInTheDocument();
  });

  it('renders initial-prompt preview when initialPrompt is present', () => {
    render(
      <OrchestratorCard
        card_id="spawn-002"
        card={spawnWithInitialPrompt as any}
      />,
    );
    expect(
      screen.getByTestId('orchestrator-card-initial-prompt-preview'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('orchestrator-card-initial-prompt-preview').textContent,
    ).toContain('Please read HANDOFF.md');
  });
});
