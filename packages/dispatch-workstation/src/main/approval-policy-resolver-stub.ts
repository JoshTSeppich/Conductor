// MB-T11 WB4 — approval-policy-resolver STUB.
//
// STUB resolver per Q-MBT11-6=a + coordination doc Rule 3 (sess-mbt13 owns
// the real resolver). Always returns approvalRequired:true (most-conservative
// default — every action surfaces a card; no auto-fire path).
//
// This module exists so:
//   1. orchestrator-action-handler.ts (WB5) has a stable import target NOW.
//   2. Sess-mbt13's real resolver lands at
//      `packages/dispatch-workstation/src/main/approval-policy-resolver.ts`
//      (separate file) post-cross-merge, with the same ResolverInput +
//      ResolverResult contract surface this stub names.
//   3. The post-cross-merge swap is a one-liner import path change in
//      orchestrator-action-handler.ts, tracked at followup
//      `MB-F-T11-T13-RESOLVER-STUB`.
//
// Behavior contract (MUST match sess-mbt13's real resolver):
//   - Input: actionType (MB-T11 subset), sessionName, optional predicates.
//   - Output: { approvalRequired: boolean, reason: string }.
//   - Deterministic: same input → same output (no I/O, no time-dependence).
//
// THIS STUB IGNORES INPUTS — every call returns approvalRequired:true. This
// is the most-conservative default per Rule 3: when the resolver is unwired,
// every action is treated as approval-required. The real resolver will
// consult per-session policy + action descriptor (§3.2 Medium baseline,
// from orchestrator-action-types.ACTION_DESCRIPTORS) + predicates to
// decide.

import type { MBT11ActionType, ApprovalPredicateKey } from './orchestrator-action-types.js';

/**
 * Input to the resolver. Fields:
 *   - actionType:   MB-T11 action type (one of the 5 §3.6 types)
 *   - sessionName:  the session this action targets
 *   - predicates:   optional per-call signals the orchestrator-action-handler
 *                   computes from the action payload + workstation state.
 *                   Real resolver consults these against the action descriptor's
 *                   approval_predicate_keys; stub ignores them.
 */
export interface ResolverInput {
  actionType: MBT11ActionType;
  sessionName: string;
  predicates?: Partial<Record<ApprovalPredicateKey, boolean>>;
}

/**
 * Resolver result. Fields:
 *   - approvalRequired: true iff the orchestrator-action-handler must surface
 *                        a card and halt the autopilot loop until operator
 *                        approves.
 *   - reason:           human-readable justification, surfaced in the audit
 *                        row + (optionally) in the card UI.
 */
export interface ResolverResult {
  approvalRequired: boolean;
  reason: string;
}

const STUB_REASON =
  'stub: sess-mbt13 resolver not yet wired (MB-F-T11-T13-RESOLVER-STUB)';

/**
 * Stub resolver. Always returns approvalRequired:true regardless of input.
 *
 * Once sess-mbt13 ships its real resolver at
 * `packages/dispatch-workstation/src/main/approval-policy-resolver.ts`,
 * orchestrator-action-handler.ts swaps the import. This stub file is then
 * deleted as part of MB-F-T11-T13-RESOLVER-STUB closure.
 */
export function resolveApprovalStub(input: ResolverInput): ResolverResult {
  // Inputs intentionally ignored — see file-header docblock.
  void input;
  return {
    approvalRequired: true,
    reason: STUB_REASON,
  };
}
