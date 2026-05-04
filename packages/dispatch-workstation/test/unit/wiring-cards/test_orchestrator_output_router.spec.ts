// MB-F-MB-T07-ORCHESTRATOR-CARD-EMITTER — F5 unit specs.
//
// The shell side of the orchestrator output flow consumes the streaming
// response from coarchitect-ipc.ts's `coarchitect:sendAndStream` handler
// and routes structured outputs to the correct surface:
//
//   card / multi-choice-card → orchestrator-card-rendered IPC to webview
//                              + cardContextCache.set(card_id, ctx)
//   escape-block             → keep in chat (existing behavior)
//   action (read-only*)      → fire-without-card per cairn-Sonnet §2.7
//                              (action execution wiring deferred to MB-T11)
//   else (text / parse fail) → text passthrough to chat (existing behavior)
//
// *For F5 the action variant is recognized but action execution itself is
// out of scope; the routing decision is just "no card, no chat" and a
// downstream batch decides what fires.
//
// Per coord §4.6 / F1 precedent: routing logic extracted into its own
// pure-function module orchestrator-output-router.ts so the variant
// dispatch + CardContext composition can be unit-tested without booting
// Electron or mocking globals. coarchitect-ipc.ts (the IPC handler glue)
// imports the router and applies the decision.
//
// CardContext composition (per card-ipc.ts:29-37 frozen MB-T07 GREEN):
//   card_id              : shell-minted (UUID via injected uuidGen)
//   trigger_event        : user prompt that triggered this stream cycle
//   build_doc_id         : from injected ctx (from buildDocConfig)
//   build_doc_commit_sha : from parsed CardOutput.build_doc_commit_sha
//   output_type          : 'card' | 'multi-choice-card'
//   output_payload       : parsed OrchestratorOutput
//   superseded_card_ids  : from parsed CardOutput.superseded_card_ids
//
// RED state: src/main/orchestrator-output-router.ts absent → import
// fails → FAIL.
import { describe, it, expect } from 'vitest';
import {
  routeOrchestratorOutput,
  type RouteContext,
  type RouteDecision,
} from '../../../src/main/orchestrator-output-router.js';

const baseCtx: RouteContext = {
  triggerEvent: 'session sherpa-001 awaiting_review for >5m',
  buildDocId: 'mvp-build-doc',
  uuidGen: () => 'card-uuid-fixed',
};

