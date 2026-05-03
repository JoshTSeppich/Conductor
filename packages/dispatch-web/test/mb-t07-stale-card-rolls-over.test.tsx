import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import {
  cardStateReducer,
  initialCardState,
  type CardStateAction,
} from '../src/orchestrator-cards/card-state.js';
import { useOrchestratorCards } from '../src/orchestrator-cards/use-orchestrator-cards.js';
import { OrchestratorCardsLane } from '../src/orchestrator-cards/orchestrator-cards-lane.js';
import type { CardBridge } from '../src/orchestrator-cards/card-ipc-bridge.js';
import type { CardOutput } from 'dispatch-core/src/v3/schema.js';

const cardA: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  rationale: 'send to sherpa-001 first',
  free_form_prompt: 'go',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123',
};

const cardB: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-002',
  rationale: 'send to sherpa-002 first',
  free_form_prompt: 'go',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123',
};

const cardC: CardOutput = {
  type: 'card',
  action: 'pull',
  target: 'sherpa-003',
  rationale: 'pull instead — supersedes prior send-options',
  free_form_prompt: 'pull then send',
  superseded_card_ids: ['a', 'b'],
  build_doc_commit_sha: 'abc123',
};

describe('MB-T07 cluster 5 — stale card rolls over (pure reducer)', () => {
  it('rendered action adds card with status=awaiting', () => {
    const action: CardStateAction = {
      type: 'rendered',
      card_id: 'a',
      card: cardA,
    };
    const state = cardStateReducer(initialCardState, action);
    expect(state.cards.get('a')).toEqual({ card: cardA, status: 'awaiting' });
  });

  it('superseded action marks specified card_ids as stale', () => {
    let state = cardStateReducer(initialCardState, {
      type: 'rendered',
      card_id: 'a',
      card: cardA,
    });
    state = cardStateReducer(state, {
      type: 'rendered',
      card_id: 'b',
      card: cardB,
    });
    state = cardStateReducer(state, {
      type: 'superseded',
      superseding_card_id: 'c',
      superseded_card_ids: ['a', 'b'],
    });
    expect(state.cards.get('a')?.status).toBe('stale');
    expect(state.cards.get('b')?.status).toBe('stale');
  });

  it('superseded action ignores unknown card_ids without throwing', () => {
    const state = cardStateReducer(initialCardState, {
      type: 'superseded',
      superseding_card_id: 'c',
      superseded_card_ids: ['ghost-1', 'ghost-2'],
    });
    expect(state.cards.size).toBe(0);
  });

  it('rendered action for the superseding card carries its own superseded_card_ids lineage on the CardOutput', () => {
    let state = cardStateReducer(initialCardState, {
      type: 'rendered',
      card_id: 'a',
      card: cardA,
    });
    state = cardStateReducer(state, {
      type: 'rendered',
      card_id: 'b',
      card: cardB,
    });
    state = cardStateReducer(state, {
      type: 'superseded',
      superseding_card_id: 'c',
      superseded_card_ids: ['a', 'b'],
    });
    state = cardStateReducer(state, {
      type: 'rendered',
      card_id: 'c',
      card: cardC,
    });
    expect(state.cards.get('c')?.card.superseded_card_ids).toEqual([
      'a',
      'b',
    ]);
  });

  it('update action merges patch into the card payload', () => {
    let state = cardStateReducer(initialCardState, {
      type: 'rendered',
      card_id: 'a',
      card: cardA,
    });
    state = cardStateReducer(state, {
      type: 'update',
      card_id: 'a',
      patch: { rationale: 'updated rationale' },
    });
    expect(state.cards.get('a')?.card.rationale).toBe('updated rationale');
  });
});

describe('MB-T07 cluster 5 — useOrchestratorCards hook', () => {
  type AnyHandler = (payload: unknown) => void;

  function makeFakeBridge(): {
    bridge: CardBridge;
    emit: {
      rendered: AnyHandler;
      superseded: AnyHandler;
      update: AnyHandler;
    };
  } {
    let renderedH: AnyHandler = () => {};
    let supersededH: AnyHandler = () => {};
    let updateH: AnyHandler = () => {};
    const bridge: CardBridge = {
      approve: vi.fn(),
      decline: vi.fn(),
      multiChoiceSelect: vi.fn(),
      onCardRendered: (h) => {
        renderedH = h as AnyHandler;
        return () => {};
      },
      onCardSuperseded: (h) => {
        supersededH = h as AnyHandler;
        return () => {};
      },
      onCardUpdate: (h) => {
        updateH = h as AnyHandler;
        return () => {};
      },
    };
    return {
      bridge,
      emit: {
        rendered: (p) => renderedH(p),
        superseded: (p) => supersededH(p),
        update: (p) => updateH(p),
      },
    };
  }

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

  it('subscribes to orchestrator-card-rendered and exposes the new card via awaiting bucket', () => {
    const { bridge, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;

    const { result } = renderHook(() => useOrchestratorCards());

    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'a',
        card: cardA,
      });
    });

    expect(result.current.awaiting).toHaveLength(1);
    expect(result.current.awaiting[0]?.card_id).toBe('a');
    expect(result.current.stale).toHaveLength(0);
  });

  it('marks superseded cards stale on receipt of orchestrator-card-superseded', () => {
    const { bridge, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;

    const { result } = renderHook(() => useOrchestratorCards());

    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'a',
        card: cardA,
      });
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'b',
        card: cardB,
      });
    });
    act(() => {
      emit.superseded({
        type: 'orchestrator-card-superseded',
        superseding_card_id: 'c',
        superseded_card_ids: ['a', 'b'],
      });
    });

    expect(result.current.awaiting).toHaveLength(0);
    expect(result.current.stale.map((e) => e.card_id).sort()).toEqual([
      'a',
      'b',
    ]);
  });

  it('no-ops gracefully when window.cardBridge is undefined', () => {
    delete (globalThis as { cardBridge?: unknown }).cardBridge;
    const { result } = renderHook(() => useOrchestratorCards());
    expect(result.current.awaiting).toEqual([]);
    expect(result.current.stale).toEqual([]);
  });
});

describe('MB-T07 cluster 5 — OrchestratorCardsLane (existing-column placement helper)', () => {
  it('renders cards by status; awaiting cards have no stale visual', () => {
    render(
      <OrchestratorCardsLane
        status="awaiting"
        entries={[{ card_id: 'a', card: cardA, status: 'awaiting' }]}
      />,
    );
    // Card renders (action+target surface visible via the action testid).
    expect(screen.getByTestId('orchestrator-card-action')).toHaveTextContent(
      'send',
    );
    // Awaiting cards should NOT show stale visual.
    const card = screen.getByTestId('orchestrator-card');
    expect(card.className).not.toMatch(/grayscale/);
  });

  it('stale cards render with stale visual + supersedes lineage', () => {
    render(
      <OrchestratorCardsLane
        status="stale"
        entries={[
          {
            card_id: 'a',
            card: cardA,
            status: 'stale',
            supersededByLineage: ['c'],
          },
        ]}
      />,
    );
    const card = screen.getByTestId('orchestrator-card');
    expect(card.className).toMatch(/grayscale/);
    expect(
      screen.getByTestId('orchestrator-card-supersedes'),
    ).toHaveTextContent(/c/);
  });

  it('renders empty when no entries match the status filter', () => {
    render(
      <OrchestratorCardsLane status="awaiting" entries={[]} />,
    );
    expect(
      screen.queryByTestId('orchestrator-card'),
    ).not.toBeInTheDocument();
  });
});
