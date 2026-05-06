// MB-T07 Phase 2 — WB5 mount-integration wrapper.
//
// SessionListPanel (shipped by sess-1 at commit 387ed6d, extras slot
// added at 0279439) exposes a single-ReactNode `extras` prop. This
// wrapper packs the awaiting + stale orchestrator-card lanes into one
// ReactNode so it can fill the slot.
//
// Per operator's Option D arbitration:
// - A2 corrected to SessionListPanel.extras (Session 1's actual ship).
// - A3 corrected to "extras-renders-both-buckets" because SessionList-
//   Panel's M2 taxonomy (Active / Done / Idle) has no Stale column
//   to share. Visual disambiguation between orchestrator cards and
//   CC-session cards comes from the blue tint already on OrchestratorCard
//   root (orchestrator-card.tsx:53-54), independent of column placement.
//
// Renders OrchestratorCard directly per-entry so the click handlers
// can close over each card_id (the existing OrchestratorCardsLane
// passes the same onApprove/onDecline/onMultiChoiceSelect to every
// card with a free_form_text-only signature; that signature can't
// reach the per-entry card_id without a closure layer, so we apply
// the closure here at the wrapper).

import type { ReactNode } from 'react';
import { OrchestratorCard } from './orchestrator-card.js';
import { useOrchestratorCards } from './use-orchestrator-cards.js';

export function OrchestratorCardsExtras(): ReactNode {
  const { awaiting, stale, approve, decline, multiChoiceSelect } =
    useOrchestratorCards();

  if (awaiting.length === 0 && stale.length === 0) {
    // Empty-state guard — render nothing so SessionListPanel's session
    // groups stay flush against the header. Avoids a phantom gap when
    // no orchestrator cards are live.
    return null;
  }

  return (
    <div
      data-testid="orchestrator-cards-extras"
      className="flex flex-col gap-2 p-2 border-b border-blue-200 dark:border-blue-800"
    >
      {awaiting.length > 0 && (
        <section data-testid="orchestrator-cards-awaiting" aria-label="Orchestrator proposals awaiting review">
          <div className="flex flex-col gap-2">
            {awaiting.map((entry) => (
              <OrchestratorCard
                key={entry.card_id}
                card_id={entry.card_id}
                card={entry.card}
                onApprove={(free_form_text) =>
                  approve(entry.card_id, free_form_text)
                }
                onDecline={(reason) => decline(entry.card_id, reason)}
                onMultiChoiceSelect={(selected_index, free_form_text) =>
                  multiChoiceSelect(entry.card_id, selected_index, free_form_text)
                }
              />
            ))}
          </div>
        </section>
      )}
      {stale.length > 0 && (
        <section data-testid="orchestrator-cards-stale" aria-label="Stale orchestrator proposals">
          <div className="flex flex-col gap-2">
            {stale.map((entry) => (
              <OrchestratorCard
                key={entry.card_id}
                card_id={entry.card_id}
                card={entry.card}
                is_stale
                superseded_card_ids={entry.supersededByLineage}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
