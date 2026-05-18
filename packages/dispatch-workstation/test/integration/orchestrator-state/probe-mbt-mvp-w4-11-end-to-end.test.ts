// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB12 — probe-11:
// end-to-end integration probe.
//
// Wires the full read-side aggregator pipeline against deterministic
// stubs:
//
//   StubDaemon (fake listSessions client)
//     ↓
//   createOrchestratorSessionsSourcePoll (WB4)
//     ↓
//   createOrchestratorStateAggregator (WB3) with null buildMd/pause/
//     narration sources + initialPaused/initialMessages/initialAttached
//     seeded
//     ↓
//   createDefaultOrchestratorStateIpcController (WB8)
//     ↓
//   Fake ipcMain + recording broadcast spy
//     ↓
//   Renderer-side subscription (direct broadcast inspection)
//
// Assertions:
//   - aggregator.start() triggers initial poll within poll-cadence
//   - First successful poll generates first broadcast with derived
//     snapshot
//   - snapshot.seq increments on state change
//   - Dedup holds across identical re-emissions (no spurious
//     broadcasts when source emits identical content)
//   - Broadcast fans out exactly once per state change
//   - Channel constants match §6.6 frozen names

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import {
  createOrchestratorStateAggregator,
  createNullBuildMdSource,
  createNullPauseSource,
  createNullNarrationSource,
} from '../../../src/main/orchestrator-state-aggregator.js';
import {
  createOrchestratorSessionsSourcePoll,
  type OrchestratorListClient,
} from '../../../src/main/orchestrator-state-source-poll.js';
import {
  CHANNEL_GET_SNAPSHOT,
  CHANNEL_UPDATE,
  createDefaultOrchestratorStateIpcController,
  type OrchestratorStateIpcMain,
} from '../../../src/main/orchestrator-state-ipc.js';
import type { OrchestratorStateSnapshot } from '../../../src/main/orchestrator-state-types.js';

// ─── Stub daemon (list-client) ──────────────────────────────────────

interface ListResponse {
  readonly sessions: ReadonlyArray<{
    readonly name: string;
    readonly state?: string;
    readonly computed_status?: string;
  }>;
}

interface StubDaemon extends OrchestratorListClient {
  setResponse(r: ListResponse | Error): void;
  callCount(): number;
}

function makeStubDaemon(initial: ListResponse): StubDaemon {
  let next: ListResponse | Error = initial;
  let calls = 0;
  return {
    listSessions(): Promise<ListResponse> {
      calls += 1;
      if (next instanceof Error) return Promise.reject(next);
      return Promise.resolve(next);
    },
    setResponse(r) {
      next = r;
    },
    callCount() {
      return calls;
    },
  };
}

// ─── Stub ipcMain ────────────────────────────────────────────────────

interface RecordedHandler {
  channel: string;
  fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown;
}

