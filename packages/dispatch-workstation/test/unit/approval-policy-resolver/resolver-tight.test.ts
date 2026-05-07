/**
 * MB-T13 WB6 — resolver §3.2 semantic: TIGHT policy.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §3.2: "Tight: every send-prompt requires
 * operator approval before the orchestrator can fire it." The Phase 2
 * brief generalizes this to every action ("tight → always require
 * approval") — there is no auto-fire path under tight policy.
 *
 * This file verifies tight always returns approvalRequired: true,
 * regardless of actionType or predicate combination.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveApproval,
  type ApprovalActionType,
  type ApprovalResolverPredicates,
} from '../../../src/main/approval-policy-resolver.js';

describe('MB-T13 WB6 — resolver §3.2 — TIGHT policy', () => {
  const allActionTypes: ApprovalActionType[] = [
    'send',
    'spawn-new-session',
    'kill',
    'pull',
    'assign-task',
  ];

  for (const actionType of allActionTypes) {
    it(`tight + ${actionType} (no predicates) → approvalRequired: true`, () => {
      const r = resolveApproval({ policy: 'tight', actionType });
      expect(r.approvalRequired).toBe(true);
      expect(r.reason).toMatch(/tight/i);
    });
  }

  it('tight + send + willCommit → approvalRequired: true', () => {
    const r = resolveApproval({
      policy: 'tight',
      actionType: 'send',
      predicates: { willCommit: true },
    });
    expect(r.approvalRequired).toBe(true);
  });

  it('tight + pull (read-only) → approvalRequired: true (overrides §3.6 read-only path)', () => {
    // Even though pull is read-only and auto-fires under medium, tight
    // policy overrides — operator wants every action gated.
    const r = resolveApproval({ policy: 'tight', actionType: 'pull' });
    expect(r.approvalRequired).toBe(true);
  });

  it('tight + assign-task + every-predicate-true → approvalRequired: true', () => {
    const predicates: ApprovalResolverPredicates = {
      willCommit: true,
      willTouchContract: true,
      isMultiStep: true,
    };
    const r = resolveApproval({
      policy: 'tight',
      actionType: 'assign-task',
      predicates,
    });
    expect(r.approvalRequired).toBe(true);
  });
});
