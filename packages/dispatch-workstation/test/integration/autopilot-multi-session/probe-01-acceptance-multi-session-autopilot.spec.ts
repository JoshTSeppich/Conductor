// MB-T11 WB8 — acceptance integration test (per CONDUCTOR_V3_RESCOPE.md §4
// MB-T11 acceptance lines 209-211).
//
// Deterministic dep-injection version: exercises the full action-handler +
// autopilot contract surface end-to-end without requiring a running daemon
// or live tmux. The hardware-boundary path is covered separately at
// WB3 probe-05 (real-tmux session-kill) + WB7 runtime-relaunch smoke
// (electron WINDOW_READY).
//
// Acceptance criteria from the rescope (verbatim):
//   "spawn 2 sessions (smoke harness), set autopilot, fire a multi-step
//    plan via 'assign-task,' verify both sessions receive their prompts
//    in correct order, verify approval card surfaces for commit-touching
//    prompt, verify operator approval resumes loop."
//
// This probe maps each clause to an assertion:
//   - "spawn 2 sessions"          → fixture setup (sess-a, sess-b registered
//                                    in the autopilot store via setEnabled)
//   - "set autopilot"             → loop.setEnabled('sess-a', true) +
//                                    loop.setEnabled('sess-b', true)
//   - "multi-step plan via assign-task" → dispatchAction with assign-task
//                                          for each session; assert
//                                          intent_id created + recorded
//   - "prompts in correct order"  → emit send actions per session with
//                                    envelope step=1, 2, 3; assert the
//                                    fireSendPrompt mock receives them in
//                                    that order per session
//   - "approval card for commit-touching prompt" → resolver-stub blocks
//                                                  every action; the send
//                                                  for the commit-touching
//                                                  step returns
//                                                  kind:'pending-approval'
//                                                  (this probe's stand-in
//                                                  for "card surfaces")
//   - "operator approval resumes" → second dispatchAction with the same
//                                    output reframed as a CardOutput
//                                    (operator-approved variant); fires
//                                    via the resolver-skip path

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  ActionOutput,
  CardOutput,
  SendPromptActionPayload,
} from 'dispatch-core/dist/v3/schema.js';
import {
  dispatchAction,
  defaultDispatchActionDeps,
  type DispatchActionDeps,
} from '../../../src/main/orchestrator-action-handler.js';
import { AutopilotLoop } from '../../../src/main/autopilot-loop.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mbt11-wb8-acceptance-'));
  process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_AUTOPILOT_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

interface AcceptanceFixture {
  loop: AutopilotLoop;
  /** Records every fireSendPrompt call across both sessions, in arrival order. */
  prompts: Array<{ sessionName: string; payload: SendPromptActionPayload }>;
  /** Returns deps that USE the loop (real autopilot calls), record prompts, and accept all approvals (resolver=false). */
  depsAutoApprove: () => DispatchActionDeps;
  /** Returns deps that USE the loop but force the resolver-stub (always approvalRequired=true). */
  depsStubBlock: () => DispatchActionDeps;
}

function makeFixture(): AcceptanceFixture {
  const loop = new AutopilotLoop();
  const prompts: AcceptanceFixture['prompts'] = [];

  const sharedDeps = (resolverApprovalRequired: boolean): DispatchActionDeps =>
    defaultDispatchActionDeps({
      resolveApproval: () => ({
        approvalRequired: resolverApprovalRequired,
        reason: resolverApprovalRequired ? 'fixture-stub' : 'fixture-allow',
      }),
      fireSendPrompt: vi.fn(async (sessionName, payload) => {
        prompts.push({ sessionName, payload });
        loop.recordAction(sessionName, 'send', payload);
      }),
      fireSpawn: vi.fn(async () => ({ sessionName: 'unused' })),
      fireKill: vi.fn(async () => {}),
      firePullHandoff: vi.fn(async () => ({
        content: 'fixture',
        written_at: '2026-05-06T00:00:00.000Z',
        archived_to: '/tmp/fixture-archive',
      })),
      startIntent: vi.fn(async (payload) => {
        const result = loop.startIntent(payload);
        loop.recordAction(payload.sessionName, 'assign-task', payload);
        return result;
      }),
    });

  return {
    loop,
    prompts,
    depsAutoApprove: () => sharedDeps(false),
    depsStubBlock: () => sharedDeps(true),
  };
}

function actionOutput(
  action: ActionOutput['action'],
  target: string,
  payload?: unknown,
): ActionOutput {
  return {
    type: 'action',
    action,
    target,
    payload,
    rationale: 'fixture',
    build_doc_commit_sha: 'fixture-sha',
  };
}

function cardOutput(
  action: CardOutput['action'],
  target: string,
  payload?: unknown,
): CardOutput {
  return {
    type: 'card',
    action,
    target,
    payload,
    rationale: 'fixture',
    free_form_prompt: 'fixture',
    superseded_card_ids: [],
    build_doc_commit_sha: 'fixture-sha',
  };
}

