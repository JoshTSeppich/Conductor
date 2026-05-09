// MB-T35-revised WB1 (red) — dispatchActionVariant contract tests.
//
// Contract asserted:
//   P1: send-prompt-to-session → fireSendPrompt(sessionName, prompt, rationale)
//   P2: spawn-session → fireSpawn(sessionName, initialPrompt, rationale)
//   P3: kill-session → fireKill(sessionName, rationale-as-reason)
//   P4: pull-handoff-from-session → firePullHandoff(sessionName)
//   P5: assign-task → fireAssignTask(sessionName, ticketScope-as-intent_summary, rationale)
//   P6: unknown action type → kind:error, message contains type name, no dep calls
//   P7: missing required field → kind:error, no dep calls
//   P8: resolveApproval returns approvalRequired:true → kind:pending-approval, no dep calls
//   P9: successful fire → emits action-variant:fired event with correct payload
//   P10: resolveApproval called with correct actionType + sessionName
//
// WB1 red: dispatchActionVariant returns { kind:'error', message:'not implemented' }
//   unconditionally.
//   P1-P5 fail (expect kind:'fired').
//   P6 fails (expect message to contain action type name, not 'not implemented').
//   P7 passes accidentally (stub returns error for all inputs — acceptable RED).
//   P8 fails (expect kind:'pending-approval', stub returns kind:'error').
//   P9 fails (expect emitted event, stub never fires emitter).
//   P10 fails (expect resolveApproval called, stub never calls deps).
//
// WB2 green: full implementation lands; all 10 probes pass.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  dispatchActionVariant,
  actionVariantEmitter,
  ACTION_VARIANT_FIRED_EVENT,
  type ActionVariantDispatchDeps,
  type ActionVariantFiredPayload,
} from '../../../src/main/action-variant-ipc.js';
import type { ParsedActionMarker } from '../../../src/coarchitect/chat-content-markers.js';

function buildDeps(
  overrides: Partial<ActionVariantDispatchDeps> = {},
): ActionVariantDispatchDeps {
  return {
    resolveApproval: vi.fn(async () => ({
      approvalRequired: false,
      reason: 'no-approval-needed',
    })),
    fireSendPrompt: vi.fn(async () => {}),
    fireSpawn: vi.fn(async (sessionName: string) => ({ sessionName })),
    fireKill: vi.fn(async () => {}),
    firePullHandoff: vi.fn(async () => ({
      content: 'fixture handoff content',
      written_at: '2026-05-08T00:00:00.000Z',
      archived_to: '/tmp/fixture.handoff.md',
    })),
    fireAssignTask: vi.fn(async () => ({ intent_id: 'fixture-intent-id' })),
    ...overrides,
  };
}

function marker(
  actionType: string,
  fields: Record<string, string>,
): ParsedActionMarker {
  return { actionType, fields };
}

describe('MB-T35-revised WB1 — dispatchActionVariant: routing', () => {
  beforeEach(() => {
    actionVariantEmitter.removeAllListeners();
  });

  it('P1: send-prompt-to-session calls fireSendPrompt with sessionName + prompt + rationale', async () => {
    const deps = buildDeps();
    const result = await dispatchActionVariant(
      marker('send-prompt-to-session', {
        sessionName: 'sess-worker-a',
        prompt: 'Please implement WB3 as specified.',
        rationale: 'Worker session is ready for next task',
      }),
      deps,
    );
    expect(result.kind).toBe('fired');
    expect(deps.fireSendPrompt).toHaveBeenCalledTimes(1);
    expect(deps.fireSendPrompt).toHaveBeenCalledWith(
      'sess-worker-a',
      'Please implement WB3 as specified.',
      'Worker session is ready for next task',
    );
    expect(deps.fireSpawn).not.toHaveBeenCalled();
    expect(deps.fireKill).not.toHaveBeenCalled();
    expect(deps.firePullHandoff).not.toHaveBeenCalled();
    expect(deps.fireAssignTask).not.toHaveBeenCalled();
  });

  it('P2: spawn-session calls fireSpawn with sessionName + initialPrompt + rationale', async () => {
    const deps = buildDeps();
    const result = await dispatchActionVariant(
      marker('spawn-session', {
        sessionName: 'sess-mb-t38',
        initialPrompt: 'You are Terminal B. Read the dispatch.',
        rationale: 'New session needed for MB-T38',
      }),
      deps,
    );
    expect(result.kind).toBe('fired');
    expect(deps.fireSpawn).toHaveBeenCalledTimes(1);
    expect(deps.fireSpawn).toHaveBeenCalledWith(
      'sess-mb-t38',
      'You are Terminal B. Read the dispatch.',
      'New session needed for MB-T38',
    );
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
    expect(deps.fireKill).not.toHaveBeenCalled();
  });

  it('P3: kill-session calls fireKill with sessionName and rationale as reason', async () => {
    const deps = buildDeps();
    const result = await dispatchActionVariant(
      marker('kill-session', {
        sessionName: 'sess-stale',
        rationale: 'Session scope complete',
      }),
      deps,
    );
    expect(result.kind).toBe('fired');
    expect(deps.fireKill).toHaveBeenCalledTimes(1);
    expect(deps.fireKill).toHaveBeenCalledWith('sess-stale', 'Session scope complete');
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
    expect(deps.fireSpawn).not.toHaveBeenCalled();
  });

  it('P4: pull-handoff-from-session calls firePullHandoff with sessionName only', async () => {
    const deps = buildDeps();
    const result = await dispatchActionVariant(
      marker('pull-handoff-from-session', {
        sessionName: 'sess-mb-t35-a',
        rationale: 'Context nearing capacity',
      }),
      deps,
    );
    expect(result.kind).toBe('fired');
    expect(deps.firePullHandoff).toHaveBeenCalledTimes(1);
    expect(deps.firePullHandoff).toHaveBeenCalledWith('sess-mb-t35-a');
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
    expect(deps.fireSpawn).not.toHaveBeenCalled();
  });

  it('P5: assign-task calls fireAssignTask with sessionName + ticketScope as intent_summary', async () => {
    const deps = buildDeps();
    const result = await dispatchActionVariant(
      marker('assign-task', {
        sessionName: 'sess-mb-t38',
        ticketScope: 'MB-T38',
        rationale: 'State writer ticket ownership',
      }),
      deps,
    );
    expect(result.kind).toBe('fired');
    expect(deps.fireAssignTask).toHaveBeenCalledTimes(1);
    expect(deps.fireAssignTask).toHaveBeenCalledWith(
      'sess-mb-t38',
      'MB-T38',
      'State writer ticket ownership',
    );
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
    expect(deps.fireSpawn).not.toHaveBeenCalled();
  });
});

