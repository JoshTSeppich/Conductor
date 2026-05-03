// MB-T07 Cluster 5 — useOrchestratorCards hook.
//
// Subscribes to the three Shell→Webview IPC envelopes via
// window.cardBridge and yields {awaiting, stale} buckets keyed by the
// card lifecycle status. Per WC §5.5 the buckets feed into the
// existing dispatch-web kanban columns (awaiting → AWAITING REVIEW,
// stale → STALE), not a new dedicated lane.
//
// When window.cardBridge is undefined (dispatch-web standalone in
// browser dev), the hook returns empty buckets so the UI renders
// without IPC connectivity.

import { useEffect, useReducer } from 'react';
import {
  cardStateReducer,
  initialCardState,
  type CardEntry,
  type CardLifecycleStatus,
} from './card-state.js';
import {
  subscribeCardRendered,
  subscribeCardSuperseded,
  subscribeCardUpdate,
} from './card-ipc-bridge.js';

export interface OrchestratorCardEntry extends CardEntry {
  card_id: string;
  /**
   * For stale entries, the lineage to surface in the UI per WC §5.4.
   * The lineage is set when the supersession message names this card
   * as one of the superseded_card_ids; the value is the
   * superseding_card_id from that envelope (not the stale card's own
   * superseded_card_ids field).
   */
  supersededByLineage?: ReadonlyArray<string>;
}

export interface OrchestratorCardsBuckets {
  awaiting: OrchestratorCardEntry[];
  stale: OrchestratorCardEntry[];
}

export function useOrchestratorCards(): OrchestratorCardsBuckets {
  const [state, dispatch] = useReducer(cardStateReducer, initialCardState);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    cleanups.push(
      subscribeCardRendered((p) =>
        dispatch({ type: 'rendered', card_id: p.card_id, card: p.card }),
      ),
    );
    cleanups.push(
      subscribeCardSuperseded((p) =>
        dispatch({
          type: 'superseded',
          superseding_card_id: p.superseding_card_id,
          superseded_card_ids: p.superseded_card_ids,
        }),
      ),
    );
    cleanups.push(
      subscribeCardUpdate((p) =>
        dispatch({ type: 'update', card_id: p.card_id, patch: p.patch }),
      ),
    );
    return () => {
      for (const c of cleanups) c();
    };
  }, []);

  const awaiting: OrchestratorCardEntry[] = [];
  const stale: OrchestratorCardEntry[] = [];
  for (const [card_id, entry] of state.cards) {
    const item: OrchestratorCardEntry = { card_id, ...entry };
    if ((entry.status as CardLifecycleStatus) === 'stale') stale.push(item);
    else if ((entry.status as CardLifecycleStatus) === 'awaiting')
      awaiting.push(item);
    // Dismissed cards intentionally drop out of the visible buckets
    // here; the parent owns dismissed-tail rendering if any.
  }
  return { awaiting, stale };
}
