// MB-F-MB-T07-CARD-CONTEXT-CACHE — F4 unit specs.
//
// CardContextLookup interface (frozen MB-T07 GREEN at b45b93b in
// card-ipc.ts:39-41) is consumed by registerCardIpcHandlers as
// `cardContext`. Production wiring needs a CardContextCache that:
// - implements CardContextLookup (`get(card_id) → CardContext | null`),
// - supports `set(card_id, ctx)` for the F5 emitter to populate when
//   orchestrator-card-rendered fires,
// - supports `delete(card_id)` for explicit eviction.
//
// Per coord §4.4: get returns CardContext | null (NOT undefined as brief
// F4 + operator patch 1 said). Aligns with frozen CardContextLookup.
//
// Per coord §4.6 / operator patch 1: card-context-cache.ts exports BOTH
// the class AND a `cardContextCache` singleton instance. Both main.ts
// (F2 wiring) and coarchitect-ipc.ts (F5 emitter) import the same
// singleton — no instantiation plumbing in main.ts.
//
// TTL/size cap NOT in v3.0 scope; file as Tier 3 followup if dogfood
// surfaces memory pressure.
//
// RED state: src/main/card-context-cache.ts absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import {
  CardContextCache,
  cardContextCache,
} from '../../../src/main/card-context-cache.js';
import type { CardContext } from '../../../src/main/card-ipc.js';
import type { CardOutput } from 'dispatch-core/src/v3/schema.js';

const sampleCardOutput: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  payload: { body: 'continue' },
  rationale: 'Sherpa stalled.',
  free_form_prompt: 'continue',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123',
};

const ctx = (id: string): CardContext => ({
  card_id: id,
  trigger_event: 'session sherpa-001 awaiting_review for >5m',
  build_doc_id: 'mvp-build-doc',
  build_doc_commit_sha: 'abc123',
  output_type: 'card',
  output_payload: sampleCardOutput,
  superseded_card_ids: [],
});

describe('MB-F-MB-T07-CARD-CONTEXT-CACHE — CardContextCache class', () => {
  it('get(unknown_id) returns null (matches CardContextLookup interface)', () => {
    const cache = new CardContextCache();
    expect(cache.get('does-not-exist')).toBeNull();
  });

  it('set then get round-trips the CardContext', () => {
    const cache = new CardContextCache();
    const c = ctx('card-1');
    cache.set('card-1', c);
    expect(cache.get('card-1')).toEqual(c);
  });

  it('set overwrites prior context for the same card_id', () => {
    const cache = new CardContextCache();
    const first = ctx('card-1');
    const second = { ...ctx('card-1'), trigger_event: 'updated trigger' };
    cache.set('card-1', first);
    cache.set('card-1', second);
    expect(cache.get('card-1')).toEqual(second);
  });

  it('delete removes the entry (subsequent get returns null)', () => {
    const cache = new CardContextCache();
    cache.set('card-1', ctx('card-1'));
    cache.delete('card-1');
    expect(cache.get('card-1')).toBeNull();
  });

  it('delete on unknown card_id is a no-op (no throw)', () => {
    const cache = new CardContextCache();
    expect(() => cache.delete('does-not-exist')).not.toThrow();
  });

  it('multiple cards do not collide', () => {
    const cache = new CardContextCache();
    cache.set('card-1', ctx('card-1'));
    cache.set('card-2', ctx('card-2'));
    expect(cache.get('card-1')?.card_id).toBe('card-1');
    expect(cache.get('card-2')?.card_id).toBe('card-2');
  });
});

describe('MB-F-MB-T07-CARD-CONTEXT-CACHE — cardContextCache singleton', () => {
  it('cardContextCache is an instance of CardContextCache', () => {
    expect(cardContextCache).toBeInstanceOf(CardContextCache);
  });

  it('singleton supports the same set/get/delete cycle', () => {
    cardContextCache.set('singleton-card', ctx('singleton-card'));
    expect(cardContextCache.get('singleton-card')?.card_id).toBe(
      'singleton-card',
    );
    cardContextCache.delete('singleton-card');
    expect(cardContextCache.get('singleton-card')).toBeNull();
  });
});
