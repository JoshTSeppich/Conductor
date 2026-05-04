// MB-F-MB-T07-CARD-CONTEXT-CACHE — production CardContextLookup.
//
// CardContextLookup (interface frozen MB-T07 GREEN at b45b93b in
// card-ipc.ts:39-41) is consumed by registerCardIpcHandlers as the
// `cardContext` dep. The shell populates the cache when orchestrator-
// card-rendered is emitted to the webview (F5 wiring); on Approve /
// Decline / multi-choice the card-ipc handler reads from the cache to
// reconstruct the OrchestratorAuditWriteRequest.
//
// Per coord §4.4: get returns CardContext | null (matches the frozen
// CardContextLookup interface). The brief F4 + operator patch 1 said
// `or undefined`; that shape is not assignable to the frozen interface
// and would force F2's `cardContext: cardContextCache` assignment to
// fail typecheck. Aligning with the frozen GREEN contract.
//
// Per operator patch 1: exports BOTH the CardContextCache class AND a
// `cardContextCache` singleton instance. Both main.ts (F2 wiring) and
// coarchitect-ipc.ts (F5 emitter) import the singleton — no
// instantiation plumbing in main.ts.
//
// In-memory Map<card_id, CardContext>. TTL / size-cap intentionally
// NOT in v3.0 scope; file Tier 3 followup if dogfood surfaces memory
// pressure (suggested ID: MB-F-MB-T07-CACHE-EVICTION-POLICY).

import type { CardContext, CardContextLookup } from './card-ipc.js';

export class CardContextCache implements CardContextLookup {
  private readonly entries = new Map<string, CardContext>();

  set(card_id: string, context: CardContext): void {
    this.entries.set(card_id, context);
  }

  get(card_id: string): CardContext | null {
    return this.entries.get(card_id) ?? null;
  }

  delete(card_id: string): void {
    this.entries.delete(card_id);
  }
}

export const cardContextCache = new CardContextCache();
