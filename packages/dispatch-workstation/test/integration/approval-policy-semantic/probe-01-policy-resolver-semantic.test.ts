/**
 * MB-T13 WB10 — Policy semantic integration via resolver-direct harness.
 *
 * Per Phase 2 brief WB10 INTEGRATION TEST note: pre-merge harness calls
 * the resolver directly (sess-mbt11's action-handler integration is NOT
 * yet on main; the cross-session card-surfacing test lands later as
 * part of MB-F-T11-T13-RESOLVER-STUB closure).
 *
 * This test exercises the daemon route ↔ workstation resolver pairing
 * end-to-end:
 *
 *   1. Spin a real daemon (dispatch-daemon spawnTestServer fixture)
 *      so the SQLite-backed session_policies persistence is exercised.
 *   2. PUT /v3/sessions/test-session/approval-policy with 'tight';
 *      GET → verify response shape matches ApprovalPolicyGetResponseSchema
 *      and approval_policy is 'tight'.
 *   3. Pass the policy from the GET response into resolveApproval();
 *      verify §3.2 semantic — tight = always approval-required.
 *   4. PUT 'loose' (overrides existing 'tight'); GET; pass to resolver.
 *   5. Verify §3.2 semantic — loose + bare send = auto-fire; loose +
 *      send + willCommit = approval-required.
 *
 * Cross-package import (KNOWN — relative-path workspace pattern):
 *   The spawnTestServer fixture lives in dispatch-daemon/test/fixtures/.
 *   workstation does not have dispatch-daemon as a workspace dep.
 *   Imports use a 4-level-up relative path through the monorepo
 *   structure. This is a test-only cross-package read; production
 *   workstation code does NOT depend on dispatch-daemon symbols
 *   (it makes HTTP calls per WORKSTATION_CONTRACT.md). If this import
 *   resolution surfaces issues across CI / fresh-install paths, fall
 *   back to a mock-fetch harness (operator can direct).
 */

import { afterEach, describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
  spawnTestServer,
  type TestServer,
} from '../../../../dispatch-daemon/test/fixtures/server.js';
import { resolveApproval } from '../../../src/main/approval-policy-resolver.js';

interface PolicyGetResponse {
  session_name: string;
  approval_policy: 'tight' | 'medium' | 'loose';
  updated_at: string | null;
}

describe('MB-T13 WB10 — policy semantic via resolver-direct harness', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  function authedJson(method: string, body?: unknown): RequestInit {
    return {
      method,
      headers: {
        'x-conductor-token': ts?.token ?? '',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };
  }

  async function putPolicy(
    sessionName: string,
    policy: 'tight' | 'medium' | 'loose',
  ): Promise<void> {
    const r = await fetch(
      `${ts?.url}/v3/sessions/${sessionName}/approval-policy`,
      authedJson('PUT', { approval_policy: policy }),
    );
    expect(r.status).toBe(200);
  }

  async function getPolicy(sessionName: string): Promise<PolicyGetResponse> {
    const r = await fetch(
      `${ts?.url}/v3/sessions/${sessionName}/approval-policy`,
      { headers: { 'x-conductor-token': ts?.token ?? '' } },
    );
    expect(r.status).toBe(200);
    return (await r.json()) as PolicyGetResponse;
  }

  it("PUT 'tight' → GET → resolver yields approvalRequired:true on send", async () => {
    ts = await spawnTestServer();
    await putPolicy('test-session', 'tight');
    const policyResp = await getPolicy('test-session');
    expect(policyResp.approval_policy).toBe('tight');

    const result = resolveApproval({
      policy: policyResp.approval_policy,
      actionType: 'send',
      predicates: {},
    });
    expect(result.approvalRequired).toBe(true);
    expect(result.reason).toMatch(/tight/i);
  });

  it("PUT 'loose' → GET → resolver yields approvalRequired:false on bare send", async () => {
    ts = await spawnTestServer();
    await putPolicy('test-session', 'loose');
    const policyResp = await getPolicy('test-session');
    expect(policyResp.approval_policy).toBe('loose');

    const result = resolveApproval({
      policy: policyResp.approval_policy,
      actionType: 'send',
      predicates: {},
    });
    expect(result.approvalRequired).toBe(false);
  });

  it("PUT 'loose' → GET → resolver yields approvalRequired:true on send+willCommit", async () => {
    ts = await spawnTestServer();
    await putPolicy('test-session', 'loose');
    const policyResp = await getPolicy('test-session');
    expect(policyResp.approval_policy).toBe('loose');

    const result = resolveApproval({
      policy: policyResp.approval_policy,
      actionType: 'send',
      predicates: { willCommit: true },
    });
    expect(result.approvalRequired).toBe(true);
    expect(result.reason).toMatch(/commit/i);
  });

  it('PUT tight → PUT loose transition: GET reflects last write; resolver tracks', async () => {
    ts = await spawnTestServer();
    await putPolicy('test-session', 'tight');
    const tightResp = await getPolicy('test-session');
    expect(tightResp.approval_policy).toBe('tight');

    // Operator flips policy mid-session per §3.2 ("Changes apply
    // immediately"). Workstation re-fetches policy on next action.
    await putPolicy('test-session', 'loose');
    const looseResp = await getPolicy('test-session');
    expect(looseResp.approval_policy).toBe('loose');
    expect(looseResp.updated_at).not.toBe(tightResp.updated_at);

    // Same actionType, same predicates — different policy yields
    // different result per §3.2.
    const tightResult = resolveApproval({
      policy: 'tight',
      actionType: 'send',
      predicates: {},
    });
    const looseResult = resolveApproval({
      policy: 'loose',
      actionType: 'send',
      predicates: {},
    });
    expect(tightResult.approvalRequired).toBe(true);
    expect(looseResult.approvalRequired).toBe(false);
  });

  it('GET on never-PUT session returns medium default; resolver applies medium semantic', async () => {
    ts = await spawnTestServer();
    const policyResp = await getPolicy('never-put-session');
    expect(policyResp.approval_policy).toBe('medium');
    expect(policyResp.updated_at).toBeNull();

    // medium + send + no predicates → auto-fire per §3.2.
    const sendResult = resolveApproval({
      policy: policyResp.approval_policy,
      actionType: 'send',
      predicates: {},
    });
    expect(sendResult.approvalRequired).toBe(false);

    // medium + spawn-new-session → always approval-required per §3.2.
    const spawnResult = resolveApproval({
      policy: policyResp.approval_policy,
      actionType: 'spawn-new-session',
      predicates: {},
    });
    expect(spawnResult.approvalRequired).toBe(true);
  });
});
