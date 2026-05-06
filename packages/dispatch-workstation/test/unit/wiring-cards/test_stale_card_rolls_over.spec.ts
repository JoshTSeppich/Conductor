// MB-T07 Phase 2 — WB4-14: stale-rollover end-to-end pipeline.
//
// V3_TICKETS §202 names test_stale_card_rolls_over.spec.ts. The
// dispatch-web/test/mb-t07-stale-card-rolls-over.test.tsx already covers
// the pure reducer + the useOrchestratorCards hook against fake bridge
// envelopes. This spec ships the shell-side end-to-end coverage:
//
//   orchestrator output JSON
//     → routeOrchestratorOutput (existing pure router)
//     → emitCardEnvelopes (WB2 GREEN pure emitter)
//     → fake broadcaster captures channel sequence
//
// What this test pins: the F5 region's full pipeline composes correctly,
// so when the orchestrator returns a card with superseded_card_ids, the
// shell broadcasts orchestrator-card-superseded BEFORE orchestrator-card-
// rendered (operator A6) in a single integrated path — matching the
// runtime sequence the dispatch-web webview observes.

import { describe, it, expect, vi } from 'vitest';
import { routeOrchestratorOutput } from '../../../src/main/orchestrator-output-router.js';
import {
  emitCardEnvelopes,
  type CardEmitter,
} from '../../../src/main/orchestrator-card-emitter.js';

const ORCH_OUTPUT_WITH_SUPERSEDES = JSON.stringify({
  type: 'card',
  action: 'pull',
  target: 'sherpa-003',
  rationale: 'pivot to a different routing — supersedes prior options',
  free_form_prompt: 'pull then send',
  superseded_card_ids: ['old-card-a', 'old-card-b'],
  build_doc_commit_sha: 'abc123def456',
});

const ORCH_OUTPUT_FIRST_PROPOSAL = JSON.stringify({
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  payload: { body: 'continue' },
  rationale: 'first proposal',
  free_form_prompt: 'continue',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123def456',
});

describe('MB-T07 WB4-14 — stale rollover end-to-end pipeline', () => {
  it('orchestrator JSON with non-empty superseded_card_ids → router → emitter broadcasts supersede THEN rendered', () => {
    const emit = vi.fn();
    const emitter: CardEmitter = { emit };

    const decision = routeOrchestratorOutput(ORCH_OUTPUT_WITH_SUPERSEDES, {
      triggerEvent: 'pivot to sherpa-003',
      buildDocId: 'build-doc.md',
      uuidGen: () => 'new-card-c',
    });
    emitCardEnvelopes(decision, emitter);

    expect(emit).toHaveBeenCalledTimes(2);
    // First emission: supersede
    expect(emit.mock.calls[0]?.[0]).toBe('orchestrator-card-superseded');
    const supersededPayload = emit.mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    expect(supersededPayload.superseding_card_id).toBe('new-card-c');
    expect(supersededPayload.superseded_card_ids).toEqual([
      'old-card-a',
      'old-card-b',
    ]);
    // Second emission: rendered
    expect(emit.mock.calls[1]?.[0]).toBe('orchestrator-card-rendered');
    const renderedPayload = emit.mock.calls[1]?.[1] as Record<string, unknown>;
    expect(renderedPayload.card_id).toBe('new-card-c');
  });

  it('orchestrator JSON without supersedes → router → emitter broadcasts only rendered', () => {
    const emit = vi.fn();
    const emitter: CardEmitter = { emit };

    const decision = routeOrchestratorOutput(ORCH_OUTPUT_FIRST_PROPOSAL, {
      triggerEvent: 'spawn sherpa-001',
      buildDocId: 'build-doc.md',
      uuidGen: () => 'new-card-1',
    });
    emitCardEnvelopes(decision, emitter);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0]?.[0]).toBe('orchestrator-card-rendered');
  });

  it('two sequential orchestrator outputs simulate stale rollover from the broadcaster point of view', () => {
    // Cycle: first card lands as awaiting, then second card supersedes it.
    // The web reducer applied to this sequence of envelopes would yield:
    //   after first emit:  awaiting=[card-1], stale=[]
    //   after second emit: awaiting=[card-2], stale=[card-1]
    // This test only asserts the SHELL emission sequence; the reducer
    // outcome is covered by mb-t07-stale-card-rolls-over.test.tsx.
    const emit = vi.fn();
    const emitter: CardEmitter = { emit };

    const first = routeOrchestratorOutput(ORCH_OUTPUT_FIRST_PROPOSAL, {
      triggerEvent: 'spawn sherpa-001',
      buildDocId: 'build-doc.md',
      uuidGen: () => 'card-1',
    });
    emitCardEnvelopes(first, emitter);

    const supersedingOutput = JSON.stringify({
      type: 'card',
      action: 'send',
      target: 'sherpa-002',
      payload: { body: 'pivot' },
      rationale: 'sherpa-001 paused; pivot to sherpa-002',
      free_form_prompt: 'pivot',
      superseded_card_ids: ['card-1'],
      build_doc_commit_sha: 'abc123def456',
    });
    const second = routeOrchestratorOutput(supersedingOutput, {
      triggerEvent: 'pivot',
      buildDocId: 'build-doc.md',
      uuidGen: () => 'card-2',
    });
    emitCardEnvelopes(second, emitter);

    // Total emission count: 1 (first rendered) + 2 (supersede + rendered).
    expect(emit).toHaveBeenCalledTimes(3);
    expect(emit.mock.calls[0]?.[0]).toBe('orchestrator-card-rendered');
    expect(emit.mock.calls[1]?.[0]).toBe('orchestrator-card-superseded');
    expect(emit.mock.calls[2]?.[0]).toBe('orchestrator-card-rendered');
    // The middle supersede targets exactly the prior card_id.
    const supersededPayload = emit.mock.calls[1]?.[1] as Record<
      string,
      unknown
    >;
    expect(supersededPayload.superseded_card_ids).toEqual(['card-1']);
    expect(supersededPayload.superseding_card_id).toBe('card-2');
  });

  it('orchestrator JSON wrapped in fenced code block routes correctly through both stages', () => {
    // Some Anthropic streams emit ```json ... ``` fencing. The router
    // strips fences before parsing (orchestrator-output-router.ts:49-58),
    // so the emitter still sees a well-formed decision.
    const fenced = '```json\n' + ORCH_OUTPUT_WITH_SUPERSEDES + '\n```';
    const emit = vi.fn();
    const decision = routeOrchestratorOutput(fenced, {
      triggerEvent: 't',
      buildDocId: 'b',
      uuidGen: () => 'card-c',
    });
    emitCardEnvelopes(decision, { emit });
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit.mock.calls[0]?.[0]).toBe('orchestrator-card-superseded');
  });

  it('non-JSON output falls through router as text-passthrough → emitter broadcasts nothing', () => {
    const emit = vi.fn();
    const decision = routeOrchestratorOutput('this is plain prose', {
      triggerEvent: 't',
      buildDocId: 'b',
      uuidGen: () => 'card-x',
    });
    emitCardEnvelopes(decision, { emit });
    expect(emit).not.toHaveBeenCalled();
  });
});
