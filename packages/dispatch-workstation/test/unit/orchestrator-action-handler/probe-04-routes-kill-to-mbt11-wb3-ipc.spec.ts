// MB-T11 WB5 probe-04 — 'kill' routes to fireKill (MB-T11 WB3).

import { describe, expect, it } from 'vitest';
import { dispatchAction } from '../../../src/main/orchestrator-action-handler.js';
import { actionOutput, input, buildDeps } from './_helpers.js';

describe('orchestrator-action-handler — probe 04: kill routes to WB3 IPC', () => {
  it('passes sessionName + payload to fireKill', async () => {
    const deps = buildDeps();
    const payload = { sessionName: 'sess-x', reason: 'task complete' };
    const result = await dispatchAction(
      input(actionOutput('kill', 'sess-x', payload)),
      deps,
    );
    expect(result.kind).toBe('fired');
    if (result.kind === 'fired') {
      expect(result.actionType).toBe('kill');
      expect(result.sessionName).toBe('sess-x');
    }
    expect(deps.fireKill).toHaveBeenCalledTimes(1);
    expect(deps.fireKill).toHaveBeenCalledWith('sess-x', payload);
  });

  it('passes minimal kill payload (no reason)', async () => {
    const deps = buildDeps();
    const payload = { sessionName: 'sess-x' };
    await dispatchAction(input(actionOutput('kill', 'sess-x', payload)), deps);
    expect(deps.fireKill).toHaveBeenCalledWith('sess-x', payload);
  });

  it('does not call other-action deps', async () => {
    const deps = buildDeps();
    await dispatchAction(
      input(actionOutput('kill', 'sess-x', { sessionName: 'sess-x' })),
      deps,
    );
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
    expect(deps.fireSpawn).not.toHaveBeenCalled();
    expect(deps.firePullHandoff).not.toHaveBeenCalled();
    expect(deps.startIntent).not.toHaveBeenCalled();
  });

  it('surfaces fireKill rejection as kind:error', async () => {
    const deps = buildDeps({
      fireKill: async () => {
        throw new Error('TmuxKillError: session not running');
      },
    });
    const result = await dispatchAction(
      input(actionOutput('kill', 'sess-x', { sessionName: 'sess-x' })),
      deps,
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toMatch(/TmuxKillError/);
      expect(result.actionType).toBe('kill');
    }
  });
});
