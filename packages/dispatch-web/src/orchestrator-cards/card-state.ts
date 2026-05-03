// MB-T07 Cluster 5 — pure card-state reducer.
//
// Manages the webview-side view of orchestrator cards. The reducer is
// driven by the three Shell→Webview IPC envelopes per WC §7.1:
//
//   - orchestrator-card-rendered  → adds a card with status='awaiting'
//   - orchestrator-card-superseded → marks named card_ids 'stale'
//   - orchestrator-card-update     → merges patch into the card payload
//
// State lives in a Map keyed by card_id. Per WC §5.5 cards plug into
// the existing dispatch-web kanban columns (AWAITING REVIEW for new
// proposals; STALE for superseded). Status drives column placement;
// the reducer does not own the column layout itself.

import type {
  CardOutput,
  MultiChoiceCardOutput,
} from 'dispatch-core/src/v3/schema.js';

export type CardLifecycleStatus = 'awaiting' | 'stale' | 'dismissed';

export interface CardEntry {
  card: CardOutput | MultiChoiceCardOutput;
  status: CardLifecycleStatus;
}

export interface CardState {
  cards: Map<string, CardEntry>;
}

export const initialCardState: CardState = { cards: new Map() };

export type CardStateAction =
  | {
      type: 'rendered';
      card_id: string;
      card: CardOutput | MultiChoiceCardOutput;
    }
  | {
      type: 'superseded';
      superseding_card_id: string;
      superseded_card_ids: ReadonlyArray<string>;
    }
  | {
      type: 'update';
      card_id: string;
      patch: Record<string, unknown>;
    }
  | { type: 'dismissed'; card_id: string };

export function cardStateReducer(
  state: CardState,
  action: CardStateAction,
): CardState {
  switch (action.type) {
    case 'rendered': {
      const next = new Map(state.cards);
      next.set(action.card_id, { card: action.card, status: 'awaiting' });
      return { cards: next };
    }
    case 'superseded': {
      const next = new Map(state.cards);
      for (const id of action.superseded_card_ids) {
        const prev = next.get(id);
        if (prev) next.set(id, { ...prev, status: 'stale' });
        // Defensive silent-skip on unknown ids: race conditions where
        // the supersede message arrives before the rendered for the
        // prior card, or the prior card was already cleared.
      }
      return { cards: next };
    }
    case 'update': {
      const prev = state.cards.get(action.card_id);
      if (!prev) return state;
      const next = new Map(state.cards);
      // Patch merges via shallow copy. Discriminator field `type` is
      // preserved by virtue of the cast — orchestrator-card-update is
      // declared rare per WC §7.1 ("(rare)") so we are not designing
      // for arbitrary type-changing patches.
      next.set(action.card_id, {
        ...prev,
        card: {
          ...(prev.card as Record<string, unknown>),
          ...action.patch,
        } as typeof prev.card,
      });
      return { cards: next };
    }
    case 'dismissed': {
      const prev = state.cards.get(action.card_id);
      if (!prev) return state;
      const next = new Map(state.cards);
      next.set(action.card_id, { ...prev, status: 'dismissed' });
      return { cards: next };
    }
  }
}
