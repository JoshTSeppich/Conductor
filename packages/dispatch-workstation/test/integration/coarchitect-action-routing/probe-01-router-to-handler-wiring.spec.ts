// MB-T11 WB7 integration probe — router → handler wiring.
//
// Asserts that an orchestrator-emitted ActionOutput JSON, parsed by
// routeOrchestratorOutput, produces a 'action-fire-without-card' decision
// whose `output` payload is shape-compatible with dispatchAction's input.
// This is the integration boundary between WB5 (action-handler) and the
// existing routing primitive — exercising it end-to-end without mounting
// the full streaming pipeline (Anthropic + Electron IPC) keeps the probe
// fast and dependency-free.

import { describe, expect, it, vi } from 'vitest';
import { routeOrchestratorOutput } from '../../../src/main/orchestrator-output-router.js';
import {
  dispatchAction,
  defaultDispatchActionDeps,
} from '../../../src/main/orchestrator-action-handler.js';

describe('MB-T11 WB7 — router → handler integration', () => {
  it('action JSON → router decision → dispatchAction fires the routed dep', async () => {
    // 1. Orchestrator emits an ActionOutput as JSON.
    const actionJson = JSON.stringify({
      type: 'action',
      action: 'send',
      target: 'sess-x',
      payload: { prompt: 'do the thing' },
      rationale: 'routing test',
      build_doc_commit_sha: 'fixture-sha',
    });

    // 2. Router parses + emits 'action-fire-without-card' decision.
    const decision = routeOrchestratorOutput(actionJson, {
      triggerEvent: 'fixture trigger',
      buildDocId: 'fixture-build-doc',
      uuidGen: () => 'unused-card-id',
    });
    expect(decision.kind).toBe('action-fire-without-card');
    if (decision.kind !== 'action-fire-without-card') return;

    // 3. Pass the routed output to dispatchAction with stub deps.
    //    Resolver overridden to NOT require approval so the action fires.
    const fireSendPrompt = vi.fn(async () => {});
    const deps = defaultDispatchActionDeps({
      resolveApproval: () => ({ approvalRequired: false, reason: 'test' }),
      fireSendPrompt,
      fireSpawn: vi.fn(async () => ({ sessionName: 'unused' })),
      fireKill: vi.fn(async () => {}),
      firePullHandoff: vi.fn(async () => ({
        content: '',
        written_at: '',
        archived_to: '',
      })),
      startIntent: vi.fn(async () => ({ intent_id: 'unused' })),
    });

    const result = await dispatchAction(
      {
        output: decision.output,
        triggerEvent: 'fixture trigger',
        buildDocId: 'fixture-build-doc',
      },
      deps,
    );
    expect(result.kind).toBe('fired');
    if (result.kind === 'fired') {
      expect(result.actionType).toBe('send');
      expect(result.sessionName).toBe('sess-x');
    }
    expect(fireSendPrompt).toHaveBeenCalledTimes(1);
    expect(fireSendPrompt).toHaveBeenCalledWith('sess-x', {
      prompt: 'do the thing',
    });
  });

  it('action with stub-blocking resolver → dispatchAction returns pending-approval', async () => {
    const actionJson = JSON.stringify({
      type: 'action',
      action: 'kill',
      target: 'sess-x',
      payload: { sessionName: 'sess-x' },
      rationale: 'routing test',
      build_doc_commit_sha: 'fixture-sha',
    });
    const decision = routeOrchestratorOutput(actionJson, {
      triggerEvent: 'fixture',
      buildDocId: 'fixture',
      uuidGen: () => 'unused',
    });
    if (decision.kind !== 'action-fire-without-card') {
      throw new Error('expected action-fire-without-card');
    }

    const fireKill = vi.fn(async () => {});
    // Use the production-default resolver (resolveApprovalStub) which
    // always returns approvalRequired:true. This exercises the
    // pending-approval branch of dispatchAction.
    const deps = defaultDispatchActionDeps({
      fireSendPrompt: vi.fn(async () => {}),
      fireSpawn: vi.fn(async () => ({ sessionName: 'unused' })),
      fireKill,
      firePullHandoff: vi.fn(async () => ({
        content: '',
        written_at: '',
        archived_to: '',
      })),
      startIntent: vi.fn(async () => ({ intent_id: 'unused' })),
    });

    const result = await dispatchAction(
      {
        output: decision.output,
        triggerEvent: 'fixture',
        buildDocId: 'fixture',
      },
      deps,
    );
    expect(result.kind).toBe('pending-approval');
    expect(fireKill).not.toHaveBeenCalled();
  });

  it('non-JSON orchestrator output → text-passthrough; dispatchAction not invoked', () => {
    const decision = routeOrchestratorOutput('Hello, this is a chat reply.', {
      triggerEvent: 'fixture',
      buildDocId: 'fixture',
      uuidGen: () => 'unused',
    });
    expect(decision.kind).toBe('text-passthrough');
    // No dispatchAction call needed; text-passthrough is the default.
  });

  it('action with assign-task → dispatchAction fires startIntent and returns intent_id', async () => {
    const actionJson = JSON.stringify({
      type: 'action',
      action: 'assign-task',
      target: 'sess-x',
      payload: {
        sessionName: 'sess-x',
        intent_summary: 'rebuild auth',
        expected_steps: 3,
      },
      rationale: 'routing test',
      build_doc_commit_sha: 'fixture-sha',
    });
    const decision = routeOrchestratorOutput(actionJson, {
      triggerEvent: 'fixture',
      buildDocId: 'fixture',
      uuidGen: () => 'unused',
    });
    if (decision.kind !== 'action-fire-without-card') {
      throw new Error('expected action-fire-without-card');
    }

    const startIntent = vi.fn(async () => ({ intent_id: 'mock-intent-1234' }));
    const deps = defaultDispatchActionDeps({
      resolveApproval: () => ({ approvalRequired: false, reason: 'test' }),
      fireSendPrompt: vi.fn(async () => {}),
      fireSpawn: vi.fn(async () => ({ sessionName: 'unused' })),
      fireKill: vi.fn(async () => {}),
      firePullHandoff: vi.fn(async () => ({
        content: '',
        written_at: '',
        archived_to: '',
      })),
      startIntent,
    });

    const result = await dispatchAction(
      {
        output: decision.output,
        triggerEvent: 'fixture',
        buildDocId: 'fixture',
      },
      deps,
    );
    expect(result.kind).toBe('fired');
    if (result.kind === 'fired') {
      expect(result.actionType).toBe('assign-task');
      expect(result.intent_id).toBe('mock-intent-1234');
    }
    expect(startIntent).toHaveBeenCalledTimes(1);
  });
});
