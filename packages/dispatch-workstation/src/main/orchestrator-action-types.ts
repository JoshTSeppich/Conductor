// MB-T11 WB2 — typed action descriptors + payload validators (pure module).
//
// This module is the workstation-side companion to dispatch-core §12
// (per-action payload sub-schemas). It supplies:
//   - Type-narrowing helpers (isSendAction, isSpawnSessionAction, …)
//   - Action descriptors (per-action metadata used by resolver + handler)
//   - assertActionPayload(actionType, payload): typed second-pass validator
//
// Pure module — no Electron, no IPC, no fs. Fully unit-testable.
//
// Import path discipline (per MB-F-DISPATCH-CORE-DUAL-IMPORT-PATTERN-DRIFT):
// dispatch-core symbols ALWAYS imported from `dispatch-core/dist/...js`.

import {
  pickPayloadSchema,
  type ActionType,
  type ActionOutput,
  type CardOutput,
  type SendPromptActionPayload,
  type SpawnSessionActionPayload,
  type KillSessionActionPayload,
  type PullHandoffActionPayload,
  type AssignTaskActionPayload,
} from 'dispatch-core/dist/v3/schema.js';

// ─────────────────────────────────────────────────────────────────────────────
// MB-T11 action-type subset
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The five MB-T11 action types per CONDUCTOR_V3_RESCOPE.md §3.6. These are the
 * action types the orchestrator-action-handler dispatches; other ActionType
 * enum members ('pause', 'hold', 'arm', 'read-file') are out of MB-T11 scope.
 */
export const MB_T11_ACTION_TYPES = [
  'send',
  'spawn-new-session',
  'kill',
  'pull',
  'assign-task',
] as const satisfies readonly ActionType[];
export type MBT11ActionType = (typeof MB_T11_ACTION_TYPES)[number];

/** Type guard for narrowing an ActionType to the MB-T11 subset. */
export function isMBT11ActionType(t: ActionType): t is MBT11ActionType {
  return (MB_T11_ACTION_TYPES as readonly ActionType[]).includes(t);
}

// ─────────────────────────────────────────────────────────────────────────────
// Type-narrowing helpers (per-action discriminators)
// ─────────────────────────────────────────────────────────────────────────────
//
// These accept ActionOutput | CardOutput because both schemas in dispatch-core
// §3 carry the same `action: ActionTypeEnum` discriminator. The handler routes
// off these without caring whether the orchestrator emitted an action variant
// (fires-without-card) or a card variant (operator-approved).

export function isSendAction(o: ActionOutput | CardOutput): boolean {
  return o.action === 'send';
}
export function isSpawnSessionAction(o: ActionOutput | CardOutput): boolean {
  return o.action === 'spawn-new-session';
}
export function isKillAction(o: ActionOutput | CardOutput): boolean {
  return o.action === 'kill';
}
export function isPullAction(o: ActionOutput | CardOutput): boolean {
  return o.action === 'pull';
}
export function isAssignTaskAction(o: ActionOutput | CardOutput): boolean {
  return o.action === 'assign-task';
}

// ─────────────────────────────────────────────────────────────────────────────
// Action descriptors (per-action metadata)
// ─────────────────────────────────────────────────────────────────────────────

/** Approval-policy predicate keys per CONDUCTOR_V3_RESCOPE.md §3.2 Medium. */
export type ApprovalPredicateKey = 'willCommit' | 'willTouchContract' | 'isMultiStep';

/** Default approval treatment under §3.2 Medium policy when the resolver has no per-session override. */
export type DefaultMediumApproval = 'always' | 'on-predicate' | 'never';

/**
 * Per-action metadata. Consumed by the approval-policy resolver (sess-mbt13
 * territory; sess-mbt11 ships a stub at WB4) and the orchestrator-action-
 * handler (WB5). Field semantics:
 *
 *   - actionType:                MB-T11 action type
 *   - requires_session_target:   true if the action operates against a
 *                                named session; false otherwise. v3.0 has
 *                                all five MB-T11 actions per-session.
 *   - mutates_session_state:     true if firing the action changes session
 *                                state (registry, tmux pane, prompt buffer).
 *                                Used by the audit-write side to decide
 *                                whether the audit row should record a
 *                                state-transition cause.
 *   - read_only:                 true if firing the action only reads data
 *                                (HANDOFF.md). Read-only actions skip the
 *                                approval-required path under Medium per
 *                                §3.2 line 64.
 *   - default_medium_approval:   per §3.2 Medium, the baseline treatment:
 *                                'always'      → operator approval required for every fire
 *                                'on-predicate' → required only when one of approval_predicate_keys is true
 *                                'never'       → never required (Medium ships these as fire-without-card + audit-log only)
 *   - approval_predicate_keys:   subset of ApprovalPredicateKey checked when
 *                                default_medium_approval='on-predicate'.
 *
 * NOTE: This descriptor encodes the §3.2 *Medium* baseline only. The Tight
 * and Loose policies are layered on top by the resolver (sess-mbt13). The
 * stub resolver at WB4 always returns approvalRequired:true regardless of
 * descriptor values.
 */
