// MB-T11 WB5 probe-06 — 'assign-task' routes to startIntent (autopilot WB6).
// Autopilot module ships in WB6; this probe asserts the dep contract surface
// only — vi.fn() stub.

import { describe, expect, it, vi } from 'vitest';
import { dispatchAction } from '../../../src/main/orchestrator-action-handler.js';
import { actionOutput, input, buildDeps } from './_helpers.js';

describe('orchestrator-action-handler — probe 06: assign-task routes to autopilot', () => {
  it('passes the validated AssignTaskActionPayload to startIntent', async () => {
    const deps = buildDeps();
    const payload = {
      sessionName: 'sess-x',
      intent_summary: 'rebuild auth flow',
      expected_steps: 4,
    };
    const result = await dispatchAction(
      input(actionOutput('assign-task', 'sess-x', payload)),
      deps,
    );
    expect(result.kind).toBe('fired');
    if (result.kind === 'fired') {
      expect(result.actionType).toBe('assign-task');
      expect(result.sessionName).toBe('sess-x');
      expect(result.intent_id).toBe('fixture-intent-id');
    }
    expect(deps.startIntent).toHaveBeenCalledTimes(1);
    expect(deps.startIntent).toHaveBeenCalledWith(payload);
  });

  it('returns the autopilot-supplied intent_id on result.intent_id', async () => {
    const deps = buildDeps({
      startIntent: vi.fn(async () => ({ intent_id: 'mock-intent-1234' })),
    });
    const result = await dispatchAction(
      input(
        actionOutput('assign-task', 'sess-x', {
          sessionName: 'sess-x',
          intent_summary: 'plan',
        }),
      ),
      deps,
    );
    expect(result.kind).toBe('fired');
    if (result.kind === 'fired') {
      expect(result.intent_id).toBe('mock-intent-1234');
    }
  });

  it('does not call other-action deps', async () => {
    const deps = buildDeps();
    await dispatchAction(
      input(
        actionOutput('assign-task', 'sess-x', {
          sessionName: 'sess-x',
          intent_summary: 'plan',
        }),
      ),
      deps,
    );
    expect(deps.fireSendPrompt).not.toHaveBeenCalled();
    expect(deps.fireSpawn).not.toHaveBeenCalled();
    expect(deps.fireKill).not.toHaveBeenCalled();
    expect(deps.firePullHandoff).not.toHaveBeenCalled();
  });

  it('surfaces startIntent rejection as kind:error', async () => {
    const deps = buildDeps({
      startIntent: async () => {
        throw new Error('autopilot store unwritable');
      },
    });
    const result = await dispatchAction(
      input(
        actionOutput('assign-task', 'sess-x', {
          sessionName: 'sess-x',
          intent_summary: 'plan',
        }),
      ),
      deps,
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toMatch(/autopilot store/);
      expect(result.actionType).toBe('assign-task');
    }
  });
});
