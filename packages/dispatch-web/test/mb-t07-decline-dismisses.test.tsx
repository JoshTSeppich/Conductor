import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrchestratorCard } from '../src/orchestrator-cards/orchestrator-card.js';
import {
  emitCardDeclined,
  type CardBridgeWindow,
} from '../src/orchestrator-cards/card-ipc-bridge.js';
import { WebviewToShellMessageSchema } from 'dispatch-core/src/v3/schema.js';
import type { CardOutput } from 'dispatch-core/src/v3/schema.js';

const sendCard: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  rationale: 'Triggering event maps to send action.',
  free_form_prompt: 'continue work on T05',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123',
};

describe('MB-T07 cluster 3 — Decline dismisses', () => {
  describe('component: Decline pill behavior', () => {
    it('clicking Decline with non-empty reason fires onDecline with trimmed text', () => {
      const onDecline = vi.fn();
      render(
        <OrchestratorCard
          card_id="card-1"
          card={sendCard}
          onDecline={onDecline}
        />,
      );
      const textarea = screen.getByLabelText(
        /add notes or modifications/i,
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '  not now  ' } });
      fireEvent.click(screen.getByRole('button', { name: /decline/i }));
      expect(onDecline).toHaveBeenCalledTimes(1);
      expect(onDecline).toHaveBeenCalledWith('not now');
    });

    it('Decline always disabled when reason empty (WC §5.3 + P-0 leftover Q3 — required reason)', () => {
      const onDecline = vi.fn();
      render(
        <OrchestratorCard
          card_id="card-1"
          card={sendCard}
          onDecline={onDecline}
        />,
      );
      const decline = screen.getByRole('button', { name: /decline/i });
      expect(decline).toBeDisabled();
      fireEvent.click(decline);
      expect(onDecline).not.toHaveBeenCalled();
    });

    it('Decline gating applies even for read-only actions (read-file: Approve relaxes gating, Decline does not)', () => {
      const onDecline = vi.fn();
      const readFileCard: CardOutput = {
        ...sendCard,
        action: 'read-file',
        target: '/path/to/doc.md',
        free_form_prompt: '',
      };
      render(
        <OrchestratorCard
          card_id="card-1"
          card={readFileCard}
          onDecline={onDecline}
        />,
      );
      const decline = screen.getByRole('button', { name: /decline/i });
      expect(decline).toBeDisabled();
    });
  });

  describe('component: dismissed visual state on confirmation', () => {
    it('is_dismissed prop renders a visually dismissed card (faded + pills hidden)', () => {
      render(
        <OrchestratorCard
          card_id="card-1"
          card={sendCard}
          is_dismissed
        />,
      );
      const card = screen.getByTestId('orchestrator-card');
      // Visual fade discriminator — opacity + line-through tokens.
      expect(card.className).toMatch(/opacity-/);
      // Pills hidden in the dismissed state — no Approve/Decline buttons.
      expect(
        screen.queryByRole('button', { name: /approve/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /decline/i }),
      ).not.toBeInTheDocument();
    });

    it('is_dismissed shows a "Declined" badge so the operator can see the lifecycle outcome', () => {
      render(
        <OrchestratorCard
          card_id="card-1"
          card={sendCard}
          is_dismissed
        />,
      );
      expect(
        screen.getByTestId('orchestrator-card-dismissed-badge'),
      ).toHaveTextContent(/declined/i);
    });
  });

  describe('bridge: emitCardDeclined', () => {
    let originalCardBridge: unknown;

    beforeEach(() => {
      originalCardBridge = (globalThis as { cardBridge?: unknown }).cardBridge;
    });

    afterEach(() => {
      if (originalCardBridge === undefined) {
        delete (globalThis as { cardBridge?: unknown }).cardBridge;
      } else {
        (globalThis as { cardBridge?: unknown }).cardBridge =
          originalCardBridge;
      }
    });

    it('constructs CardDeclinedMessage envelope with card_id + reason + ISO timestamp; round-trips schema', () => {
      const send = vi.fn();
      (globalThis as unknown as CardBridgeWindow).cardBridge = {
        approve: vi.fn(),
        decline: send,
        multiChoiceSelect: vi.fn(),
        onCardRendered: () => () => {},
        onCardSuperseded: () => () => {},
        onCardUpdate: () => () => {},
      };

      emitCardDeclined('card-1', 'not now');

      expect(send).toHaveBeenCalledTimes(1);
      const arg = send.mock.calls[0]![0] as Record<string, unknown>;
      expect(arg.type).toBe('card-declined');
      expect(arg.card_id).toBe('card-1');
      // Schema field name is `reason` (not `free_form_text`) for declines —
      // CardDeclinedMessage in v3/schema.ts:414-422 with required min 1.
      expect(arg.reason).toBe('not now');
      expect(typeof arg.timestamp).toBe('string');
      const parsed = WebviewToShellMessageSchema.safeParse(arg);
      expect(parsed.success).toBe(true);
    });

    it('no-ops gracefully when window.cardBridge undefined', () => {
      delete (globalThis as { cardBridge?: unknown }).cardBridge;
      expect(() => emitCardDeclined('card-1', 'reason')).not.toThrow();
    });
  });
});
