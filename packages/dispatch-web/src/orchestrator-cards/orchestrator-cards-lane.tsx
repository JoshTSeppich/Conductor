// MB-T07 Cluster 5 — OrchestratorCardsLane.
//
// Existing-column placement helper per WC §5.5: orchestrator cards
// plug into the existing dispatch-web kanban columns (AWAITING
// REVIEW for new proposals; STALE for superseded). This component
// is the small render slot a column hosts; the column owns the
// surrounding layout.
//
// Visual distinction per WC §5.2 (subtle blue tint) is supplied by
// OrchestratorCard itself; the lane is just the entries iterator.

import type { ReactNode } from 'react';
import {
  OrchestratorCard,
  type OrchestratorCardProps,
} from './orchestrator-card.js';
import type { OrchestratorCardEntry } from './use-orchestrator-cards.js';

export interface OrchestratorCardsLaneProps {
  status: 'awaiting' | 'stale';
  entries: ReadonlyArray<OrchestratorCardEntry>;
  onApprove?: OrchestratorCardProps['onApprove'];
  onDecline?: OrchestratorCardProps['onDecline'];
  onMultiChoiceSelect?: OrchestratorCardProps['onMultiChoiceSelect'];
}

export function OrchestratorCardsLane({
  status,
  entries,
  onApprove,
  onDecline,
  onMultiChoiceSelect,
}: OrchestratorCardsLaneProps): ReactNode {
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {entries.map((e) => (
        <OrchestratorCard
          key={e.card_id}
          card_id={e.card_id}
          card={e.card}
          is_stale={status === 'stale'}
          superseded_card_ids={
            status === 'stale' ? e.supersededByLineage : undefined
          }
          onApprove={onApprove}
          onDecline={onDecline}
          onMultiChoiceSelect={onMultiChoiceSelect}
        />
      ))}
    </div>
  );
}
