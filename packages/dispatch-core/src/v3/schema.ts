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

export const WorkstationErrorSchema = z.discriminatedUnion('error_type', [
  SchemaValidationError,
  SessionNotFoundError,
  AnthropicAPIError,
  BuildDocReadError,
  ReadScopeViolationError,
  IPCDropError,
  TicketNotFoundError,
  PersistenceError,
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