describe('MB-T35-revised WB1 — dispatchActionVariant: error + approval gate', () => {
  beforeEach(() => {
    actionVariantEmitter.removeAllListeners();
  });

  it('P6: unknown action type returns kind:error with type name in message; no deps called', async () => {
    const deps = buildDeps();
    const result = await dispatchActionVariant(
      marker('foo-bar', { sessionName: 'sess-x' }),
      deps,
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toMatch(/foo-bar/);
    }
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
    expect(deps.fireSpawn).not.toHaveBeenCalled();
    expect(deps.fireKill).not.toHaveBeenCalled();
    expect(deps.firePullHandoff).not.toHaveBeenCalled();
    expect(deps.fireAssignTask).not.toHaveBeenCalled();
  });

  it('P7: missing required field returns kind:error; no deps called', async () => {
    const deps = buildDeps();
    const result = await dispatchActionVariant(
      marker('send-prompt-to-session', {
        sessionName: 'sess-x',
        // prompt is required for send-prompt-to-session — intentionally omitted
      }),
      deps,
    );
    expect(result.kind).toBe('error');
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
  });

  it('P8: resolveApproval returns approvalRequired:true → kind:pending-approval, no dep fires', async () => {
    const deps = buildDeps({
      resolveApproval: vi.fn(async () => ({
        approvalRequired: true,
        reason: 'fixture: approval required for kill',
      })),
    });
    const result = await dispatchActionVariant(
      marker('kill-session', {
        sessionName: 'sess-target',
        rationale: 'cleanup',
      }),
      deps,
    );
    expect(result.kind).toBe('pending-approval');
    if (result.kind === 'pending-approval') {
      expect(result.reason).toBe('fixture: approval required for kill');
      expect(result.sessionName).toBe('sess-target');
      expect(result.actionType).toBe('kill-session');
    }
    expect(deps.fireKill).not.toHaveBeenCalled();
  });
});

describe('MB-T35-revised WB1 — dispatchActionVariant: emission protocol', () => {
  beforeEach(() => {
    actionVariantEmitter.removeAllListeners();
  });

  it('P9: emits action-variant:fired event with correct payload shape after successful fire', async () => {
    const deps = buildDeps();
    const emitted: ActionVariantFiredPayload[] = [];
    actionVariantEmitter.on(
      ACTION_VARIANT_FIRED_EVENT,
      (p: ActionVariantFiredPayload) => emitted.push(p),
    );

    await dispatchActionVariant(
      marker('send-prompt-to-session', {
        sessionName: 'sess-y',
        prompt: 'hello swarm',
        rationale: 'test emission protocol',
      }),
      deps,
    );

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.actionType).toBe('send-prompt-to-session');
    expect(emitted[0]?.sessionName).toBe('sess-y');
    expect(typeof emitted[0]?.firedAt).toBe('string');
    expect(new Date(emitted[0]!.firedAt).getTime()).toBeGreaterThan(0);
  });

  it('P10: resolveApproval called with correct actionType and sessionName', async () => {
    const resolveApproval = vi.fn(async () => ({
      approvalRequired: false,
      reason: 'ok',
    }));
    const deps = buildDeps({ resolveApproval });
    await dispatchActionVariant(
      marker('kill-session', {
        sessionName: 'sess-target',
        rationale: 'test resolver call shape',
      }),
      deps,
    );
    expect(resolveApproval).toHaveBeenCalledWith({
      actionType: 'kill-session',
      sessionName: 'sess-target',
    });
  });
});
