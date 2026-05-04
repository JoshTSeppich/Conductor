// Fix-C / cairn finding #82 — Cluster 1 RED.
//
// Closes the operator-trigger gap diagnosed in cairn-findings #82 +
// FOLLOWUPS.md MB-F-CONSOLE-T03-MENU-SUBSCRIPTION. main.ts:200 ships
// refreshConsoleMenu([]) hardcoded; the menu therefore enumerates as
// "No sessions registered" forever even when the daemon has dozens of
// armed sessions.
//
// Hybrid pattern (operator-arbitrated 2026-05-04): bootstrap GET
// /v2/sessions for initial population + WS /v2/events/stream as a
// "something changed → refetch" trigger. Daemon does not emit
// session_created/session_removed (filed as cairn finding #88) so a
// pure event-driven consumer is impossible at this daemon HEAD.
//
// Public surface (KNOWN):
//   subscribeConsoleMenuToDaemon(deps): () => void
//     deps:
//       fetchImpl(url, init?) → Response-like with .ok / .json()
//       wsFactory(url) → ConsoleMountWebSocket
//       httpUrl, wsUrl, token: string
//       refreshMenu(sessions: readonly string[]): void
//       debounceMs?: number   // default 150
//   returns dispose() that closes the WS and cancels pending refetches.
//
// RED state: subscribeConsoleMenuToDaemon does not yet exist in
// console-mount.ts → import fails → spec fails.
import { describe, it, expect, vi } from 'vitest';
import {
  subscribeConsoleMenuToDaemon,
  type ConsoleMountWebSocket,
  type SubscribeConsoleMenuDeps,
} from '../../../src/main/console-mount.js';

// ── Fakes ────────────────────────────────────────────────────────────────

interface FakeWs extends ConsoleMountWebSocket {
  url: string;
  emitMessage(raw: string): void;
  emitClose(code: number): void;
  closed: boolean;
}

function makeFakeWs(url: string): FakeWs {
  const handlers = {
    open: [] as Array<() => void>,
    message: [] as Array<(d: string) => void>,
    close: [] as Array<(c: number, r: string) => void>,
    error: [] as Array<(e: Error) => void>,
  };
  return {
    url,
    closed: false,
    on(event, cb) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handlers as any)[event].push(cb);
    },
    close() {
      this.closed = true;
      handlers.close.forEach((h) => h(1000, 'operator'));
    },
    emitMessage(raw: string) {
      handlers.message.forEach((h) => h(raw));
    },
    emitClose(code: number) {
      handlers.close.forEach((h) => h(code, 'fake'));
    },
  };
}

interface FakeFetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

interface FetchCall {
  url: string;
  init?: { headers?: Record<string, string> };
}

interface FetchHarness {
  calls: FetchCall[];
  enqueue: (body: unknown) => void;
  fetchImpl: (url: string, init?: { headers?: Record<string, string> }) => Promise<FakeFetchResponse>;
}

function makeFetchHarness(): FetchHarness {
  const queue: unknown[] = [];
  const calls: FetchCall[] = [];
  return {
    calls,
    enqueue(body) {
      queue.push(body);
    },
    async fetchImpl(url, init) {
      calls.push({ url, init });
      const body = queue.shift();
      if (body === undefined) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => body };
    },
  };
}

function sessionsResponse(names: readonly string[]): unknown {
  return {
    sessions: names.map((name) => ({
      name,
      cwd: '/tmp/x',
      tmux_target: `${name}:0.0`,
      handoff_path: `/tmp/x/${name}/HANDOFF.md`,
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
      computed_status: 'idle',
    })),
  };
}

function sessionsResponseWithStates(
  entries: ReadonlyArray<{ name: string; state: string }>,
): unknown {
  return {
    sessions: entries.map((e) => ({
      name: e.name,
      cwd: '/tmp/x',
      tmux_target: `${e.name}:0.0`,
      handoff_path: `/tmp/x/${e.name}/HANDOFF.md`,
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: e.state,
      last_commit_sha: null,
      last_status_json_at: null,
      computed_status: 'idle',
    })),
  };
}

