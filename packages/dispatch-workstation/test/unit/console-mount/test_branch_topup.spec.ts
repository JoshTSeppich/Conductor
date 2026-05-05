// test-batch-1 Session B — console-mount.ts branch-only top-up (Tier 1).
//
// Pre-state: stmt 86.07% / branch 71.42% / func 92.85% / line 100.00%.
// Branch coverage was the only sub-80% axis. Existing fix-console-trigger/
// test_menu_subscription.spec.ts covers the happy paths and the WS bootstrap
// fallback, but several defensive branches in pickActiveSessionNames + the
// disposed-mid-flight guards in refetchAndRefresh / scheduleRefetch /
// openSocket / dispose were uncovered.
//
// Coverage report identified 12 uncovered branches at lines 144, 146, 149,
// 152, 162 (debounceMs default), 168, 173, 174, 176, 185, 194, 226.
//
// This spec exercises those branches via:
//   - bootstrap fetch with malformed daemon responses to drive
//     pickActiveSessionNames defensive branches
//   - refetchAndRefresh non-ok response branch (line 174)
//   - debounceMs default branch (line 162)
//   - dispose idempotency (line 226)
//
// KNOWN: subscribeConsoleMenuToDaemon's defensive branches matter because
// the daemon is an external service. Malformed responses must NOT crash
// the workstation; they must leave the menu in its last-known state.
import { describe, it, expect, vi } from 'vitest';
import { subscribeConsoleMenuToDaemon } from '../../../src/main/console-mount.js';

interface FakeWebSocket {
  on: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

function makeFakeWs(): FakeWebSocket {
  return {
    on: vi.fn(),
    close: vi.fn(),
  };
}

async function flushMicrotasks(): Promise<void> {
  // Allow the bootstrap fetch's promise chain to resolve into refreshMenu.
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe('console-mount.ts branch-only top-up — pickActiveSessionNames defensives', () => {
  it('refreshMenu([]) when bootstrap response body is null (line 144 branch)', async () => {
    const refreshMenu = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => null,
    });
    const dispose = subscribeConsoleMenuToDaemon({
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 't',
      fetchImpl,
      wsFactory: () => makeFakeWs() as never,
      refreshMenu,
      debounceMs: 50,
    });
    await flushMicrotasks();
    expect(refreshMenu).toHaveBeenCalledWith([]);
    dispose();
  });

  it('refreshMenu([]) when sessions field is not an array (line 146 branch)', async () => {
    const refreshMenu = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ sessions: 'not-an-array' }),
    });
    const dispose = subscribeConsoleMenuToDaemon({
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 't',
      fetchImpl,
      wsFactory: () => makeFakeWs() as never,
      refreshMenu,
      debounceMs: 50,
    });
    await flushMicrotasks();
    expect(refreshMenu).toHaveBeenCalledWith([]);
    dispose();
  });

  it('skips invalid entries (null/non-object/no name/empty name) but keeps valid ones', async () => {
    // KNOWN: lines 149 (entry guard) + 152 (name guard) — defensive
    // filtering against malformed daemon entries. Whitelist survives:
    // every entry that fails any check is dropped, valid entries pass.
    const refreshMenu = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        sessions: [
          null,
          'string-not-object',
          { name: 123 },
          { name: '' },
          { name: 'valid-1', state: 'armed' },
          { name: 'valid-2' },
          { name: 'killed-one', state: 'killed' },
          { name: 'archived-one', state: 'archived' },
        ],
      }),
    });
    const dispose = subscribeConsoleMenuToDaemon({
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 't',
      fetchImpl,
      wsFactory: () => makeFakeWs() as never,
      refreshMenu,
      debounceMs: 50,
    });
    await flushMicrotasks();
    expect(refreshMenu).toHaveBeenCalledWith(['valid-1', 'valid-2']);
    dispose();
  });
});

describe('console-mount.ts branch-only top-up — refetchAndRefresh non-ok branch', () => {
  it('does NOT call refreshMenu when daemon responds non-ok (line 174 branch)', async () => {
    // KNOWN: per refinement (a) — daemon-unreachable / non-ok responses
    // leave the menu in its last-known state. The bootstrap fetch's
    // !res.ok branch must early-return without invoking refreshMenu.
    const refreshMenu = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    const dispose = subscribeConsoleMenuToDaemon({
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 't',
      fetchImpl,
      wsFactory: () => makeFakeWs() as never,
      refreshMenu,
      debounceMs: 50,
    });
    await flushMicrotasks();
    expect(refreshMenu).not.toHaveBeenCalled();
    dispose();
  });
});

describe('console-mount.ts branch-only top-up — debounceMs default branch', () => {
  it('uses DEFAULT_DEBOUNCE_MS (150) when deps.debounceMs is omitted (line 162 nullish-coalesce)', async () => {
    // KNOWN: existing tests always pass debounceMs explicitly to keep
    // them fast. This test omits it to exercise the default branch.
    // We do not need to wait the full 150ms; we just need the bootstrap
    // call to complete to confirm the SUT accepts the omission.
    const refreshMenu = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ sessions: [{ name: 'alpha' }] }),
    });
    const dispose = subscribeConsoleMenuToDaemon({
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 't',
      fetchImpl,
      wsFactory: () => makeFakeWs() as never,
      refreshMenu,
      // debounceMs intentionally omitted
    });
    await flushMicrotasks();
    expect(refreshMenu).toHaveBeenCalledWith(['alpha']);
    dispose();
  });
});

describe('console-mount.ts branch-only top-up — dispose idempotency', () => {
  it('second dispose call is a no-op (line 226 disposed guard)', async () => {
    // KNOWN: dispose returns early on the second call so cleanup
    // (timer, socket close) does not run twice. Asserting socket.close
    // is called exactly once across two dispose() calls confirms
    // idempotency.
    const refreshMenu = vi.fn();
    const fakeWs = makeFakeWs();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ sessions: [] }),
    });
    const dispose = subscribeConsoleMenuToDaemon({
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 't',
      fetchImpl,
      wsFactory: () => fakeWs as never,
      refreshMenu,
      debounceMs: 50,
    });
    await flushMicrotasks();
    dispose();
    dispose();
    expect(fakeWs.close).toHaveBeenCalledTimes(1);
  });
});

describe('console-mount.ts branch-only top-up — disposed-mid-flight guards', () => {
  it('refetchAndRefresh stops calling refreshMenu when dispose runs before fetch resolves', async () => {
    // KNOWN: lines 168/173/176 — the SUT checks `if (disposed)` at three
    // checkpoints inside refetchAndRefresh because each await suspends
    // execution and dispose may have run during that gap. Without these
    // guards, a late refresh could fire after the controller intends to
    // be quiet.
    const refreshMenu = vi.fn();
    let resolveFetch: (v: unknown) => void = () => {};
    const fetchPromise = new Promise<unknown>((r) => {
      resolveFetch = r;
    });
    const fetchImpl = vi.fn().mockReturnValue(fetchPromise);
    const dispose = subscribeConsoleMenuToDaemon({
      httpUrl: 'http://localhost:7878',
      wsUrl: 'ws://localhost:7878',
      token: 't',
      fetchImpl: fetchImpl as never,
      wsFactory: () => makeFakeWs() as never,
      refreshMenu,
      debounceMs: 50,
    });
    // Fetch is in flight; dispose now.
    dispose();
    // Now resolve the fetch — disposed guard at line 173 must prevent
    // refreshMenu invocation.
    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({ sessions: [{ name: 'alpha' }] }),
    });
    await flushMicrotasks();
    expect(refreshMenu).not.toHaveBeenCalled();
  });
});
