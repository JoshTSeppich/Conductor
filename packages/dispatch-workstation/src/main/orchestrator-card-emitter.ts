// MB-F-MB-T07-CARD-EMITTER — pure F5 emit-side logic.
//
// Phase 1 §G5 + operator A6: when the orchestrator-output-router decides a
// card should surface, the shell broadcasts envelopes to all webContents so
// the dispatch-web kanban webview's useOrchestratorCards hook can update
// its reducer.
//
// Two envelopes flow per card with a non-empty superseded_card_ids lineage:
//
//   1. orchestrator-card-superseded — fires FIRST so the web reducer's
//      'superseded' action transitions the prior card_ids to 'stale'
//      before the new card lands. Operator A6 explicitly pinned this
//      ordering.
//   2. orchestrator-card-rendered  — fires second; the web reducer's
//      'rendered' action adds the new card with status='awaiting'.
//
// For cards with empty superseded_card_ids only the rendered envelope
// fires. For non-card decisions (text-passthrough / escape-block /
// action-fire-without-card) nothing fires — the chat-panel for-await
// loop in coarchitect-ipc.ts already streamed the chunks for those
// variants, and action execution is deferred to MB-T11 per
// orchestrator-output-router.ts:14-16.
//
// This helper is pure (no Electron import) so the ordering is unit-
// testable. coarchitect-ipc.ts F5 region wraps allWebContents.getAll-
// WebContents() into a CardEmitter and calls emitCardEnvelopes(decision,
// emitter) — the broadcaster injection seam keeps the helper Electron-
// free.

import type { RouteDecision } from './orchestrator-output-router.js';

export interface CardEmitter {
  emit(channel: string, payload: unknown): void;
}

export function emitCardEnvelopes(
  decision: RouteDecision,
  emitter: CardEmitter,
): void {
  if (decision.kind !== 'card-or-multi-choice') return;
  const supersededIds = decision.context.superseded_card_ids;
  if (supersededIds.length > 0) {
    // Per operator A6: superseded BEFORE rendered.
    emitter.emit('orchestrator-card-superseded', {
      type: 'orchestrator-card-superseded',
      superseding_card_id: decision.cardId,
      superseded_card_ids: supersededIds,
    });
  }
  emitter.emit('orchestrator-card-rendered', decision.payload);
}
