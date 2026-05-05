// test-batch-1 Session B — console-ipc.ts coverage gap closure (Tier 1).
//
// Per operator scope decision §4, console-ipc.ts is SCOPE-REDUCED to
// ship-gate-proximate paths only. In scope: error paths in IPC handlers
// + happy-path IPC flows. Out of scope (intentional gap, documented in
// audit doc §6): WebSocket reconnection edge cases, panel cap edge cases
// (already covered in console-t02/console-t03).
//
// This spec covers HttpConsoleDaemonClient — the production daemon HTTP
// client used for stdin and signal POSTs. The class is uncovered at
// pre-state (lines 305-366 in console-ipc.ts).
//
// KNOWN: §4.7 contract — sendStdin and sendSignal POST to v3 endpoints
// with X-Conductor-Token header (when token present) and JSON bodies.
// Non-ok response throws an Error with message including HTTP status —
// caller (controller / renderer) surfaces as console:error.
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

const fsMocks = vi.hoisted(() => ({
  readFileSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  readFileSync: fsMocks.readFileSync,
}));

import { HttpConsoleDaemonClient } from '../../../src/main/console-ipc.js';

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

describe('HttpConsoleDaemonClient — constructor + token resolution', () => {
  it('reads token from ~/.foxworks-dispatch/token when no opts.token override is provided', async () => {
    const client = new HttpConsoleDaemonClient();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ accepted: true, stdin_seq: 1 }),
    });
    await client.sendStdin('alpha', 'hello', 'utf8');
    expect(fsMocks.readFileSync).toHaveBeenCalledTimes(1);
    const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers['X-Conductor-Token']).toBe('tok-default');
  });

  it('honors opts.token=null override (skips fs read, omits token header)', async () => {
    const client = new HttpConsoleDaemonClient({ token: null });
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ accepted: true, stdin_seq: 1 }),
    });
    await client.sendStdin('alpha', 'hello', 'utf8');
    expect(fsMocks.readFileSync).not.toHaveBeenCalled();
    // KNOWN: console-ipc.ts:331 spreads token header conditionally — when
    // token is null, the header key is absent entirely (not '' empty).
    const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers['X-Conductor-Token']).toBeUndefined();
  });

  it('honors opts.httpUrl + opts.wsUrl overrides for endpoint targeting', async () => {
    const client = new HttpConsoleDaemonClient({
      httpUrl: 'http://daemon.test:9000',
      wsUrl: 'ws://daemon.test:9000',
      token: 't',
    });
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ accepted: true, stdin_seq: 1 }),
    });
    await client.sendStdin('alpha', 'hello', 'utf8');
    const url = fetchSpy.mock.calls[0]![0];
    expect(String(url)).toBe(
      'http://daemon.test:9000/v3/sessions/alpha/console/stdin',
    );
    // streamUrl uses wsUrl
    expect(client.streamUrl('alpha')).toBe(
      'ws://daemon.test:9000/v3/sessions/alpha/console/stream?token=t',
    );
  });
});

describe('HttpConsoleDaemonClient.sendStdin', () => {
  it('POSTs JSON body with bytes + encoding and returns parsed StdinAck', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ accepted: true, stdin_seq: 42 }),
    });
    const client = new HttpConsoleDaemonClient({ token: 't' });
    const ack = await client.sendStdin('alpha', 'hi', 'utf8');
    expect(ack).toEqual({ accepted: true, stdin_seq: 42 });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe(
      'http://localhost:7878/v3/sessions/alpha/console/stdin',
    );
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      bytes: 'hi',
      encoding: 'utf8',
    });
  });

  it('URL-encodes session name (handles special characters)', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ accepted: true, stdin_seq: 1 }),
    });
    const client = new HttpConsoleDaemonClient({ token: 't' });
    await client.sendStdin('foo/bar baz', 'hi', 'utf8');
    const url = String(fetchSpy.mock.calls[0]![0]);
    expect(url).toBe(
      'http://localhost:7878/v3/sessions/foo%2Fbar%20baz/console/stdin',
    );
  });

  it('throws Error with HTTP status on non-ok daemon response', async () => {
    // KNOWN: error path is ship-gate-proximate — the renderer surfaces
    // a stdin send failure to the operator. Message format must include
    // HTTP status for debugging.
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'session not running',
    });
    const client = new HttpConsoleDaemonClient({ token: 't' });
    await expect(
      client.sendStdin('alpha', 'hi', 'utf8'),
    ).rejects.toThrow(/HTTP 422/);
  });

  it('throws Error with HTTP status even when error body text() throws (defensive .catch)', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.reject(new Error('body unreadable')),
    });
    const client = new HttpConsoleDaemonClient({ token: 't' });
    // KNOWN: console-ipc.ts:337 uses .text().catch(() => '') so the
    // throw-from-error-body path stays informative without a second
    // unhandled rejection.
    await expect(
      client.sendStdin('alpha', 'hi', 'utf8'),
    ).rejects.toThrow(/HTTP 500/);
  });
});

describe('HttpConsoleDaemonClient.sendSignal', () => {
  it('POSTs JSON body with signal and returns parsed SignalAck', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ accepted: true, dispatch_method: 'pty' }),
    });
    const client = new HttpConsoleDaemonClient({ token: 't' });
    const ack = await client.sendSignal('alpha', 'SIGINT');
    expect(ack).toEqual({ accepted: true, dispatch_method: 'pty' });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe(
      'http://localhost:7878/v3/sessions/alpha/console/signal',
    );
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      signal: 'SIGINT',
    });
  });

  it('throws Error with HTTP status on non-ok daemon response', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'session not found',
    });
    const client = new HttpConsoleDaemonClient({ token: 't' });
    await expect(client.sendSignal('alpha', 'SIGTERM')).rejects.toThrow(
      /HTTP 404/,
    );
  });
});

describe('HttpConsoleDaemonClient.streamUrl', () => {
  it('appends ?token=<encoded> when token is present', () => {
    const client = new HttpConsoleDaemonClient({ token: 'abc&xyz' });
    const url = client.streamUrl('alpha');
    expect(url).toBe(
      'ws://localhost:7878/v3/sessions/alpha/console/stream?token=abc%26xyz',
    );
  });

  it('omits ?token query string entirely when token is null', () => {
    const client = new HttpConsoleDaemonClient({ token: null });
    const url = client.streamUrl('alpha');
    expect(url).toBe(
      'ws://localhost:7878/v3/sessions/alpha/console/stream',
    );
  });

  it('URL-encodes session name in stream URL', () => {
    const client = new HttpConsoleDaemonClient({ token: 't' });
    const url = client.streamUrl('foo bar');
    expect(url).toBe(
      'ws://localhost:7878/v3/sessions/foo%20bar/console/stream?token=t',
    );
  });
});
