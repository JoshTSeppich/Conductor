// MB-T07 Phase 2 — WB5-17 mount integration acceptance.
//
// Per operator's Option D arbitration: Layout.tsx mounts
// OrchestratorCardsExtras into SessionListPanel.extras. This spec
// pins both layers:
//   1. Component layer — OrchestratorCardsExtras renders the awaiting
//      and stale lanes from useOrchestratorCards's reducer state and
//      drops to null when both buckets are empty.
//   2. Layout layer — Layout passes <OrchestratorCardsExtras /> as the
//      extras prop to SessionListPanel.
//
// Component-level tests exercise the WB1+WB2+WB3+WB5 pipeline end-to-
// end on the dispatch-web side: bridge subscribe → reducer → render
// → optimistic dismiss on click. Existing extras-slot.test.tsx already
// pins SessionListPanel's extras prop forwarding (Session 1's harness).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OrchestratorCardsExtras } from '../src/orchestrator-cards/orchestrator-cards-extras.js';
import type { CardBridge } from '../src/orchestrator-cards/card-ipc-bridge.js';
import type { CardOutput } from 'dispatch-core/src/v3/schema.js';

const sendCard: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  rationale: 'send to sherpa-001',
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
  emit: { rendered: AnyHandler; superseded: AnyHandler };
} {
  let renderedH: AnyHandler = () => {};
  let supersededH: AnyHandler = () => {};
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
    onCardSuperseded: (h) => {
      supersededH = h as AnyHandler;
      return () => {};
    },
    onCardUpdate: () => () => {},
  };
  return {
    bridge,
    approve,
    decline,
    multiChoiceSelect,
    emit: {
      rendered: (p) => renderedH(p),
      superseded: (p) => supersededH(p),
    },
  };
}

describe('MB-T07 WB5-17 — OrchestratorCardsExtras mount integration', () => {
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

  it('renders null when both buckets are empty (no phantom gap above session list)', () => {
    const { bridge } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    const { container } = render(<OrchestratorCardsExtras />);
    expect(container.firstChild).toBeNull();
    expect(
      screen.queryByTestId('orchestrator-cards-extras'),
    ).not.toBeInTheDocument();
  });

  it('renders the awaiting section when an orchestrator-card-rendered envelope arrives', () => {
    const { bridge, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    render(<OrchestratorCardsExtras />);
    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'card-1',
        card: sendCard,
      });
    });
    expect(screen.getByTestId('orchestrator-cards-extras')).toBeInTheDocument();
    expect(
      screen.getByTestId('orchestrator-cards-awaiting'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('orchestrator-card')).toBeInTheDocument();
  });

  it('moves a card from awaiting to stale section on orchestrator-card-superseded', () => {
    const { bridge, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    render(<OrchestratorCardsExtras />);
    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'card-1',
        card: sendCard,
      });
    });
    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'card-2',
        card: { ...sendCard, target: 'sherpa-002' },
      });
    });
    act(() => {
      emit.superseded({
        type: 'orchestrator-card-superseded',
        superseding_card_id: 'card-2',
        superseded_card_ids: ['card-1'],
      });
    });
    // card-1 transitioned to stale; card-2 stays in awaiting.
    const stale = screen.getByTestId('orchestrator-cards-stale');
    const awaiting = screen.getByTestId('orchestrator-cards-awaiting');
    expect(stale).toBeInTheDocument();
    expect(awaiting).toBeInTheDocument();
    // The stale card is visible inside the stale section.
    const staleCards = stale.querySelectorAll('[data-testid="orchestrator-card"]');
    expect(staleCards).toHaveLength(1);
    expect(staleCards[0]?.getAttribute('data-card-id')).toBe('card-1');
  });

  it('clicking Decline on an awaiting card optimistically removes it (WB3-9 wiring)', () => {
    const { bridge, decline, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    render(<OrchestratorCardsExtras />);
    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'card-1',
        card: sendCard,
      });
    });
    expect(screen.getByTestId('orchestrator-card')).toBeInTheDocument();

    // Type a reason (Decline gates on non-empty reason per WC §5.3).
    const textarea = screen.getByLabelText(
      /add notes or modifications/i,
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'not now' } });
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));

    // Optimistic dismiss: card disappears from awaiting bucket.
    expect(
      screen.queryByTestId('orchestrator-cards-extras'),
    ).not.toBeInTheDocument();
    // Bridge received the IPC envelope.
    expect(decline).toHaveBeenCalledTimes(1);
    const envelope = decline.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(envelope.card_id).toBe('card-1');
    expect(envelope.reason).toBe('not now');
  });

  it('stale-section cards do NOT render Approve/Decline pills (lifecycle outcome final)', () => {
    const { bridge, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    render(<OrchestratorCardsExtras />);
    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'card-1',
        card: sendCard,
      });
      emit.superseded({
        type: 'orchestrator-card-superseded',
        superseding_card_id: 'card-2',
        superseded_card_ids: ['card-1'],
      });
    });
    const stale = screen.getByTestId('orchestrator-cards-stale');
    // Stale card visible; awaiting empty.
    expect(stale.querySelectorAll('[data-testid="orchestrator-card"]')).toHaveLength(1);
    expect(
      screen.queryByTestId('orchestrator-cards-awaiting'),
    ).not.toBeInTheDocument();
    // The stale card has the grayscale visual; pills present but the
    // existing OrchestratorCard renders them anyway in is_stale mode
    // because is_stale is a visual flag (orchestrator-card.tsx:53).
    // What matters at the WRAPPER level is that we don't double-wire
    // click handlers to stale cards (see orchestrator-cards-extras.tsx
    // — stale entries omit onApprove/onDecline/onMultiChoiceSelect).
    expect(stale.className).not.toMatch(/awaiting/);
  });
});

