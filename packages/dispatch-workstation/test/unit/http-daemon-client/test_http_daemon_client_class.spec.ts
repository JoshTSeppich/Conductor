// test-batch-1 Session B — http-daemon-client.ts coverage gap closure (Tier 1).
//
// Covers HttpDaemonClient.fetchHistory / postMessage / postAudit. The class
// uses module-level `fetch` (global) and reads daemon token from
// ~/.foxworks-dispatch/token at construction. Tests stub:
// - node:fs.readFileSync to control token presence/absence per test
// - globalThis.fetch via vi.stubGlobal so the class's bare fetch calls
//   are observable
//
// KNOWN: HttpDaemonClient documents fail-graceful behavior at every IO
// boundary — fetchHistory returns [], postMessage returns synthetic
// fallback, postAudit returns null. This ensures the workstation can boot
// and operate even when the daemon is unreachable. Tests assert each
// failure mode produces the documented graceful return value.
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

const fsMocks = vi.hoisted(() => ({
  readFileSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  readFileSync: fsMocks.readFileSync,
}));

import { HttpDaemonClient } from '../../../src/main/http-daemon-client.js';

const ORIG_FETCH = globalThis.fetch;
const fetchSpy = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchSpy);
  // Default: token-file exists with a valid token.
  fsMocks.readFileSync.mockReturnValue('tok-default\n');
});

afterAll(() => {
  globalThis.fetch = ORIG_FETCH;
});

describe('HttpDaemonClient — constructor + token read', () => {
  it('reads daemon token from ~/.foxworks-dispatch/token at construction', () => {
    new HttpDaemonClient();
    expect(fsMocks.readFileSync).toHaveBeenCalledTimes(1);
    const [path] = fsMocks.readFileSync.mock.calls[0]!;
    // Path varies by host but must end in '.foxworks-dispatch/token'.
    expect(String(path)).toMatch(/\.foxworks-dispatch\/token$/);
  });

  it('survives readFileSync throwing — token field becomes null', async () => {
    // KNOWN: token-file absent (first launch, never logged in) must not
    // throw at construction. The class proceeds with token=null and
    // every method short-circuits to the fallback path.
    fsMocks.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const client = new HttpDaemonClient();
    // Indirect token=null assertion: fetchHistory returns [] without
    // ever calling fetch.
    const rows = await client.fetchHistory();
    expect(rows).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('HttpDaemonClient.fetchHistory', () => {
  it('returns body.messages when daemon returns ok with messages array', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [{ id: 'm1', role: 'user', content: 'hi' }],
      }),
    });
    const client = new HttpDaemonClient();
    const rows = await client.fetchHistory();
    expect(rows).toEqual([{ id: 'm1', role: 'user', content: 'hi' }]);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toMatch(/\/v3\/orchestrator\/history\?limit=50$/);
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['X-Conductor-Token']).toBe('tok-default');
  });

  it('returns empty array when body.messages is undefined (defensive default)', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({}) });
    const client = new HttpDaemonClient();
    expect(await client.fetchHistory()).toEqual([]);
  });

  it('returns empty array when daemon responds non-ok (4xx/5xx)', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500 });
    const client = new HttpDaemonClient();
    expect(await client.fetchHistory()).toEqual([]);
  });

  it('returns empty array when fetch throws (network error)', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));
    const client = new HttpDaemonClient();
    expect(await client.fetchHistory()).toEqual([]);
  });

  it('returns empty array when token is null (never calls fetch)', async () => {
    fsMocks.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const client = new HttpDaemonClient();
    const rows = await client.fetchHistory();
    expect(rows).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('HttpDaemonClient.postMessage', () => {
  const userMsg = { role: 'user' as const, content: 'hello' };

  it('returns server response when daemon ok', async () => {
    const serverEcho = {
      id: 'srv-1',
      role: 'user',
      content: 'hello',
      created_at: '2026-05-05T12:00:00Z',
      build_doc_id: null,
      build_doc_commit_sha: null,
    };
    fetchSpy.mockResolvedValue({ ok: true, json: async () => serverEcho });
    const client = new HttpDaemonClient();
    const result = await client.postMessage(userMsg);
    expect(result).toEqual(serverEcho);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toMatch(/\/v3\/orchestrator\/messages$/);
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(userMsg);
  });

  it('returns synthetic fallback ChatMessage when daemon non-ok', async () => {
    // KNOWN: fallback id format is `local-<ts>-<rand>` per
    // http-daemon-client.ts:88. This guarantees renderer gets a
    // round-trippable message even when daemon write failed.
    fetchSpy.mockResolvedValue({ ok: false });
    const client = new HttpDaemonClient();
    const result = await client.postMessage(userMsg);
    expect(result.id).toMatch(/^local-\d+-[a-z0-9]+$/);
    expect(result.role).toBe('user');
    expect(result.content).toBe('hello');
    expect(result.build_doc_id).toBeNull();
    expect(result.build_doc_commit_sha).toBeNull();
    expect(typeof result.created_at).toBe('string');
  });

  it('returns synthetic fallback when fetch throws', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));
    const client = new HttpDaemonClient();
    const result = await client.postMessage(userMsg);
    expect(result.id).toMatch(/^local-\d+-[a-z0-9]+$/);
    expect(result.role).toBe('user');
  });

  it('returns synthetic fallback when token is null (skip fetch entirely)', async () => {
    fsMocks.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const client = new HttpDaemonClient();
    const result = await client.postMessage(userMsg);
    expect(result.id).toMatch(/^local-\d+-[a-z0-9]+$/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('propagates build_doc_id and build_doc_commit_sha into fallback when present on input', async () => {
    // KNOWN: input msg may carry buildDoc context for routing parity;
    // fallback must preserve those fields so renderer-side build-doc
    // tracking is not severed by daemon downtime.
    fetchSpy.mockResolvedValue({ ok: false });
    const client = new HttpDaemonClient();
    const result = await client.postMessage({
      role: 'assistant',
      content: 'reply',
      build_doc_id: 'docs/x.build.md',
      build_doc_commit_sha: 'abc1234',
    });
    expect(result.build_doc_id).toBe('docs/x.build.md');
    expect(result.build_doc_commit_sha).toBe('abc1234');
  });
});

describe('HttpDaemonClient.postAudit', () => {
  it('delegates to postAuditViaFetch and forwards token + DAEMON_URL', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'audit-1' }),
    });
    const client = new HttpDaemonClient();
    const result = await client.postAudit({
      trigger_event: 't',
    } as never);
    expect(result).toEqual({ id: 'audit-1' });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toMatch(/\/v3\/orchestrator\/audit$/);
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['X-Conductor-Token']).toBe('tok-default');
  });

  it('returns null without invoking fetch when token is null', async () => {
    fsMocks.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const client = new HttpDaemonClient();
    const result = await client.postAudit({ trigger_event: 't' } as never);
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
