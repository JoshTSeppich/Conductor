// MB-T11 WB5 probe-05 — 'pull' routes to firePullHandoff (GET /v2/sessions/:name/handoff).

import { describe, expect, it } from 'vitest';
import { dispatchAction } from '../../../src/main/orchestrator-action-handler.js';
import { actionOutput, input, buildDeps } from './_helpers.js';

describe('orchestrator-action-handler — probe 05: pull routes to /v2 handoff', () => {
  it('passes sessionName from action.target to firePullHandoff', async () => {
    const deps = buildDeps();
    const result = await dispatchAction(
      input(actionOutput('pull', 'sess-x', { sessionName: 'sess-x' })),
      deps,
    );
    expect(result.kind).toBe('fired');
    if (result.kind === 'fired') {
      expect(result.actionType).toBe('pull');
      expect(result.sessionName).toBe('sess-x');
    }
    expect(deps.firePullHandoff).toHaveBeenCalledTimes(1);
    expect(deps.firePullHandoff).toHaveBeenCalledWith('sess-x');
  });

  it('does not call other-action deps', async () => {
    const deps = buildDeps();
    await dispatchAction(
      input(actionOutput('pull', 'sess-x', { sessionName: 'sess-x' })),
      deps,
    );
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
    expect(deps.fireSpawn).not.toHaveBeenCalled();
    expect(deps.fireKill).not.toHaveBeenCalled();
    expect(deps.startIntent).not.toHaveBeenCalled();
  });

  it('surfaces firePullHandoff rejection as kind:error', async () => {
    const deps = buildDeps({
      firePullHandoff: async () => {
        throw new Error('handoff file not found at /repo/HANDOFF.md');
      },
    });
    const result = await dispatchAction(
      input(actionOutput('pull', 'sess-x', { sessionName: 'sess-x' })),
      deps,
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toMatch(/handoff file not found/);
      expect(result.actionType).toBe('pull');
    }
  });
});