function makeFakeIpcMain(): {
  ipcMain: OrchestratorStateIpcMain;
  handlers: RecordedHandler[];
} {
  const handlers: RecordedHandler[] = [];
  return {
    ipcMain: {
      handle: (channel, fn) => {
        handlers.push({ channel, fn });
      },
    },
    handlers,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

// ─── E2E test ────────────────────────────────────────────────────────

describe('MB-T-MVP-W4 probe-11 — orchestrator-state end-to-end integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function buildPipeline(opts: {
    initialResponse: ListResponse;
    initialPaused?: boolean;
  }): {
    daemon: StubDaemon;
    aggregator: ReturnType<typeof createOrchestratorStateAggregator>;
    handlers: RecordedHandler[];
    broadcasts: Array<{ channel: string; snapshot: OrchestratorStateSnapshot }>;
    disposeIpc: () => void;
  } {
    const daemon = makeStubDaemon(opts.initialResponse);
    const sessionsSource = createOrchestratorSessionsSourcePoll({
      listClient: daemon,
      // Deterministic nowIso for snapshot.polledAt comparisons.
      nowIso: (() => {
        let n = 0;
        return () => {
          n += 1;
          return `2026-05-18T17:00:0${n}.000Z`;
        };
      })(),
    });
    const aggregator = createOrchestratorStateAggregator({
      sessionsSource,
      buildMdSource: createNullBuildMdSource(),
      pauseSource: createNullPauseSource(),
      narrationSource: createNullNarrationSource(),
      initialPaused: opts.initialPaused ?? false,
      initialMessages: [],
      initialAttached: null,
    });
    const broadcasts: Array<{
      channel: string;
      snapshot: OrchestratorStateSnapshot;
    }> = [];
    const { ipcMain, handlers } = makeFakeIpcMain();
    const ipcController = createDefaultOrchestratorStateIpcController({
      aggregator,
      broadcast: (channel, snapshot) => {
        broadcasts.push({ channel, snapshot });
      },
    });
    const disposeIpc = ipcController.registerHandlers(ipcMain);
    return { daemon, aggregator, handlers, broadcasts, disposeIpc };
  }

  it('Channel #8 handler is registered with §6.6 frozen channel name', () => {
    const { handlers, disposeIpc, aggregator } = buildPipeline({
      initialResponse: { sessions: [] },
    });
    expect(handlers).toHaveLength(1);
    expect(handlers[0]!.channel).toBe(CHANNEL_GET_SNAPSHOT);
    expect(CHANNEL_GET_SNAPSHOT).toBe('orchestrator-state:get-snapshot');
    disposeIpc();
    aggregator.stop();
  });

  it('aggregator.start() triggers initial poll → broadcast within cadence window', async () => {
    const { daemon, aggregator, broadcasts, disposeIpc } = buildPipeline({
      initialResponse: {
        sessions: [{ name: 's1', computed_status: 'running' }],
      },
    });
    aggregator.start();
    await flushPromises();
    // Initial poll fires synchronously (sessionsSource.start kicks off poll
    // without waiting for first interval).
    expect(daemon.callCount()).toBe(1);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]!.channel).toBe(CHANNEL_UPDATE);
    expect(broadcasts[0]!.snapshot.sessions).toEqual([
      { name: 's1', computed_status: 'running' },
    ]);
    expect(broadcasts[0]!.snapshot.daemonReachable).toBe(true);
    disposeIpc();
    aggregator.stop();
  });

  it('seq increments on state change between snapshots', async () => {
    const { daemon, aggregator, broadcasts, disposeIpc } = buildPipeline({
      initialResponse: { sessions: [{ name: 's1' }] },
    });
    aggregator.start();
    await flushPromises();
    const seq0 = broadcasts[0]!.snapshot.seq;
    // Update daemon response; advance cadence.
    daemon.setResponse({
      sessions: [
        { name: 's1', computed_status: 'running' },
        { name: 's2' },
      ],
    });
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(broadcasts.length).toBeGreaterThan(1);
    const seq1 = broadcasts[broadcasts.length - 1]!.snapshot.seq;
    expect(seq1).toBeGreaterThan(seq0);
  });

  it('dedup: identical re-emissions do not generate spurious broadcasts', async () => {
    const { daemon, aggregator, broadcasts, disposeIpc } = buildPipeline({
      initialResponse: {
        sessions: [{ name: 's1', computed_status: 'running' }],
      },
    });
    aggregator.start();
    await flushPromises();
    const initialBroadcastCount = broadcasts.length;
    // Daemon returns identical content on 3 consecutive polls.
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(daemon.callCount()).toBe(4); // 1 initial + 3 cadence
    // Source-level + aggregator-level dedup ensures no additional
    // broadcasts fired.
    expect(broadcasts.length).toBe(initialBroadcastCount);
    disposeIpc();
    aggregator.stop();
  });

  it('daemon failure → daemonReachable=false snapshot + broadcast fires', async () => {
    const { daemon, aggregator, broadcasts, disposeIpc } = buildPipeline({
      initialResponse: { sessions: [{ name: 's1' }] },
    });
    aggregator.start();
    await flushPromises();
    expect(broadcasts[0]!.snapshot.daemonReachable).toBe(true);

    daemon.setResponse(new Error('daemon down'));
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    const lastBroadcast = broadcasts[broadcasts.length - 1]!.snapshot;
    expect(lastBroadcast.daemonReachable).toBe(false);
    disposeIpc();
    aggregator.stop();
  });

  it('Channel #8 invoke handler returns current aggregator snapshot', async () => {
    const { handlers, aggregator, disposeIpc } = buildPipeline({
      initialResponse: {
        sessions: [{ name: 's1', computed_status: 'running' }],
      },
    });
    aggregator.start();
    await flushPromises();
    const snapshot = (await handlers[0]!.fn({})) as OrchestratorStateSnapshot;
    expect(snapshot.sessions).toEqual([
      { name: 's1', computed_status: 'running' },
    ]);
    expect(snapshot.daemonReachable).toBe(true);
    disposeIpc();
    aggregator.stop();
  });

  it('initial state seeded from initialPaused dep', async () => {
    const { handlers, aggregator, disposeIpc } = buildPipeline({
      initialResponse: { sessions: [] },
      initialPaused: true,
    });
    // Before start() the cached snapshot reflects initial deps.
    const snapshot = (await handlers[0]!.fn({})) as OrchestratorStateSnapshot;
    expect(snapshot.paused).toBe(true);
    disposeIpc();
    aggregator.stop();
  });

  it('dispose tears down broadcast subscription; emissions stop reaching broadcast', async () => {
    const { daemon, aggregator, broadcasts, disposeIpc } = buildPipeline({
      initialResponse: { sessions: [{ name: 's1' }] },
    });
    aggregator.start();
    await flushPromises();
    expect(broadcasts.length).toBe(1);
    disposeIpc();
    // After dispose, even genuine state changes don't reach broadcast.
    daemon.setResponse({
      sessions: [{ name: 's1', computed_status: 'running' }],
    });
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(broadcasts.length).toBe(1);
    aggregator.stop();
  });

  it('CHANNEL_UPDATE constant matches §6.6 frozen name', () => {
    expect(CHANNEL_UPDATE).toBe('orchestrator-state:update');
  });

  it('multi-step session lifecycle E2E — boot → poll → change → dedup → broadcast', async () => {
    const { daemon, aggregator, broadcasts, handlers, disposeIpc } =
      buildPipeline({
        initialResponse: { sessions: [] },
      });
    // Step 1: boot snapshot (pre-start) — sessions empty + polledAt null.
    const boot = (await handlers[0]!.fn({})) as OrchestratorStateSnapshot;
    expect(boot.sessions).toEqual([]);
    expect(boot.polledAt).toBeNull();
    expect(boot.daemonReachable).toBe(false);

    // Step 2: start aggregator → first poll → broadcast.
    aggregator.start();
    await flushPromises();
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]!.snapshot.daemonReachable).toBe(true);
    const afterStart = (await handlers[0]!.fn({})) as OrchestratorStateSnapshot;
    expect(afterStart.daemonReachable).toBe(true);

    // Step 3: session count changes → new broadcast with incremented seq.
    daemon.setResponse({
      sessions: [{ name: 's1', computed_status: 'running' }],
    });
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(broadcasts.length).toBeGreaterThan(1);
    const seqAfterChange =
      broadcasts[broadcasts.length - 1]!.snapshot.seq;
    expect(seqAfterChange).toBeGreaterThan(broadcasts[0]!.snapshot.seq);
    expect(
      broadcasts[broadcasts.length - 1]!.snapshot.sessions,
    ).toEqual([{ name: 's1', computed_status: 'running' }]);

    // Step 4: identical re-emission → no new broadcast.
    const broadcastCountBeforeStasis = broadcasts.length;
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(broadcasts.length).toBe(broadcastCountBeforeStasis);

    // Step 5: another change → broadcast resumes.
    daemon.setResponse({
      sessions: [
        { name: 's1', computed_status: 'idle' },
        { name: 's2', computed_status: 'running' },
      ],
    });
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(broadcasts.length).toBeGreaterThan(broadcastCountBeforeStasis);

    disposeIpc();
    aggregator.stop();
  });
});
