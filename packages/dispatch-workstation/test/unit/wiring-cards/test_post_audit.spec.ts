// MB-F-MB-T07-DAEMON-AUDIT-CLIENT — F3 unit specs.
//
// WORKSTATION_CONTRACT.md §6.2 + COARCH-T01: when the operator approves /
// declines / multi-choice-selects a card, the shell-side card-ipc.ts handler
// (frozen MB-T07 GREEN at b45b93b) calls deps.daemonClient.postAudit(row)
// to persist the audit row via POST /v3/orchestrator/audit. CardIpcDeps.
// daemonClient is typed as DaemonAuditClient { postAudit: (req) => Promise<unknown> }.
// Production wiring needs HttpDaemonClient.postAudit to fire the POST.
//
// Per WC §6.2 audit is fire-and-forget — failures must NOT throw or block
// the operator's UI. Behavior on each daemon-failure mode must be graceful.
//
// Test design — pure-function extraction:
// http-daemon-client.ts exports a top-level helper postAuditViaFetch(baseUrl,
// token, req, fetchImpl) that the class's postAudit method wraps. The helper
// is fully unit-testable without mocking globals (no `vi.stubGlobal('fetch')`,
// no `node:fs` mocking). The class wrapper passes DAEMON_URL, this.token,
// req, and the global fetch.
//
// RED state: postAuditViaFetch absent from http-daemon-client.ts → import
// fails → FAIL.
import { describe, it, expect, vi } from 'vitest';
import { postAuditViaFetch } from '../../../src/main/http-daemon-client.js';
import type { OrchestratorAuditWriteRequest } from 'dispatch-core/src/v3/schema.js';

const sampleReq: OrchestratorAuditWriteRequest = {
  timestamp: '2026-05-03T22:00:00.000Z',
  trigger_event: 'session sherpa-001 awaiting_review for >5m',
  build_doc_id: 'mvp-build-doc',
  build_doc_commit_sha: 'abc123',
  output_type: 'card',
  output_payload: {
    type: 'card',
    action: 'send',
    target: 'sherpa-001',
    payload: { body: 'continue' },
    rationale: 'Sherpa stalled.',
    free_form_prompt: 'continue',
    superseded_card_ids: [],
    build_doc_commit_sha: 'abc123',
  },
  operator_response: 'approve',
  final_fired_payload: { body: 'continue' },
  execution_outcome: 'n/a',
  free_form_text: null,
  staleness_status: 'current',
  superseded_card_ids: [],
};

describe('MB-F-MB-T07-DAEMON-AUDIT-CLIENT — postAuditViaFetch', () => {
  it('returns null and does not call fetchImpl when token is null', async () => {
    const fetchMock = vi.fn();
    const result = await postAuditViaFetch(
      'http://localhost:7878',
      null,
      sampleReq,
      fetchMock as unknown as typeof fetch,
    );
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fires POST /v3/orchestrator/audit with correct headers + body when token is set', async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          status: 201,
          json: async () => ({ id: 'audit-1' }),
        }) as unknown as Response,
    );
    const result = await postAuditViaFetch(
      'http://localhost:7878',
      'test-token',
      sampleReq,
      fetchMock as unknown as typeof fetch,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:7878/v3/orchestrator/audit');
    const initObj = init as RequestInit;
    expect(initObj.method).toBe('POST');
    const headers = initObj.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Conductor-Token']).toBe('test-token');
    expect(initObj.body).toBe(JSON.stringify(sampleReq));
    expect(result).toEqual({ id: 'audit-1' });
  });

  it('returns null when daemon responds 401 (does not throw)', async () => {
    const fetchMock = vi.fn(
      async () =>
        ({ ok: false, status: 401, json: async () => ({}) }) as unknown as Response,
    );
    const result = await postAuditViaFetch(
      'http://localhost:7878',
      'bad-token',
      sampleReq,
      fetchMock as unknown as typeof fetch,
    );
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when fetch throws (ECONNREFUSED, daemon down)', async () => {
    const fetchMock = vi.fn(async () => {
      const err = new Error('ECONNREFUSED 127.0.0.1:7878');
      throw err;
    });
    const result = await postAuditViaFetch(
      'http://localhost:7878',
      'test-token',
      sampleReq,
      fetchMock as unknown as typeof fetch,
    );
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when daemon responds 422 (invalid body shape — fire-and-forget per WC §6.2)', async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: false,
          status: 422,
          json: async () => ({ error: 'invalid body' }),
        }) as unknown as Response,
    );
    const result = await postAuditViaFetch(
      'http://localhost:7878',
      'test-token',
      sampleReq,
      fetchMock as unknown as typeof fetch,
    );
    expect(result).toBeNull();
  });
});
