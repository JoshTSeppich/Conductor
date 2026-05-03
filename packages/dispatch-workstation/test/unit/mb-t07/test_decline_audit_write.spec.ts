// MB-T07 Cluster 3 — shell-side audit-write path on Decline.
//
// WORKSTATION_CONTRACT.md §6.2 + vision §7.4: when operator declines a
// card, the shell posts an OrchestratorAuditWriteRequest with
// operator_response='decline' and the operator-supplied reason captured
// in free_form_text (per OrchestratorAuditRowSchema field naming;
// CardDeclinedMessage uses `reason` on the IPC envelope, the audit row
// stores it as `free_form_text`).
import { describe, it, expect, vi } from 'vitest';
import {
  buildDeclineAuditRow,
  registerCardIpcHandlers,
  type CardContext,
  type CardIpcDeps,
} from '../../../src/main/card-ipc.js';
import {
  OrchestratorAuditWriteRequestSchema,
  type CardOutput,
} from 'dispatch-core/src/v3/schema.js';

const sendCard: CardOutput = {
  type: 'card',
  action: 'send',
  target: 'sherpa-001',
  payload: { body: 'continue work on T05' },
  rationale: 'Triggering event maps to send action.',
  free_form_prompt: 'continue work on T05',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc123',
};

const baseContext: CardContext = {
  card_id: 'card-1',
  trigger_event: 'session sherpa-001 awaiting_review for >5m',
  build_doc_id: 'mvp-build-doc',
  build_doc_commit_sha: 'abc123',
  output_type: 'card',
  output_payload: sendCard,
  superseded_card_ids: [],
};

describe('MB-T07 cluster 3 — buildDeclineAuditRow (pure)', () => {
  it('builds OrchestratorAuditWriteRequest with operator_response=decline', () => {
    const row = buildDeclineAuditRow({
      context: baseContext,
      reason: 'not now',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.operator_response).toBe('decline');
  });

  it('round-trips through OrchestratorAuditWriteRequestSchema', () => {
    const row = buildDeclineAuditRow({
      context: baseContext,
      reason: 'not now',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(
      OrchestratorAuditWriteRequestSchema.safeParse(row).success,
    ).toBe(true);
  });

  it('stores the operator-supplied reason in audit row free_form_text', () => {
    const row = buildDeclineAuditRow({
      context: baseContext,
      reason: 'wrong target session',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.free_form_text).toBe('wrong target session');
  });

  it('final_fired_payload is null on Decline (no action fires)', () => {
    const row = buildDeclineAuditRow({
      context: baseContext,
      reason: 'no',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.final_fired_payload).toBeNull();
  });

  it('execution_outcome is n/a; staleness_status is current', () => {
    const row = buildDeclineAuditRow({
      context: baseContext,
      reason: 'no',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.execution_outcome).toBe('n/a');
    expect(row.staleness_status).toBe('current');
  });
});

describe('MB-T07 cluster 3 — registerCardIpcHandlers (Decline path)', () => {
  it('on card:declined IPC, calls daemonClient.postAudit with the decline row', async () => {
    const fakeDaemon = { postAudit: vi.fn(async () => {}) };
    const lookups = new Map<string, CardContext>([['card-1', baseContext]]);
    const handlers = new Map<
      string,
      (event: unknown, payload: unknown) => Promise<void> | void
    >();
    const deps: CardIpcDeps = {
      daemonClient: fakeDaemon,
      cardContext: { get: (id) => lookups.get(id) ?? null },
      ipcOn: (channel, listener) => handlers.set(channel, listener),
      now: () => '2026-05-02T19:30:00.000Z',
    };
    registerCardIpcHandlers(deps);

    await handlers.get('card:declined')!(
      {},
      { card_id: 'card-1', reason: 'not now' },
    );

    expect(fakeDaemon.postAudit).toHaveBeenCalledTimes(1);
    expect(fakeDaemon.postAudit.mock.calls[0]![0]).toMatchObject({
      operator_response: 'decline',
      free_form_text: 'not now',
    });
  });

  it('skips audit-write when reason is empty (defensive: required-field gate enforced even if UI gate bypassed)', async () => {
    const fakeDaemon = { postAudit: vi.fn() };
    const handlers = new Map<
      string,
      (event: unknown, payload: unknown) => Promise<void> | void
    >();
    const deps: CardIpcDeps = {
      daemonClient: fakeDaemon,
      cardContext: { get: () => baseContext },
      ipcOn: (channel, listener) => handlers.set(channel, listener),
      now: () => '2026-05-02T19:30:00.000Z',
    };
    registerCardIpcHandlers(deps);

    await handlers.get('card:declined')!({}, { card_id: 'card-1', reason: '' });
    expect(fakeDaemon.postAudit).not.toHaveBeenCalled();
  });
});
