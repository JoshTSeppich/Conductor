// SPIKE: pending operator-arbitrated commit; not the freeze anchor.
//
// Round-trip smoke for proposed-schema.ts. Validates that representative
// instances of each schema parse cleanly and that the discriminated unions
// reject unknown variants. Mirrors the daemon harness pattern.
//
// Run: cd packages/dispatch-core && pnpm exec tsx spikes/MB-S03/schema-smoke.ts

import {
  ActionOutputSchema,
  BuildDocFrontmatterSchema,
  BuildDocSchema,
  BuildDocTicketSchema,
  CardOutputSchema,
  EscapeBlockOutputSchema,
  MultiChoiceCardOutputSchema,
  MultiChoiceTemplateSchema,
  OpenQuestionSchema,
  OrchestratorAuditRowSchema,
  OrchestratorHistoryDeleteResponseSchema,
  OrchestratorHistoryQuerySchema,
  OrchestratorHistoryResponseSchema,
  OrchestratorMessageRowSchema,
  OrchestratorMessageSchema,
  OrchestratorOutputSchema,
  ShellToWebviewMessageSchema,
  TicketStateGetQuerySchema,
  TicketStateRowSchema,
  TicketStateSchema,
  TicketStateUpsertRequestSchema,
  WebviewToShellMessageSchema,
  WorkstationErrorSchema,
} from './proposed-schema.js';

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    pass += 1;
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail += 1;
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ── §2 build-doc fixtures ──────────────────────────────────────────────
const validFrontmatter = BuildDocFrontmatterSchema.safeParse({
  schema_version: '1.0',
  doc_id: 'v3-tickets-2026-04-28',
  title: 'Foxworks Workstation v3 Build Plan',
  target_repo: '/Users/josh/Desktop/Automata/foxworks-dispatch',
  author: 'Joshua Seppich',
  created_at: '2026-04-28T17:42:00-06:00',
  allowed_action_types: ['spawn-new-session', 'send', 'pull'],
  description: 'v3.0 ticket build plan',
});
check('BuildDocFrontmatterSchema accepts ratified spec example', validFrontmatter.success);

const rejectsExtra = BuildDocFrontmatterSchema.safeParse({
  schema_version: '1.0',
  doc_id: 'd', title: 't', target_repo: '/r', author: 'a',
  created_at: '2026-04-28T17:42:00-06:00',
  allowed_action_types: [],
  description: 'd',
  unknown_field: 'should-fail',
});
check('BuildDocFrontmatterSchema rejects extra fields (strict)', !rejectsExtra.success);

const validTicket = BuildDocTicketSchema.safeParse({
  ticket_id: 'MB-T05',
  section_id: '#tickets-mb-t05',
  type: 'green',
  domain: 'menubar',
  phase: 'Phase 2 / Tier B',
  depends_on: ['MB-T04', 'MB-S02'],
  allowed_actions: ['spawn-new-session'],
  status: 'pending',
  description: 'Wire spawn IPC...',
  red: 'Test: ...',
  green: 'Implement spawn handler...',
  refactor: null,
  open_questions_refs: [],
});
check('BuildDocTicketSchema accepts MB-T05-shaped ticket', validTicket.success);

const validBuildDoc = BuildDocSchema.safeParse({
  frontmatter: validFrontmatter.success ? validFrontmatter.data : {},
  tickets: validTicket.success ? [validTicket.data] : [],
  open_questions: [],
  multi_choice_templates: [],
});
check('BuildDocSchema composes frontmatter + tickets', validBuildDoc.success);

const validOpenQ = OpenQuestionSchema.safeParse({
  question_id: 'Q-tmux-pty-env-edge-cases',
  section_id: '#open-questions-tmux-pty-env-edge-cases',
  trigger_condition: 'When MB-T05 spawn handler encounters tmux PTY env diff',
  why_operator_only: 'Environmental drift is real failure mode',
  escape_block_content: 'detected env diff, MB-S02 baseline, suggested mitigations',
});
check('OpenQuestionSchema accepts ratified spec example', validOpenQ.success);