export interface ActionDescriptor {
  actionType: MBT11ActionType;
  requires_session_target: boolean;
  mutates_session_state: boolean;
  read_only: boolean;
  default_medium_approval: DefaultMediumApproval;
  approval_predicate_keys: readonly ApprovalPredicateKey[];
}

/**
 * Descriptor map for all MB-T11 action types. Mapping rationale per
 * CONDUCTOR_V3_RESCOPE.md §3.2 Medium policy (lines 58-64):
 *
 *   - 'send':              on-predicate. Send fires without approval unless
 *                          the prompt is predicted to commit, touch a
 *                          frozen contract, or is part of a multi-step plan.
 *   - 'spawn-new-session': always. §3.2 line 60 explicitly classes spawn as
 *                          approval-required under Medium.
 *   - 'kill':              always. §3.2 line 60 explicitly classes kill as
 *                          approval-required under Medium.
 *   - 'pull':              never. §3.2 line 64 fires HANDOFF pulls without
 *                          per-action approval (still audit-logged).
 *   - 'assign-task':       on-predicate. The metadata-only marker becomes
 *                          a card when the multi-step predicate is set
 *                          (expected_steps > 1) per §3.2 line 62.
 */
export const ACTION_DESCRIPTORS: Readonly<Record<MBT11ActionType, ActionDescriptor>> = {
  'send': {
    actionType: 'send',
    requires_session_target: true,
    mutates_session_state: true,
    read_only: false,
    default_medium_approval: 'on-predicate',
    approval_predicate_keys: ['willCommit', 'willTouchContract', 'isMultiStep'],
  },
  'spawn-new-session': {
    actionType: 'spawn-new-session',
    requires_session_target: true,
    mutates_session_state: true,
    read_only: false,
    default_medium_approval: 'always',
    approval_predicate_keys: [],
  },
  'kill': {
    actionType: 'kill',
    requires_session_target: true,
    mutates_session_state: true,
    read_only: false,
    default_medium_approval: 'always',
    approval_predicate_keys: [],
  },
  'pull': {
    actionType: 'pull',
    requires_session_target: true,
    mutates_session_state: false,
    read_only: true,
    default_medium_approval: 'never',
    approval_predicate_keys: [],
  },
  'assign-task': {
    actionType: 'assign-task',
    requires_session_target: true,
    mutates_session_state: false,
    read_only: false,
    default_medium_approval: 'on-predicate',
    approval_predicate_keys: ['isMultiStep'],
  },
};

/** Look up the descriptor for an MB-T11 action type. */
export function getActionDescriptor(actionType: MBT11ActionType): ActionDescriptor {
  return ACTION_DESCRIPTORS[actionType];
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload validation (second pass)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conditional type that maps an MB-T11 action type to its payload type. Used
 * as the return type of assertActionPayload so callers get static type
 * narrowing for free.
 */
export type ActionPayloadFor<A extends MBT11ActionType> =
  A extends 'send' ? SendPromptActionPayload :
  A extends 'spawn-new-session' ? SpawnSessionActionPayload :
  A extends 'kill' ? KillSessionActionPayload :
  A extends 'pull' ? PullHandoffActionPayload :
  A extends 'assign-task' ? AssignTaskActionPayload :
  never;

/**
 * Validate `payload` against the per-action sub-schema selected by
 * pickPayloadSchema(actionType). Throws on mismatch. Returns the typed
 * payload on success.
 *
 * Caller pattern (orchestrator-action-handler.ts WB5):
 *   const payload = assertActionPayload(action.action, action.payload);
 *   // payload is now typed per the action discriminator
 */
export function assertActionPayload<A extends MBT11ActionType>(
  actionType: A,
  payload: unknown,
): ActionPayloadFor<A> {
  const schema = pickPayloadSchema(actionType);
  const result = schema.safeParse(payload);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.join('.') ?? '';
    const issueDesc = firstIssue
      ? `${path.length > 0 ? path : '<root>'}: ${firstIssue.message}`
      : 'unknown validation error';
    throw new Error(
      `Invalid payload for action '${actionType}': ${issueDesc}`,
    );
  }
  return result.data as ActionPayloadFor<A>;
}
