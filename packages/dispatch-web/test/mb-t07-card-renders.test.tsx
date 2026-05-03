import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { OrchestratorCard } from '../src/orchestrator-cards/orchestrator-card.js';
import type {
  CardOutput,
  MultiChoiceCardOutput,
} from 'dispatch-core/src/v3/schema.js';
import { SessionCard } from '../src/components/SessionCard.js';
import type { SessionResponseV2Type } from 'dispatch-core/src/v2/schema.js';

const baseCard: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  payload: { body: 'continue work on T05' },
  rationale: 'Triggering event maps to send action per build doc green condition.',
  free_form_prompt: 'continue work on T05',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123def456',
};

const baseMultiChoice: MultiChoiceCardOutput = {
  type: 'multi-choice-card',
  question: 'Which session should receive the handoff?',
  options: ['sherpa-001', 'sherpa-002', 'sherpa-003'],
  rationale: 'Multiple sessions are awaiting_review; operator picks routing.',
  build_doc_commit_sha: 'abc123def456',
  superseded_card_ids: [],
};

const baseSession: SessionResponseV2Type = {
  cwd: '/test/path',
  tmux_target: 'sherpa-001:1.2',
  handoff_path: '/test/HANDOFF.md',
  last_prompt_sent_at: null,
  last_handoff_pulled_at: null,
  state: 'paused',
  last_commit_sha: null,
  last_status_json_at: null,
  computed_status: 'awaiting_review',
  status_json: null,
  recent_events: [],
};

describe('MB-T07 cluster 1 — OrchestratorCard rendering', () => {
  describe('CardOutput variant (action proposal)', () => {
    it('renders action, target, rationale text', () => {
      render(<OrchestratorCard card_id="card-1" card={baseCard} />);
      expect(screen.getByTestId('orchestrator-card')).toBeInTheDocument();
      // action surfaces in the proposal text — shown in uppercase as a badge
      // similar to how SessionCard renders state. The token "SEND" is the
      // discriminator the operator scans for.
      expect(screen.getByText(/send/i)).toBeInTheDocument();
      expect(screen.getByText('sherpa-001')).toBeInTheDocument();
      expect(screen.getByText(/triggering event maps to send/i)).toBeInTheDocument();
    });

    it('renders Decline (red) and Approve (green) pills per WC §5.3', () => {
      render(<OrchestratorCard card_id="card-1" card={baseCard} />);
      const decline = screen.getByRole('button', { name: /decline/i });
      const approve = screen.getByRole('button', { name: /approve/i });
      expect(decline).toBeInTheDocument();
      expect(approve).toBeInTheDocument();
      // Visual order: Decline left, Approve right per WC §5.3.
      // compareDocumentPosition: bit 0x04 = "other follows this".
      const positionMask = decline.compareDocumentPosition(approve);
      expect(positionMask & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // Color discriminators: red for Decline, green for Approve.
      expect(decline.className).toMatch(/red/);
      expect(approve.className).toMatch(/green/);
    });

    it('renders free-form text field labeled "Add notes or modifications" per WC §5.3', () => {
      render(<OrchestratorCard card_id="card-1" card={baseCard} />);
      const textarea = screen.getByLabelText(/add notes or modifications/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName.toLowerCase()).toBe('textarea');
    });

    it('renders the orchestrator-supplied free_form_prompt as the textarea placeholder', () => {
      render(<OrchestratorCard card_id="card-1" card={baseCard} />);
      const textarea = screen.getByLabelText(
        /add notes or modifications/i,
      ) as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe('continue work on T05');
    });
  });

  describe('MultiChoiceCardOutput variant', () => {
    it('renders question text', () => {
      render(<OrchestratorCard card_id="mc-1" card={baseMultiChoice} />);
      expect(
        screen.getByText('Which session should receive the handoff?'),
      ).toBeInTheDocument();
    });

    it('renders one button per option (2-4 options dynamic per v3 schema)', () => {
      render(<OrchestratorCard card_id="mc-1" card={baseMultiChoice} />);
      // Three options in the fixture; assert all three render as buttons.
      expect(screen.getByRole('button', { name: 'sherpa-001' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'sherpa-002' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'sherpa-003' })).toBeInTheDocument();
    });

    it('renders a free-form text field for the "none of the above" path', () => {
      render(<OrchestratorCard card_id="mc-1" card={baseMultiChoice} />);
      // Per WC §5.3 multi-choice: "Free-form text field for 'none of the above' path"
      expect(
        screen.getByLabelText(/none of the above/i),
      ).toBeInTheDocument();
    });

    it('does NOT render Approve/Decline pills on multi-choice variant', () => {
      render(<OrchestratorCard card_id="mc-1" card={baseMultiChoice} />);
      expect(
        screen.queryByRole('button', { name: /^approve$/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^decline$/i }),
      ).not.toBeInTheDocument();
    });

    it('clamps to 4 options max per MultiChoiceCardOutputSchema (.options length 2..4)', () => {
      const four: MultiChoiceCardOutput = {
        ...baseMultiChoice,
        options: ['A', 'B', 'C', 'D'],
      };
      render(<OrchestratorCard card_id="mc-1" card={four} />);
      const card = screen.getByTestId('orchestrator-card');
      const optionButtons = within(card).getAllByTestId(/multi-choice-option-/);
      expect(optionButtons).toHaveLength(4);
    });
  });

  describe('§5.2 visual distinction (subtle blue tint vs CC-session card white)', () => {
    it('orchestrator card root has a blue-tint class distinguishing it from session cards', () => {
      render(<OrchestratorCard card_id="card-1" card={baseCard} />);
      const card = screen.getByTestId('orchestrator-card');
      // WC §5.2: "subtle blue tint" — matches Tailwind blue-* utility.
      expect(card.className).toMatch(/blue/);
    });

    it('CC session card (existing SessionCard) does NOT carry the blue-tint class', () => {
      // Anti-fixture: prove the visual discriminator is meaningful by showing
      // SessionCard renders without the blue-tint marker. Read with finder
      // by role to avoid colliding with orchestrator-card test ids.
      render(<SessionCard name="sherpa-001" session={baseSession} />);
      const sessionCard = screen.getByRole('button', { name: /sherpa-001/i });
      // SessionCard uses bg-white / dark:bg-gray-900 per session-card.tsx:85.
      // The orchestrator-card blue-tint class must not appear here.
      expect(sessionCard.className).not.toMatch(/bg-blue-/);
    });
  });
});
