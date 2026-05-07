// MB-T11 WB4 probe-02 — returned object has both keys, with correct types.

import { describe, expect, it } from 'vitest';
import {
  resolveApprovalStub,
  type ResolverResult,
} from '../../../src/main/approval-policy-resolver-stub.js';

describe('approval-policy-resolver-stub — shape matches interface', () => {
  it('returns an object with approvalRequired:boolean and reason:string', () => {
    const result: ResolverResult = resolveApprovalStub({
      actionType: 'kill',
      sessionName: 'sess-x',
    });
    expect(typeof result.approvalRequired).toBe('boolean');
    expect(typeof result.reason).toBe('string');
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('reason includes the followup-id MB-F-T11-T13-RESOLVER-STUB', () => {
    // Tightens the contract: future swap-in of real resolver MUST replace
    // the stub-reason string; this assertion fails when the swap happens
    // and forces the test author to update either this probe or delete
    // it (per the MB-F-T11-T13-RESOLVER-STUB closure path).
    const result = resolveApprovalStub({
      actionType: 'send',
      sessionName: 'sess-x',
    });
    expect(result.reason).toMatch(/MB-F-T11-T13-RESOLVER-STUB/);
  });

  it('returned object has exactly two keys (no extras)', () => {
    const result = resolveApprovalStub({
      actionType: 'spawn-new-session',
      sessionName: 'sess-x',
    });
    const keys = Object.keys(result).sort();
    expect(keys).toEqual(['approvalRequired', 'reason']);
  });

  it('returned object is structurally distinct across calls (no shared mutable state)', () => {
    const a = resolveApprovalStub({ actionType: 'send', sessionName: 's1' });
    const b = resolveApprovalStub({ actionType: 'send', sessionName: 's2' });
    expect(a).not.toBe(b); // different references
    expect(a).toEqual(b);  // same shape
  });
});
