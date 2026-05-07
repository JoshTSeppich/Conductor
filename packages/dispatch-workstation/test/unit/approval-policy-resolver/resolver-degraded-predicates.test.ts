/**
 * MB-T13 WB6 — resolver graceful degradation: missing predicates.
 *
 * Per Q-MBT13-6 + Phase 2 brief R3 (graceful-degradation): sess-mbt11
 * may ship action-handler before prediction-population logic. The
 * resolver tolerates missing predicates by treating them as `false`.
 *
 * This file verifies the degraded-mode behavior:
 *   - undefined `predicates` field on input → treated as all-false
 *   - empty `predicates` object → treated as all-false
 *   - partial `predicates` (e.g., only willCommit) → other fields false
 *
 * The most-permissive correct answer is "auto-fire" when predicates
 * are unknown — matches the medium-policy "low-friction default"
 * framing of §3.2.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveApproval,
} from '../../../src/main/approval-policy-resolver.js';

describe('MB-T13 WB6 — resolver graceful degradation on missing predicates', () => {
  it('medium + send (no predicates field at all) → auto-fires', () => {
    const r = resolveApproval({ policy: 'medium', actionType: 'send' });
    expect(r.approvalRequired).toBe(false);
  });

  it('medium + send + empty predicates {} → auto-fires', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'send',
      predicates: {},
    });
    expect(r.approvalRequired).toBe(false);
  });

  it('loose + assign-task (no predicates field) → auto-fires', () => {
    const r = resolveApproval({
      policy: 'loose',
      actionType: 'assign-task',
    });
    expect(r.approvalRequired).toBe(false);
  });

  it('medium + send + partial predicates {willCommit: true} → respects supplied flag, others false', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'send',
      predicates: { willCommit: true },
    });
    expect(r.approvalRequired).toBe(true);
    expect(r.reason).toMatch(/commit/i);
  });

  it('medium + send + partial predicates {willCommit: false, isMultiStep: undefined} → degraded other fields false', () => {
    const r = resolveApproval({
      policy: 'medium',
      actionType: 'send',
      predicates: { willCommit: false, isMultiStep: undefined },
    });
    expect(r.approvalRequired).toBe(false);
  });
});
