/**
 * MB-T13 WB6 — resolver §3.2 semantic: MEDIUM policy (default).
 *
 * Per CONDUCTOR_V3_RESCOPE.md §3.2: medium requires approval for
 *   - Commit-creating prompts (willCommit)
 *   - Contract-touching prompts (willTouchContract)
 *   - spawn-new-session and kill actions
 *   - Multi-step plans (isMultiStep)
 * Everything else (single-prompt send w/o commit-or-contract, pull) fires
 * without approval but is logged in the audit table.
 *
 * This file walks the medium-policy decision matrix per the brief
 * resolver-coverage block.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveApproval,
} from '../../../src/main/approval-policy-resolver.js';

describe('MB-T13 WB6 — resolver §3.2 — MEDIUM policy', () => {
  // Action-type triggers (auto-required regardless of predicates)
  it('medium + spawn-new-session → approvalRequired: true', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'spawn-new-session',
    });
    expect(r.approvalRequired).toBe(true);
    expect(r.reason).toMatch(/spawn/i);
  });

  it('medium + kill → approvalRequired: true', () => {
    const r = resolveApproval({ policy: 'medium', actionType: 'kill' });
    expect(r.approvalRequired).toBe(true);
    expect(r.reason).toMatch(/kill/i);
  });

  it('medium + pull (read-only) → approvalRequired: false (auto-fires)', () => {
    const r = resolveApproval({ policy: 'medium', actionType: 'pull' });
    expect(r.approvalRequired).toBe(false);
    expect(r.reason).toMatch(/read-only|pull/i);
  });

  // Predicate-driven triggers on send / assign-task
  it('medium + send + willCommit=true → approvalRequired: true', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'send',
      predicates: { willCommit: true },
    });
    expect(r.approvalRequired).toBe(true);
    expect(r.reason).toMatch(/commit/i);
  });

  it('medium + send + willTouchContract=true → approvalRequired: true', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'send',
      predicates: { willTouchContract: true },
    });
    expect(r.approvalRequired).toBe(true);
    expect(r.reason).toMatch(/contract/i);
  });

  it('medium + send + isMultiStep=true → approvalRequired: true', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'send',
      predicates: { isMultiStep: true },
    });
    expect(r.approvalRequired).toBe(true);
    expect(r.reason).toMatch(/multi-step/i);
  });

  it('medium + assign-task + isMultiStep=true → approvalRequired: true', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'assign-task',
      predicates: { isMultiStep: true },
    });
    expect(r.approvalRequired).toBe(true);
  });

  // Auto-fire paths (no triggers fire under medium)
  it('medium + send (no predicates) → approvalRequired: false', () => {
    const r = resolveApproval({ policy: 'medium', actionType: 'send' });
    expect(r.approvalRequired).toBe(false);
    expect(r.reason).toMatch(/medium/i);
  });

  it('medium + send + all-predicates-false → approvalRequired: false', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'send',
      predicates: {
        willCommit: false,
        willTouchContract: false,
        isMultiStep: false,
      },
    });
    expect(r.approvalRequired).toBe(false);
  });

  it('medium + assign-task (no predicates) → approvalRequired: false', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'assign-task',
    });
    expect(r.approvalRequired).toBe(false);
  });

  // Multiple triggers — first-wins reason behavior
  it('medium + send + willCommit + isMultiStep → approvalRequired: true (multi-step takes precedence)', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'send',
      predicates: { willCommit: true, isMultiStep: true },
    });
    expect(r.approvalRequired).toBe(true);
    // Implementation orders multi-step check before willCommit.
    expect(r.reason).toMatch(/multi-step/i);
  });

  it('medium + spawn + every-predicate-true → approvalRequired: true (action-type takes precedence)', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'spawn-new-session',
      predicates: {
        willCommit: true,
        willTouchContract: true,
        isMultiStep: true,
      },
    });
    expect(r.approvalRequired).toBe(true);
    expect(r.reason).toMatch(/spawn/i);
  });
});
