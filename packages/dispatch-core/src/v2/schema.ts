/**
 * Conductor v2 — Shared Zod Schemas
 *
 * Operator-published contract surface derived from CONDUCTOR_API_CONTRACT.md
 * (frozen at commit 3ddca60) + Round 1 frozen arbitrations:
 *   - Blocker 1: initial state for POST /v2/sessions = 'armed'
 *   - Blocker 2: persisted v2 fields = state, last_commit_sha, last_status_json_at
 *   - Blocker 3: killed re-init returns 409, killed records are immutable history
 *   - GAP 1: daemon returns all sessions including killed (UI hides by default)
 *   - GAP 3: computed_status enum frozen at v1 set, orthogonal to state
 *
 * This file is operator-arbitrated. Both Session A (daemon) and Session B
 * (UI) consume from here. Neither session may modify these schemas
 * unilaterally — same primitive as the contract itself.
 *
 * Derivation basis cited per export. KNOWN = derivable directly from contract
 * text. MODELED = inferred from contract examples + frozen arbitrations.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// §1 — Enums (KNOWN — directly from contract §4.2 + §6.1 + Blocker 1 + GAP 3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lifecycle state. Operator-controlled via PATCH /v2/sessions/:name/state.
 * Per contract §6.1 + Blocker 1 arbitration: newly-POSTed sessions start
 * in 'armed'. Per Blocker 3: 'killed' is terminal; killed records persist
 * as immutable history.
 */
export const StateEnum = z.enum(['armed', 'paused', 'held', 'killed']);
export type State = z.infer<typeof StateEnum>;

/**
 * Computed status. Derived from pane activity, NOT operator-controlled.
 * Per GAP 3 arbitration: frozen at v1 set, orthogonal to state. Kanban
 * groups on this field; state surfaces as separate badge + control cluster.
 */
export const ComputedStatusEnum = z.enum([
  'idle',
  'running',
  'awaiting_review',
  'stale',
]);
export type ComputedStatus = z.infer<typeof ComputedStatusEnum>;

/**
 * State-transition trigger source. Per contract §5.3 state_changed event.
 */
export const StateTriggerEnum = z.enum([
  'operator',
  'cairn_violation',
  'gate_trip',
]);
export type StateTrigger = z.infer<typeof StateTriggerEnum>;

/**
 * Cairn violation taxonomy. Per contract §5.3 cairn_violation_detected event.
 */
export const ViolationTypeEnum = z.enum([
  'drift',
  'fabrication',
  'scope_creep',
  'missing_redgreen',
]);
export type ViolationType = z.infer<typeof ViolationTypeEnum>;

// ─────────────────────────────────────────────────────────────────────────────
// §2 — Session schema (KNOWN — contract §4.2 + §7.3 + Blocker 2 arbitration)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Session record as persisted in sessions.json (v2 schema).
 *
 * Derivation:
 *   v1 fields (cwd, tmux_target, handoff_path, last_prompt_sent_at,
 *   last_handoff_pulled_at) preserved verbatim per contract §7.3
 *   "backward-compat: v1 schema fields unchanged."
 *
 *   v2 additions per Blocker 2 arbitration:
 *   - state: persisted (required for §6.3 durability across daemon restart)
 *   - last_commit_sha: persisted (written on commit_landed event)
 *   - last_status_json_at: persisted (written on test_status_updated event)
 */
export const SessionSchemaV2 = z.object({
  // v1 fields — frozen, do not modify shape
  cwd: z.string().min(1),
  tmux_target: z.string().regex(/^[^:]+:\d+\.\d+$/),
  handoff_path: z.string().min(1),
  last_prompt_sent_at: z.string().datetime().nullable(),
  last_handoff_pulled_at: z.string().datetime().nullable(),

  // v2 additions
  state: StateEnum,
  last_commit_sha: z.string().nullable(),
  last_status_json_at: z.string().datetime().nullable(),
});
export type SessionV2 = z.infer<typeof SessionSchemaV2>;

