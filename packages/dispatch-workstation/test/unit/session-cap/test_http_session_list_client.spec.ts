// test-batch-1 Session B — session-cap.ts coverage gap closure (Tier 1).
//
// Pre-state: stmt 45.16% / branch 47.05% / func 50.00% / line 45.16%.
// The mb-t06 specs cover isAtCap and checkSpawnCapacity (pure surfaces)
// but the HTTP implementation HttpSessionListClient + readDaemonToken +
// makeUnreachable are entirely uncovered (lines 146-184).
//
// This spec exercises the HTTP surface — constructor, token resolution,
// happy path, and the three documented DaemonUnreachable failure modes
// (no token, fetch throw, non-ok response).
//
// KNOWN: per WORKSTATION_CONTRACT.md §6.5 fail-closed semantics, daemon
// unreachable must NOT silently allow a spawn — every failure mode
// throws an error tagged error_type='DaemonUnreachable' so the spawn-
// handler caller can route through its WorkstationSpawnError envelope.
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

const fsMocks = vi.hoisted(() => ({
  readFileSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  readFileSync: fsMocks.readFileSync,
}));

import { HttpSessionListClient } from '../../../src/main/session-cap.js';

const ORIG_FETCH = globalThis.fetch;
const fetchSpy = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchSpy);
  fsMocks.readFileSync.mockReturnValue('tok-default\n');
});

afterAll(() => {
  globalThis.fetch = ORIG_FETCH;
});

describe('HttpSessionListClient — constructor + token resolution', () => {
  it('reads token from ~/.foxworks-dispatch/token when no opts.token override is provided', async () => {
    const client = new HttpSessionListClient();
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ sessions: [] }) });
    await client.listSessions();
    expect(fsMocks.readFileSync).toHaveBeenCalledTimes(1);
    const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers['X-Conductor-Token']).toBe('tok-default');
  });

  it('honors opts.token override (null) — skips fs read and forces token-null path', async () => {
    // KNOWN: opts.token !== undefined disambiguates "explicit null" from
    // "absent override". This is the test-injection contract; tests pass
    // null to drive the no-token branch without touching the filesystem.
    const client = new HttpSessionListClient({ token: null });
    expect(fsMocks.readFileSync).not.toHaveBeenCalled();
    await expect(client.listSessions()).rejects.toMatchObject({
      error_type: 'DaemonUnreachable',
      message: expect.stringContaining('Daemon token not found'),
    });
  });

  it('honors opts.token override (string) — uses provided token in header', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ sessions: [] }) });
    const client = new HttpSessionListClient({ token: 'override-tok' });
    await client.listSessions();
    expect(fsMocks.readFileSync).not.toHaveBeenCalled();
    const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers['X-Conductor-Token']).toBe('override-tok');
  });

  it('honors opts.daemonUrl override — replaces DEFAULT_DAEMON_URL in fetch URL', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ sessions: [] }) });
    const client = new HttpSessionListClient({
      daemonUrl: 'http://daemon.example:9999',
      token: 't',
    });
    await client.listSessions();
    const url = fetchSpy.mock.calls[0]![0];
    expect(String(url)).toBe('http://daemon.example:9999/v2/sessions');
  });

  it('falls back to null token when readFileSync throws (token-file absent)', async () => {
    fsMocks.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const client = new HttpSessionListClient();
    await expect(client.listSessions()).rejects.toMatchObject({
      error_type: 'DaemonUnreachable',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('HttpSessionListClient.listSessions — happy path', () => {
  it('GETs /v2/sessions with token header and returns the parsed body', async () => {
    const body = {
      sessions: [
        { name: 'alpha', state: 'armed' },
        { name: 'beta', state: 'archived' },
      ],
    };
    fetchSpy.mockResolvedValue({ ok: true, json: async () => body });
    const client = new HttpSessionListClient({ token: 't' });
    const result = await client.listSessions();
    expect(result).toEqual(body);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toMatch(/\/v2\/sessions$/);
    expect((init as RequestInit).headers).toMatchObject({
      'X-Conductor-Token': 't',
    });
  });
});

describe('HttpSessionListClient.listSessions — DaemonUnreachable failure modes', () => {
  it('throws DaemonUnreachable when token is null (no fetch invoked)', async () => {
    const client = new HttpSessionListClient({ token: null });
    await expect(client.listSessions()).rejects.toMatchObject({
      error_type: 'DaemonUnreachable',
      message: expect.stringContaining('Daemon token not found'),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws DaemonUnreachable when fetch throws (network error)', async () => {
    // KNOWN: §6.5 — daemon-unreachable failures propagate as-is to
    // spawn-handler, which wraps them. Original error message is
    // included in the envelope for operator-visible debugging.
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));
    const client = new HttpSessionListClient({ token: 't' });
    await expect(client.listSessions()).rejects.toMatchObject({
      error_type: 'DaemonUnreachable',
      message: expect.stringContaining('fetch failed'),
    });
  });

  it('throws DaemonUnreachable when daemon returns non-ok HTTP status', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 503 });
    const client = new HttpSessionListClient({ token: 't' });
    await expect(client.listSessions()).rejects.toMatchObject({
      error_type: 'DaemonUnreachable',
      message: expect.stringContaining('HTTP 503'),
    });
  });
});
