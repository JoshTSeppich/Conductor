// MB-T11 WB4 probe-01 — stub returns approvalRequired:true for every input shape.

import { describe, expect, it } from 'vitest';
import {
  resolveApprovalStub,
  type ResolverInput,
} from '../../../src/main/approval-policy-resolver-stub.js';
import { MB_T11_ACTION_TYPES } from '../../../src/main/orchestrator-action-types.js';

describe('approval-policy-resolver-stub — always requires approval', () => {
  it('returns approvalRequired:true for every MB-T11 action type', () => {
    for (const actionType of MB_T11_ACTION_TYPES) {
      const result = resolveApprovalStub({
        actionType,
        sessionName: 'fixture',
      });
      expect(result.approvalRequired).toBe(true);
    }
  });

  it('returns approvalRequired:true regardless of sessionName variation', () => {
    const names = ['s1', 'sess-x', 'a-very-long-session-name-with-dashes', 'A'];
    for (const sessionName of names) {
      const result = resolveApprovalStub({ actionType: 'send', sessionName });
      expect(result.approvalRequired).toBe(true);
    }
  });

  it('ignores predicates — true even when all predicates are false', () => {
    const result = resolveApprovalStub({
      actionType: 'send',
      sessionName: 'sess-x',
      predicates: {
        willCommit: false,
        willTouchContract: false,
        isMultiStep: false,
      },
    });
    expect(result.approvalRequired).toBe(true);
  });

  it('ignores predicates — true even when no predicates supplied', () => {
    const result = resolveApprovalStub({
      actionType: 'pull',
      sessionName: 'sess-x',
    });
    expect(result.approvalRequired).toBe(true);
  });

  it('ignores predicates — true even when isMultiStep:true on assign-task', () => {
    const result = resolveApprovalStub({
      actionType: 'assign-task',
      sessionName: 'sess-x',
      predicates: { isMultiStep: true },
    });
    expect(result.approvalRequired).toBe(true);
  });
});
