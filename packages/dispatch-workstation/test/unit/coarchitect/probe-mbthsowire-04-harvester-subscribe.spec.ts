// MB-T-HSO-WIRE WB4 (red) — PeerSummaryHarvester wiring contract probe.
//
// Asserts (per ticket §4 WB4 line 222-227):
//   probe-01: harvester subscribes to peer PTY observers via the
//             IConsoleBroadcaster.addStdoutObserver tap (MB-T37 contract,
//             console-ipc.ts:169 fan-out observer signature).
//   probe-02: harvester emits captured §7 summaries (`peer:turn-complete`)
//             on the SHARED dispatch-event emitter — the same instance that
//             SwarmStateWriter subscribes to at its constructor
//             (swarm-state-writer.ts:210 `emitter.on('peer:turn-complete', ...)`).
//   probe-03: subscription order: writer's `emitter.on(peer:turn-complete)`
//             precedes harvester's `broadcaster.addStdoutObserver(...)`.
//             Per plan §1.3 Obs-3: shared EventEmitter → writer → harvester.
//
// WB4 RED: `wireHsoSubsystem` module does not yet exist at HEAD `3c9629b`
//          (T2's WB3 GREEN creates it). All 3 probes fail at import resolution.
// WB5 GREEN: harvester wired into T2's WB3-introduced sentinel zone factory;
//            all 3 probes flip RED → GREEN.
//
// Speculative import (resolved at WB5 GREEN by reading T2's actual module
// name in src/main/ after WB3 lands on origin/main): module path + factory
// name mirror the `wirePtyRelay` / `pty-stream-relay.ts` precedent shipped at
// MB-T40 WB2-followup (`5aca470`). WB5 reconciles authorial deltas if any.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

import type {
  IConsoleBroadcaster,
  IPromptInjector,
} from '../../../src/coarchitect/peer-summary-harvester.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error WB4 RED: hso-wire module ships in WB3 GREEN; import resolves at WB5.
import { wireHsoSubsystem } from '../../../src/main/hso-wire.js';

const QUIESCENCE_MS = 100;
const TIMEOUT_MS = 500;
const RESPONSE_QUIESCENCE_MS = 25;

const VALID_SUMMARY_YAML = `peer_session: alpha
task: WB1
files_touched:
  - foo.ts
result: done
completion_status: complete
no_follow_up: true`;

describe('MB-T-HSO-WIRE WB4 — PeerSummaryHarvester wiring contract', () => {
  let emitter: EventEmitter;
  let capturedObserver: ((sessionName: string, chunk: string) => void) | undefined;
  let broadcaster: IConsoleBroadcaster;
  let addObserverSpy: ReturnType<typeof vi.fn>;
  let injectorSpy: ReturnType<typeof vi.fn>;
  let injector: IPromptInjector;

  beforeEach(() => {
    vi.useFakeTimers();
    emitter = new EventEmitter();
    capturedObserver = undefined;

    addObserverSpy = vi.fn((fn: (sessionName: string, chunk: string) => void) => {
      capturedObserver = fn;
      return () => { capturedObserver = undefined; };
    });
    broadcaster = { addStdoutObserver: addObserverSpy };

    injectorSpy = vi.fn().mockResolvedValue({ ok: true });
    injector = { handleSendPrompt: injectorSpy } as unknown as IPromptInjector;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function makeWired() {
    return wireHsoSubsystem({
      ptyBroadcaster: broadcaster,
      promptInjector: injector,
      stateEmitter: emitter,
      swarmStatePath: '/tmp/test-swarm-state.md',
      handoffDir: '/tmp/test-handoffs',
      quiescenceThresholdMs: QUIESCENCE_MS,
      awaitingResponseTimeoutMs: TIMEOUT_MS,
      responseQuiescenceMs: RESPONSE_QUIESCENCE_MS,
    });
  }

  // ─── Probe 01 ───────────────────────────────────────────────────────────────

  it('probe-01: harvester subscribes to peer PTY observers via IConsoleBroadcaster.addStdoutObserver', () => {
    const wired = makeWired();

    expect(addObserverSpy).toHaveBeenCalledTimes(1);
    expect(capturedObserver).toBeDefined();
    expect(typeof capturedObserver).toBe('function');

    wired.dispose();
  });

  // ─── Probe 02 ───────────────────────────────────────────────────────────────

  it('probe-02: harvester emits peer:turn-complete on the SHARED dispatch-event emitter', () => {
    const peerCompleteHandler = vi.fn();
    emitter.on('peer:turn-complete', peerCompleteHandler);

    const wired = makeWired();

    // Drive harvester: chunk → outer quiescence → summary prompt fires
    capturedObserver?.('alpha', 'doing work...');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);
    expect(injectorSpy).toHaveBeenCalledOnce();

    // Peer responds with valid §7 YAML; inner quiescence triggers parse + emit
    capturedObserver?.('alpha', VALID_SUMMARY_YAML);
    vi.advanceTimersByTime(RESPONSE_QUIESCENCE_MS + 1);

    expect(peerCompleteHandler).toHaveBeenCalledTimes(1);
    expect(peerCompleteHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionName: 'alpha',
        task: 'WB1',
        filesTouched: ['foo.ts'],
        result: 'done',
        completionStatus: 'complete',
        noFollowUp: true,
      }),
    );

    wired.dispose();
  });

  // ─── Probe 03 ───────────────────────────────────────────────────────────────

  it('probe-03: subscription order — writer.emitter.on(peer:turn-complete) BEFORE harvester.addStdoutObserver', () => {
    const callSequence: string[] = [];

    // Spy on emitter.on calls for the events writer registers (swarm-state-writer.ts:205-211)
    const realOn = emitter.on.bind(emitter);
    emitter.on = ((event: string | symbol, listener: (...args: unknown[]) => void) => {
      if (typeof event === 'string') callSequence.push(`emitter.on(${event})`);
      return realOn(event, listener);
    }) as typeof emitter.on;

    addObserverSpy.mockImplementation((fn) => {
      callSequence.push('broadcaster.addStdoutObserver');
      capturedObserver = fn;
      return () => { capturedObserver = undefined; };
    });

    const wired = makeWired();

    const writerSubIdx = callSequence.indexOf('emitter.on(peer:turn-complete)');
    const harvesterSubIdx = callSequence.indexOf('broadcaster.addStdoutObserver');

    expect(writerSubIdx).toBeGreaterThanOrEqual(0);
    expect(harvesterSubIdx).toBeGreaterThanOrEqual(0);
    expect(writerSubIdx).toBeLessThan(harvesterSubIdx);

    wired.dispose();
  });
});
