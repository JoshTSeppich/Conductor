// MB-T16 WB1 probe-00 — approval-policy-ipc module loads + exports stub fns.
//
// WB1 RED state: implementations throw 'MB-T16 WB1 stub: ... lands at WB2'.
// This probe verifies the module imports correctly + exports are
// present, without invoking the throw paths beyond the explicit
// "stubs throw" guard. WB2 ADDS probe-01..N with real assertions when
// the implementations land.

import { describe, it, expect } from 'vitest';
import {
  fetchSessionApprovalPolicy,
  putSessionApprovalPolicy,
  ApprovalPolicyIpcController,
} from '../../../src/main/approval-policy-ipc.js';

describe('MB-T16 WB1 — approval-policy-ipc module loads', () => {
  it('exports fetchSessionApprovalPolicy as a function', () => {
    expect(typeof fetchSessionApprovalPolicy).toBe('function');
  });

  it('exports putSessionApprovalPolicy as a function', () => {
    expect(typeof putSessionApprovalPolicy).toBe('function');
  });

  it('exports ApprovalPolicyIpcController as a class (constructor function)', () => {
    expect(typeof ApprovalPolicyIpcController).toBe('function');
  });

  it('ApprovalPolicyIpcController constructor accepts options without throwing (WB1 no-op)', () => {
    expect(() => {
      new ApprovalPolicyIpcController({
        daemonUrl: 'http://localhost:7878',
        readToken: () => 'fake-token',
      });
    }).not.toThrow();
  });

  it('WB1 stubs throw with WB2 deferral message (RED state guard)', async () => {
    await expect(
      fetchSessionApprovalPolicy('sess-x', 'http://localhost:7878', 'token'),
    ).rejects.toThrow(/WB2/);
    await expect(
      putSessionApprovalPolicy(
        'sess-x',
        'medium',
        'http://localhost:7878',
        'token',
      ),
    ).rejects.toThrow(/WB2/);
  });

  it('ApprovalPolicyIpcController.registerHandlers throws with WB2 deferral message', () => {
    const ctl = new ApprovalPolicyIpcController({
      daemonUrl: 'http://localhost:7878',
      readToken: () => 'token',
    });
    expect(() => {
      ctl.registerHandlers({ handle: () => {} });
    }).toThrow(/WB2/);
  });
});
