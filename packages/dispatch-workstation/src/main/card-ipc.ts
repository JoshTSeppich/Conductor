// MB-T07 shell-side IPC handlers for orchestrator cards.
//
// WORKSTATION_CONTRACT.md §6.2 + §7.1: when the operator clicks
// Approve/Decline/multi-choice on a card in the embedded webview, the
// renderer emits a Webview→Shell IPC message. This module receives the
// message via ipcMain (or the test's injected ipcOn), constructs an
// OrchestratorAuditWriteRequest per the frozen v3 schema, and POSTs to
// the daemon's /v3/orchestrator/audit endpoint shipped by COARCH-T01.
//
// Pure helpers (`buildApproveAuditRow`, etc.) factor out the row
// construction so it is testable without booting Electron and without
// hitting the daemon. The IPC registration glue layer is also testable
// via the `ipcOn` injection seam.
//
// Card context (trigger_event, build_doc_id, build_doc_commit_sha,
// output_payload, superseded_card_ids) is supplied by a CardContextLookup
// that the shell populates when emitting orchestrator-card-rendered to
// the webview. The lookup is injected for testability; the production
// implementation (a Map populated on card-rendered emit) lands in
// cluster 5 with the supersession bookkeeping.

import type {
  CardOutput,
  MultiChoiceCardOutput,
  OrchestratorAuditWriteRequest,
  OperatorResponse,
} from 'dispatch-core/src/v3/schema.js';

export interface CardContext {
  card_id: string;
  trigger_event: string;
  build_doc_id: string;
  build_doc_commit_sha: string;
  output_type: 'card' | 'multi-choice-card';
  output_payload: CardOutput | MultiChoiceCardOutput;
  superseded_card_ids: string[];
}

export interface CardContextLookup {
  get(card_id: string): CardContext | null;
}

export interface DaemonAuditClient {
  postAudit(req: OrchestratorAuditWriteRequest): Promise<unknown>;
}

export interface CardIpcDeps {
  daemonClient: DaemonAuditClient;
  cardContext: CardContextLookup;
  /**
   * Injection seam for ipcMain.on (or a test fake). Production wires
   * `(channel, listener) => ipcMain.on(channel, listener)`.
   */
  ipcOn: (
    channel: string,
    listener: (event: unknown, payload: unknown) => Promise<void> | void,
  ) => void;
  now?: () => string;
}

export interface ApproveArgs {
  context: CardContext;
  free_form_text: string;
  now: string;
}

export interface DeclineArgs {
  context: CardContext;
  reason: string;
  now: string;
}

export interface MultiChoiceArgs {
  context: CardContext;
  selected_index: number;
  free_form_text: string | null;
  now: string;
}

const MULTI_CHOICE_RESPONSE_BY_INDEX: ReadonlyArray<OperatorResponse> = [
  'multi-choice-A',
  'multi-choice-B',
  'multi-choice-C',
  'multi-choice-D',
];

/**
 * For a CardOutput (action variant), merge the operator's free-form text
 * into the payload per locked vision §7.4. For send actions the body
 * field is the prompt, so free-form overrides body. For other actions
 * the orchestrator-supplied payload passes through with a free_form_text
 * sidecar so the action handler can decide how to use it.
 */
function mergeApprovePayload(
  output_payload: CardOutput | MultiChoiceCardOutput,
  free_form_text: string,
): unknown {
  if (output_payload.type !== 'card') {
    // Multi-choice approvals don't reach this path (multi-choice has its
    // own builder); guard kept for type-narrow safety.
    return output_payload;
  }
  const card = output_payload;
  const basePayload =
    typeof card.payload === 'object' && card.payload !== null
      ? (card.payload as Record<string, unknown>)
      : {};
  if (free_form_text === '') {
    return { ...basePayload };
  }
  // For send actions the operator's text replaces body. For other
  // actions free-form rides as a sidecar field.
  if (card.action === 'send') {
    return { ...basePayload, body: free_form_text };
  }
  return { ...basePayload, free_form_text };
}

