// MB-T07 Phase 2 — WB2-6 RED: F5 supersede emission ordering.
//
// Phase 1 §G5: coarchitect-ipc.ts F5 region today emits ONLY
// `orchestrator-card-rendered`. The web-side useOrchestratorCards hook
// subscribes to `orchestrator-card-superseded` (card-state.ts:60-70 +
// use-orchestrator-cards.ts:53-60) to roll prior cards into the stale
// bucket, but the shell never emits the supersede envelope, so the
// "stale rollover" acceptance in V3_TICKETS §198 is unreachable.
//
// Per operator A6: when the new card carries non-empty
// superseded_card_ids, emit `orchestrator-card-superseded` BEFORE
// `orchestrator-card-rendered` so the web-side reducer sees the
// lineage applied first (the prior cards transition to 'stale' before
// the new card lands as 'awaiting').
//
// Approach: extract a pure helper `emitCardEnvelopes(decision, emitter)`
// from coarchitect-ipc.ts F5 region so the ordering is unit-testable
// without booting Electron's webContents broadcaster. WB2-7 GREEN
// implements the helper + rewires F5 to use it.
import { describe, it, expect, vi } from 'vitest';
import { emitCardEnvelopes } from '../../../src/main/orchestrator-card-emitter.js';
import type { RouteDecision } from '../../../src/main/orchestrator-output-router.js';
import type { CardOutput } from 'dispatch-core/src/v3/schema.js';

const sendCard: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  rationale: 'replace prior proposal',
  free_form_prompt: 'go',
  superseded_card_ids: ['a', 'b'],
  build_doc_commit_sha: 'abc123',
};

const baseCardNoSupersedes: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  rationale: 'first proposal',
  free_form_prompt: 'go',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123',
};

describe('MB-T07 WB2-6 — emitCardEnvelopes supersede-before-rendered ordering', () => {
  it('non-card decision (text-passthrough) emits nothing', () => {
    const emit = vi.fn();
    const decision: RouteDecision = { kind: 'text-passthrough' };
    emitCardEnvelopes(decision, { emit });
    expect(emit).not.toHaveBeenCalled();
  });

  it('card with empty superseded_card_ids emits only orchestrator-card-rendered', () => {
    const emit = vi.fn();
    const decision: RouteDecision = {
      kind: 'card-or-multi-choice',
      cardId: 'card-1',
      context: {
        card_id: 'card-1',
        trigger_event: 'spawn sherpa-001',
        build_doc_id: 'build-doc.md',
        build_doc_commit_sha: 'abc123',
        output_type: 'card',
        output_payload: baseCardNoSupersedes,
        superseded_card_ids: [],
      },
      payload: { card_id: 'card-1', output: baseCardNoSupersedes },
    };
    emitCardEnvelopes(decision, { emit });
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      'orchestrator-card-rendered',
      decision.payload,
    );
  });

  it('card with non-empty superseded_card_ids emits superseded BEFORE rendered (per operator A6)', () => {
    const emit = vi.fn();
    const decision: RouteDecision = {
      kind: 'card-or-multi-choice',
      cardId: 'card-c',
      context: {
        card_id: 'card-c',
        trigger_event: 'pivot to sherpa-003',
        build_doc_id: 'build-doc.md',
        build_doc_commit_sha: 'abc123',
        output_type: 'card',
        output_payload: sendCard,
        superseded_card_ids: ['a', 'b'],
      },
      payload: { card_id: 'card-c', output: sendCard },
    };
    emitCardEnvelopes(decision, { emit });
    expect(emit).toHaveBeenCalledTimes(2);
    // First call MUST be the supersede envelope.
    expect(emit.mock.calls[0]?.[0]).toBe('orchestrator-card-superseded');
    // Second call MUST be the rendered envelope.
    expect(emit.mock.calls[1]?.[0]).toBe('orchestrator-card-rendered');
  });

  it('superseded envelope payload carries superseding_card_id and superseded_card_ids', () => {
    const emit = vi.fn();
    const decision: RouteDecision = {
      kind: 'card-or-multi-choice',
      cardId: 'card-c',
      context: {
        card_id: 'card-c',
        trigger_event: 'pivot',
        build_doc_id: 'build-doc.md',
        build_doc_commit_sha: 'abc123',
        output_type: 'card',
        output_payload: sendCard,
        superseded_card_ids: ['a', 'b'],
      },
      payload: { card_id: 'card-c', output: sendCard },
    };
    emitCardEnvelopes(decision, { emit });
    const supersededPayload = emit.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(supersededPayload.type).toBe('orchestrator-card-superseded');
    expect(supersededPayload.superseding_card_id).toBe('card-c');
    expect(supersededPayload.superseded_card_ids).toEqual(['a', 'b']);
  });

  it('rendered envelope passes through the route-decision payload verbatim', () => {
    const emit = vi.fn();
    const decision: RouteDecision = {
      kind: 'card-or-multi-choice',
      cardId: 'card-c',
      context: {
        card_id: 'card-c',
        trigger_event: 'pivot',
        build_doc_id: 'build-doc.md',
        build_doc_commit_sha: 'abc123',
        output_type: 'card',
        output_payload: sendCard,
        superseded_card_ids: ['a', 'b'],
      },
      payload: { card_id: 'card-c', output: sendCard },
    };
    emitCardEnvelopes(decision, { emit });
    expect(emit.mock.calls[1]?.[1]).toEqual(decision.payload);
  });

  it('escape-block decision emits nothing (existing chat-panel streaming handles it)', () => {
    const emit = vi.fn();
    const decision: RouteDecision = {
      kind: 'escape-block',
      output: {
        type: 'escape-block',
        rationale: 'ambiguous',
        build_doc_commit_sha: 'abc123',
        superseded_card_ids: [],
      },
    };
    emitCardEnvelopes(decision, { emit });
    expect(emit).not.toHaveBeenCalled();
  });

  it('action decision emits nothing (action-fire-without-card deferred to MB-T11 per orchestrator-output-router.ts:14-16)', () => {
    const emit = vi.fn();
    const decision: RouteDecision = {
      kind: 'action-fire-without-card',
      output: {
        type: 'action',
        action: 'send',
        target: 'sherpa-001',
        payload: { body: 'hi' },
        rationale: 'low-stakes',
        build_doc_commit_sha: 'abc123',
        superseded_card_ids: [],
      },
    };
    emitCardEnvelopes(decision, { emit });
    expect(emit).not.toHaveBeenCalled();
  });
});
