import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrchestratorCard } from '../src/orchestrator-cards/orchestrator-card.js';
import {
  emitCardApproved,
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

const readFileCard: CardOutput = {
  type: 'card',
  action: 'read-file',
  target: '/path/to/doc.md',
  rationale: 'Read-only context lookup.',
  free_form_prompt: '',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123',
};

describe('MB-T07 cluster 2 — Approve fires action', () => {
  describe('component-level: Approve pill behavior', () => {
    it('clicking Approve with non-empty free-form fires onApprove with trimmed text', () => {
      const onApprove = vi.fn();
      render(
        <OrchestratorCard
          card_id="card-1"
          card={sendCard}
          onApprove={onApprove}
        />,
      );
      const textarea = screen.getByLabelText(
        /add notes or modifications/i,
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '  modified prompt  ' } });
      fireEvent.click(screen.getByRole('button', { name: /approve/i }));
      expect(onApprove).toHaveBeenCalledTimes(1);
      expect(onApprove).toHaveBeenCalledWith('modified prompt');
    });

    it('Approve disabled when free-form empty for state-mutating action (WC §5.3 + P-0 leftover Q3)', () => {
      const onApprove = vi.fn();
      render(
        <OrchestratorCard
          card_id="card-1"
          card={sendCard}
          onApprove={onApprove}
        />,
      );
      const approve = screen.getByRole('button', { name: /approve/i });
      expect(approve).toBeDisabled();
      fireEvent.click(approve);
      expect(onApprove).not.toHaveBeenCalled();
    });

    it('Approve enabled when free-form empty for read-only action (read-file is the sole read-only ActionTypeEnum entry)', () => {
      const onApprove = vi.fn();
      render(
        <OrchestratorCard
          card_id="card-1"
          card={readFileCard}
          onApprove={onApprove}
        />,
      );
      const approve = screen.getByRole('button', { name: /approve/i });
      expect(approve).not.toBeDisabled();
      fireEvent.click(approve);
      expect(onApprove).toHaveBeenCalledTimes(1);
      expect(onApprove).toHaveBeenCalledWith('');
    });
  });

  describe('bridge-emit layer: emitCardApproved', () => {
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

    it('constructs a CardApprovedMessage envelope with card_id + free_form_text + ISO timestamp', () => {
      const send = vi.fn();
      const fakeBridge: CardBridgeWindow['cardBridge'] = {
        approve: send,
        decline: vi.fn(),
        multiChoiceSelect: vi.fn(),
        onCardRendered: () => () => {},
        onCardSuperseded: () => () => {},
        onCardUpdate: () => () => {},
      };
      (globalThis as unknown as CardBridgeWindow).cardBridge = fakeBridge;

      emitCardApproved('card-1', 'modified prompt');

      expect(send).toHaveBeenCalledTimes(1);
      const arg = send.mock.calls[0]![0] as Record<string, unknown>;
      expect(arg.type).toBe('card-approved');
      expect(arg.card_id).toBe('card-1');
      expect(arg.free_form_text).toBe('modified prompt');
      expect(typeof arg.timestamp).toBe('string');
      // ISO datetime parses back; round-trips through the schema.
      const parsed = WebviewToShellMessageSchema.safeParse(arg);
      expect(parsed.success).toBe(true);
    });

    it('emits free_form_text as null (per CardApprovedMessage schema) when empty', () => {
      const send = vi.fn();
      (globalThis as unknown as CardBridgeWindow).cardBridge = {
        approve: send,
        decline: vi.fn(),
        multiChoiceSelect: vi.fn(),
        onCardRendered: () => () => {},
        onCardSuperseded: () => () => {},
        onCardUpdate: () => () => {},
      };

      emitCardApproved('card-1', '');

      const arg = send.mock.calls[0]![0] as Record<string, unknown>;
      expect(arg.free_form_text).toBeNull();
    });

    it('no-ops gracefully when window.cardBridge is undefined (dispatch-web standalone in browser dev)', () => {
      delete (globalThis as { cardBridge?: unknown }).cardBridge;
      // Must not throw.
      expect(() => emitCardApproved('card-1', 'text')).not.toThrow();
    });
  });
});
