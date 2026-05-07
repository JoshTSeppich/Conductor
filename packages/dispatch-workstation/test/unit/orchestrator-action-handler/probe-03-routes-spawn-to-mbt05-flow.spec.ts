// MB-T11 WB5 probe-03 — 'spawn-new-session' routes to fireSpawn (MB-T05).

import { describe, expect, it } from 'vitest';
import { dispatchAction } from '../../../src/main/orchestrator-action-handler.js';
import { actionOutput, input, buildDeps } from './_helpers.js';

describe('orchestrator-action-handler — probe 03: spawn routes to MB-T05 flow', () => {
  it('passes the validated SpawnSessionActionPayload to fireSpawn', async () => {
    const deps = buildDeps();
    const payload = {
      sessionName: 'new-sess',
      repoPath: '/abs/repo',
      permissionMode: 'normal' as const,
    };
    const result = await dispatchAction(
      input(actionOutput('spawn-new-session', 'new-sess', payload)),
      deps,
    );
    expect(result.kind).toBe('fired');
    if (result.kind === 'fired') {
      expect(result.actionType).toBe('spawn-new-session');
      expect(result.sessionName).toBe('new-sess');
    }
    expect(deps.fireSpawn).toHaveBeenCalledTimes(1);
    expect(deps.fireSpawn).toHaveBeenCalledWith(payload);
  });

  it('result.sessionName comes from fireSpawn IPC reply (authoritative)', async () => {
    const deps = buildDeps({
      fireSpawn: async () => ({ sessionName: 'reply-sess' }),
    });
    const result = await dispatchAction(
      input(
        actionOutput('spawn-new-session', 'requested-sess', {
          sessionName: 'requested-sess',
          repoPath: '/abs',
        }),
      ),
      deps,
    );
    expect(result.kind).toBe('fired');
    if (result.kind === 'fired') {
      expect(result.sessionName).toBe('reply-sess');
    }
  });

  it('does not call other-action deps', async () => {
    const deps = buildDeps();
    await dispatchAction(
      input(
        actionOutput('spawn-new-session', 'new-sess', {
          sessionName: 'new-sess',
          repoPath: '/abs',
        }),
      ),
      deps,
    );
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
    expect(deps.fireKill).not.toHaveBeenCalled();
    expect(deps.firePullHandoff).not.toHaveBeenCalled();
    expect(deps.startIntent).not.toHaveBeenCalled();
  });

  it('surfaces fireSpawn rejection as kind:error', async () => {
    const deps = buildDeps({
      fireSpawn: async () => {
        throw new Error('SessionCapExceeded: 5 sessions active');
      },
    });
    const result = await dispatchAction(
      input(
        actionOutput('spawn-new-session', 'new-sess', {
          sessionName: 'new-sess',
          repoPath: '/abs',
        }),
      ),
      deps,
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toMatch(/SessionCapExceeded/);
      expect(result.actionType).toBe('spawn-new-session');
    }
  });
});
