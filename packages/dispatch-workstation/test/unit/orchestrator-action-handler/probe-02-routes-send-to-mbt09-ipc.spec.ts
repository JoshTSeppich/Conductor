// MB-T11 WB5 probe-02 — 'send' routes to the MB-T09 fireSendPrompt dep.

import { describe, expect, it } from 'vitest';
import { dispatchAction } from '../../../src/main/orchestrator-action-handler.js';
import { actionOutput, input, buildDeps } from './_helpers.js';

describe('orchestrator-action-handler — probe 02: send routes to MB-T09 IPC', () => {
  it('passes sessionName from action.target + payload to fireSendPrompt', async () => {
    const deps = buildDeps();
    const payload = { prompt: 'do the thing' };
    const result = await dispatchAction(
      input(actionOutput('send', 'sess-x', payload)),
      deps,
    );
    expect(result.kind).toBe('fired');
    if (result.kind === 'fired') {
      expect(result.actionType).toBe('send');
      expect(result.sessionName).toBe('sess-x');
    }
    expect(deps.fireSendPrompt).toHaveBeenCalledTimes(1);
    expect(deps.fireSendPrompt).toHaveBeenCalledWith('sess-x', payload);
  });

  it('forwards envelope when present', async () => {
    const deps = buildDeps();
    const payload = {
      prompt: 'step 2 of plan',
      envelope: {
        envelope_version: 1 as const,
        intent_id: '01963a35-7c9c-7b8a-bb9c-1234567890ab',
        step: 2,
        total_steps: 3,
        intent_summary: 'multi-step plan',
      },
    };
    await dispatchAction(input(actionOutput('send', 'sess-x', payload)), deps);
    expect(deps.fireSendPrompt).toHaveBeenCalledWith('sess-x', payload);
  });

  it('does not call other-action deps', async () => {
    const deps = buildDeps();
    await dispatchAction(
      input(actionOutput('send', 'sess-x', { prompt: 'hello' })),
      deps,
    );
    expect(deps.fireSpawn).not.toHaveBeenCalled();
    expect(deps.fireKill).not.toHaveBeenCalled();
    expect(deps.firePullHandoff).not.toHaveBeenCalled();
    expect(deps.startIntent).not.toHaveBeenCalled();
  });

  it('surfaces fireSendPrompt rejection as kind:error', async () => {
    const deps = buildDeps({
      fireSendPrompt: async () => {
        throw new Error('tmux unreachable');
      },
    });
    const result = await dispatchAction(
      input(actionOutput('send', 'sess-x', { prompt: 'hello' })),
      deps,
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toMatch(/tmux unreachable/);
      expect(result.actionType).toBe('send');
      expect(result.sessionName).toBe('sess-x');
    }
  });
});
