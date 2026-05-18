// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB4 — probe-03:
// daemon poll seam cadence + backoff + dedup.
//
// Verifies orchestrator-state-source-poll.ts behavior against the
// §6.6-frozen Channel #9 cadence contract:
//   - Default 3000ms cadence
//   - BACKOFF_CAP_MS = 12000ms hard cap
//   - On failure: cadence doubles (3 → 6 → 12 → 12...) up to cap
//   - On success: cadence resets to default
//   - Source-level dedup: only emit on sessions-content or daemon-
//     reachable change
//   - dispose() (stop()) prevents further polls + clears subscribers
//
// Uses vitest fake timers to deterministically advance the setTimeout
// loop. Pattern mirrors tile-grid/probe-mbtphase5-status-integration-
// 03-dispose.spec.tsx fake-timer-with-microtask-flush approach.

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import {
  createOrchestratorSessionsSourcePoll,
  BACKOFF_CAP_MS,
  type OrchestratorListClient,
} from '../../../src/main/orchestrator-state-source-poll.js';
import type { OrchestratorSessionLite } from '../../../src/main/orchestrator-state-types.js';

interface ListResponse {
  readonly sessions: ReadonlyArray<{
    readonly name: string;
    readonly state?: string;
    readonly computed_status?: string;
  }>;
}

interface FakeClient extends OrchestratorListClient {
  setNextResponse(r: ListResponse | Error): void;
  callCount(): number;
}

function makeFakeClient(initial: ListResponse): FakeClient {
  let next: ListResponse | Error = initial;
  let calls = 0;
  return {
    listSessions(): Promise<ListResponse> {
      calls += 1;
      if (next instanceof Error) {
        return Promise.reject(next);
      }
      return Promise.resolve(next);
    },
    setNextResponse(r: ListResponse | Error): void {
      next = r;
    },
    callCount(): number {
      return calls;
    },
  };
}

