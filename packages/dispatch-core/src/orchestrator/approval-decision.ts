/**
 * MB-T11-B — ApprovalDecision type + prediction hook stubs.
 *
 * ApprovalDecision is the resolver result shape: whether an orchestrator
 * action requires operator approval and a human-readable reason. Defined
 * in dispatch-core so downstream consumers (workstation, daemon, CLI) share
 * a single canonical import.
 *
 * The §3.2 approval-policy resolver that produces ApprovalDecision values
 * lives at dispatch-workstation/src/main/approval-policy-resolver.ts
 * (sess-mbt13 WB6, MB-T13). That resolver's ApprovalResolverResult is
 * structurally identical to ApprovalDecision; post-cross-merge type
 * reconciliation is tracked at MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE.
 *
 * Policy and action types (ApprovalPolicy, ApprovalActionType) are exported
 * from dispatch-core/src/v3/schema.ts §13 as Zod-validated enums.
 *
 * Hook stubs:
 *   predictCommitCreating   — always returns false (stub). Round 6 closure:
 *                             MB-F-T11B-PREDICT-COMMIT-CREATING-IMPL.
 *   predictContractTouching — always returns false (stub). Round 6 closure:
 *                             MB-F-T11B-PREDICT-CONTRACT-TOUCHING-IMPL.
 *
 * Conservative default (false = "no commit/contract predicted") causes
 * over-approval under medium policy rather than under-approval — correct
 * safety posture per MB-T11-B §1 ("over-approval rather than under-approval").
 */

export interface ApprovalDecision {
  /** True when an approval card must surface before the action fires. */
  approvalRequired: boolean;
  /** Human-readable rationale for surfacing in the approval card and audit row. */
  reason: string;
}

/**
 * Predict whether a prompt will result in a `git commit`. Stub returns false.
 *
 * Round 6 closure: MB-F-T11B-PREDICT-COMMIT-CREATING-IMPL. Real implementation
 * will classify prompt text for commit signals (`git commit`, commit-creating
 * tool patterns) and return true when the orchestrator prediction is confident.
 */
export function predictCommitCreating(_prompt: string): boolean {
  return false;
}

/**
 * Predict whether a prompt will modify files matching the operator's
 * frozen-contract pattern list. Stub returns false.
 *
 * Round 6 closure: MB-F-T11B-PREDICT-CONTRACT-TOUCHING-IMPL. Real implementation
 * will match prompt text against `contractPatterns` (operator-configured list
 * of frozen-contract file paths) and return true when a match is found.
 */
export function predictContractTouching(
  _prompt: string,
  _contractPatterns: string[],
): boolean {
  return false;
}
