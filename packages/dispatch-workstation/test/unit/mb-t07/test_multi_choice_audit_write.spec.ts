// MB-T07 Cluster 4 — shell-side audit-write path on multi-choice selection.
//
// WORKSTATION_CONTRACT.md §6.2 + v3/schema.ts:
// - IPC envelope MultiChoiceSelectedMessage: {selected_index: int 0..3,
//   free_form_text: nullable}.
// - Audit row operator_response: 'multi-choice-A' | 'multi-choice-B' |
//   'multi-choice-C' | 'multi-choice-D' | 'pending' (per
//   OperatorResponseEnum). The free-form-fallback path routes back to
//   the orchestrator on the next call; operator_response='pending'
//   captures that the operator deferred the routing decision.
import { describe, it, expect, vi } from 'vitest';
import {
  buildMultiChoiceAuditRow,
  registerCardIpcHandlers,
  type CardContext,
  type CardIpcDeps,
} from '../../../src/main/card-ipc.js';
import {
  OrchestratorAuditWriteRequestSchema,
  type MultiChoiceCardOutput,
} from 'dispatch-core/src/v3/schema.js';

const mcCard: MultiChoiceCardOutput = {
  type: 'multi-choice-card',
  question: 'Which session should receive the handoff?',
  options: ['sherpa-001', 'sherpa-002', 'sherpa-003'],
  rationale: 'Multiple sessions awaiting_review.',
  build_doc_commit_sha: 'abc123',
  superseded_card_ids: [],
};

const baseContext: CardContext = {
  card_id: 'mc-1',
  trigger_event: 'three sessions awaiting_review',
  build_doc_id: 'mvp-build-doc',
  build_doc_commit_sha: 'abc123',
  output_type: 'multi-choice-card',
  output_payload: mcCard,
  superseded_card_ids: [],
};

describe('MB-T07 cluster 4 — buildMultiChoiceAuditRow (pure)', () => {
  it.each([
    [0, 'multi-choice-A'],
    [1, 'multi-choice-B'],
    [2, 'multi-choice-C'],
    [3, 'multi-choice-D'],
  ] as const)(
    'maps selected_index=%i to operator_response=%s',
    (idx, expected) => {
      const row = buildMultiChoiceAuditRow({
        context: baseContext,
        selected_index: idx,
        free_form_text: null,
        now: '2026-05-02T19:30:00.000Z',
      });
      expect(row.operator_response).toBe(expected);
    },
  );

  it('round-trips OrchestratorAuditWriteRequestSchema for option-click path', () => {
    const row = buildMultiChoiceAuditRow({
      context: baseContext,
      selected_index: 1,
      free_form_text: null,
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(
      OrchestratorAuditWriteRequestSchema.safeParse(row).success,
    ).toBe(true);
  });

  it('free-form fallback path: selected_index out of [0..3] maps to operator_response=pending', () => {
    // Bridge clamps -1 → 0 at envelope boundary; the audit-row builder
    // sees synthetic-0+free_form_text. But pure-function test exercises
    // the index>3 OR <0 branch directly to document the routing.
    const row = buildMultiChoiceAuditRow({
      context: baseContext,
      selected_index: 99,
      free_form_text: 'spawn a new one',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.operator_response).toBe('pending');
    expect(row.free_form_text).toBe('spawn a new one');
  });

  it('captures free_form_text into audit row even when an option is selected', () => {
    // Defensive: the operator could click option-0 AND have typed in
    // the free-form box. The audit row preserves both signals so the
    // orchestrator can use the free-form as routing context.
    const row = buildMultiChoiceAuditRow({
      context: baseContext,
      selected_index: 0,
      free_form_text: 'use option A but only after pulling',
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.operator_response).toBe('multi-choice-A');
    expect(row.free_form_text).toBe(
      'use option A but only after pulling',
    );
  });

  it('final_fired_payload null on multi-choice (the orchestrator decides what to fire on the next call)', () => {
    const row = buildMultiChoiceAuditRow({
      context: baseContext,
      selected_index: 2,
      free_form_text: null,
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.final_fired_payload).toBeNull();
  });

  it('preserves output_type=multi-choice-card + output_payload from context', () => {
    const row = buildMultiChoiceAuditRow({
      context: baseContext,
      selected_index: 0,
      free_form_text: null,
      now: '2026-05-02T19:30:00.000Z',
    });
    expect(row.output_type).toBe('multi-choice-card');
    expect(row.output_payload).toEqual(mcCard);
  });
});

describe('MB-T07 cluster 4 — registerCardIpcHandlers (multi-choice path)', () => {
  it('on card:multi-choice-selected IPC, calls daemonClient.postAudit with mapped operator_response', async () => {
    const fakeDaemon = { postAudit: vi.fn(async () => {}) };
    const lookups = new Map<string, CardContext>([['mc-1', baseContext]]);
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

    await handlers.get('card:multi-choice-selected')!(
      {},
      { card_id: 'mc-1', selected_index: 2, free_form_text: null },
    );

    expect(fakeDaemon.postAudit).toHaveBeenCalledTimes(1);
    expect(fakeDaemon.postAudit.mock.calls[0]![0]).toMatchObject({
      operator_response: 'multi-choice-C',
      output_type: 'multi-choice-card',
    });
  });

  it('skips audit-write when card_id is unknown', async () => {
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

    await handlers.get('card:multi-choice-selected')!(
      {},
      { card_id: 'gone', selected_index: 0, free_form_text: null },
    );
    expect(fakeDaemon.postAudit).not.toHaveBeenCalled();
  });
});