async function flushPromises(): Promise<void> {
  // Allow any pending microtasks (resolved listSessions promises)
  // to drain before the next timer advance.
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

describe('MB-T-MVP-W4 probe-03 — poll cadence / backoff / dedup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires initial poll on start() (no wait for first interval)', async () => {
    const client = makeFakeClient({ sessions: [{ name: 's1' }] });
    const source = createOrchestratorSessionsSourcePoll({ listClient: client });
    const cb = vi.fn();
    source.onState(cb);
    expect(client.callCount()).toBe(0);
    source.start();
    await flushPromises();
    expect(client.callCount()).toBe(1);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]![0].sessions).toEqual([{ name: 's1' }]);
    expect(cb.mock.calls[0]![0].daemonReachable).toBe(true);
    source.stop();
  });

  it('schedules subsequent polls at default 3000ms cadence', async () => {
    const client = makeFakeClient({
      sessions: [{ name: 's1', computed_status: 'running' }],
    });
    const source = createOrchestratorSessionsSourcePoll({ listClient: client });
    source.onState(() => {});
    source.start();
    await flushPromises();
    expect(client.callCount()).toBe(1);
    // Tick advancement: after 3000ms the second poll fires.
    await vi.advanceTimersByTimeAsync(3000);
    expect(client.callCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(3000);
    expect(client.callCount()).toBe(3);
    source.stop();
  });

  it('dedups identical sessions content (only emits on change)', async () => {
    const client = makeFakeClient({
      sessions: [{ name: 's1', computed_status: 'running' }],
    });
    const source = createOrchestratorSessionsSourcePoll({ listClient: client });
    const cb = vi.fn();
    source.onState(cb);
    source.start();
    await flushPromises();
    expect(cb).toHaveBeenCalledTimes(1);
    // 3 more polls returning identical content → no additional emits.
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);
    expect(client.callCount()).toBe(4);
    expect(cb).toHaveBeenCalledTimes(1);
    // Now content changes — emit fires.
    client.setNextResponse({
      sessions: [{ name: 's1', computed_status: 'idle' }],
    });
    await vi.advanceTimersByTimeAsync(3000);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb.mock.calls[1]![0].sessions[0].computed_status).toBe('idle');
    source.stop();
  });

  it('emits daemonReachable=false on failure + doubles cadence', async () => {
    const client = makeFakeClient({ sessions: [{ name: 's1' }] });
    const source = createOrchestratorSessionsSourcePoll({ listClient: client });
    const cb = vi.fn();
    source.onState(cb);
    source.start();
    await flushPromises();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]![0].daemonReachable).toBe(true);

    // First failure: cadence still at 3000ms when scheduled; emit
    // fires with daemonReachable=false.
    client.setNextResponse(new Error('daemon down'));
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb.mock.calls[1]![0].daemonReachable).toBe(false);

    // Second failure: cadence now 6000ms; no fire at 3000ms.
    await vi.advanceTimersByTimeAsync(3000);
    expect(client.callCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(client.callCount()).toBe(3);
    // daemonReachable stays false; dedup keeps cb at 2.
    expect(cb).toHaveBeenCalledTimes(2);

    // Third failure: cadence doubles to 12000ms (cap).
    await vi.advanceTimersByTimeAsync(11999);
    expect(client.callCount()).toBe(3);
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(client.callCount()).toBe(4);

    source.stop();
  });

  it('caps backoff at BACKOFF_CAP_MS = 12000ms', async () => {
    expect(BACKOFF_CAP_MS).toBe(12000);
    const client = makeFakeClient({ sessions: [] });
    const source = createOrchestratorSessionsSourcePoll({ listClient: client });
    source.onState(() => {});
    source.start();
    await flushPromises();
    // Drive into consecutive-failure backoff.
    client.setNextResponse(new Error('down'));
    // Advance past several cadence doublings.
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(6000);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(12000);
    await flushPromises();
    const after3Failures = client.callCount();
    // Beyond cap, intervals stay at 12000ms — not 24000 or higher.
    await vi.advanceTimersByTimeAsync(12000);
    await flushPromises();
    expect(client.callCount()).toBe(after3Failures + 1);
    await vi.advanceTimersByTimeAsync(12000);
    await flushPromises();
    expect(client.callCount()).toBe(after3Failures + 2);
    source.stop();
  });

  it('resets cadence to default after success following failures', async () => {
    const client = makeFakeClient({ sessions: [] });
    const source = createOrchestratorSessionsSourcePoll({ listClient: client });
    source.onState(() => {});
    source.start();
    await flushPromises();
    // Force backoff via failures.
    client.setNextResponse(new Error('down'));
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(6000);
    await flushPromises();
    // Now succeed — cadence resets after this poll.
    client.setNextResponse({ sessions: [{ name: 's1' }] });
    await vi.advanceTimersByTimeAsync(12000);
    await flushPromises();
    const afterReset = client.callCount();
    // Next poll should fire at default 3000ms, not 12000ms.
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(client.callCount()).toBe(afterReset + 1);
    source.stop();
  });

  it('stop() halts further polls and clears subscribers', async () => {
    const client = makeFakeClient({ sessions: [{ name: 's1' }] });
    const source = createOrchestratorSessionsSourcePoll({ listClient: client });
    const cb = vi.fn();
    source.onState(cb);
    source.start();
    await flushPromises();
    expect(client.callCount()).toBe(1);
    source.stop();
    // Even after the next cadence window, no further polls fire.
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(client.callCount()).toBe(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('dispose returned from onState deregisters that subscriber only', async () => {
    const client = makeFakeClient({ sessions: [{ name: 's1' }] });
    const source = createOrchestratorSessionsSourcePoll({ listClient: client });
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const dispose1 = source.onState(cb1);
    source.onState(cb2);
    source.start();
    await flushPromises();
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    dispose1();
    client.setNextResponse({ sessions: [{ name: 's2' }] });
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(2);
    source.stop();
  });

  it('uses injected nowIso provider for polledAt (deterministic test)', async () => {
    const client = makeFakeClient({ sessions: [{ name: 's1' }] });
    let counter = 0;
    const nowIso = (): string => {
      counter += 1;
      return `2026-05-18T17:00:0${counter}.000Z`;
    };
    const source = createOrchestratorSessionsSourcePoll({
      listClient: client,
      nowIso,
    });
    const cb = vi.fn();
    source.onState(cb);
    source.start();
    await flushPromises();
    expect(cb.mock.calls[0]![0].polledAt).toBe('2026-05-18T17:00:01.000Z');
    client.setNextResponse({ sessions: [{ name: 's2' }] });
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(cb.mock.calls[1]![0].polledAt).toBe('2026-05-18T17:00:02.000Z');
    source.stop();
  });
});
