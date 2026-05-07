// MB-T11 WB5 probe-07 — resolver returns approvalRequired:true →
// dispatchAction returns kind:'pending-approval' WITHOUT firing.

import { describe, expect, it, vi } from 'vitest';
import { dispatchAction } from '../../../src/main/orchestrator-action-handler.js';
import { actionOutput, input, buildDeps } from './_helpers.js';

describe('orchestrator-action-handler — probe 07: resolver blocks on approval', () => {
  it('returns kind:pending-approval when resolver requires approval (action variant)', async () => {
    const deps = buildDeps({
      resolveApproval: vi.fn(async () => ({
        approvalRequired: true,
        reason: 'fixture: must approve',
      })),
    });
    const result = await dispatchAction(
      input(actionOutput('send', 'sess-x', { prompt: 'hello' })),
      deps,
    );
    expect(result.kind).toBe('pending-approval');
    if (result.kind === 'pending-approval') {
      expect(result.reason).toBe('fixture: must approve');
      expect(result.actionType).toBe('send');
      expect(result.sessionName).toBe('sess-x');
    }
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
  });

  it('resolver called with correct ResolverInput shape', async () => {
    const resolveApproval = vi.fn(async () => ({
      approvalRequired: true,
      reason: 'r',
    }));
    const deps = buildDeps({ resolveApproval });
    await dispatchAction(
      input(actionOutput('kill', 'sess-x', { sessionName: 'sess-x' })),
      deps,
    );
    expect(resolveApproval).toHaveBeenCalledTimes(1);
    expect(resolveApproval).toHaveBeenCalledWith({
      actionType: 'kill',
      sessionName: 'sess-x',
    });
  });

  it('all 5 MB-T11 action types respect approvalRequired:true', async () => {
    const deps = buildDeps({
      resolveApproval: vi.fn(async () => ({ approvalRequired: true, reason: 'r' })),
    });
    const fixtures = [
      actionOutput('send', 'sess-x', { prompt: 'p' }),
      actionOutput('spawn-new-session', 'new', { sessionName: 'new', repoPath: '/abs' }),
      actionOutput('kill', 'sess-x', { sessionName: 'sess-x' }),
      actionOutput('pull', 'sess-x', { sessionName: 'sess-x' }),
      actionOutput('assign-task', 'sess-x', {
        sessionName: 'sess-x',
        intent_summary: 'plan',
      }),
    ] as const;
    for (const f of fixtures) {
      const r = await dispatchAction(input(f), deps);
      expect(r.kind, `expected pending-approval for ${f.action}`).toBe(
        'pending-approval',
      );
    }
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
    expect(deps.fireSpawn).not.toHaveBeenCalled();
    expect(deps.fireKill).not.toHaveBeenCalled();
    expect(deps.firePullHandoff).not.toHaveBeenCalled();
    expect(deps.startIntent).not.toHaveBeenCalled();
  });

  it('payload is validated BEFORE resolver — invalid payload returns kind:error not pending-approval', async () => {
    // The resolver should not be consulted when the payload itself is bad.
    const resolveApproval = vi.fn(async () => ({ approvalRequired: true, reason: 'r' }));
    const deps = buildDeps({ resolveApproval });
    const result = await dispatchAction(
      input(actionOutput('send', 'sess-x', {})),
      deps,
    );
    expect(result.kind).toBe('error');
    expect(resolveApproval).not.toHaveBeenCalled();
  });
});
