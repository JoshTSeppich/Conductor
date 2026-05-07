/**
 * v3 schema — orchestrator and Workstation surface.
 *
 * Authority: operator-arbitrated freeze anchor per WORKSTATION_CONTRACT.md
 * §2.2 ("the runtime schema is the source of truth for runtime validation").
 * This file is the source of truth for v3 runtime types. Markdown specs
 * (`WORKSTATION_CONTRACT.md`, `build-doc-schema-spec.md`, `vision.md`) are
 * the human-readable contract surface; when this file and the Markdown
 * specs diverge, this file wins and the Markdown spec is amended via
 * `contract:` commit.
 *
 * Authority chain (per-section citations below):
 *   - WORKSTATION_CONTRACT.md (frozen at ade584b, amended at 7fd48e4 §8.1)
 *   - vision.md §7 + §8 (frozen at 9d751f8)
 *   - build-doc-schema-spec.md (P-0.5 ratified)
 *   - cairn-sonnet-extensions.md §2 (seven primitives)
 *   - operator-acked decisions (MB-S03 ratified §6.1–§6.4)
 *
 * Schema versioning: v3 versions independently from v2. v2 schema at
 * `../v2/schema.ts` (frozen at 551c469) coexists; v3 does not modify v2
 * types. v3.0 ships as v3 schema version "1.0" per §2.3.
 */

import { z } from 'zod';
// v2-frozen IPC payload type; daemon-state-update IPC carries the FULL
// SessionsListResponse shape per MB-S03 ratified decision (NOT a delta).
import { SessionsListResponse } from '../v2/schema.js';

// ─────────────────────────────────────────────────────────────────────────────
// §1 — Enumerations (per WORKSTATION_CONTRACT.md §3.3 + build-doc-schema-spec)
// ─────────────────────────────────────────────────────────────────────────────

/** Build-doc + orchestrator action enumeration per WORKSTATION_CONTRACT.md §3.3. */
export const ActionTypeEnum = z.enum([
  'spawn-new-session',
  'send',
  'pull',
  'kill',
  'pause',
  'hold',
  'arm',
  'read-file',
  // MB-T11 — assign-task action (metadata-only marker per Q-MBT11-5)
  'assign-task',
]);
export type ActionType = z.infer<typeof ActionTypeEnum>;

/** Ticket types per build-doc-schema-spec.md §3.3. */
export const TicketTypeEnum = z.enum([
  'red',
  'green',
  'refactor',
  'contract',
  'spike',
]);
export type TicketType = z.infer<typeof TicketTypeEnum>;

/** Ticket lifecycle state per build-doc-schema-spec.md §3.3 + §3.8. */
export const TicketLifecycleStateEnum = z.enum([
  'pending',
  'in-progress',
  'awaiting-approval',
  'complete',
  'stale',
  'superseded',
]);
export type TicketLifecycleState = z.infer<typeof TicketLifecycleStateEnum>;

/** Orchestrator output discriminator per ratified P-0.4 Q2 + vision §7.1. */
export const OrchestratorOutputTypeEnum = z.enum([
  'action',
  'card',
  'multi-choice-card',
  'escape-block',
  'noop',
]);
export type OrchestratorOutputType = z.infer<typeof OrchestratorOutputTypeEnum>;

/** Operator response per vision §7.8 audit-row schema. */
export const OperatorResponseEnum = z.enum([
  'approve',
  'decline',
  'multi-choice-A',
  'multi-choice-B',
  'multi-choice-C',
  'multi-choice-D',
  'copied-escape-block',
  'pending',
]);
export type OperatorResponse = z.infer<typeof OperatorResponseEnum>;

/** Audit-row execution outcome per vision §7.8. */
export const ExecutionOutcomeEnum = z.enum(['success', 'failure', 'n/a']);
export type ExecutionOutcome = z.infer<typeof ExecutionOutcomeEnum>;

/** Audit-row staleness per vision §7.8 + §7.6. */
export const StalenessStatusEnum = z.enum(['current', 'stale', 'superseded']);
export type StalenessStatus = z.infer<typeof StalenessStatusEnum>;

/** Chat-message role per ratified §0.7 chat-history schema. */
export const MessageRoleEnum = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleEnum>;

// ─────────────────────────────────────────────────────────────────────────────
// §2 — Build-doc schemas (per build-doc-schema-spec.md §2 + §3)
// ─────────────────────────────────────────────────────────────────────────────

/** §2 frontmatter — strict v1.0 per ratified P-0.5 Q2. */
export const BuildDocFrontmatterSchema = z
  .object({
    schema_version: z.literal('1.0'),
    doc_id: z.string().min(1),
    title: z.string().min(1),
    target_repo: z.string().min(1),
    author: z.string().min(1),
    created_at: z.string().datetime({ offset: true }),
    allowed_action_types: z.array(ActionTypeEnum).min(0),
    description: z.string().min(1),
  })
  .strict();
export type BuildDocFrontmatter = z.infer<typeof BuildDocFrontmatterSchema>;

/** §3.3 ticket — full structure for every ticket type per ratified P-0.5 Q3. */
export const BuildDocTicketSchema = z
  .object({
    ticket_id: z.string().min(1),
    section_id: z.string().min(1),
    type: TicketTypeEnum,
    domain: z.string().min(1),
    phase: z.string().min(1),
    depends_on: z.array(z.string().min(1)),
    allowed_actions: z.array(ActionTypeEnum),
    status: TicketLifecycleStateEnum,
    description: z.string().min(1),
    red: z.string().nullable(),
    green: z.string().nullable(),
    refactor: z.string().nullable(),
    open_questions_refs: z.array(z.string()).default([]),
  })
  .strict();
export type BuildDocTicket = z.infer<typeof BuildDocTicketSchema>;

