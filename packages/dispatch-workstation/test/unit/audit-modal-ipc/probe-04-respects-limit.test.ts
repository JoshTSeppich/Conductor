/**
 * MB-T13 WB7 — Probe 04: controller passes limit=100 to fetchSwarmAudit.
 *
 * Per Q-MBT13-9=a (LIMIT 100 default at v3.0): the IPC handler always
 * fetches the last 100 rows; rich filtering / pagination deferred to
 * v3.1 followup MB-F-T13-AUDIT-MODAL-FILTERS. This probe verifies the
 * controller calls fetchSwarmAudit(100), nothing else.
 *
 * Also verifies the URL+headers shape of fetchSwarmAuditViaFetch (the
 * production helper) by passing an injected fetchImpl recorder.
 */

import { describe, it, expect } from 'vitest';
import {
  AuditModalIpcController,
  fetchSwarmAuditViaFetch,
  type AuditModalFetchDeps,
} from '../../../src/main/audit-modal-ipc.js';

describe('MB-T13 WB7 — probe-04 — controller passes limit=100', () => {
  it('controller calls fetchSwarmAudit exactly once with limit=100', async () => {
    const calls: number[] = [];
    const deps: AuditModalFetchDeps = {
      fetchSwarmAudit: async (limit: number) => {
        calls.push(limit);
        return { rows: [], total: 0 };
      },
    };
    const controller = new AuditModalIpcController(deps);
    await controller.handleFetch();
    expect(calls).toEqual([100]);
  });

  it('fetchSwarmAuditViaFetch builds GET ?limit=N with X-Conductor-Token header', async () => {
    const observedRequests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      observedRequests.push({ url, init });
      return new Response(JSON.stringify({ rows: [], total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    await fetchSwarmAuditViaFetch(
      'http://localhost:7878',
      'tok-abc',
      100,
      fetchImpl,
    );
    expect(observedRequests).toHaveLength(1);
    expect(observedRequests[0].url).toBe(
      'http://localhost:7878/v3/audit/swarm-audit?limit=100',
    );
    const headers = observedRequests[0].init?.headers as
      | Record<string, string>
      | undefined;
    expect(headers?.['X-Conductor-Token']).toBe('tok-abc');
  });

  it('fetchSwarmAuditViaFetch throws when token is null (treated as daemon-unreachable upstream)', async () => {
    await expect(
      fetchSwarmAuditViaFetch('http://localhost:7878', null, 100),
    ).rejects.toThrow(/token/i);
  });

  it('fetchSwarmAuditViaFetch throws on non-2xx response with status info', async () => {
    const fetchImpl = (async () => {
      return new Response('forbidden', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }) as typeof fetch;
    await expect(
      fetchSwarmAuditViaFetch('http://localhost:7878', 'tok', 100, fetchImpl),
    ).rejects.toThrow(/401/);
  });
});
