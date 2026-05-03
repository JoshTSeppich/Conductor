// MB-T07 Cluster 2 — shell-side audit-write path on Approve.
//
// WORKSTATION_CONTRACT.md §6.2: when operator approves a card, the shell
// posts an OrchestratorAuditWriteRequest to /v3/orchestrator/audit. Audit
// row shape per OrchestratorAuditRowSchema (frozen in dispatch-core/src/v3/schema.ts).
// final_fired_payload merges the operator's free-form text into the
// payload per locked vision §7.4.
//
// RED state: src/main/card-audit-writer.ts absent → import fails.
import { describe, it, expect, vi } from 'vitest';
import {
  buildApproveAuditRow,
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

describe('MB-T07 cluster 2 — buildApproveAuditRow (pure)', () => {
  it('builds an OrchestratorAuditWriteRequest with operator_response=approve', () => {
    const row = buildApproveAuditRow({
      context: baseContext,
      free_form_text: 'modified prompt',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.operator_response).toBe('approve');
  });

  it('round-trips through OrchestratorAuditWriteRequestSchema (anti-fabrication: cites the frozen schema)', () => {
    const row = buildApproveAuditRow({
      context: baseContext,
      free_form_text: 'modified prompt',
      now: '2026-05-02T19:30:00.000Z',
    });
    const parsed = OrchestratorAuditWriteRequestSchema.safeParse(row);
    expect(parsed.success).toBe(true);
  });

  it('captures free_form_text into the audit row', () => {
    const row = buildApproveAuditRow({
      context: baseContext,
      free_form_text: 'modified prompt',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.free_form_text).toBe('modified prompt');
  });

  it('merges free-form text into final_fired_payload per vision §7.4', () => {
    const row = buildApproveAuditRow({
      context: baseContext,
      free_form_text: 'modified prompt',
      now: '2026-05-02T19:30:00.000Z',
    });
    // Vision §7.4: free-form merges into payload. For send action, the
    // body is the field that carries the prompt; the operator's free-form
    // overrides the orchestrator's pre-filled body.
    expect(row.final_fired_payload).toMatchObject({ body: 'modified prompt' });
  });

  it('emits free_form_text as null when operator approved without modification (read-only path)', () => {
    const row = buildApproveAuditRow({
      context: baseContext,
      free_form_text: '',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.free_form_text).toBeNull();
  });

  it('preserves output_payload, build_doc_id, build_doc_commit_sha from context', () => {
    const row = buildApproveAuditRow({
      context: baseContext,
      free_form_text: 'x',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.output_payload).toEqual(sendCard);
    expect(row.build_doc_id).toBe('mvp-build-doc');
    expect(row.build_doc_commit_sha).toBe('abc123');
    expect(row.output_type).toBe('card');
  });

  it('execution_outcome defaults to n/a (audit row records operator decision; action firing is downstream)', () => {
    const row = buildApproveAuditRow({
      context: baseContext,
      free_form_text: 'x',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.execution_outcome).toBe('n/a');
  });

  it('staleness_status starts at current; supersession transitions land in cluster 5', () => {
    const row = buildApproveAuditRow({
      context: baseContext,
      free_form_text: 'x',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.staleness_status).toBe('current');
  });
});

describe('MB-T07 cluster 2 — registerCardIpcHandlers (Approve path)', () => {
  it('on card:approved IPC, calls daemonClient.postAudit with the constructed audit row', async () => {
    const calls: unknown[] = [];
    const fakeDaemon = {
      postAudit: vi.fn(async (req: unknown) => {
        calls.push(req);
      }),
    };
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

    const handler = handlers.get('card:approved');
    expect(handler).toBeDefined();
    await handler!({}, { card_id: 'card-1', free_form_text: 'modified' });

    expect(fakeDaemon.postAudit).toHaveBeenCalledTimes(1);
    expect(calls[0]).toMatchObject({
      operator_response: 'approve',
      free_form_text: 'modified',
      output_type: 'card',
    });
  });

  it('skips audit-write when card_id is unknown (defensive: stale IPC, race condition)', async () => {
    const fakeDaemon = { postAudit: vi.fn() };
    const handlers = new Map<
      string,
      (event: unknown, payload: unknown) => Promise<void> | void
    >();
    const deps: CardIpcDeps = {
      daemonClient: fakeDaemon,
      cardContext: { get: () => null },
      ipcOn: (channel, listener) => handlers.set(channel, listener),
      now: () => '2026-05-02T19:30:00.000Z',
    };
    registerCardIpcHandlers(deps);

    await handlers.get('card:approved')!(
      {},
      { card_id: 'unknown-card', free_form_text: 'x' },
    );
    expect(fakeDaemon.postAudit).not.toHaveBeenCalled();
  });
});
