// SPIKE: pending operator-arbitrated commit; not the freeze anchor.
//
// MB-S03 proposed v3 schema draft.
//
// The frozen-anchor path is `packages/dispatch-core/src/v3/schema.ts` per
// WORKSTATION_CONTRACT.md §2.2 — this draft does NOT live at that path.
// Operator commits the freeze-anchor schema as a `contract:` change once
// arbitrated; this spike file is reference-only material for that step.
//
// Authority chain (one citation per schema cluster):
//   - WORKSTATION_CONTRACT.md §2.1 — schema scope enumeration
//   - WORKSTATION_CONTRACT.md §3.3 — action enumeration
//   - WORKSTATION_CONTRACT.md §6 — endpoint surface
//   - WORKSTATION_CONTRACT.md §7.1 — IPC message-type enumeration
//   - WORKSTATION_CONTRACT.md §8.1 (amended 2026-04-29) — SQLite tables
//   - vision.md §7.4, §7.6, §7.8 — approval/audit/lineage details
//   - build-doc-schema-spec.md §2 + §3 + §3.6 + §3.7 — build-doc shape
//   - operator-acked decisions in MB-S03 prompt (history filter, full-clear,
//     upsert ticket-state, build_doc_id required, full SessionsListResponse IPC)

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// §1 — Enumerations (KNOWN — directly from contract + build-doc spec)
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

/** Orchestrator output discriminator per ratified P-0.4 Q2. */
export const OrchestratorOutputTypeEnum = z.enum([
  'action',
  'card',
  'multi-choice-card',
  'escape-block',
  'noop',
]);
export type OrchestratorOutputType = z.infer<typeof OrchestratorOutputTypeEnum>;

/** Operator response to orchestrator output per vision §7.8. */
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
// §2 — Build-doc schemas (KNOWN — directly from build-doc-schema-spec.md)
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
// §3 — Orchestrator output schemas (KNOWN — vision §7.3 + §7.4 + §7.7)
// ─────────────────────────────────────────────────────────────────────────────

/** Action output — fires-without-card only when read-only per §2.7 cairn-Sonnet primitive. */
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
    // §7.6 Item B visual-on-card supersession lineage
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
    // §7.6 Item B
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

/** Discriminated union per §2.1 + §2.5 cairn-Sonnet primitive (structured-output-discipline). */
export const OrchestratorOutputSchema = z.discriminatedUnion('type', [
  ActionOutputSchema,
  CardOutputSchema,
  MultiChoiceCardOutputSchema,
  EscapeBlockOutputSchema,
]);
export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §4 — Ticket-state schemas (P-0.5 Q8.2 — daemon table; acked decision: upsert)
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
 * Ticket-state row as persisted in the daemon SQLite
 * `orchestrator_ticket_state` table per §8.1.
 *
 * Identical to TicketStateSchema for v3.0 — the row shape is the public
 * shape because acked decision routes upsert-via-INSERT-OR-REPLACE, so
 * there's no internal-only field. Operator may decide to diverge in a
 * future amendment; keeping a separate type enables that without a
 * breaking change to TicketStateSchema consumers.
 */
export const TicketStateRowSchema = TicketStateSchema;
export type TicketStateRow = z.infer<typeof TicketStateRowSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §5 — Audit-row schemas (vision §7.8 — fields verbatim from §7.8)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Audit row as persisted in `orchestrator_audit` per §8.1 + §6.2.
 *
 * Field set is the verbatim §7.8 list. JSON-encoded payloads are stored
 * as TEXT in SQLite; this schema validates the parsed shape.
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

/** Persisted shape in `orchestrator_messages` (id + created_at added). */
export const OrchestratorMessageRowSchema = OrchestratorMessageSchema.extend({
  id: z.string().min(1),
  created_at: z.string().datetime(),
}).strict();
export type OrchestratorMessageRow = z.infer<typeof OrchestratorMessageRowSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §7 — IPC schemas (§7.1 — directional discriminated unions)
// ─────────────────────────────────────────────────────────────────────────────

// Acked decision: daemon-state-update IPC carries FULL SessionsListResponse
// shape, not delta. Orchestrator computes its own deltas if needed. Imported
// by-name from v2 schema to avoid duplicating the v2-frozen shape in v3.
// Spike-side note: v3/schema.ts (frozen anchor) should `import { SessionsListResponse }
// from '../v2/schema.js'` so the v2 type IS the v3 IPC payload. This spike
// uses a structurally-equivalent placeholder so the file doesn't depend on the
// frozen v2 layout for harness exercise.
const SessionsListResponsePlaceholder = z.object({
  sessions: z.record(z.string(), z.unknown()),
});

// Shell → Webview message variants (§7.1)

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
    // Acked decision: full SessionsListResponse shape, not delta.
    payload: SessionsListResponsePlaceholder,
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

// Webview → Shell message variants (§7.1)

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
    // Required for declines per §7.4 Item B / P-0 leftover Q3
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
// §9 — Endpoint request/response schemas (per §6 + acked decisions)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /v3/orchestrator/history query params per acked decision: GLOBAL DEFAULT
 *  + optional build_doc_id filter (orchestrator P-0.4 Q4 TIERED chat-history fetch). */
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

/** DELETE /v3/orchestrator/history — full clear per acked decision. No body, no scoping. */
export const OrchestratorHistoryDeleteResponseSchema = z
  .object({
    deleted: z.number().int().nonnegative(),
  })
  .strict();
export type OrchestratorHistoryDeleteResponse = z.infer<
  typeof OrchestratorHistoryDeleteResponseSchema
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

/** GET /v3/tickets/state/:ticket_id query — build_doc_id REQUIRED per acked decision. */
export const TicketStateGetQuerySchema = z
  .object({
    build_doc_id: z.string().min(1),
  })
  .strict();
export type TicketStateGetQuery = z.infer<typeof TicketStateGetQuerySchema>;