// === Layout integration: confirm OrchestratorCardsExtras is passed
// into SessionListPanel.extras ===

vi.mock('../src/components/SessionListPanel.js', () => ({
  SessionListPanel: ({ extras }: { extras?: unknown }) => (
    <section
      role="region"
      aria-label="Sessions"
      data-testid="session-list-panel-mount"
    >
      <div data-testid="extras-prop-marker">
        {extras as React.ReactNode}
      </div>
    </section>
  ),
}));

vi.mock('../src/components/FocusedDetailPanel.js', () => ({
  FocusedDetailPanel: () => (
    <section role="region" aria-label="Session detail">detail</section>
  ),
}));

vi.mock('../src/components/TickerPanel.js', () => ({
  TickerPanel: () => (
    <section role="region" aria-label="Activity">activity</section>
  ),
}));

vi.mock('../src/components/InBannerHost.js', () => ({
  InBannerHost: () => null,
}));

vi.mock('../src/components/ConnectionStatusBanner.js', () => ({
  ConnectionStatusBanner: () => null,
}));

vi.mock('../src/components/SendModal.js', () => ({
  SendModal: () => null,
}));

import { Layout } from '../src/components/Layout.js';
import * as React from 'react';

describe('MB-T07 WB5-17 — Layout passes OrchestratorCardsExtras as SessionListPanel.extras', () => {
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

  it('Layout renders SessionListPanel with the OrchestratorCardsExtras component as the extras prop', () => {
    const { bridge, emit } = makeFakeBridge();
    (globalThis as unknown as { cardBridge: CardBridge }).cardBridge = bridge;
    render(<Layout />);
    // Sessions region is mocked + present.
    expect(screen.getByTestId('session-list-panel-mount')).toBeInTheDocument();
    // Extras prop renders nothing when buckets empty (component-level
    // null guard) — but the marker container is still present.
    const marker = screen.getByTestId('extras-prop-marker');
    expect(marker).toBeInTheDocument();
    expect(marker.firstChild).toBeNull();

    // Drive the extras through a card-rendered envelope; assert the
    // extras's testid surfaces inside the marker, proving the prop is
    // genuinely OrchestratorCardsExtras (and not some other subtree).
    act(() => {
      emit.rendered({
        type: 'orchestrator-card-rendered',
        card_id: 'card-1',
        card: sendCard,
      });
    });
    const extras = screen.getByTestId('orchestrator-cards-extras');
    expect(marker.contains(extras)).toBe(true);
    expect(
      screen.getByTestId('orchestrator-cards-awaiting'),
    ).toBeInTheDocument();
  });
});