export function buildApproveAuditRow(
  args: ApproveArgs,
): OrchestratorAuditWriteRequest {
  const { context, free_form_text, now } = args;
  return {
    timestamp: now,
    trigger_event: context.trigger_event,
    build_doc_id: context.build_doc_id,
    build_doc_commit_sha: context.build_doc_commit_sha,
    output_type: context.output_type,
    output_payload: context.output_payload,
    operator_response: 'approve',
    final_fired_payload: mergeApprovePayload(
      context.output_payload,
      free_form_text,
    ),
    execution_outcome: 'n/a',
    free_form_text: free_form_text === '' ? null : free_form_text,
    staleness_status: 'current',
    superseded_card_ids: context.superseded_card_ids,
  };
}

export function buildDeclineAuditRow(
  args: DeclineArgs,
): OrchestratorAuditWriteRequest {
  const { context, reason, now } = args;
  return {
    timestamp: now,
    trigger_event: context.trigger_event,
    build_doc_id: context.build_doc_id,
    build_doc_commit_sha: context.build_doc_commit_sha,
    output_type: context.output_type,
    output_payload: context.output_payload,
    operator_response: 'decline',
    final_fired_payload: null,
    execution_outcome: 'n/a',
    free_form_text: reason,
    staleness_status: 'current',
    superseded_card_ids: context.superseded_card_ids,
  };
}

export function buildMultiChoiceAuditRow(
  args: MultiChoiceArgs,
): OrchestratorAuditWriteRequest {
  const { context, selected_index, free_form_text, now } = args;
  // selected_index < 0 indicates the "none of the above" free-form path.
  // For that path operator_response stays 'pending' (per OperatorResponseEnum)
  // because the orchestrator must consume the free-form on next call to
  // determine what the operator meant.
  const operator_response: OperatorResponse =
    selected_index >= 0 && selected_index < MULTI_CHOICE_RESPONSE_BY_INDEX.length
      ? MULTI_CHOICE_RESPONSE_BY_INDEX[selected_index]!
      : 'pending';
  return {
    timestamp: now,
    trigger_event: context.trigger_event,
    build_doc_id: context.build_doc_id,
    build_doc_commit_sha: context.build_doc_commit_sha,
    output_type: context.output_type,
    output_payload: context.output_payload,
    operator_response,
    final_fired_payload: null,
    execution_outcome: 'n/a',
    free_form_text,
    staleness_status: 'current',
    superseded_card_ids: context.superseded_card_ids,
  };
}

export function registerCardIpcHandlers(deps: CardIpcDeps): void {
  const now = deps.now ?? (() => new Date().toISOString());

  deps.ipcOn('card:approved', async (_event, payload) => {
    const p = payload as { card_id?: string; free_form_text?: string | null };
    const card_id = typeof p?.card_id === 'string' ? p.card_id : '';
    if (card_id === '') return;
    const context = deps.cardContext.get(card_id);
    if (context === null) return;
    const free_form_text =
      typeof p.free_form_text === 'string' ? p.free_form_text : '';
    const row = buildApproveAuditRow({
      context,
      free_form_text,
      now: now(),
    });
    await deps.daemonClient.postAudit(row);
  });

  deps.ipcOn('card:declined', async (_event, payload) => {
    const p = payload as { card_id?: string; reason?: string };
    const card_id = typeof p?.card_id === 'string' ? p.card_id : '';
    const reason = typeof p?.reason === 'string' ? p.reason : '';
    if (card_id === '' || reason === '') return;
    const context = deps.cardContext.get(card_id);
    if (context === null) return;
    const row = buildDeclineAuditRow({ context, reason, now: now() });
    await deps.daemonClient.postAudit(row);
  });

  deps.ipcOn('card:multi-choice-selected', async (_event, payload) => {
    const p = payload as {
      card_id?: string;
      selected_index?: number;
      free_form_text?: string | null;
    };
    const card_id = typeof p?.card_id === 'string' ? p.card_id : '';
    if (card_id === '') return;
    const context = deps.cardContext.get(card_id);
    if (context === null) return;
    const selected_index =
      typeof p.selected_index === 'number' ? p.selected_index : -1;
    const free_form_text =
      typeof p.free_form_text === 'string' ? p.free_form_text : null;
    const row = buildMultiChoiceAuditRow({
      context,
      selected_index,
      free_form_text,
      now: now(),
    });
    await deps.daemonClient.postAudit(row);
  });
}
