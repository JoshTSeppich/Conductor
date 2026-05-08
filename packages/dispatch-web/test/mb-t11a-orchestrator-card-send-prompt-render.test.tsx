/**
 * mb-t11a — OrchestratorCard: send-prompt-to-session render (MB-T11-A WB1 RED)
 *
 * RED: OrchestratorCard.card prop only accepts CardOutput | MultiChoiceCardOutput.
 * Passing a send-prompt-to-session variant causes a runtime crash (card.options is
 * undefined when MultiChoiceVariant fallthrough tries to map it) → test fails.
 * GREEN: OrchestratorCard handles send-prompt-to-session variant explicitly;
 * assertions pass against the rendered action-specific preview.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrchestratorCard } from '../src/orchestrator-cards/orchestrator-card.js';

const sendPromptVariant = {
  type: 'send-prompt-to-session',
  sessionName: 'sherpa-001',
  prompt: 'Continue implementing the JWT authentication middleware. Focus on the token expiry logic per the acceptance criteria in HANDOFF.md.',
  rationale: 'Auth is the unblocking dependency for all downstream session work.',
} as const;

const sendPromptLongPrompt = {
  type: 'send-prompt-to-session',
  sessionName: 'atlas-002',
  prompt: 'A'.repeat(300),
  rationale: 'Long prompt test.',
} as const;

describe('MB-T11-A — OrchestratorCard send-prompt-to-session variant', () => {
  it('renders without crashing when given a send-prompt-to-session card', () => {
    render(
      <OrchestratorCard
        card_id="sp-001"
        card={sendPromptVariant as any}
      />,
    );
    expect(screen.getByTestId('orchestrator-card')).toBeInTheDocument();
  });

  it('renders the action type identifier', () => {
    render(
      <OrchestratorCard
        card_id="sp-001"
        card={sendPromptVariant as any}
      />,
    );
    expect(
      screen.getByTestId('orchestrator-card-action-type'),
    ).toHaveTextContent('send-prompt-to-session');
  });

  it('renders the target session name', () => {
    render(
      <OrchestratorCard
        card_id="sp-001"
        card={sendPromptVariant as any}
      />,
    );
    expect(screen.getByTestId('orchestrator-card-session-name')).toHaveTextContent(
      'sherpa-001',
    );
  });

  it('renders the first 200 chars of the prompt as a preview', () => {
    const first200 = sendPromptVariant.prompt.slice(0, 200);
    render(
      <OrchestratorCard
        card_id="sp-001"
        card={sendPromptVariant as any}
      />,
    );
    const preview = screen.getByTestId('orchestrator-card-prompt-preview');
    expect(preview.textContent).toContain(first200);
  });

  it('shows a length indicator when prompt exceeds 200 chars', () => {
    render(
      <OrchestratorCard
        card_id="sp-long"
        card={sendPromptLongPrompt as any}
      />,
    );
    expect(
      screen.getByTestId('orchestrator-card-prompt-length-indicator'),
    ).toBeInTheDocument();
  });

  it('does NOT show a length indicator when prompt is 200 chars or fewer', () => {
    render(
      <OrchestratorCard
        card_id="sp-001"
        card={sendPromptVariant as any}
      />,
    );
    expect(
      screen.queryByTestId('orchestrator-card-prompt-length-indicator'),
    ).not.toBeInTheDocument();
  });

  it('renders the rationale', () => {
    render(
      <OrchestratorCard
        card_id="sp-001"
        card={sendPromptVariant as any}
      />,
    );
    expect(screen.getByText(/auth is the unblocking dependency/i)).toBeInTheDocument();
  });
});
