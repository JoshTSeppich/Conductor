/**
 * mb-t11a — OrchestratorCard: approvalRequired indicator (MB-T11-A WB1 RED)
 *
 * RED: OrchestratorCard does not accept approvalRequired prop yet.
 * The approval-required-indicator testid does not exist → assertions fail.
 * GREEN: Card accepts approvalRequired?: boolean prop; renders visual indicator
 * when true and "fires automatically" indicator when false.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrchestratorCard } from '../src/orchestrator-cards/orchestrator-card.js';
import type { CardOutput } from 'dispatch-core/src/v3/schema.js';

const baseCard: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  rationale: 'Triggering event maps to send action.',
  free_form_prompt: 'continue work on auth',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123def456',
};

const sendPromptVariant = {
  type: 'send-prompt-to-session',
  sessionName: 'sherpa-001',
  prompt: 'Continue auth work.',
  rationale: 'Auth is the next action.',
} as const;

describe('MB-T11-A — OrchestratorCard approvalRequired indicator', () => {
  describe('existing card type (CardOutput) with approvalRequired prop', () => {
    it('shows approval-required indicator when approvalRequired is true', () => {
      render(
        <OrchestratorCard
          card_id="card-1"
          card={baseCard}
          approvalRequired={true as any}
        />,
      );
      expect(
        screen.getByTestId('approval-required-indicator'),
      ).toBeInTheDocument();
    });

    it('shows fires-automatically indicator when approvalRequired is false', () => {
      render(
        <OrchestratorCard
          card_id="card-1"
          card={baseCard}
          approvalRequired={false as any}
        />,
      );
      expect(
        screen.getByTestId('fires-automatically-indicator'),
      ).toBeInTheDocument();
    });

    it('does NOT show fires-automatically indicator when approvalRequired is true', () => {
      render(
        <OrchestratorCard
          card_id="card-1"
          card={baseCard}
          approvalRequired={true as any}
        />,
      );
      expect(
        screen.queryByTestId('fires-automatically-indicator'),
      ).not.toBeInTheDocument();
    });

    it('does NOT show approval-required indicator when approvalRequired is false', () => {
      render(
        <OrchestratorCard
          card_id="card-1"
          card={baseCard}
          approvalRequired={false as any}
        />,
      );
      expect(
        screen.queryByTestId('approval-required-indicator'),
      ).not.toBeInTheDocument();
    });
  });

  describe('new action variant with approvalRequired prop', () => {
    it('shows approval-required indicator on send-prompt-to-session when approvalRequired is true', () => {
      render(
        <OrchestratorCard
          card_id="sp-001"
          card={sendPromptVariant as any}
          approvalRequired={true as any}
        />,
      );
      expect(
        screen.getByTestId('approval-required-indicator'),
      ).toBeInTheDocument();
    });

    it('shows fires-automatically indicator on send-prompt-to-session when approvalRequired is false', () => {
      render(
        <OrchestratorCard
          card_id="sp-001"
          card={sendPromptVariant as any}
          approvalRequired={false as any}
        />,
      );
      expect(
        screen.getByTestId('fires-automatically-indicator'),
      ).toBeInTheDocument();
    });
  });

  describe('backward compatibility — approvalRequired omitted', () => {
    it('renders without approvalRequired prop (backward compat — existing behavior preserved)', () => {
      render(
        <OrchestratorCard
          card_id="card-1"
          card={baseCard}
        />,
      );
      expect(screen.getByTestId('orchestrator-card')).toBeInTheDocument();
      // Neither indicator required when approvalRequired is omitted
      // (consistent with existing MB-T07 tests)
    });
  });
});
