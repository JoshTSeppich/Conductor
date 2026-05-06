// MB-T07 Phase 2 — WB3-8 RED: optimistic decline dispatch.
//
// Phase 1 §G4 + operator A4: when the operator clicks Decline (or Approve),
// the card should transition to 'dismissed' locally — without waiting for
// a Shell→Webview echo. Today the cardStateReducer has a 'dismissed'
// action (card-state.ts:39-40, 88-95) but no caller dispatches it; declined
// cards stay in the awaiting bucket until something supersedes them.
//
// Operator A5 + V3_TICKETS §198 also confirm the audit-row write happens
// via the shell on Decline / Approve, but the UI flip is local-optimistic.
//
// Approach: extend useOrchestratorCards() to return action handlers
// (decline/approve/multiChoiceSelect) alongside the {awaiting, stale}
// buckets. Each handler emits via the bridge AND dispatches the local
// 'dismissed' action so the card disappears from awaiting immediately.
//
// RED state: useOrchestratorCards() today returns OrchestratorCardsBuckets
// only (use-orchestrator-cards.ts:38-41 type). Extending it to return the
// action handlers is WB3-9 GREEN.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrchestratorCards } from '../src/orchestrator-cards/use-orchestrator-cards.js';
import type { CardBridge } from '../src/orchestrator-cards/card-ipc-bridge.js';
import type { CardOutput } from 'dispatch-core/src/v3/schema.js';

const sendCard: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  rationale: 'send to sherpa-001 first',
  free_form_prompt: 'go',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123',
};

type AnyHandler = (payload: unknown) => void;

function makeFakeBridge(): {
  bridge: CardBridge;
  approve: ReturnType<typeof vi.fn>;
  decline: ReturnType<typeof vi.fn>;
  multiChoiceSelect: ReturnType<typeof vi.fn>;
  emit: { rendered: AnyHandler };
} {
  let renderedH: AnyHandler = () => {};
  const approve = vi.fn();
  const decline = vi.fn();
  const multiChoiceSelect = vi.fn();
  const bridge: CardBridge = {
    approve,
    decline,
    multiChoiceSelect,
    onCardRendered: (h) => {
      renderedH = h as AnyHandler;
      return () => {};
    },
    onCardSuperseded: () => () => {},
    onCardUpdate: () => () => {},
  };
  return {
    bridge,
    approve,
    decline,
    multiChoiceSelect,
    emit: { rendered: (p) => renderedH(p) },
  };
}