/** §3.6 escape-hatch markers — pre-marked open questions. */
export const OpenQuestionSchema = z
  .object({
    question_id: z.string().min(1),
    section_id: z.string().min(1),
    trigger_condition: z.string().min(1),
    why_operator_only: z.string().min(1),
    escape_block_content: z.string().min(1),
  })
  .strict();
export type OpenQuestion = z.infer<typeof OpenQuestionSchema>;

/** §3.7 multi-choice templates — 2-4 dynamic options per ratified P-0.5 Q7. */
export const MultiChoiceTemplateSchema = z
  .object({
    template_id: z.string().min(1),
    section_id: z.string().min(1),
    trigger_condition: z.string().min(1),
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
    routing: z.string().min(1),
  })
  .strict();
export type MultiChoiceTemplate = z.infer<typeof MultiChoiceTemplateSchema>;

/** Composite document validation per build-doc-schema-spec §5. */
export const BuildDocSchema = z
  .object({
    frontmatter: BuildDocFrontmatterSchema,
    tickets: z.array(BuildDocTicketSchema),
    open_questions: z.array(OpenQuestionSchema).default([]),
    multi_choice_templates: z.array(MultiChoiceTemplateSchema).default([]),
  })
  .strict();
export type BuildDoc = z.infer<typeof BuildDocSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §3 — Orchestrator output schemas (vision §7.3 + §7.4 + §7.7)
// ─────────────────────────────────────────────────────────────────────────────

/** Action output — fires-without-card only when read-only per cairn-Sonnet §2.7. */
export const ActionOutputSchema = z
  .object({
    type: z.literal('action'),
    action: ActionTypeEnum,
    target: z.string().min(1),
    payload: z.unknown().optional(),
    rationale: z.string().min(1),
    build_doc_commit_sha: z.string().min(1),
  })
  .strict();
export type ActionOutput = z.infer<typeof ActionOutputSchema>;

/** Card output — two pills + free-form per §7.3, §7.4. */
export const CardOutputSchema = z
  .object({
    type: z.literal('card'),
    action: ActionTypeEnum,
    target: z.string().min(1),
    payload: z.unknown().optional(),
    rationale: z.string().min(1),
    free_form_prompt: z.string().min(1),
    /** §7.6 Item B visual-on-card supersession lineage. */
    superseded_card_ids: z.array(z.string()).default([]),
    build_doc_commit_sha: z.string().min(1),
  })
  .strict();
export type CardOutput = z.infer<typeof CardOutputSchema>;

/** Multi-choice card — 2-4 dynamic options per §7.11 Item C / P-0.4 Q3. */
export const MultiChoiceCardOutputSchema = z
  .object({
    type: z.literal('multi-choice-card'),
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
    rationale: z.string().min(1),
    build_doc_commit_sha: z.string().min(1),
    superseded_card_ids: z.array(z.string()).default([]),
  })
  .strict();
export type MultiChoiceCardOutput = z.infer<typeof MultiChoiceCardOutputSchema>;

/** needs-operator-prose escape-block per ratified §7.7. */
export const EscapeBlockOutputSchema = z
  .object({
    type: z.literal('escape-block'),
    build_doc_path: z.string().min(1),
    build_doc_commit_sha: z.string().min(1),
    triggering_event: z.string().min(1),
    what_i_tried: z.string().min(1),
    where_im_stuck: z.string().min(1),
    build_doc_sections_consulted: z.array(z.string()).default([]),
  })
  .strict();
export type EscapeBlockOutput = z.infer<typeof EscapeBlockOutputSchema>;

/** Discriminated union per §2.1 + cairn-Sonnet §2.5 (structured-output-discipline). */
export const OrchestratorOutputSchema = z.discriminatedUnion('type', [
  ActionOutputSchema,
  CardOutputSchema,
  MultiChoiceCardOutputSchema,
  EscapeBlockOutputSchema,
]);
export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §4 — Ticket-state schemas (P-0.5 Q8.2 + ratified §6 upsert decision)
// ─────────────────────────────────────────────────────────────────────────────

/** Ticket state per build-doc-schema-spec §3.8. */
export const TicketStateSchema = z
  .object({
    ticket_id: z.string().min(1),
    build_doc_id: z.string().min(1),
    state: TicketLifecycleStateEnum,
    state_updated_at: z.string().datetime(),
    superseded_by_ticket_id: z.string().nullable(),
  })
  .strict();
export type TicketState = z.infer<typeof TicketStateSchema>;

/**
 * Persisted row in `orchestrator_ticket_state` per WORKSTATION_CONTRACT.md
 * §8.1. Identical to `TicketStateSchema` for v3.0 — the row shape is the
 * public shape because ratified §6 upserts via INSERT OR REPLACE with no
 * internal-only fields. Kept as a separate alias so a future amendment can
 * diverge without breaking `TicketStateSchema` consumers.
 */
export const TicketStateRowSchema = TicketStateSchema;
export type TicketStateRow = z.infer<typeof TicketStateRowSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §5 — Audit-row schemas (vision §7.8 — fields verbatim from §7.8)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Audit row as persisted in `orchestrator_audit` per WORKSTATION_CONTRACT.md
 * §8.1 + ratified §6.4 (JSON-encoded payload as TEXT in SQLite, parsed shape
 * validated at the route boundary).
 *
 * Field set is the verbatim vision §7.8 list.
 */
