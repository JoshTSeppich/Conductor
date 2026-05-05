// test-batch-1 Session B — http-daemon-client.ts coverage gap closure (Tier 1).
//
// Pre-state: stmt 39.39% / branch 33.33% / func 50.00% / line 44.82%.
//
// postAuditViaFetch is the audit-write helper used by card-ipc; the SUT
// already exports a fetchImpl injection point so this spec needs no global
// fetch mocking.
//
// KNOWN: WORKSTATION_CONTRACT.md §6.2 mandates audit writes are fire-and-
// forget — every failure mode must return null and not throw. Tests assert
// the four documented failure paths plus the happy path.
import { describe, it, expect, vi } from 'vitest';
import { postAuditViaFetch } from '../../../src/main/http-daemon-client.js';
import type { OrchestratorAuditWriteRequest } from 'dispatch-core/src/v3/schema.js';

// SUT does not validate request body shape — it JSON-stringifies and
// POSTs. Tests only need a stable JSON-shape stub that survives
// JSON.parse/stringify round-trip for body assertions.
const SAMPLE_REQ = {
  trigger_event: 'unit-test',
  build_doc_id: 'docs/x.build.md',
  build_doc_commit_sha: 'abc1234',
  marker: 'card-001',
} as unknown as OrchestratorAuditWriteRequest;

describe('postAuditViaFetch — token-null branch', () => {
  it('returns null without invoking fetchImpl when token is null', async () => {
    const fetchSpy = vi.fn();
    const result = await postAuditViaFetch(
      'http://localhost:7878',
      null,
      SAMPLE_REQ,
      fetchSpy,
    );
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('postAuditViaFetch — happy path', () => {
  it('POSTs to /v3/orchestrator/audit with token header and JSON body, returns parsed JSON', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'audit-row-1', accepted: true }),
    });
    const result = await postAuditViaFetch(
      'http://localhost:7878',
      'tok123',
      SAMPLE_REQ,
      fetchSpy,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('http://localhost:7878/v3/orchestrator/audit');
    expect((init as RequestInit).method).toBe('POST');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['X-Conductor-Token']).toBe('tok123');
    expect(headers['Content-Type']).toBe('application/json');
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      marker: 'card-001',
    });
    expect(result).toEqual({ id: 'audit-row-1', accepted: true });
  });
});

describe('postAuditViaFetch — failure branches all return null', () => {
  it('returns null when daemon responds non-ok (4xx/5xx)', async () => {
    // KNOWN: §6.2 — daemon 401/422/500 must surface as null, not throw.
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'unprocessable' }),
    });
    const result = await postAuditViaFetch(
      'http://localhost:7878',
      'tok123',
      SAMPLE_REQ,
      fetchSpy,
    );
    expect(result).toBeNull();
  });

  it('returns null when fetchImpl throws (network error)', async () => {
    // KNOWN: ECONNREFUSED when daemon is offline must not crash the
    // workstation. Returns null silently.
    const fetchSpy = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await postAuditViaFetch(
      'http://localhost:7878',
      'tok123',
      SAMPLE_REQ,
      fetchSpy,
    );
    expect(result).toBeNull();
  });

  it('returns null when res.json() throws (malformed JSON response)', async () => {
    // SPECULATIVE: a daemon returning non-JSON on a 200 is unusual but
    // the contract says fire-and-forget; res.json() throwing must be
    // caught by the same outer try/catch.
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });
    const result = await postAuditViaFetch(
      'http://localhost:7878',
      'tok123',
      SAMPLE_REQ,
      fetchSpy,
    );
    expect(result).toBeNull();
  });
});