// Drains the microtask queue so awaited fetch promises settle.
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Fix-C #82 — subscribeConsoleMenuToDaemon', () => {
  it('bootstrap-fetches /v2/sessions and refreshes menu with active session names', async () => {
    vi.useFakeTimers();
    const refreshMenu = vi.fn();
    const fetchH = makeFetchHarness();
    fetchH.enqueue(sessionsResponse(['alpha', 'beta']));

    const wsList: FakeWs[] = [];
    const deps: SubscribeConsoleMenuDeps = {
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 'TEST-TOKEN',
      fetchImpl: fetchH.fetchImpl,
      wsFactory: (url) => {
        const w = makeFakeWs(url);
        wsList.push(w);
        return w;
      },
      refreshMenu,
      debounceMs: 50,
    };

    const dispose = subscribeConsoleMenuToDaemon(deps);
    await settle();

    expect(fetchH.calls.length).toBeGreaterThanOrEqual(1);
    expect(fetchH.calls[0].url).toBe('http://localhost:7878/v2/sessions');
    expect(fetchH.calls[0].init?.headers?.['X-Conductor-Token']).toBe('TEST-TOKEN');
    expect(refreshMenu).toHaveBeenCalledWith(['alpha', 'beta']);

    dispose();
    vi.useRealTimers();
  });

  it('filters killed and archived sessions from menu population', async () => {
    vi.useFakeTimers();
    const refreshMenu = vi.fn();
    const fetchH = makeFetchHarness();
    fetchH.enqueue(
      sessionsResponseWithStates([
        { name: 'alpha', state: 'armed' },
        { name: 'beta', state: 'killed' },
        { name: 'gamma', state: 'archived' },
        { name: 'delta', state: 'held' },
      ]),
    );

    const deps: SubscribeConsoleMenuDeps = {
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 'TEST-TOKEN',
      fetchImpl: fetchH.fetchImpl,
      wsFactory: (url) => makeFakeWs(url),
      refreshMenu,
      debounceMs: 50,
    };

    const dispose = subscribeConsoleMenuToDaemon(deps);
    await settle();

    expect(refreshMenu).toHaveBeenCalledWith(['alpha', 'delta']);
    dispose();
    vi.useRealTimers();
  });

  it('refetches /v2/sessions when WS emits an event, after debounce window', async () => {
    vi.useFakeTimers();
    const refreshMenu = vi.fn();
    const fetchH = makeFetchHarness();
    fetchH.enqueue(sessionsResponse(['alpha']));
    fetchH.enqueue(sessionsResponse(['alpha', 'beta']));

    const wsList: FakeWs[] = [];
    const deps: SubscribeConsoleMenuDeps = {
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 'TEST-TOKEN',
      fetchImpl: fetchH.fetchImpl,
      wsFactory: (url) => {
        const w = makeFakeWs(url);
        wsList.push(w);
        return w;
      },
      refreshMenu,
      debounceMs: 100,
    };

    const dispose = subscribeConsoleMenuToDaemon(deps);
    await settle();
    expect(refreshMenu).toHaveBeenLastCalledWith(['alpha']);
    expect(wsList.length).toBe(1);

    // Daemon emits a state_changed event for a newly armed session.
    wsList[0].emitMessage(
      JSON.stringify({
        type: 'state_changed',
        timestamp: '2026-05-04T00:00:00.000Z',
        session: 'beta',
        data: { from: 'armed', to: 'armed', triggered_by: 'operator' },
      }),
    );

    // Before the debounce window expires, no extra refetch.
    expect(fetchH.calls.length).toBe(1);

    // Advance past the debounce window. The refetch fires.
    await vi.advanceTimersByTimeAsync(150);
    await settle();

    expect(fetchH.calls.length).toBe(2);
    expect(refreshMenu).toHaveBeenLastCalledWith(['alpha', 'beta']);

    dispose();
    vi.useRealTimers();
  });

  it('debounces a burst of WS events into a single refetch', async () => {
    vi.useFakeTimers();
    const refreshMenu = vi.fn();
    const fetchH = makeFetchHarness();
    fetchH.enqueue(sessionsResponse(['alpha']));
    fetchH.enqueue(sessionsResponse(['alpha', 'beta', 'gamma']));

    const wsList: FakeWs[] = [];
    const deps: SubscribeConsoleMenuDeps = {
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 'TEST-TOKEN',
      fetchImpl: fetchH.fetchImpl,
      wsFactory: (url) => {
        const w = makeFakeWs(url);
        wsList.push(w);
        return w;
      },
      refreshMenu,
      debounceMs: 100,
    };

    const dispose = subscribeConsoleMenuToDaemon(deps);
    await settle();
    const initialCalls = fetchH.calls.length;

    // Five rapid-fire events (batched transitions).
    for (let i = 0; i < 5; i += 1) {
      wsList[0].emitMessage(
        JSON.stringify({
          type: 'state_changed',
          timestamp: `2026-05-04T00:00:00.00${i}Z`,
          session: `beta`,
          data: { from: 'armed', to: 'armed', triggered_by: 'operator' },
        }),
      );
      await vi.advanceTimersByTimeAsync(20);
    }

    // Still inside debounce → no refetch yet.
    expect(fetchH.calls.length).toBe(initialCalls);

    // Quiet window elapses.
    await vi.advanceTimersByTimeAsync(120);
    await settle();

    // Exactly one additional refetch.
    expect(fetchH.calls.length).toBe(initialCalls + 1);
    expect(refreshMenu).toHaveBeenLastCalledWith(['alpha', 'beta', 'gamma']);

    dispose();
    vi.useRealTimers();
  });

  it('survives WS connection failure: bootstrap fetch still populates menu', async () => {
    vi.useFakeTimers();
    const refreshMenu = vi.fn();
    const fetchH = makeFetchHarness();
    fetchH.enqueue(sessionsResponse(['alpha', 'beta']));

    const deps: SubscribeConsoleMenuDeps = {
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 'TEST-TOKEN',
      fetchImpl: fetchH.fetchImpl,
      wsFactory: () => {
        throw new Error('WS unreachable');
      },
      refreshMenu,
      debounceMs: 50,
    };

    // Must not throw out of subscribe; bootstrap path still fires.
    const dispose = subscribeConsoleMenuToDaemon(deps);
    await settle();

    expect(refreshMenu).toHaveBeenCalledWith(['alpha', 'beta']);

    dispose();
    vi.useRealTimers();
  });

  it('dispose closes the WS and cancels pending debounced refetch', async () => {
    vi.useFakeTimers();
    const refreshMenu = vi.fn();
    const fetchH = makeFetchHarness();
    fetchH.enqueue(sessionsResponse(['alpha']));
    // No second body queued — if a stray refetch fires after dispose
    // it will produce an ok:false response, which we assert on by
    // counting fetch calls.

    const wsList: FakeWs[] = [];
    const deps: SubscribeConsoleMenuDeps = {
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 'TEST-TOKEN',
      fetchImpl: fetchH.fetchImpl,
      wsFactory: (url) => {
        const w = makeFakeWs(url);
        wsList.push(w);
        return w;
      },
      refreshMenu,
      debounceMs: 100,
    };

    const dispose = subscribeConsoleMenuToDaemon(deps);
    await settle();

    // Fire an event, then dispose before the debounce window expires.
    wsList[0].emitMessage(
      JSON.stringify({
        type: 'state_changed',
        timestamp: '2026-05-04T00:00:00.000Z',
        session: 'alpha',
        data: { from: 'armed', to: 'held', triggered_by: 'operator' },
      }),
    );
    dispose();
    await vi.advanceTimersByTimeAsync(200);
    await settle();

    expect(wsList[0].closed).toBe(true);
    // Bootstrap was the only fetch; no refetch fired post-dispose.
    expect(fetchH.calls.length).toBe(1);

    vi.useRealTimers();
  });
});
