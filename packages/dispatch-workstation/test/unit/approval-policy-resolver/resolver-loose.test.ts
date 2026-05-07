/**
 * MB-T13 WB6 — resolver §3.2 semantic: LOOSE policy.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §3.2: "Loose: only commits and contract
 * changes require approval. Multi-step plans, spawn/kill, all other
 * prompts fire without approval. Useful for trusted sessions on well-
 * defined tasks."
 *
 * Notable: under loose, spawn/kill auto-fire (different from medium),
 * and isMultiStep does NOT trigger (different from medium).
 */

import { describe, it, expect } from 'vitest';
import {
  resolveApproval,
} from '../../../src/main/approval-policy-resolver.js';

describe('MB-T13 WB6 — resolver §3.2 — LOOSE policy', () => {
  // Required-approval paths (only commit + contract)
  it('loose + send + willCommit=true → approvalRequired: true', () => {
    const r = resolveApproval({
      policy: 'loose',
      actionType: 'send',
      predicates: { willCommit: true },
    });
    expect(r.approvalRequired).toBe(true);
    expect(r.reason).toMatch(/commit/i);
  });

  it('loose + send + willTouchContract=true → approvalRequired: true', () => {
    const r = resolveApproval({
      policy: 'loose',
      actionType: 'send',
      predicates: { willTouchContract: true },
    });
    expect(r.approvalRequired).toBe(true);
    expect(r.reason).toMatch(/contract/i);
  });

  it('loose + assign-task + willCommit=true → approvalRequired: true', () => {
    const r = resolveApproval({
      policy: 'loose',
      actionType: 'assign-task',
      predicates: { willCommit: true },
    });
    expect(r.approvalRequired).toBe(true);
  });

  // Auto-fire paths (everything else under loose)
  it('loose + spawn-new-session → approvalRequired: false (auto-fires)', () => {
    const r = resolveApproval({
      policy: 'loose',
      actionType: 'spawn-new-session',
    });
    expect(r.approvalRequired).toBe(false);
  });

  it('loose + kill → approvalRequired: false (auto-fires)', () => {
    const r = resolveApproval({ policy: 'loose', actionType: 'kill' });
    expect(r.approvalRequired).toBe(false);
  });

  it('loose + pull → approvalRequired: false', () => {
    const r = resolveApproval({ policy: 'loose', actionType: 'pull' });
    expect(r.approvalRequired).toBe(false);
  });

  it('loose + send + isMultiStep=true (no commit/contract) → approvalRequired: false', () => {
    const r = resolveApproval({
      policy: 'loose',
      actionType: 'send',
      predicates: { isMultiStep: true },
    });
    expect(r.approvalRequired).toBe(false);
  });

  it('loose + send (no predicates) → approvalRequired: false', () => {
    const r = resolveApproval({ policy: 'loose', actionType: 'send' });
    expect(r.approvalRequired).toBe(false);
  });

  it('loose + assign-task + isMultiStep + spawn-like context → approvalRequired: false', () => {
    // Confirms the loose-policy auto-fire path even when an action
    // would have surfaced under medium (multi-step + assign-task).
    const r = resolveApproval({
      policy: 'loose',
      actionType: 'assign-task',
      predicates: { isMultiStep: true },
    });
    expect(r.approvalRequired).toBe(false);
  });
});
