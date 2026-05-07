// MB-T11 WB5 probe-08 — resolver returns approvalRequired:false → action
// fires immediately. Also verifies the card-variant short-circuit
// (operator-approved cards skip the resolver and fire directly).

import { describe, expect, it, vi } from 'vitest';
import { dispatchAction } from '../../../src/main/orchestrator-action-handler.js';
import { actionOutput, cardOutput, input, buildDeps } from './_helpers.js';

describe('orchestrator-action-handler — probe 08: resolver allows / card short-circuits', () => {
  it('action variant + resolver returns approvalRequired:false → fires send', async () => {
    const deps = buildDeps({
      resolveApproval: vi.fn(async () => ({
        approvalRequired: false,
        reason: 'fixture: no approval needed',
      })),
    });
    const result = await dispatchAction(
      input(actionOutput('send', 'sess-x', { prompt: 'hello' })),
      deps,
    );
    expect(result.kind).toBe('fired');
    expect(deps.fireSendPrompt).toHaveBeenCalledTimes(1);
  });

  it('card variant skips resolver entirely (operator already approved)', async () => {
    const resolveApproval = vi.fn(async () => ({
      approvalRequired: true, // would block if consulted
      reason: 'should not be consulted',
    }));
    const deps = buildDeps({ resolveApproval });
    const result = await dispatchAction(
      input(cardOutput('send', 'sess-x', { prompt: 'hello' })),
      deps,
    );
    expect(result.kind).toBe('fired');
    expect(resolveApproval).not.toHaveBeenCalled();
    expect(deps.fireSendPrompt).toHaveBeenCalledTimes(1);
  });

  it('card variant fires kill even when stub resolver would block', async () => {
    const deps = buildDeps({
      // Default resolver blocks everything; card variant should bypass.
      resolveApproval: vi.fn(async () => ({
        approvalRequired: true,
        reason: 'shim blocks',
      })),
    });
    const result = await dispatchAction(
      input(cardOutput('kill', 'sess-x', { sessionName: 'sess-x' })),
      deps,
    );
    expect(result.kind).toBe('fired');
    expect(deps.fireKill).toHaveBeenCalledTimes(1);
  });

  it('card variant fires assign-task and returns intent_id', async () => {
    const deps = buildDeps({
      resolveApproval: vi.fn(async () => ({
        approvalRequired: true,
        reason: 'shim blocks',
      })),
      startIntent: vi.fn(async () => ({ intent_id: 'card-approved-intent' })),
    });
    const result = await dispatchAction(
      input(
        cardOutput('assign-task', 'sess-x', {
          sessionName: 'sess-x',
          intent_summary: 'plan',
        }),
      ),
      deps,
    );
    expect(result.kind).toBe('fired');
    if (result.kind === 'fired') {
      expect(result.intent_id).toBe('card-approved-intent');
    }
  });
});
