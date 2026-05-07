// MB-T11 WB5 probe-01 — payload validation. Each MB-T11 action type's
// correct payload shape passes through; wrong shape returns
// {kind:'error', actionType, reason}. Non-MB-T11 enum members return
// {kind:'error'} with "unsupported action type" reason.

import { describe, expect, it } from 'vitest';
import { dispatchAction } from '../../../src/main/orchestrator-action-handler.js';
import { actionOutput, input, buildDeps } from './_helpers.js';

describe('orchestrator-action-handler — probe 01: payload validation', () => {
  it('valid send payload passes validation and routes to fireSendPrompt', async () => {
    const deps = buildDeps();
    const result = await dispatchAction(
      input(actionOutput('send', 'sess-x', { prompt: 'hello' })),
      deps,
    );
    expect(result.kind).toBe('fired');
    expect(deps.fireSendPrompt).toHaveBeenCalledTimes(1);
  });

  it('send payload missing prompt returns kind:error', async () => {
    const deps = buildDeps();
    const result = await dispatchAction(
      input(actionOutput('send', 'sess-x', {})),
      deps,
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toMatch(/Invalid payload for action 'send'/);
      expect(result.actionType).toBe('send');
    }
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
  });

  it('spawn payload missing repoPath returns kind:error', async () => {
    const deps = buildDeps();
    const result = await dispatchAction(
      input(
        actionOutput('spawn-new-session', 'sess-y', {
          sessionName: 'sess-y',
          // missing repoPath
        }),
      ),
      deps,
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toMatch(/Invalid payload for action 'spawn-new-session'/);
    }
    expect(deps.fireSpawn).not.toHaveBeenCalled();
  });

  it('kill payload with extra keys returns kind:error (strict)', async () => {
    const deps = buildDeps();
    const result = await dispatchAction(
      input(actionOutput('kill', 'sess-x', { sessionName: 'sess-x', extra: true })),
      deps,
    );
    expect(result.kind).toBe('error');
    expect(deps.fireKill).not.toHaveBeenCalled();
  });

  it('pull payload with empty sessionName returns kind:error', async () => {
    const deps = buildDeps();
    const result = await dispatchAction(
      input(actionOutput('pull', 'sess-x', { sessionName: '' })),
      deps,
    );
    expect(result.kind).toBe('error');
    expect(deps.firePullHandoff).not.toHaveBeenCalled();
  });

  it('assign-task payload missing intent_summary returns kind:error', async () => {
    const deps = buildDeps();
    const result = await dispatchAction(
      input(
        actionOutput('assign-task', 'sess-x', { sessionName: 'sess-x' }),
      ),
      deps,
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toMatch(/Invalid payload for action 'assign-task'/);
    }
    expect(deps.startIntent).not.toHaveBeenCalled();
  });

  it('non-MB-T11 action type returns kind:error with "unsupported" reason', async () => {
    const deps = buildDeps();
    const result = await dispatchAction(
      input(actionOutput('pause', 'sess-x', {})),
      deps,
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toMatch(/unsupported action type/);
      expect(result.actionType).toBe('pause');
    }
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
    expect(deps.fireSpawn).not.toHaveBeenCalled();
    expect(deps.fireKill).not.toHaveBeenCalled();
    expect(deps.firePullHandoff).not.toHaveBeenCalled();
    expect(deps.startIntent).not.toHaveBeenCalled();
  });

  it('non-MB-T11 action type bypasses resolver entirely', async () => {
    const deps = buildDeps();
    await dispatchAction(input(actionOutput('hold', 'sess-x', {})), deps);
    expect(deps.resolveApproval).not.toHaveBeenCalled();
  });
});