export const OrchestratorAuditRowSchema = z
  .object({
    id: z.string().min(1),
    timestamp: z.string().datetime(),
    trigger_event: z.string().min(1),
    build_doc_id: z.string().min(1),
    build_doc_commit_sha: z.string().min(1),
    output_type: OrchestratorOutputTypeEnum,
    output_payload: OrchestratorOutputSchema.nullable(),
    operator_response: OperatorResponseEnum,
    final_fired_payload: z.unknown().nullable(),
    execution_outcome: ExecutionOutcomeEnum,
    free_form_text: z.string().nullable(),
    staleness_status: StalenessStatusEnum,
    superseded_card_ids: z.array(z.string()).default([]),
  })
  .strict();
export type OrchestratorAuditRow = z.infer<typeof OrchestratorAuditRowSchema>;

/**
 * POST /v3/orchestrator/audit body — verbatim audit-row shape minus `id`
 * (server-assigned UUIDv7) per ratified §6.2.
 */
export const OrchestratorAuditWriteRequestSchema = OrchestratorAuditRowSchema.omit({
  id: true,
});
export type OrchestratorAuditWriteRequest = z.infer<
  typeof OrchestratorAuditWriteRequestSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// §6 — Chat-history schemas (§8.1 SQLite + §6.1 endpoint surface)
// ─────────────────────────────────────────────────────────────────────────────

/** Wire-shape for POST /v3/orchestrator/messages request. */
export const OrchestratorMessageSchema = z
  .object({
    role: MessageRoleEnum,
    content: z.string().min(1),
    build_doc_id: z.string().nullable(),
    build_doc_commit_sha: z.string().nullable(),
  })
  .strict();
export type OrchestratorMessage = z.infer<typeof OrchestratorMessageSchema>;

/** Persisted shape in `orchestrator_messages` (server-assigned id + created_at). */
export const OrchestratorMessageRowSchema = OrchestratorMessageSchema.extend({
  id: z.string().min(1),
  created_at: z.string().datetime(),
}).strict();
export type OrchestratorMessageRow = z.infer<typeof OrchestratorMessageRowSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §7 — IPC schemas (WORKSTATION_CONTRACT.md §7.1 — directional unions)
// ─────────────────────────────────────────────────────────────────────────────

// Shell → Webview message variants

const OrchestratorCardRenderedMessage = z
  .object({
    type: z.literal('orchestrator-card-rendered'),
    card_id: z.string().min(1),
    card: z.discriminatedUnion('type', [
      CardOutputSchema,
      MultiChoiceCardOutputSchema,
    ]),
  })
  .strict();

const OrchestratorCardSupersededMessage = z
  .object({
    type: z.literal('orchestrator-card-superseded'),
    superseding_card_id: z.string().min(1),
    superseded_card_ids: z.array(z.string().min(1)).min(1),
  })
  .strict();

const OrchestratorCardUpdateMessage = z
  .object({
    type: z.literal('orchestrator-card-update'),
    card_id: z.string().min(1),
    patch: z.record(z.string(), z.unknown()),
  })
  .strict();

const EscapeBlockSurfacedMessage = z
  .object({
    type: z.literal('escape-block-surfaced'),
    block: EscapeBlockOutputSchema,
  })
  .strict();

const DaemonStateUpdateMessage = z
  .object({
    type: z.literal('daemon-state-update'),
    /**
     * Ratified §6 (MB-S03): full SessionsListResponse shape from v2 schema,
     * NOT a delta. Orchestrator computes its own deltas if needed.
     */
    payload: SessionsListResponse,
  })
  .strict();

const SettingsChangedMessage = z
  .object({
    type: z.literal('settings-changed'),
    keys: z.array(z.string()).min(1),
  })
  .strict();

export const ShellToWebviewMessageSchema = z.discriminatedUnion('type', [
  OrchestratorCardRenderedMessage,
  OrchestratorCardSupersededMessage,
  OrchestratorCardUpdateMessage,
  EscapeBlockSurfacedMessage,
  DaemonStateUpdateMessage,
  SettingsChangedMessage,
]);
export type ShellToWebviewMessage = z.infer<typeof ShellToWebviewMessageSchema>;

// Webview → Shell message variants

const CardApprovedMessage = z
  .object({
    type: z.literal('card-approved'),
    card_id: z.string().min(1),
    free_form_text: z.string().nullable(),
    timestamp: z.string().datetime(),
  })
  .strict();

const CardDeclinedMessage = z
  .object({
    type: z.literal('card-declined'),
    card_id: z.string().min(1),
    /** Required for declines per vision §7.4 Item B / P-0 leftover Q3. */
    reason: z.string().min(1),
    timestamp: z.string().datetime(),
  })
  .strict();

const MultiChoiceSelectedMessage = z
  .object({
    type: z.literal('multi-choice-selected'),
    card_id: z.string().min(1),
    selected_index: z.number().int().min(0).max(3),
    free_form_text: z.string().nullable(),
    timestamp: z.string().datetime(),
  })
  .strict();

const EscapeBlockCopiedMessage = z
  .object({
    type: z.literal('escape-block-copied'),
    block_id: z.string().min(1),
    timestamp: z.string().datetime(),
  })
  .strict();

const KanbanFilterChangedMessage = z
  .object({
    type: z.literal('kanban-filter-changed'),
    filter: z.record(z.string(), z.unknown()),
    timestamp: z.string().datetime(),
  })
  .strict();

export const WebviewToShellMessageSchema = z.discriminatedUnion('type', [
  CardApprovedMessage,
  CardDeclinedMessage,
  MultiChoiceSelectedMessage,
  EscapeBlockCopiedMessage,
  KanbanFilterChangedMessage,
]);
export type WebviewToShellMessage = z.infer<typeof WebviewToShellMessageSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §8 — Error schemas (§6.5 — typed discriminated union)
// ─────────────────────────────────────────────────────────────────────────────

const SchemaValidationError = z
  .object({
    error_type: z.literal('SchemaValidationError'),
    schema: z.string().min(1),
    field_path: z.string(),
    issue: z.string().min(1),
    build_doc_commit_sha: z.string().nullable(),
  })
  .strict();