/**
 * Full registry shape for sessions.json (v2).
 * Per contract §7.3: schema version bumps from 1 to 2 with auto-migration.
 * Migration shape: v1 records gain state='armed', last_commit_sha=null,
 * last_status_json_at=null defaults; written atomically via existing
 * writeRegistry tmp+rename pattern.
 */
export const RegistrySchemaV2 = z.object({
  version: z.literal(2),
  sessions: z.record(z.string().min(1), SessionSchemaV2),
});
export type RegistryV2 = z.infer<typeof RegistrySchemaV2>;

// ─────────────────────────────────────────────────────────────────────────────
// §3 — STATUS.json schema (MODELED — contract §8.2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * STATUS.json shape — written by CC sessions per contract §8 hybrid model.
 * Daemon falls back to git+prose inference when STATUS.json absent.
 *
 * Confidence: MODELED. Derivable from contract §8.2 "Richer" option but
 * exact field nullability inferred. If real CC sessions write divergent
 * shapes, surface for contract clarification.
 */
export const StatusJsonSchema = z.object({
  phase: z.string().nullable(),
  tests_passing: z.number().int().nonnegative().nullable(),
  tests_failing: z.number().int().nonnegative().nullable(),
  unknowns: z.array(z.string()).optional(),
  last_action: z.string().nullable(),
  updated_at: z.string().datetime(),
});
export type StatusJson = z.infer<typeof StatusJsonSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// §4 — Event schemas (KNOWN — contract §5.2 + §5.3, all 7 frozen at v2 ship)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base envelope for all WebSocket and GET /v2/events responses.
 * Per contract §5.2: all messages share { type, timestamp, session, data }.
 */
const EventBase = z.object({
  timestamp: z.string().datetime(),
  session: z.string().min(1),
});

/** §5.3 handoff_written — daemon detected HANDOFF.md update */
export const HandoffWrittenEvent = EventBase.extend({
  type: z.literal('handoff_written'),
  data: z.object({
    path: z.string().min(1),
    size_bytes: z.number().int().nonnegative(),
  }),
});

/** §5.3 commit_landed — git ref watch detected new commit */
export const CommitLandedEvent = EventBase.extend({
  type: z.literal('commit_landed'),
  data: z.object({
    sha: z.string().min(1),
    subject: z.string(),
    branch: z.string().min(1),
  }),
});

/** §5.3 state_changed — session lifecycle transition */
export const StateChangedEvent = EventBase.extend({
  type: z.literal('state_changed'),
  data: z.object({
    from: StateEnum,
    to: StateEnum,
    triggered_by: StateTriggerEnum,
  }),
});

/** §5.3 prompt_sent — operator sent new prompt to session */
export const PromptSentEvent = EventBase.extend({
  type: z.literal('prompt_sent'),
  data: z.object({
    archived_to: z.string().min(1),
    size_chars: z.number().int().nonnegative(),
  }),
});

/** §5.3 test_status_updated — STATUS.json updated by CC */
export const TestStatusUpdatedEvent = EventBase.extend({
  type: z.literal('test_status_updated'),
  data: z.object({
    tests_passing: z.number().int().nonnegative(),
    tests_failing: z.number().int().nonnegative(),
    phase: z.string(),
  }),
});

/** §5.3 cairn_violation_detected — daemon or operator flagged violation */
export const CairnViolationDetectedEvent = EventBase.extend({
  type: z.literal('cairn_violation_detected'),
  data: z.object({
    violation_type: ViolationTypeEnum,
    details: z.string(),
  }),
});

/** §5.3 gate_trip — pre-registration gate triggered, session pauses */
export const GateTripEvent = EventBase.extend({
  type: z.literal('gate_trip'),
  data: z.object({
    gate_name: z.string().min(1),
    context: z.string(),
    expected_action: z.string(),
  }),
});

/**
 * Discriminated union of all 7 frozen event types.
 * Both daemon emission and UI consumption parse against this union.
 */