describe('MB-F-MB-T07-ORCHESTRATOR-CARD-EMITTER — routeOrchestratorOutput', () => {
  it('plain text → text-passthrough', () => {
    const decision = routeOrchestratorOutput('Just a regular reply.', baseCtx);
    expect(decision.kind).toBe('text-passthrough');
  });

  it('non-JSON text → text-passthrough', () => {
    const decision = routeOrchestratorOutput(
      "I'll think about it. Here's my plan: 1. Look at X. 2. Do Y.",
      baseCtx,
    );
    expect(decision.kind).toBe('text-passthrough');
  });

  it('valid JSON but not OrchestratorOutput shape → text-passthrough', () => {
    const decision = routeOrchestratorOutput(
      JSON.stringify({ random: 'object', not_a_type: true }),
      baseCtx,
    );
    expect(decision.kind).toBe('text-passthrough');
  });

  it('card variant → card-or-multi-choice with composed CardContext', () => {
    const card = {
      type: 'card',
      action: 'send',
      target: 'sherpa-001',
      payload: { body: 'continue work on T05' },
      rationale: 'Sherpa stalled.',
      free_form_prompt: 'continue work on T05',
      superseded_card_ids: ['old-card-1'],
      build_doc_commit_sha: 'sha-from-orch',
    };
    const decision = routeOrchestratorOutput(JSON.stringify(card), baseCtx);
    expect(decision.kind).toBe('card-or-multi-choice');
    if (decision.kind !== 'card-or-multi-choice') return; // type guard
    expect(decision.cardId).toBe('card-uuid-fixed');
    expect(decision.context).toEqual({
      card_id: 'card-uuid-fixed',
      trigger_event: baseCtx.triggerEvent,
      build_doc_id: baseCtx.buildDocId,
      build_doc_commit_sha: 'sha-from-orch',
      output_type: 'card',
      output_payload: card,
      superseded_card_ids: ['old-card-1'],
    });
    expect(decision.payload).toEqual({
      card_id: 'card-uuid-fixed',
      output: card,
    });
  });

  it('multi-choice-card variant → card-or-multi-choice with output_type=multi-choice-card', () => {
    const mc = {
      type: 'multi-choice-card',
      question: 'How should we handle X?',
      options: ['Option A', 'Option B', 'Option C'],
      rationale: 'Multiple plausible paths forward.',
      build_doc_commit_sha: 'sha-from-orch',
      superseded_card_ids: [],
    };
    const decision = routeOrchestratorOutput(JSON.stringify(mc), baseCtx);
    expect(decision.kind).toBe('card-or-multi-choice');
    if (decision.kind !== 'card-or-multi-choice') return;
    expect(decision.context.output_type).toBe('multi-choice-card');
    expect(decision.context.output_payload).toEqual(mc);
  });

  it('escape-block variant → escape-block decision', () => {
    const eb = {
      type: 'escape-block',
      build_doc_path: 'docs/build-docs/mvp.md',
      build_doc_commit_sha: 'sha-from-orch',
      triggering_event: 'ambiguous routing',
      what_i_tried: 'Read X, Y. Considered A vs B.',
      where_im_stuck: 'Constraints conflict; need operator decision.',
      build_doc_sections_consulted: ['§3.5', '§7.1'],
    };
    const decision = routeOrchestratorOutput(JSON.stringify(eb), baseCtx);
    expect(decision.kind).toBe('escape-block');
  });

  it('action variant → action-fire-without-card decision', () => {
    const act = {
      type: 'action',
      action: 'send',
      target: 'sherpa-001',
      payload: { body: 'do thing' },
      rationale: 'Read-only metadata fetch.',
      build_doc_commit_sha: 'sha-from-orch',
    };
    const decision = routeOrchestratorOutput(JSON.stringify(act), baseCtx);
    expect(decision.kind).toBe('action-fire-without-card');
  });

  it('JSON wrapped in ```json ... ``` code fence parses correctly', () => {
    const card = {
      type: 'card',
      action: 'send',
      target: 'sherpa-001',
      payload: { body: 'x' },
      rationale: 'r',
      free_form_prompt: 'x',
      superseded_card_ids: [],
      build_doc_commit_sha: 'sha',
    };
    const fenced = '```json\n' + JSON.stringify(card) + '\n```';
    const decision = routeOrchestratorOutput(fenced, baseCtx);
    expect(decision.kind).toBe('card-or-multi-choice');
  });

  it('JSON wrapped in plain ``` ... ``` code fence parses correctly', () => {
    const eb = {
      type: 'escape-block',
      build_doc_path: 'p',
      build_doc_commit_sha: 's',
      triggering_event: 't',
      what_i_tried: 'w',
      where_im_stuck: 's',
      build_doc_sections_consulted: [],
    };
    const fenced = '```\n' + JSON.stringify(eb) + '\n```';
    const decision = routeOrchestratorOutput(fenced, baseCtx);
    expect(decision.kind).toBe('escape-block');
  });

  it('uuidGen called only for card variants (not for escape-block / action / text)', () => {
    let calls = 0;
    const ctx: RouteContext = {
      ...baseCtx,
      uuidGen: () => {
        calls += 1;
        return 'uuid';
      },
    };
    routeOrchestratorOutput('plain text', ctx);
    expect(calls).toBe(0);
    routeOrchestratorOutput(
      JSON.stringify({
        type: 'escape-block',
        build_doc_path: 'p',
        build_doc_commit_sha: 's',
        triggering_event: 't',
        what_i_tried: 'w',
        where_im_stuck: 's',
        build_doc_sections_consulted: [],
      }),
      ctx,
    );
    expect(calls).toBe(0);
    routeOrchestratorOutput(
      JSON.stringify({
        type: 'card',
        action: 'send',
        target: 't',
        payload: { body: 'x' },
        rationale: 'r',
        free_form_prompt: 'x',
        superseded_card_ids: [],
        build_doc_commit_sha: 's',
      }),
      ctx,
    );
    expect(calls).toBe(1);
  });
});

// Type-only smoke check that RouteDecision discriminates correctly.
function _typeCheck(d: RouteDecision): string {
  switch (d.kind) {
    case 'text-passthrough':
      return 'text';
    case 'card-or-multi-choice':
      return d.cardId;
    case 'escape-block':
      return d.output.where_im_stuck;
    case 'action-fire-without-card':
      return d.output.action;
  }
}
void _typeCheck;
