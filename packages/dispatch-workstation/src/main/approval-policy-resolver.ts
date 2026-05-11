/**
 * MB-T13 — Approval-policy resolver (pure fn).
 *
 * Per Q-MBT13-6=b (operator-arbitrated 2026-05-06): resolver is a pure
 * function. The v3.5 caller (action-marker-router via dispatchActionVariant's
 * resolveApproval dep, wired at WB9 through approval-policy-resolver-shim)
 * fetches the per-session policy via daemon HTTP (GET
 * /v3/sessions/:name/approval-policy), builds predicates from the
 * orchestrator's structured action output, and passes both into this
 * resolver. Resolver applies CONDUCTOR_V3_RESCOPE.md §3.2 semantic
 * locally and returns whether an approval card must surface.
 *
 * Policy semantics (verbatim §3.2):
 *
 *   tight:  every action requires operator approval before fire.
 *           Useful for high-risk sessions or when operator is learning
 *           the orchestrator's behavior.
 *
 *   medium: the following require approval:
 *           - Commit-creating prompts (orchestrator predicts `git commit`)
 *           - Contract-touching prompts (modifies frozen-contract files)
 *           - spawn-new-session and kill actions
 *           - Multi-step plans (>1 send-prompt in a single approval cycle)
 *           Everything else (single-prompt sends, HANDOFF pulls,
 *           console reads) fires without per-action approval but is
 *           logged in the audit table.
 *
 *   loose:  only commits and contract changes require approval.
 *           Multi-step plans, spawn/kill, all other prompts fire
 *           without approval. Useful for trusted sessions on well-
 *           defined tasks.
 *
 * Predicate semantics (Q-MBT13-6 + R3 graceful-degradation):
 *
 *   willCommit:        caller sets to true when the orchestrator
 *                      predicts a `git commit` will result from the
 *                      action. Not applicable to spawn/kill/pull.
 *
 *   willTouchContract: caller sets to true when the orchestrator
 *                      predicts a frozen-contract file modification.
 *
 *   isMultiStep:       caller sets to true when the action is
 *                      part of a chained plan (>1 send-prompt under
 *                      one intent_id).
 *
 *   All predicates default to `false` when omitted — graceful
 *   degradation per R3 (caller may ship dispatchActionVariant deps
 *   before prediction-population logic). Resolver therefore yields the
 *   most-permissive correct answer ("auto-fire") when predicates
 *   are unknown — matches the "low-friction default" framing of
 *   medium policy.
 *
 * Cross-session ownership (per coordination doc Rule 3):
 *   sess-mbt13 owns this resolver. sess-mbt11 stub-imports it pre-
 *   merge; post-cross-merge swap is captured by followup
 *   MB-F-T11-T13-RESOLVER-STUB.
 *
 * ApprovalActionType naming convention follows §1 ActionTypeEnum
 * precedent (`send`, `kill`, `pull`) rather than §3.6 verbose form
 * (`send-prompt-to-session`, `kill-session`, etc.). Mirrors the
 * §13 ApprovalActionTypeEnum (commit a225411). Post-cross-merge
 * dedup followup MB-F-T11-T13-ACTION-TYPE-ENUM-DEDUP reconciles
 * with sess-mbt11's §12 ActionType.
 */

export type ApprovalPolicy = 'tight' | 'medium' | 'loose';

export type ApprovalActionType =
  | 'send'
  | 'spawn-new-session'
  | 'kill'
  | 'pull'
  | 'assign-task';

export interface ApprovalResolverPredicates {
  /** Orchestrator predicts the action will result in a `git commit`. */
  willCommit?: boolean;
  /** Orchestrator predicts the action will modify frozen-contract files. */
  willTouchContract?: boolean;
  /** Action is part of a chained multi-step plan (>1 send-prompt). */
  isMultiStep?: boolean;
}

export interface ApprovalResolverInput {
  policy: ApprovalPolicy;
  actionType: ApprovalActionType;
  predicates?: ApprovalResolverPredicates;
}

export interface ApprovalResolverResult {
  /** True when an approval card must surface before the action fires. */
  approvalRequired: boolean;
  /** Human-readable rationale; logged in audit-row free-form when present. */
  reason: string;
}

/**
 * Resolve whether an orchestrator action requires operator approval per
 * the per-session policy + action-type + (optional) predicates.
 *
 * Pure function — no side effects, no I/O. Caller is responsible for
 * fetching the policy + populating predicates.
 */
export function resolveApproval(
  input: ApprovalResolverInput,
): ApprovalResolverResult {
  const { policy, actionType } = input;
  const willCommit = input.predicates?.willCommit ?? false;
  const willTouchContract = input.predicates?.willTouchContract ?? false;
  const isMultiStep = input.predicates?.isMultiStep ?? false;

  // ── tight ────────────────────────────────────────────────────────────
  // Every action requires approval. No predicate inspection needed.
  if (policy === 'tight') {
    return {
      approvalRequired: true,
      reason: 'tight policy: every action requires operator approval',
    };
  }

  // ── loose ────────────────────────────────────────────────────────────
  // Only commits and contract-touches require approval; everything else
  // auto-fires (including spawn/kill/multi-step per §3.2 verbatim).
  if (policy === 'loose') {
    if (willCommit) {
      return {
        approvalRequired: true,
        reason: 'loose policy: commit-creating prompt requires approval',
      };
    }
    if (willTouchContract) {
      return {
        approvalRequired: true,
        reason: 'loose policy: contract-touching prompt requires approval',
      };
    }
    return {
      approvalRequired: false,
      reason: 'loose policy: action does not affect commits or contracts',
    };
  }

  // ── medium ───────────────────────────────────────────────────────────
  // The default policy. Spawn/kill always require approval; pull always
  // auto-fires (read-only); multi-step plans always require approval;
  // commit/contract predictions on send/assign-task require approval;
  // single-prompt sends without those predictions auto-fire.
  if (actionType === 'spawn-new-session') {
    return {
      approvalRequired: true,
      reason: 'medium policy: spawn-session action requires approval',
    };
  }
  if (actionType === 'kill') {
    return {
      approvalRequired: true,
      reason: 'medium policy: kill-session action requires approval',
    };
  }
  if (actionType === 'pull') {
    // Read-only HANDOFF fetch per §3.6 — auto-fires under medium.
    return {
      approvalRequired: false,
      reason: 'medium policy: pull is read-only, auto-fires',
    };
  }
  if (isMultiStep) {
    return {
      approvalRequired: true,
      reason: 'medium policy: multi-step plan requires approval',
    };
  }
  if (willCommit) {
    return {
      approvalRequired: true,
      reason: 'medium policy: commit-creating prompt requires approval',
    };
  }
  if (willTouchContract) {
    return {
      approvalRequired: true,
      reason: 'medium policy: contract-touching prompt requires approval',
    };
  }
  // Single-prompt send or assign-task without commit/contract/multi-step
  // predictions — auto-fires per §3.2 ("Everything else ... fires
  // without per-action approval but is logged in the audit table").
  return {
    approvalRequired: false,
    reason:
      'medium policy: action does not match any approval-required class',
  };
}