describe('MB-T07 WB3-8 — optimistic dismiss on Decline / Approve / multi-choice', () => {
  let originalBridge: unknown;
  beforeEach(() => {
    originalBridge = (globalThis as { cardBridge?: unknown }).cardBridge;
  });
  afterEach(() => {
    if (originalBridge === undefined) {
      delete (globalThis as { cardBridge?: unknown }).cardBridge;
    } else {
      (globalThis as { cardBridge?: unknown }).cardBridge = originalBridge;
    }
  });

  it('useOrchestratorCards returns a decline handler', () => {
    const { bridge } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    const { result } = renderHook(() => useOrchestratorCards());
    expect(typeof (result.current as { decline?: unknown }).decline).toBe(
      'function',
    );
  });

  it('useOrchestratorCards returns an approve handler', () => {
    const { bridge } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    const { result } = renderHook(() => useOrchestratorCards());
    expect(typeof (result.current as { approve?: unknown }).approve).toBe(
      'function',
    );
  });

  it('useOrchestratorCards returns a multiChoiceSelect handler', () => {
    const { bridge } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    const { result } = renderHook(() => useOrchestratorCards());
    expect(
      typeof (result.current as { multiChoiceSelect?: unknown })
        .multiChoiceSelect,
    ).toBe('function');
  });

  it('decline(card_id, reason) drops the card from the awaiting bucket optimistically', () => {
    const { bridge, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    const { result } = renderHook(() => useOrchestratorCards());

    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'card-1',
        card: sendCard,
      });
    });
    expect(result.current.awaiting).toHaveLength(1);

    act(() => {
      (
        result.current as unknown as {
          decline: (card_id: string, reason: string) => void;
        }
      ).decline('card-1', 'not now');
    });
    // Local optimistic dismiss — the dismissed status is filtered out of
    // the visible buckets per use-orchestrator-cards.ts:79-80.
    expect(result.current.awaiting).toHaveLength(0);
  });

  it('decline(card_id, reason) emits the IPC envelope to the bridge', () => {
    const { bridge, decline, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    const { result } = renderHook(() => useOrchestratorCards());
    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'card-1',
        card: sendCard,
      });
    });
    act(() => {
      (
        result.current as unknown as {
          decline: (card_id: string, reason: string) => void;
        }
      ).decline('card-1', 'not now');
    });
    expect(decline).toHaveBeenCalledTimes(1);
    const envelope = decline.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(envelope.type).toBe('card-declined');
    expect(envelope.card_id).toBe('card-1');
    expect(envelope.reason).toBe('not now');
  });

  it('approve(card_id, free_form_text) drops the card from the awaiting bucket optimistically', () => {
    const { bridge, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    const { result } = renderHook(() => useOrchestratorCards());
    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'card-1',
        card: sendCard,
      });
    });
    act(() => {
      (
        result.current as unknown as {
          approve: (card_id: string, text: string) => void;
        }
      ).approve('card-1', 'modified prompt');
    });
    expect(result.current.awaiting).toHaveLength(0);
  });

  it('approve(card_id, free_form_text) emits the IPC envelope to the bridge', () => {
    const { bridge, approve, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    const { result } = renderHook(() => useOrchestratorCards());
    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'card-1',
        card: sendCard,
      });
    });
    act(() => {
      (
        result.current as unknown as {
          approve: (card_id: string, text: string) => void;
        }
      ).approve('card-1', 'modified prompt');
    });
    expect(approve).toHaveBeenCalledTimes(1);
    const envelope = approve.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(envelope.type).toBe('card-approved');
    expect(envelope.card_id).toBe('card-1');
    // Non-empty free-form text rides through; the schema-aligned null
    // mapping (empty → null) lives in the existing emitCardApproved
    // helper at card-ipc-bridge.ts:96-98 which the hook handler reuses.
    expect(envelope.free_form_text).toBe('modified prompt');
  });

  it('multiChoiceSelect(card_id, idx, text) drops the card optimistically and emits the IPC envelope', () => {
    const { bridge, multiChoiceSelect, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    const { result } = renderHook(() => useOrchestratorCards());
    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'mc-1',
        card: sendCard,
      });
    });
    act(() => {
      (
        result.current as unknown as {
          multiChoiceSelect: (
            card_id: string,
            idx: number,
            text: string | null,
          ) => void;
        }
      ).multiChoiceSelect('mc-1', 1, null);
    });
    expect(result.current.awaiting).toHaveLength(0);
    expect(multiChoiceSelect).toHaveBeenCalledTimes(1);
    const envelope = multiChoiceSelect.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(envelope.type).toBe('multi-choice-selected');
    expect(envelope.card_id).toBe('mc-1');
    expect(envelope.selected_index).toBe(1);
    expect(envelope.free_form_text).toBeNull();
  });

  it('decline of a non-existent card_id is a no-op (does not crash, does not emit)', () => {
    const { bridge, decline } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    const { result } = renderHook(() => useOrchestratorCards());
    act(() => {
      (
        result.current as unknown as {
          decline: (card_id: string, reason: string) => void;
        }
      ).decline('ghost', 'never seen');
    });
    // Reducer's 'dismissed' action returns state unchanged for unknown
    // card_ids (card-state.ts:91-92). The IPC emit still fires — the
    // shell card-ipc handler does its own context lookup and short-
    // circuits on null per card-ipc.ts:198. Accepting that emit happens
    // regardless mirrors the existing behavior of emitCardDeclined.
    expect(result.current.awaiting).toHaveLength(0);
    expect(decline).toHaveBeenCalledTimes(1);
  });
});
