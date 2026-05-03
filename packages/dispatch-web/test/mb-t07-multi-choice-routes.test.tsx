import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrchestratorCard } from '../src/orchestrator-cards/orchestrator-card.js';
import {
  emitMultiChoiceSelected,
  type CardBridgeWindow,
} from '../src/orchestrator-cards/card-ipc-bridge.js';
import { WebviewToShellMessageSchema } from 'dispatch-core/src/v3/schema.js';
import type { MultiChoiceCardOutput } from 'dispatch-core/src/v3/schema.js';

const baseMc: MultiChoiceCardOutput = {
  type: 'multi-choice-card',
  question: 'Which session should receive the handoff?',
  options: ['sherpa-001', 'sherpa-002', 'sherpa-003'],
  rationale: 'Multiple sessions awaiting_review.',
  build_doc_commit_sha: 'abc123',
  superseded_card_ids: [],
};

describe('MB-T07 cluster 4 — multi-choice routes', () => {
  describe('component: option-button click', () => {
    it('clicking option-0 fires onMultiChoiceSelect(0, null)', () => {
      const onMc = vi.fn();
      render(
        <OrchestratorCard
          card_id="mc-1"
          card={baseMc}
          onMultiChoiceSelect={onMc}
        />,
      );
      fireEvent.click(screen.getByTestId('multi-choice-option-0'));
      expect(onMc).toHaveBeenCalledTimes(1);
      expect(onMc).toHaveBeenCalledWith(0, null);
    });

    it('clicking option-2 fires onMultiChoiceSelect(2, null)', () => {
      const onMc = vi.fn();
      render(
        <OrchestratorCard
          card_id="mc-1"
          card={baseMc}
          onMultiChoiceSelect={onMc}
        />,
      );
      fireEvent.click(screen.getByTestId('multi-choice-option-2'));
      expect(onMc).toHaveBeenCalledWith(2, null);
    });
  });

  describe('component: "none of the above" free-form path', () => {
    it('typing in free-form + clicking submit fires onMultiChoiceSelect(-1, <trimmed text>)', () => {
      const onMc = vi.fn();
      render(
        <OrchestratorCard
          card_id="mc-1"
          card={baseMc}
          onMultiChoiceSelect={onMc}
        />,
      );
      const textarea = screen.getByLabelText(
        /none of the above/i,
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '  spawn a new one  ' } });
      fireEvent.click(screen.getByTestId('multi-choice-freeform-submit'));
      expect(onMc).toHaveBeenCalledTimes(1);
      // selected_index < 0 is the schema-aligned signal for the
      // free-form path (the audit-row builder maps this to
      // operator_response='pending' so the orchestrator's next call
      // sees the free-form input as routing context).
      expect(onMc).toHaveBeenCalledWith(-1, 'spawn a new one');
    });

    it('free-form submit disabled when textarea empty', () => {
      const onMc = vi.fn();
      render(
        <OrchestratorCard
          card_id="mc-1"
          card={baseMc}
          onMultiChoiceSelect={onMc}
        />,
      );
      const submit = screen.getByTestId('multi-choice-freeform-submit');
      expect(submit).toBeDisabled();
      fireEvent.click(submit);
      expect(onMc).not.toHaveBeenCalled();
    });
  });

  describe('bridge: emitMultiChoiceSelected', () => {
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

    it('option click envelope: selected_index in [0..3], free_form_text=null, round-trips schema', () => {
      const send = vi.fn();
      (globalThis as unknown as CardBridgeWindow).cardBridge = {
        approve: vi.fn(),
        decline: vi.fn(),
        multiChoiceSelect: send,
        onCardRendered: () => () => {},
        onCardSuperseded: () => () => {},
        onCardUpdate: () => () => {},
      };

      emitMultiChoiceSelected('mc-1', 1, null);

      const arg = send.mock.calls[0]![0] as Record<string, unknown>;
      expect(arg.type).toBe('multi-choice-selected');
      expect(arg.card_id).toBe('mc-1');
      expect(arg.selected_index).toBe(1);
      expect(arg.free_form_text).toBeNull();
      expect(typeof arg.timestamp).toBe('string');
      expect(WebviewToShellMessageSchema.safeParse(arg).success).toBe(true);
    });

    it('free-form path envelope: WebviewToShellMessageSchema requires selected_index in [0..3] — emit at index 0 with free_form_text non-null when operator picks the free-form path', () => {
      // The schema constrains selected_index to int 0..3; the free-form
      // path therefore cannot use a sentinel negative index in the
      // envelope. The bridge clamps -1 → 0 and lets free_form_text
      // signal "operator-picked free-form" (the shell-side audit-row
      // builder treats free_form_text non-null + operator_response
      // mapping as the discriminator).
      //
      // This test documents the bridge clamp behavior.
      const send = vi.fn();
      (globalThis as unknown as CardBridgeWindow).cardBridge = {
        approve: vi.fn(),
        decline: vi.fn(),
        multiChoiceSelect: send,
        onCardRendered: () => () => {},
        onCardSuperseded: () => () => {},
        onCardUpdate: () => () => {},
      };

      emitMultiChoiceSelected('mc-1', -1, 'spawn a new one');

      const arg = send.mock.calls[0]![0] as Record<string, unknown>;
      // Sentinel negative index is clamped at the bridge boundary so
      // the wire envelope respects the schema. The shell-side audit
      // builder sees free_form_text + a synthetic 0 index and routes
      // through operator_response='pending'.
      expect(arg.selected_index).toBe(0);
      expect(arg.free_form_text).toBe('spawn a new one');
      expect(WebviewToShellMessageSchema.safeParse(arg).success).toBe(true);
    });

    it('no-ops gracefully when window.cardBridge undefined', () => {
      delete (globalThis as { cardBridge?: unknown }).cardBridge;
      expect(() =>
        emitMultiChoiceSelected('mc-1', 0, null),
      ).not.toThrow();
    });
  });
});