const validMC = MultiChoiceTemplateSchema.safeParse({
  template_id: 'MC-spawn-target-repo',
  section_id: '#mc-spawn-target-repo',
  trigger_condition: 'When orchestrator proposes spawn-new-session ambiguously',
  question: 'Which repo should the new session work against?',
  options: [
    'A: foxworks-dispatch',
    'B: sherpa',
    'C: lantern',
    'D: Other (escape via free-form)',
  ],
  routing: 'choice routes back as spawn target',
});
check('MultiChoiceTemplateSchema accepts 4-option example', validMC.success);

const tooFewOptions = MultiChoiceTemplateSchema.safeParse({
  template_id: 'x', section_id: '#x', trigger_condition: 'x', question: 'q',
  options: ['only-one'],
  routing: 'r',
});
check('MultiChoiceTemplateSchema rejects 1-option (min 2)', !tooFewOptions.success);

// ── §3 orchestrator output fixtures ────────────────────────────────────
const action = ActionOutputSchema.safeParse({
  type: 'action',
  action: 'read-file',
  target: '/Users/josh/foo/bar.md',
  rationale: 'Build doc declares read-file in allowed_actions',
  build_doc_commit_sha: 'abc123def456',
});
check('ActionOutputSchema accepts read-file action', action.success);

const card = CardOutputSchema.safeParse({
  type: 'card',
  action: 'kill',
  target: 'clit06-...',
  rationale: 'Session stuck per build-doc indicators',
  free_form_prompt: 'Approve to kill, decline to keep running',
  superseded_card_ids: [],
  build_doc_commit_sha: 'abc',
});
check('CardOutputSchema accepts kill card', card.success);

const mc = MultiChoiceCardOutputSchema.safeParse({
  type: 'multi-choice-card',
  question: 'Build doc says green commit but two tests passed. Which scope?',
  options: ['A: file 1', 'B: file 2', 'C: both'],
  rationale: 'no-arbitration primitive: escape on ambiguity',
  build_doc_commit_sha: 'abc',
  superseded_card_ids: [],
});
check('MultiChoiceCardOutputSchema accepts 3-option card', mc.success);

const escape = EscapeBlockOutputSchema.safeParse({
  type: 'escape-block',
  build_doc_path: '/Users/josh/.../v3-tickets.build.md',
  build_doc_commit_sha: 'abc123',
  triggering_event: 'session clit06 entered FAILED state',
  what_i_tried: 'Reviewed allowed_actions...',
  where_im_stuck: 'Recovery requires action outside allowed_actions',
  build_doc_sections_consulted: ['MB-T05.allowed_actions'],
});
check('EscapeBlockOutputSchema accepts §2.1 cairn-Sonnet example', escape.success);

const union = OrchestratorOutputSchema.safeParse(card.success ? card.data : null);
check('OrchestratorOutputSchema discriminates union', union.success);

const unknownType = OrchestratorOutputSchema.safeParse({
  type: 'whatever',
  rationale: 'x',
});
check('OrchestratorOutputSchema rejects unknown type', !unknownType.success);

// ── §4–§6 persistence shapes ───────────────────────────────────────────
const ticketState = TicketStateSchema.safeParse({
  ticket_id: 'MB-T05',
  build_doc_id: 'v3-tickets-2026-04-28',
  state: 'in-progress',
  state_updated_at: '2026-04-29T10:00:00.000Z',
  superseded_by_ticket_id: null,
});
check('TicketStateSchema accepts pending row', ticketState.success);
check('TicketStateRowSchema is identical alias (acked decision)',
  TicketStateRowSchema.safeParse(ticketState.success ? ticketState.data : null).success);

const auditRow = OrchestratorAuditRowSchema.safeParse({
  id: '01900000-0000-7000-8000-000000000001',
  timestamp: '2026-04-29T10:00:00.000Z',
  trigger_event: 'cc-session-output',
  build_doc_id: 'v3-tickets-2026-04-28',
  build_doc_commit_sha: 'abc123',
  output_type: 'card',
  output_payload: card.success ? card.data : null,
  operator_response: 'pending',
  final_fired_payload: null,
  execution_outcome: 'n/a',
  free_form_text: null,
  staleness_status: 'current',
  superseded_card_ids: [],
});
check('OrchestratorAuditRowSchema accepts §7.8 row', auditRow.success);