export const EventV2 = z.discriminatedUnion('type', [
  HandoffWrittenEvent,
  CommitLandedEvent,
  StateChangedEvent,
  PromptSentEvent,
  TestStatusUpdatedEvent,
  CairnViolationDetectedEvent,
  GateTripEvent,
]);
export type EventV2Type = z.infer<typeof EventV2>;

// ─────────────────────────────────────────────────────────────────────────────
// §5 — HTTP response schemas (KNOWN — contract §4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /v2/health response. Per contract §4.1, no auth required.
 * Per DAEMON-S05 ADR: shape is { status, version, uptime_seconds }.
 */
export const HealthResponse = z.object({
  status: z.literal('ok'),
  version: z.string(),
  uptime_seconds: z.number().nonnegative(),
});
export type HealthResponseType = z.infer<typeof HealthResponse>;

/**
 * Per-session response shape for GET /v2/sessions and GET /v2/sessions/:name.
 * Combines persisted v2 record + computed_status (derived) + recent_events
 * (derived, capped at 50 most recent per Session A §5.1 MODELED default).
 *
 * Per GAP 1 arbitration: includes killed sessions; UI filters/displays
 * via archive toggle.
 */
export const SessionResponseV2 = SessionSchemaV2.extend({
  computed_status: ComputedStatusEnum,
  status_json: StatusJsonSchema.nullable(),
  recent_events: z.array(EventV2).max(50),
});
export type SessionResponseV2Type = z.infer<typeof SessionResponseV2>;

/**
 * GET /v2/sessions list response.
 * Per GAP 1: includes ALL sessions (armed + paused + held + killed).
 */
export const SessionsListResponse = z.object({
  sessions: z.record(z.string().min(1), SessionResponseV2),
});
export type SessionsListResponseType = z.infer<typeof SessionsListResponse>;

/**
 * GET /v2/events?since=&limit= response. Per contract §4.5.
 * Default limit 100, max 500.
 */
export const EventsHistoryResponse = z.object({
  events: z.array(EventV2),
  next_since: z.string().datetime().nullable(),
});
export type EventsHistoryResponseType = z.infer<typeof EventsHistoryResponse>;

/**
 * Standard error response body. Per Session A §5.1 MODELED default,
 * verified KNOWN via DAEMON-S05 P2/P6/P7 probes.
 *
 * Used by all 4xx responses including the verbatim Blocker 3 body:
 * { "error": "Session name in use (killed record exists). Pick a new name." }
 */
export const ErrorResponse = z.object({
  error: z.string().min(1),
});
export type ErrorResponseType = z.infer<typeof ErrorResponse>;

// ─────────────────────────────────────────────────────────────────────────────
// §6 — Request body schemas (KNOWN — contract §4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /v2/sessions request body. Creates a new session.
 * Per Blocker 1: created session starts in state='armed' automatically;
 * this body does not include state field.
 */
export const CreateSessionRequest = z.object({
  name: z.string().min(1),
  cwd: z.string().min(1),
  tmux_target: z.string().regex(/^[^:]+:\d+\.\d+$/),
  handoff_path: z.string().min(1),
});
export type CreateSessionRequestType = z.infer<typeof CreateSessionRequest>;

/**
 * PATCH /v2/sessions/:name/state request body.
 * Per contract §6.1: only valid transitions allowed; daemon validates
 * against state machine and returns 422 on invalid transition.
 */
export const PatchStateRequest = z.object({
  state: StateEnum,
});
export type PatchStateRequestType = z.infer<typeof PatchStateRequest>;

/**
 * POST /v2/sessions/:name/prompts request body. Send new prompt to session.
 * Per contract §4.4: returns 422 if session not in armed state.
 */
export const SendPromptRequest = z.object({
  body: z.string().min(1),
});
export type SendPromptRequestType = z.infer<typeof SendPromptRequest>;

/**
 * GET /v2/sessions/:name/handoff response body.
 * Per contract §4.4: returns 404 if no handoff present.
 */
export const PullHandoffResponse = z.object({
  content: z.string(),
  written_at: z.string().datetime(),
  archived_to: z.string().min(1),
});
export type PullHandoffResponseType = z.infer<typeof PullHandoffResponse>;