const SessionNotFoundError = z
  .object({
    error_type: z.literal('SessionNotFoundError'),
    session_id: z.string().min(1),
  })
  .strict();

const AnthropicAPIError = z
  .object({
    error_type: z.literal('AnthropicAPIError'),
    status_code: z.number().int().nullable(),
    message: z.string().min(1),
    retryable: z.boolean(),
  })
  .strict();

const BuildDocReadError = z
  .object({
    error_type: z.literal('BuildDocReadError'),
    repo_root: z.string().min(1),
    relative_path: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

const ReadScopeViolationError = z
  .object({
    error_type: z.literal('ReadScopeViolation'),
    requested_path: z.string().min(1),
    configured_scopes: z.array(z.string()),
  })
  .strict();

const IPCDropError = z
  .object({
    error_type: z.literal('IPCDropError'),
    direction: z.enum(['shell-to-webview', 'webview-to-shell']),
    message_type: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

const TicketNotFoundError = z
  .object({
    error_type: z.literal('TicketNotFoundError'),
    ticket_id: z.string().min(1),
    build_doc_id: z.string().min(1),
  })
  .strict();

const PersistenceError = z
  .object({
    error_type: z.literal('PersistenceError'),
    operation: z.string().min(1),
    table: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

// MB-T09 — surfaced when the workstation:session-send-prompt IPC handler
// invokes the canonical sendKeys helper and the underlying tmux command
// fails (load-buffer/paste-buffer/send-keys/delete-buffer flow per
// dispatch-core/src/transport/tmux.ts). `target` is the tmux session
// name passed in the IPC payload; `reason` carries the underlying error
// message (typically execFile stderr).
const TmuxSendError = z
  .object({
    error_type: z.literal('TmuxSendError'),
    target: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

export const WorkstationErrorSchema = z.discriminatedUnion('error_type', [
  SchemaValidationError,
  SessionNotFoundError,
  AnthropicAPIError,
  BuildDocReadError,
  ReadScopeViolationError,
  IPCDropError,
  TicketNotFoundError,
  PersistenceError,
  TmuxSendError,
]);
export type WorkstationError = z.infer<typeof WorkstationErrorSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §9 — Endpoint request/response schemas (per §6 + ratified §6.1–§6.4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /v3/orchestrator/history query params per ratified MB-S03 §6:
 * GLOBAL DEFAULT (no implicit build-doc filter) + optional build_doc_id
 * filter to support orchestrator P-0.4 Q4 TIERED chat-history fetch.
 */
export const OrchestratorHistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    before_id: z.string().optional(),
    since_id: z.string().optional(),
    build_doc_id: z.string().optional(),
  })
  .strict();
export type OrchestratorHistoryQuery = z.infer<typeof OrchestratorHistoryQuerySchema>;

export const OrchestratorHistoryResponseSchema = z
  .object({
    messages: z.array(OrchestratorMessageRowSchema),
    next_before_id: z.string().nullable(),
  })
  .strict();
export type OrchestratorHistoryResponse = z.infer<typeof OrchestratorHistoryResponseSchema>;

/** DELETE /v3/orchestrator/history — full clear per ratified MB-S03 §6. */
export const OrchestratorHistoryDeleteResponseSchema = z
  .object({
    deleted: z.number().int().nonnegative(),
  })
  .strict();
export type OrchestratorHistoryDeleteResponse = z.infer<
  typeof OrchestratorHistoryDeleteResponseSchema
>;

/**
 * GET /v3/orchestrator/audit query — filter axes per WORKSTATION_CONTRACT.md
 * §6.2. Pagination shape per ratified §6.1: `{ rows, next_since: string | null }`
 * (timestamp-cursor mirroring `/v2/events`).
 */
export const OrchestratorAuditQuerySchema = z
  .object({
    since: z.string().optional(),
    until: z.string().optional(),
    build_doc_id: z.string().optional(),
    output_type: OrchestratorOutputTypeEnum.optional(),
    operator_response: OperatorResponseEnum.optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
  })
  .strict();
export type OrchestratorAuditQuery = z.infer<typeof OrchestratorAuditQuerySchema>;

export const OrchestratorAuditListResponseSchema = z
  .object({
    rows: z.array(OrchestratorAuditRowSchema),
    next_since: z.string().nullable(),
  })
  .strict();
export type OrchestratorAuditListResponse = z.infer<
  typeof OrchestratorAuditListResponseSchema
>;

/** POST /v3/tickets/state body — upsert one row per (ticket_id, build_doc_id). */
export const TicketStateUpsertRequestSchema = z
  .object({
    ticket_id: z.string().min(1),
    build_doc_id: z.string().min(1),
    state: TicketLifecycleStateEnum,
    superseded_by_ticket_id: z.string().nullable().default(null),
  })
  .strict();
export type TicketStateUpsertRequest = z.infer<typeof TicketStateUpsertRequestSchema>;

/**
 * GET /v3/tickets/state query — operator-facing kanban filter; omitting
 * build_doc_id returns all rows.
 */
export const TicketStateListQuerySchema = z
  .object({
    build_doc_id: z.string().optional(),
  })
  .strict();
export type TicketStateListQuery = z.infer<typeof TicketStateListQuerySchema>;

export const TicketStateListResponseSchema = z
  .object({
    rows: z.array(TicketStateRowSchema),
  })
  .strict();
export type TicketStateListResponse = z.infer<typeof TicketStateListResponseSchema>;

/**
 * GET /v3/tickets/state/:ticket_id query — build_doc_id REQUIRED per
 * ratified MB-S03 §6 (a single ticket_id can exist across build-doc
 * revisions; omitting is structurally ambiguous).
 */
export const TicketStateGetQuerySchema = z
  .object({
    build_doc_id: z.string().min(1),
  })
  .strict();
export type TicketStateGetQuery = z.infer<typeof TicketStateGetQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §10 — Workstation IPC: session-send-prompt (MB-T09 — CONDUCTOR_V3_RESCOPE.md §3.4 + §4)
// ─────────────────────────────────────────────────────────────────────────────
//
// IPC channel `workstation:session-send-prompt`: orchestrator/tile-footer →
// workstation main process → tmux pane via canonical sendKeys helper.
//
// Two payload paths per CONDUCTOR_V3_RESCOPE.md §3.4:
//   - Raw text (envelope omitted): prompt sent verbatim.
//   - Structured envelope (multi-step intent): operator-visible comment
//     line is prepended to the prompt before sendKeys.
//
// Reply discriminates on `ok`. The error path carries a typed
// WorkstationError (see §8). MB-T09 introduces `TmuxSendError` and reuses
// the existing `SchemaValidationError` and `SessionNotFoundError` variants
// for invalid-payload and unknown-session paths respectively.

/**
 * Operator-visible envelope wrapping a prompt with multi-step intent
 * tracking. Serialized to a single comment line + the prompt before
 * tmux send (see `envelope-serializer.ts`). The orchestrator tracks
 * `intent_id` across the multi-step sequence in its own state.
 */
export const SendPromptEnvelopeSchema = z
  .object({
    envelope_version: z.literal(1),
    intent_id: z.string().uuid(),
    step: z.number().int().min(1),
    total_steps: z.number().int().min(1),
    intent_summary: z.string().min(1),
  })
  .strict();
export type SendPromptEnvelope = z.infer<typeof SendPromptEnvelopeSchema>;

/**
 * IPC payload for `workstation:session-send-prompt`. `prompt` is sent
 * verbatim when `envelope` is omitted; otherwise the envelope is
 * serialized to a comment line and prepended.
 */
export const WorkstationSessionSendPromptRequestSchema = z
  .object({
    sessionName: z.string().min(1),
    prompt: z.string().min(1),
    envelope: SendPromptEnvelopeSchema.optional(),
  })
  .strict();
export type WorkstationSessionSendPromptRequest = z.infer<
  typeof WorkstationSessionSendPromptRequestSchema
>;

/**
 * IPC reply for `workstation:session-send-prompt`. `ok: true` carries no
 * additional fields; `ok: false` carries a typed WorkstationError.
 */
export const WorkstationSessionSendPromptReplySchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }).strict(),
  z.object({ ok: z.literal(false), error: WorkstationErrorSchema }).strict(),
]);
export type WorkstationSessionSendPromptReply = z.infer<
  typeof WorkstationSessionSendPromptReplySchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// §11 — Spawned-session context snapshot (MB-T10 — CONDUCTOR_V3_RESCOPE.md §3.5 + §4)
// ─────────────────────────────────────────────────────────────────────────────
//
// New daemon endpoint `GET /v3/sessions/:name/context-snapshot` returns a
// per-session observability slice for the workstation context-builder's
// new Tier 4 (spawnedSessions). Per CONDUCTOR_V3_RESCOPE.md §3.5 line 121
// the orchestrator chat tier shows live state of every registered non-
// killed session: recent HANDOFF tail, recent console tail, pending multi-
// step intents, and last-action / last-operator-typed timestamps.
//
// v3.0 surface (operator-arbitrated Q-MBT10-{1..7} 2026-05-06):
//   - pending_intents: [] until MB-T11 populates orchestrator-side state
//   - last_action_fired_at: null until MB-T11
//   - last_operator_typed_at: always null in v3.0 (deferred to v3.0.x)
//   - All schemas .strict() per Q-MBT10-4=a + existing v3 convention
//   - Tier 4 numbering renumbers existing context-builder tiers
//     (chat-history → Tier 5; triggering-event → Tier 6) per Q-MBT10-1=a;
//     refactor lands in MB-T10 WB4.5/WB5

/**
 * One element of `pending_intents` in a session context snapshot.
 *
 * MB-T10 v3.0 ships this schema with `pending_intents: []` populated;
 * MB-T11 wires the orchestrator-side state that fills the array.
 * Shape mirrors `SendPromptEnvelopeSchema` (§10) minus the
 * `envelope_version` literal — these are intent records observed
 * across multi-step sequences, not envelope payloads in flight.
 */
export const PendingIntentSchema = z
  .object({
    intent_id: z.string().uuid(),
    step: z.number().int().min(1),
    total_steps: z.number().int().min(1),
    intent_summary: z.string().min(1),
  })
  .strict();
export type PendingIntent = z.infer<typeof PendingIntentSchema>;

/**
 * GET /v3/sessions/:name/context-snapshot response body.
 *
 * `recent_handoff`: last 4096 chars of HANDOFF.md (string-char slice per
 * Q-MBT10-6=a) when the file's mtime is within 60s of the request; null
 * if the file is absent OR if the mtime is older than 60s.
 *
 * `recent_console_tail`: last ≤2048 bytes of cc_console_buffer rows for
 * the session, whole-line accumulation oldest-fully-included-first per
 * Q-MBT10-5=a; null if no rows exist for the session.
 *
 * `pending_intents`: empty array in v3.0 (MB-T11 populates).
 *
 * `last_action_fired_at`: null in v3.0 (MB-T11 populates).
 *
 * `last_operator_typed_at`: always null in v3.0 (deferred per
 * CONDUCTOR_V3_RESCOPE.md §4 MB-T10 out-of-scope clause line 199).
 */
export const SessionContextSnapshotSchema = z
  .object({
    recent_handoff: z.string().nullable(),
    recent_console_tail: z.string().nullable(),
    pending_intents: z.array(PendingIntentSchema),
    last_action_fired_at: z.string().datetime().nullable(),
    last_operator_typed_at: z.string().datetime().nullable(),
  })
  .strict();
export type SessionContextSnapshot = z.infer<typeof SessionContextSnapshotSchema>;

/**
 * Tier 4 payload assembled by the workstation context-builder per
 * CONDUCTOR_V3_RESCOPE.md §3.5. Map keyed by session name → snapshot.
 * Empty `sessions_context` record when no spawned sessions exist OR
 * all sessions are killed. Per Q-MBT10-7=a, sessions whose daemon
 * fetch fails are still keyed in the record with a stub snapshot
 * (recent_handoff: null, recent_console_tail: null, pending_intents: [],
 * timestamps null) so context-builder consumers can see which session
 * names were attempted.
 */
export const Tier4PayloadSchema = z
  .object({
    sessions_context: z.record(z.string(), SessionContextSnapshotSchema),
  })
  .strict();
export type Tier4Payload = z.infer<typeof Tier4PayloadSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §12 — Orchestrator action tools (MB-T11 — CONDUCTOR_V3_RESCOPE.md §3.6 + §4)
// ─────────────────────────────────────────────────────────────────────────────
//
// Per-action payload sub-schemas. Validated post-OrchestratorOutputSchema.parse
// by orchestrator-action-handler.ts via pickPayloadSchema(actionType) helper.
// Q-MBT11-1=a applied: the `payload` field on ActionOutputSchema and
// CardOutputSchema (§3) stays z.unknown(); the handler does the second-pass
// validation against the per-action schema chosen by the discriminator.
//
// Action coverage (per CONDUCTOR_V3_RESCOPE.md §3.6):
//   - 'send'              → SendPromptActionPayloadSchema     (existing IPC at §10)
//   - 'spawn-new-session' → SpawnSessionActionPayloadSchema   (existing MB-T05 IPC)
//   - 'kill'              → KillSessionActionPayloadSchema    (new MB-T11 WB3 IPC)
//   - 'pull'              → PullHandoffActionPayloadSchema    (existing GET /v2/sessions/:name/handoff)
//   - 'assign-task'       → AssignTaskActionPayloadSchema     (Q-MBT11-5=a metadata marker; autopilot-loop tracks intent_id)
//
// Other ActionTypeEnum members ('pause', 'hold', 'arm', 'read-file') are not
// in MB-T11 scope and have no payload sub-schema here. pickPayloadSchema
// throws for them so a consumer is forced to handle the missing case
// explicitly rather than silently accepting an unvalidated payload.

/**
 * Send-prompt action payload. The orchestrator-action-handler forwards this
 * (with the optional envelope) into the workstation:session-send-prompt IPC
 * channel defined at §10. The envelope schema is shared with §10's
 * WorkstationSessionSendPromptRequest so a multi-step intent_id round-trips
 * unchanged from action emission to tmux send.
 */
export const SendPromptActionPayloadSchema = z
  .object({
    prompt: z.string().min(1),
    envelope: SendPromptEnvelopeSchema.optional(),
  })
  .strict();
export type SendPromptActionPayload = z.infer<typeof SendPromptActionPayloadSchema>;

/**
 * Spawn-session action payload. The orchestrator-action-handler forwards this
 * to the existing MB-T05 spawn pipeline (workstation:spawn-requested IPC).
 * permissionMode is forwarded to spawn-handler.ts SpawnPermissionMode; v3.0
 * ships two operative values ('normal' = MB-T05 'ask', 'dangerously-skip' =
 * MB-T05 'auto'). 'readonly' is reserved for a future v3.x permission tier
 * with no current binding — accepted at the schema layer to avoid a
 * follow-up schema bump when the tier lands.
 */
export const SpawnSessionActionPayloadSchema = z
  .object({
    sessionName: z.string().min(1),
    repoPath: z.string().min(1),
    permissionMode: z.enum(['readonly', 'normal', 'dangerously-skip']).optional(),
  })
  .strict();
export type SpawnSessionActionPayload = z.infer<typeof SpawnSessionActionPayloadSchema>;

/**
 * Kill-session action payload. Forwarded by orchestrator-action-handler to
 * the workstation:session-kill IPC channel defined at MB-T11 WB3
 * (session-kill-ipc.ts). Optional `reason` is included in the audit row to
 * support post-hoc forensics on why the orchestrator killed a session.
 */
export const KillSessionActionPayloadSchema = z
  .object({
    sessionName: z.string().min(1),
    reason: z.string().optional(),
  })
  .strict();
export type KillSessionActionPayload = z.infer<typeof KillSessionActionPayloadSchema>;

/**
 * Pull-handoff action payload. Forwarded by orchestrator-action-handler to
 * the existing daemon HTTP route GET /v2/sessions/:name/handoff (handoff.ts).
 * Per Q-MBT11-4=a the orchestrator reuses the v2 route; the archive +
 * clipboard side-effects are operator-friendly behaviors that the
 * orchestrator does not need to opt out of.
 */
export const PullHandoffActionPayloadSchema = z
  .object({
    sessionName: z.string().min(1),
  })
  .strict();
export type PullHandoffActionPayload = z.infer<typeof PullHandoffActionPayloadSchema>;

/**
 * Assign-task action payload. Per Q-MBT11-5=a this is a metadata-only marker:
 * the orchestrator emits assign-task to declare the start of a multi-step
 * intent against `sessionName`; orchestrator-action-handler creates an
 * intent_id via autopilot-loop.startIntent and records `intent_summary` plus
 * `expected_steps` (when known) on the autopilot state. Subsequent
 * send-prompt actions emitted by the orchestrator reference the same
 * intent_id via the SendPromptEnvelope step=N/total_steps field. No
 * structural decomposition happens at the payload level — the orchestrator
 * decides each next prompt heuristically per CONDUCTOR_V3_RESCOPE.md §4
 * out-of-scope language.
 */
export const AssignTaskActionPayloadSchema = z
  .object({
    sessionName: z.string().min(1),
    intent_summary: z.string().min(1),
    expected_steps: z.number().int().min(1).optional(),
  })
  .strict();
export type AssignTaskActionPayload = z.infer<typeof AssignTaskActionPayloadSchema>;

/**
 * Helper: pick the payload sub-schema for an MB-T11 action type. Consumed
 * by orchestrator-action-handler.ts as the second-pass validator — the
 * first pass parses the discriminated OrchestratorOutputSchema (§3) which
 * leaves the `payload` field as z.unknown(); this helper supplies the
 * per-action shape for the second pass.
 *
 * Throws on action types that have no MB-T11 payload schema. v3.0 ships
 * payload schemas for the five §3.6 action types only; the legacy
 * 'pause', 'hold', 'arm', 'read-file' enum members are not part of the
 * MB-T11 surface, so pickPayloadSchema('pause') (etc.) is a programming
 * error in MB-T11 callers and surfaces here.
 */
export function pickPayloadSchema(actionType: ActionType): z.ZodTypeAny {
  switch (actionType) {
    case 'send':
      return SendPromptActionPayloadSchema;
    case 'spawn-new-session':
      return SpawnSessionActionPayloadSchema;
    case 'kill':
      return KillSessionActionPayloadSchema;
    case 'pull':
      return PullHandoffActionPayloadSchema;
    case 'assign-task':
      return AssignTaskActionPayloadSchema;
    default:
      throw new Error(`No payload schema for action type: ${actionType}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §13 — Per-session approval policy + swarm audit (MB-T13 — CONDUCTOR_V3_RESCOPE.md §3.2 + §3.8 + §4)
// ─────────────────────────────────────────────────────────────────────────────
//
// v3.0 surface (operator-arbitrated Q-MBT13-1..13 2026-05-06):
//   - approval_policy stored in NEW SQLite session_policies table (Q-MBT13-1=a)
//     coexists with sessions.json RegistryV2 (frozen per §5)
//   - resolver is a pure fn; caller passes (policy, actionType, predicates) per Q-MBT13-6=b
//   - audit-write is async-after-fire, best-effort + single-shot retry per Q-MBT13-7=b
//   - audit row queryable by ts DESC and (session_name, ts DESC) per Q-MBT13-5=b
//   - ApprovalActionTypeEnum defined here parallel to sess-mbt11 §12 ActionType per Q-MBT13-12=a
//     post-cross-merge dedup followup: MB-F-T11-T13-ACTION-TYPE-ENUM-DEDUP
//   - tile-header picker UI deferred per Q-MBT13-10=b (MB-F-T13-TILE-HEADER-PICKER-INTEGRATION)
//   - settings-default-policy UI deferred per Q-MBT13-11=a (MB-F-T13-SETTINGS-DEFAULT-POLICY-INTEGRATION)
//
// Section numbering note: when sess-mbt11 lands §12 in main, the numerical-
// order rebase rule per MB-F-PARALLEL-CAIRN-SCHEMA-FILE-MERGE-CONFLICT
// (sess-mbt10 lesson) governs which branch lands first; this section lands
// AS §13 in the post-merge file regardless of merge order (sess-mbt11's §12
// either precedes here or is interleaved at rebase time).

/** Per-session approval policy per CONDUCTOR_V3_RESCOPE.md §3.2. */
export const ApprovalPolicyEnum = z.enum(['tight', 'medium', 'loose']);
export type ApprovalPolicy = z.infer<typeof ApprovalPolicyEnum>;

/**
 * Action types that flow through the approval-policy resolver per
 * CONDUCTOR_V3_RESCOPE.md §3.6. Mirrors sess-mbt11's §12 ActionType
 * naming per Q-MBT13-12=a (parallel definition to avoid cross-territory
 * write pre-merge); post-cross-merge dedup followup
 * MB-F-T11-T13-ACTION-TYPE-ENUM-DEDUP reconciles the two enums (likely
 * via re-export or alias from §12). Naming convention follows the §1
 * ActionTypeEnum precedent (`send`, `kill`, `pull`) rather than the
 * §3.6 verbose form (`send-prompt-to-session`, `kill-session`, etc.).
 */
export const ApprovalActionTypeEnum = z.enum([
  'send',
  'spawn-new-session',
  'kill',
  'pull',
  'assign-task',
]);
export type ApprovalActionType = z.infer<typeof ApprovalActionTypeEnum>;

/**
 * Persisted row in `session_policies` per Q-MBT13-1=a. New SQLite table;
 * coexists with sessions.json RegistryV2 (frozen). Keyed by session_name
 * (matches the registry name in sessions.json; not FK because the v3
 * SQLite layer is independent of the v2 JSON-file registry per
 * WORKSTATION_CONTRACT.md §8.1 coexistence-without-sync rule).
 */
export const ApprovalPolicyRowSchema = z
  .object({
    session_name: z.string().min(1),
    approval_policy: ApprovalPolicyEnum,
    updated_at: z.string().datetime(),
  })
  .strict();
export type ApprovalPolicyRow = z.infer<typeof ApprovalPolicyRowSchema>;

/**
 * GET /v3/sessions/:name/approval-policy response body.
 *
 * `updated_at` is nullable: when no row exists in session_policies for the
 * given session_name, the daemon returns the structural default
 * `approval_policy: 'medium'` with `updated_at: null` (Q-MBT13-4=c
 * defense-in-depth — workstation-side resolver fallback ALSO defaults to
 * 'medium' on no-row, so the wire-level null sentinel is observability,
 * not a correctness load-bearing field).
 */
export const ApprovalPolicyGetResponseSchema = z
  .object({
    session_name: z.string().min(1),
    approval_policy: ApprovalPolicyEnum,
    updated_at: z.string().datetime().nullable(),
  })
  .strict();
export type ApprovalPolicyGetResponse = z.infer<typeof ApprovalPolicyGetResponseSchema>;

/**
 * PUT /v3/sessions/:name/approval-policy body. Server upserts via
 * INSERT OR REPLACE INTO session_policies (session_name, approval_policy,
 * updated_at) where updated_at is server-assigned (datetime('now')).
 */
export const ApprovalPolicyPutRequestSchema = z
  .object({
    approval_policy: ApprovalPolicyEnum,
  })
  .strict();
export type ApprovalPolicyPutRequest = z.infer<typeof ApprovalPolicyPutRequestSchema>;

/**
 * Persisted row in `orchestrator_swarm_audit` per CONDUCTOR_V3_RESCOPE.md
 * §3.8. Distinct from the freeze-anchor `OrchestratorAuditRowSchema` (§5)
 * which audits operator-facing approve/decline of orchestrator chat output;
 * THIS table audits orchestrator swarm-action firings (autopilot or
 * manual) — different surface, different retention, separate forensics.
 *
 * Field set per §3.8 verbatim:
 *   ts, session_name, action_type, intent_id, step, total_steps,
 *   approval_required, approval_status, payload_hash, result_status,
 *   operator_loop_state
 *
 * `intent_id`/`step`/`total_steps` are nullable for non-multi-step actions
 * (single send, spawn, kill, pull-handoff). Populated only when the
 * orchestrator wraps the action in a multi-step envelope per §3.4.
 *
 * `payload_hash` is SHA-256 hex (lowercase, 64 chars) of canonical
 * JSON-serialized `{action_type, session_name, prompt}` per Q-MBT13-8=c.
 * For non-prompt actions, hash the action-type-relevant fields (e.g.,
 * spawn → `{action_type, session_name, repo_path}`); concrete per-type
 * hash-input shape is defined at the audit-writer call site (sess-mbt11
 * territory).
 *
 * `id` is UUIDv7, server-assigned at POST time per Q-MBT13-9=a +
 * orchestrator_audit precedent (`uuidv7()` from
 * dispatch-daemon/src/events/history.ts).
 */
export const OrchestratorSwarmAuditRowSchema = z
  .object({
    id: z.string().uuid(),
    ts: z.string().datetime(),
    session_name: z.string().min(1),
    action_type: ApprovalActionTypeEnum,
    intent_id: z.string().uuid().nullable(),
    step: z.number().int().min(1).nullable(),
    total_steps: z.number().int().min(1).nullable(),
    approval_required: z.boolean(),
    approval_status: z.enum(['not-required', 'pending', 'approved', 'declined']),
    payload_hash: z.string().regex(/^[a-f0-9]{64}$/),
    result_status: z.enum(['fired', 'failed', 'pending']),
    operator_loop_state: z.enum(['autopilot', 'manual', 'paused']),
  })
  .strict();
export type OrchestratorSwarmAuditRow = z.infer<typeof OrchestratorSwarmAuditRowSchema>;

/**
 * POST /v3/audit/swarm-audit body — verbatim swarm-audit-row shape minus
 * `id` (server-assigned UUIDv7). Matches the §5 OrchestratorAuditWriteRequest
 * shape pattern.
 */
export const OrchestratorSwarmAuditWriteRequestSchema =
  OrchestratorSwarmAuditRowSchema.omit({ id: true }).strict();
export type OrchestratorSwarmAuditWriteRequest = z.infer<
  typeof OrchestratorSwarmAuditWriteRequestSchema
>;

/**
 * GET /v3/audit/swarm-audit query params. Filter axes per Q-MBT13-5=b
 * (per-session forensics) + Q-MBT13-9=a (default limit 100; route-layer
 * Math.min clamp caps at 100 even when caller passes a larger value —
 * defense-in-depth against accidental large-N reads).
 *
 * Note on WB1/WB4 boundary: the WB1 schema brief listed the response
 * shape (OrchestratorSwarmAuditQueryResponseSchema below) but did NOT
 * list the request-side query schema; this schema landed as part of
 * WB4 because daemon-side route validation requires a dispatch-core
 * Zod instance (daemon does not direct-dep zod). Functionally part of
 * the §13 schema surface; isolated here for traceability.
 */
export const OrchestratorSwarmAuditQuerySchema = z
  .object({
    session_name: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).default(100),
  })
  .strict();
export type OrchestratorSwarmAuditQuery = z.infer<
  typeof OrchestratorSwarmAuditQuerySchema
>;

/**
 * GET /v3/audit/swarm-audit response body per Q-MBT13-9=a (LIMIT 100
 * ORDER BY ts DESC). `total` is the count of rows returned in this
 * response (NOT the table cardinality — caller can issue a follow-up
 * GET with the smallest `ts` from this response to paginate further;
 * v3.0 ships a single-page modal, deferring rich pagination to v3.1
 * followup MB-F-T13-AUDIT-MODAL-FILTERS).
 */
export const OrchestratorSwarmAuditQueryResponseSchema = z
  .object({
    rows: z.array(OrchestratorSwarmAuditRowSchema),
    total: z.number().int().min(0),
  })
  .strict();
export type OrchestratorSwarmAuditQueryResponse = z.infer<
  typeof OrchestratorSwarmAuditQueryResponseSchema
>;