const message = OrchestratorMessageSchema.safeParse({
  role: 'user',
  content: 'Run the red commit for MB-T05',
  build_doc_id: 'v3-tickets-2026-04-28',
  build_doc_commit_sha: 'abc123',
});
check('OrchestratorMessageSchema accepts user message', message.success);

const messageRow = OrchestratorMessageRowSchema.safeParse({
  ...(message.success ? message.data : {}),
  id: '01900000-0000-7000-8000-000000000002',
  created_at: '2026-04-29T10:00:00.000Z',
});
check('OrchestratorMessageRowSchema accepts persisted row', messageRow.success);

// ── §7 IPC ─────────────────────────────────────────────────────────────
const shell2webview = ShellToWebviewMessageSchema.safeParse({
  type: 'daemon-state-update',
  payload: { sessions: { sherpa: { state: 'armed' } } },
});
check('ShellToWebviewMessageSchema accepts full daemon-state-update', shell2webview.success);

const cardSuperseded = ShellToWebviewMessageSchema.safeParse({
  type: 'orchestrator-card-superseded',
  superseding_card_id: 'card-2',
  superseded_card_ids: ['card-1'],
});
check('ShellToWebviewMessageSchema accepts card-superseded', cardSuperseded.success);

const declineMissingReason = WebviewToShellMessageSchema.safeParse({
  type: 'card-declined',
  card_id: 'card-1',
  reason: '',
  timestamp: '2026-04-29T10:00:00.000Z',
});
check(
  'WebviewToShellMessageSchema rejects empty decline reason (P-0 leftover Q3)',
  !declineMissingReason.success,
);

const validApprove = WebviewToShellMessageSchema.safeParse({
  type: 'card-approved',
  card_id: 'card-1',
  free_form_text: null,
  timestamp: '2026-04-29T10:00:00.000Z',
});
check('WebviewToShellMessageSchema accepts approval with null free-form', validApprove.success);

// ── §8 errors ──────────────────────────────────────────────────────────
const schemaErr = WorkstationErrorSchema.safeParse({
  error_type: 'SchemaValidationError',
  schema: 'BuildDocSchema',
  field_path: 'frontmatter.allowed_action_types',
  issue: 'Required field missing',
  build_doc_commit_sha: 'abc123',
});
check('WorkstationErrorSchema accepts §6.5 example', schemaErr.success);

const apiErr = WorkstationErrorSchema.safeParse({
  error_type: 'AnthropicAPIError',
  status_code: 429,
  message: 'rate limited',
  retryable: true,
});
check('WorkstationErrorSchema discriminates AnthropicAPIError', apiErr.success);

// ── §9 endpoint shapes ─────────────────────────────────────────────────
const histQ = OrchestratorHistoryQuerySchema.safeParse({
  limit: '50',
  build_doc_id: 'v3-tickets-2026-04-28',
});
check(
  'OrchestratorHistoryQuerySchema coerces limit and accepts optional build_doc_id (acked)',
  histQ.success && histQ.data.limit === 50 && histQ.data.build_doc_id === 'v3-tickets-2026-04-28',
);

const histResp = OrchestratorHistoryResponseSchema.safeParse({
  messages: [],
  next_before_id: null,
});
check('OrchestratorHistoryResponseSchema accepts empty page', histResp.success);

const delResp = OrchestratorHistoryDeleteResponseSchema.safeParse({ deleted: 0 });
check('OrchestratorHistoryDeleteResponseSchema accepts {deleted:0}', delResp.success);

const upsertReq = TicketStateUpsertRequestSchema.safeParse({
  ticket_id: 'MB-T05',
  build_doc_id: 'v3-tickets-2026-04-28',
  state: 'in-progress',
  superseded_by_ticket_id: null,
});
check('TicketStateUpsertRequestSchema accepts upsert body', upsertReq.success);

const stateGet = TicketStateGetQuerySchema.safeParse({
  build_doc_id: 'v3-tickets-2026-04-28',
});
check('TicketStateGetQuerySchema requires build_doc_id (acked)', stateGet.success);

const stateGetMissing = TicketStateGetQuerySchema.safeParse({});
check(
  'TicketStateGetQuerySchema rejects missing build_doc_id (acked: REQUIRED)',
  !stateGetMissing.success,
);

console.log('');
console.log(`schema-smoke: ${pass}/${pass + fail} checks passed`);
process.exit(fail === 0 ? 0 : 1);