describe('MB-T11 WB8 — acceptance: 2-session autopilot + multi-step plan + approval card + resume', () => {
  it('full acceptance flow: assign-task → send×3-per-session × 2 sessions, approval-card surfaces, resume on approve', async () => {
    const f = makeFixture();

    // ── (a) "spawn 2 sessions" — register in autopilot store via setEnabled ──
    f.loop.setEnabled('sess-a', true);
    f.loop.setEnabled('sess-b', true);
    expect(f.loop.isEnabled('sess-a')).toBe(true);
    expect(f.loop.isEnabled('sess-b')).toBe(true);

    // ── (b) "fire a multi-step plan via assign-task" — emit assign-task for both ──
    // Use depsAutoApprove so the assign-task itself fires (resolver-stub
    // blocking would surface a card on the assign-task too; that's exercised
    // separately in (d) below).
    const assignA = await dispatchAction(
      {
        output: actionOutput('assign-task', 'sess-a', {
          sessionName: 'sess-a',
          intent_summary: 'A-plan',
          expected_steps: 3,
        }),
        triggerEvent: 'go',
        buildDocId: 'fixture-doc',
      },
      f.depsAutoApprove(),
    );
    const assignB = await dispatchAction(
      {
        output: actionOutput('assign-task', 'sess-b', {
          sessionName: 'sess-b',
          intent_summary: 'B-plan',
          expected_steps: 3,
        }),
        triggerEvent: 'go',
        buildDocId: 'fixture-doc',
      },
      f.depsAutoApprove(),
    );
    expect(assignA.kind).toBe('fired');
    expect(assignB.kind).toBe('fired');
    const intentA =
      assignA.kind === 'fired' && assignA.intent_id ? assignA.intent_id : '';
    const intentB =
      assignB.kind === 'fired' && assignB.intent_id ? assignB.intent_id : '';
    expect(intentA.length).toBeGreaterThan(0);
    expect(intentB.length).toBeGreaterThan(0);
    expect(intentA).not.toBe(intentB);

    // ── (c) "verify both sessions receive their prompts in correct order" ──
    // Send 3 prompts to each session, in interleaved A/B/A/B/A/B order.
    // Each carries an envelope referencing its session's intent_id and
    // step=N/total_steps=3.
    const sequence: Array<{ session: 'sess-a' | 'sess-b'; step: number; intentId: string }> = [
      { session: 'sess-a', step: 1, intentId: intentA },
      { session: 'sess-b', step: 1, intentId: intentB },
      { session: 'sess-a', step: 2, intentId: intentA },
      { session: 'sess-b', step: 2, intentId: intentB },
      { session: 'sess-a', step: 3, intentId: intentA },
      { session: 'sess-b', step: 3, intentId: intentB },
    ];
    for (const s of sequence) {
      const result = await dispatchAction(
        {
          output: actionOutput('send', s.session, {
            prompt: `${s.session} step ${s.step}`,
            envelope: {
              envelope_version: 1 as const,
              intent_id: s.intentId,
              step: s.step,
              total_steps: 3,
              intent_summary: s.session === 'sess-a' ? 'A-plan' : 'B-plan',
            },
          }),
          triggerEvent: `step-${s.step}`,
          buildDocId: 'fixture-doc',
        },
        f.depsAutoApprove(),
      );
      expect(
        result.kind,
        `${s.session} step ${s.step} expected fired, got ${JSON.stringify(result)}`,
      ).toBe('fired');
    }

    // Order assertion — interleaved A/B/A/B/A/B, all 6 captured.
    expect(f.prompts.length).toBe(6);
    expect(f.prompts.map((p) => p.sessionName)).toEqual([
      'sess-a',
      'sess-b',
      'sess-a',
      'sess-b',
      'sess-a',
      'sess-b',
    ]);
    // Per-session step monotonicity.
    const aSteps = f.prompts
      .filter((p) => p.sessionName === 'sess-a')
      .map((p) => p.payload.envelope?.step);
    const bSteps = f.prompts
      .filter((p) => p.sessionName === 'sess-b')
      .map((p) => p.payload.envelope?.step);
    expect(aSteps).toEqual([1, 2, 3]);
    expect(bSteps).toEqual([1, 2, 3]);

    // Per-session intent_id consistency — every prompt for sess-a carries
    // intentA in its envelope, every prompt for sess-b carries intentB.
    for (const p of f.prompts) {
      const expected = p.sessionName === 'sess-a' ? intentA : intentB;
      expect(p.payload.envelope?.intent_id).toBe(expected);
    }

    // Autopilot state after the sequence: both sessions have advanced
    // their intent's step counter to 3.
    const stateA = f.loop.getPendingIntents('sess-a');
    const stateB = f.loop.getPendingIntents('sess-b');
    expect(stateA[0]!.step).toBe(3);
    expect(stateB[0]!.step).toBe(3);
  });

  it('approval-card surfaces for commit-touching prompt under stub resolver', async () => {
    // ── (d) "verify approval card surfaces for commit-touching prompt" ──
    // The resolver-stub (Q-MBT11-6=a) returns approvalRequired:true for
    // every action; in the v3.0 wiring this means EVERY 'action' variant
    // surfaces a card. The probe asserts the kind:'pending-approval'
    // path of dispatchAction — the workstation runtime then surfaces a
    // card from this signal (card-emitter wiring is exercised separately).
    const f = makeFixture();
    f.loop.setEnabled('sess-a', true);
    f.loop.startIntent({
      sessionName: 'sess-a',
      intent_summary: 'plan with a commit',
      expected_steps: 1,
    });

    const result = await dispatchAction(
      {
        output: actionOutput('send', 'sess-a', {
          prompt: 'git commit -m "feat: add login"', // "commit-touching" — operator-arbitrated would predicate true
        }),
        triggerEvent: 'fixture',
        buildDocId: 'fixture-doc',
      },
      f.depsStubBlock(),
    );
    expect(result.kind).toBe('pending-approval');
    if (result.kind === 'pending-approval') {
      expect(result.actionType).toBe('send');
      expect(result.sessionName).toBe('sess-a');
    }
    // No prompt fired — the card-pending path holds.
    expect(f.prompts.length).toBe(0);
  });

  it('operator approval resumes loop — same prompt re-emitted as CardOutput fires through', async () => {
    // ── (e) "verify operator approval resumes loop" ──
    // The MB-T07 surface emits card:approved IPC carrying the original
    // CardContext.output_payload (which is the CardOutput shape). The
    // post-approve handler fires the action by passing the CardOutput
    // (type:'card') to dispatchAction; per WB5 design, card variants
    // SHORT-CIRCUIT the resolver and fire directly. This probe asserts
    // that path: same payload, type:'card' instead of 'action', stub
    // resolver still says block (irrelevant — card variant skips
    // resolver), action FIRES.
    const f = makeFixture();
    f.loop.setEnabled('sess-a', true);
    f.loop.startIntent({
      sessionName: 'sess-a',
      intent_summary: 'plan',
      expected_steps: 1,
    });

    // 1. Initial 'action' emission with stub resolver → pending-approval.
    const pending = await dispatchAction(
      {
        output: actionOutput('send', 'sess-a', {
          prompt: 'git commit -m "feat: add login"',
        }),
        triggerEvent: 'fixture',
        buildDocId: 'fixture-doc',
      },
      f.depsStubBlock(),
    );
    expect(pending.kind).toBe('pending-approval');
    expect(f.prompts.length).toBe(0);

    // 2. Operator approves — same payload re-emitted as CardOutput (the
    //    card-ipc card:approved IPC handler does this via its
    //    final_fired_payload field). The card variant skips the resolver
    //    and fires.
    const resumed = await dispatchAction(
      {
        output: cardOutput('send', 'sess-a', {
          prompt: 'git commit -m "feat: add login"',
        }),
        triggerEvent: 'fixture',
        buildDocId: 'fixture-doc',
      },
      f.depsStubBlock(),
    );
    expect(resumed.kind).toBe('fired');
    expect(f.prompts.length).toBe(1);
    expect(f.prompts[0]!.sessionName).toBe('sess-a');
    expect(f.prompts[0]!.payload.prompt).toBe('git commit -m "feat: add login"');
  });

  it('per-session isolation: A-plan and B-plan progress independently with no cross-contamination', async () => {
    // Defense-in-depth assertion separate from the main acceptance flow:
    // even when 2 sessions run in parallel, intent_ids stay distinct and
    // step counters advance independently.
    const f = makeFixture();
    f.loop.setEnabled('sess-a', true);
    f.loop.setEnabled('sess-b', true);

    const a = f.loop.startIntent({
      sessionName: 'sess-a',
      intent_summary: 'A',
      expected_steps: 5,
    });
    const b = f.loop.startIntent({
      sessionName: 'sess-b',
      intent_summary: 'B',
      expected_steps: 2,
    });
    expect(a.intent_id).not.toBe(b.intent_id);

    // Advance A by 2 steps, B by 1 step. Verify counters.
    f.loop.recordAction('sess-a', 'send', {
      prompt: 'a2',
      envelope: {
        envelope_version: 1,
        intent_id: a.intent_id,
        step: 2,
        total_steps: 5,
        intent_summary: 'A',
      },
    });
    f.loop.recordAction('sess-b', 'send', {
      prompt: 'b1.5',
      envelope: {
        envelope_version: 1,
        intent_id: b.intent_id,
        step: 1,
        total_steps: 2,
        intent_summary: 'B',
      },
    });
    const aIntent = f.loop.getPendingIntents('sess-a')[0]!;
    const bIntent = f.loop.getPendingIntents('sess-b')[0]!;
    expect(aIntent.intent_id).toBe(a.intent_id);
    expect(aIntent.step).toBe(2);
    expect(aIntent.total_steps).toBe(5);
    expect(bIntent.intent_id).toBe(b.intent_id);
    expect(bIntent.step).toBe(1);
    expect(bIntent.total_steps).toBe(2);
  });
});
