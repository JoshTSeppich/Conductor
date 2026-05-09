// MB-T39 WB1 (red) — PeerSummaryHarvester probe contract.
//
// 9 probes:
//   Probe 01: quiescence detection — chunk resets timer; silence past threshold fires summary prompt
//   Probe 02: summary prompt fire — correct sessionName + summaryPromptText sent to injector
//   Probe 03: TURN_INCOMPLETE response — peer:turn-complete NOT emitted; state recovers to IDLE (re-fires)
//   Probe 04: valid summary response — YAML validated; snake_case→camelCase translation;
//             peer:turn-complete emitted with camelCase PeerTurnCompletePayload
//   Probe 05: invalid summary response — schema drift/non-YAML → error:recorded; peer:turn-complete NOT emitted
//   Probe 06: orchestrator exclusion — __orchestrator_active / __orchestrator_standby never receive prompt
//   Probe 07: concurrent harvest lock — second quiescence while AWAITING_RESPONSE → only one prompt sent
//   Probe 08: multi-peer parallel — 3 peers quiesce simultaneously → 3 prompts, 3 peer:turn-complete events
//   Probe 09: TIMEOUT path — awaitingResponseTimeoutMs elapses with no response → error:recorded;
//             state recovers to IDLE (subsequent quiescence re-fires)
//
// WB1 RED: constructor/start()/dispose() are no-ops. All positive behavioral assertions fail.
// WB2 GREEN: full implementation ships addStdoutObserver consumption (Terminal X tap) +
//            quiescence detection + YAML parser + snake_case→camelCase translation +
//            per-peer state machine (IDLE/AWAITING_RESPONSE/RESPONSE_PARSED/TIMEOUT).
//
// Mock interfaces (cross-session coordination):
//   IConsoleBroadcaster — Terminal X arbitrated tap interface per operator HALT 0 arbitration:
//     addStdoutObserver(fn: (sessionName, chunk) => void): () => void
//     Fan-out observer, non-redirecting, returns disposer.
//   IPromptInjector — MB-T09 surface, KNOWN PF2:
//     handleSendPrompt({ sessionName, prompt, envelope? }): Promise<{ok:true}|{ok:false,error}>
//
// HALT-STAGING-FOR-X: WB2 GREEN unblocks when Terminal X ships MB-T37 WB2 GREEN
// (ConsoleIpcController.addStdoutObserver on origin/main). Before authoring WB2 GREEN,
// probe-verify actual method signature in src/main/console-ipc.ts against this mock.
// If signature drifts from IConsoleBroadcaster, halt-and-surface; do NOT improvise.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  PeerSummaryHarvester,
  type IConsoleBroadcaster,
  type IPromptInjector,
} from '../../../src/coarchitect/peer-summary-harvester.js';

// Fast thresholds for unit tests; real defaults 3000ms / 30000ms per Q-MBT39-2 + HALT 1.
const QUIESCENCE_MS = 100;
const TIMEOUT_MS = 500;
const SUMMARY_PROMPT =
  '[SYSTEM-METADATA] Peer summary harvester request. Per MB-T41 §3 + §7: if your current turn is mid-work (incomplete sentence, mid-tool-call, thinking indicator, peer process still writing), output exactly the literal string "TURN_INCOMPLETE" with no trailing newline. Otherwise, emit your turn summary in §7 YAML format with exact parser-anchored field names: peer_session, task, files_touched, result, completion_status, no_follow_up, follow_up_action.';

describe('MB-T39 WB1 — PeerSummaryHarvester probes', () => {
  let emitter: EventEmitter;
  let capturedObserver: ((sessionName: string, chunk: string) => void) | undefined;
  let injectorSpy: ReturnType<typeof vi.fn>;
  let mockBroadcaster: IConsoleBroadcaster;
  let mockInjector: IPromptInjector;

  beforeEach(() => {
    vi.useFakeTimers();
    emitter = new EventEmitter();
    capturedObserver = undefined;

    injectorSpy = vi.fn().mockResolvedValue({ ok: true });

    mockBroadcaster = {
      addStdoutObserver: vi.fn((fn: (sessionName: string, chunk: string) => void) => {
        capturedObserver = fn;
        return () => {
          capturedObserver = undefined;
        };
      }),
    };

    mockInjector = {
      handleSendPrompt: injectorSpy,
    } as unknown as IPromptInjector;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function makeHarvester(): PeerSummaryHarvester {
    return new PeerSummaryHarvester({
      ptyBroadcaster: mockBroadcaster,
      promptInjector: mockInjector,
      stateEmitter: emitter,
      quiescenceThresholdMs: QUIESCENCE_MS,
      awaitingResponseTimeoutMs: TIMEOUT_MS,
      orchestratorNamePattern: /^__orchestrator_/,
      summaryPromptText: SUMMARY_PROMPT,
    });
  }

  // ── Probe 01 ───────────────────────────────────────────────────────────────

  it('probe-01: quiescence detection — chunk resets timer; silence past threshold fires summary prompt', () => {
    const harvester = makeHarvester();
    harvester.start();

    // Chunk resets the quiescence timer
    capturedObserver?.('alpha', 'chunk-1');
    vi.advanceTimersByTime(QUIESCENCE_MS - 1);
    expect(injectorSpy).not.toHaveBeenCalled();

    // Second chunk resets again
    capturedObserver?.('alpha', 'chunk-2');
    vi.advanceTimersByTime(QUIESCENCE_MS - 1);
    expect(injectorSpy).not.toHaveBeenCalled();

    // Silence past threshold from last chunk → quiescence fires → prompt sent
    vi.advanceTimersByTime(2);
    expect(injectorSpy).toHaveBeenCalledOnce();
  });

  // ── Probe 02 ───────────────────────────────────────────────────────────────

  it('probe-02: summary prompt fire — correct sessionName + summaryPromptText sent to injector', () => {
    const harvester = makeHarvester();
    harvester.start();

    capturedObserver?.('alpha', 'some output');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);

    expect(injectorSpy).toHaveBeenCalledOnce();
    expect(injectorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionName: 'alpha',
        prompt: SUMMARY_PROMPT,
      }),
    );
  });

  // ── Probe 03 ───────────────────────────────────────────────────────────────

  it('probe-03: TURN_INCOMPLETE response — peer:turn-complete NOT emitted; state recovers to IDLE', () => {
    const harvester = makeHarvester();
    harvester.start();

    const emitSpy = vi.spyOn(emitter, 'emit');

    // Quiescence → summary prompt sent (positive assertion — RED with stub)
    capturedObserver?.('alpha', 'doing work...');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);
    expect(injectorSpy).toHaveBeenCalledOnce();

    // Peer responds TURN_INCOMPLETE — must NOT emit peer:turn-complete
    capturedObserver?.('alpha', 'TURN_INCOMPLETE');
    expect(emitSpy).not.toHaveBeenCalledWith('peer:turn-complete', expect.anything());

    // State recovers to IDLE: next quiescence re-fires summary prompt (2nd call)
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);
    expect(injectorSpy).toHaveBeenCalledTimes(2);
  });

  // ── Probe 04 ───────────────────────────────────────────────────────────────

  it('probe-04: valid summary response — YAML validated + snake_case→camelCase translation; peer:turn-complete emitted', () => {
    const harvester = makeHarvester();
    harvester.start();

    const emitSpy = vi.spyOn(emitter, 'emit');

    capturedObserver?.('alpha', 'working...');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);

    // Positive assertion — RED with stub
    expect(injectorSpy).toHaveBeenCalledOnce();

    const validYaml = [
      'peer_session: alpha',
      'task: implement feature X',
      'files_touched:',
      '  - src/foo.ts',
      '  - src/bar.ts',
      'result: shipped WB2 GREEN',
      'completion_status: complete',
      'no_follow_up: false',
      'follow_up_action: file MB-F followup',
    ].join('\n');

    capturedObserver?.('alpha', validYaml);

    // peer:turn-complete emitted with camelCase PeerTurnCompletePayload
    // (snake_case→camelCase translation ratified at HALT 0 PF4)
    expect(emitSpy).toHaveBeenCalledWith('peer:turn-complete', {
      sessionName: 'alpha',
      task: 'implement feature X',
      filesTouched: ['src/foo.ts', 'src/bar.ts'],
      result: 'shipped WB2 GREEN',
      completionStatus: 'complete',
      noFollowUp: false,
      followUpAction: 'file MB-F followup',
    });

    // error:recorded must NOT be emitted
    expect(emitSpy).not.toHaveBeenCalledWith('error:recorded', expect.anything());
  });

  // ── Probe 05 ───────────────────────────────────────────────────────────────

  it('probe-05: invalid summary response — schema drift/non-YAML → error:recorded; peer:turn-complete NOT emitted', () => {
    const harvester = makeHarvester();
    harvester.start();

    const emitSpy = vi.spyOn(emitter, 'emit');

    capturedObserver?.('alpha', 'working...');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);

    // Positive assertion — RED with stub
    expect(injectorSpy).toHaveBeenCalledOnce();

    // Sub-case (a): non-YAML prose response
    capturedObserver?.('alpha', 'Sure, here is my update! I finished the task and everything looks good.');

    expect(emitSpy).toHaveBeenCalledWith(
      'error:recorded',
      expect.objectContaining({
        sessionName: 'alpha',
        message: expect.any(String),
        timestamp: expect.any(String),
      }),
    );
    expect(emitSpy).not.toHaveBeenCalledWith('peer:turn-complete', expect.anything());

    emitSpy.mockClear();

    // Sub-case (b): YAML with schema drift — missing required 'result' field
    capturedObserver?.('alpha', 'new output after error recovery');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);

    const driftedYaml = [
      'peer_session: alpha',
      'task: implement feature X',
      'files_touched: []',
      // 'result' intentionally absent — schema drift
      'completion_status: complete',
      'no_follow_up: true',
    ].join('\n');

    capturedObserver?.('alpha', driftedYaml);

    expect(emitSpy).toHaveBeenCalledWith(
      'error:recorded',
      expect.objectContaining({
        sessionName: 'alpha',
        message: expect.any(String),
        timestamp: expect.any(String),
      }),
    );
    expect(emitSpy).not.toHaveBeenCalledWith('peer:turn-complete', expect.anything());
  });

  // ── Probe 06 ───────────────────────────────────────────────────────────────

  it('probe-06: orchestrator exclusion — __orchestrator_active and __orchestrator_standby never receive summary prompt', () => {
    const harvester = makeHarvester();
    harvester.start();

    // Normal peer beta DOES trigger (positive assertion — RED with stub)
    capturedObserver?.('beta', 'beta output');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);
    expect(injectorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ sessionName: 'beta' }),
    );

    const callCountAfterBeta = (injectorSpy as ReturnType<typeof vi.fn>).mock.calls.length;

    // Orchestrator sessions quiesce — must NOT trigger summary prompt
    capturedObserver?.('__orchestrator_active', 'orchestrator thinking...');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);
    capturedObserver?.('__orchestrator_standby', 'standby output');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);

    expect(injectorSpy).toHaveBeenCalledTimes(callCountAfterBeta);
    expect(injectorSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ sessionName: '__orchestrator_active' }),
    );
    expect(injectorSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ sessionName: '__orchestrator_standby' }),
    );
  });

  // ── Probe 07 ───────────────────────────────────────────────────────────────

  it('probe-07: concurrent harvest lock — second quiescence while AWAITING_RESPONSE → only one prompt sent', () => {
    const harvester = makeHarvester();
    harvester.start();

    // First quiescence → summary prompt sent → AWAITING_RESPONSE
    capturedObserver?.('alpha', 'first output');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);

    // Positive assertion — RED with stub
    expect(injectorSpy).toHaveBeenCalledOnce();

    // While in AWAITING_RESPONSE (no response delivered), quiescence would fire again
    // if the timer restarts — lock must prevent second prompt
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);

    expect(injectorSpy).toHaveBeenCalledOnce();
  });

  // ── Probe 08 ───────────────────────────────────────────────────────────────

  it('probe-08: multi-peer parallel — 3 peers quiesce simultaneously → 3 prompts + 3 peer:turn-complete events', () => {
    const harvester = makeHarvester();
    harvester.start();

    const emitSpy = vi.spyOn(emitter, 'emit');

    // All 3 peers emit a chunk at the same moment then go silent
    capturedObserver?.('alpha', 'alpha output');
    capturedObserver?.('beta', 'beta output');
    capturedObserver?.('gamma', 'gamma output');

    // Advance past threshold — all 3 quiesce simultaneously
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);

    // 3 prompts sent (positive assertion — RED with stub)
    expect(injectorSpy).toHaveBeenCalledTimes(3);
    expect(injectorSpy).toHaveBeenCalledWith(expect.objectContaining({ sessionName: 'alpha' }));
    expect(injectorSpy).toHaveBeenCalledWith(expect.objectContaining({ sessionName: 'beta' }));
    expect(injectorSpy).toHaveBeenCalledWith(expect.objectContaining({ sessionName: 'gamma' }));

    // Each peer delivers a valid §7 YAML response
    const makeYaml = (sessionName: string): string =>
      [
        `peer_session: ${sessionName}`,
        `task: task for ${sessionName}`,
        'files_touched: []',
        `result: done by ${sessionName}`,
        'completion_status: complete',
        'no_follow_up: true',
      ].join('\n');

    capturedObserver?.('alpha', makeYaml('alpha'));
    capturedObserver?.('beta', makeYaml('beta'));
    capturedObserver?.('gamma', makeYaml('gamma'));

    // 3 peer:turn-complete events emitted — one per peer, each independently
    const turnCompleteEmits = emitSpy.mock.calls.filter(
      ([event]) => event === 'peer:turn-complete',
    );
    expect(turnCompleteEmits).toHaveLength(3);

    const emittedSessions = turnCompleteEmits.map(
      ([, payload]) => (payload as { sessionName: string }).sessionName,
    );
    expect(emittedSessions).toContain('alpha');
    expect(emittedSessions).toContain('beta');
    expect(emittedSessions).toContain('gamma');
  });

  // ── Probe 09 ───────────────────────────────────────────────────────────────

  it('probe-09: TIMEOUT path — awaitingResponseTimeoutMs elapses with no response → error:recorded; state recovers to IDLE', () => {
    const harvester = makeHarvester();
    harvester.start();

    const emitSpy = vi.spyOn(emitter, 'emit');

    // Quiescence → summary prompt sent → AWAITING_RESPONSE
    capturedObserver?.('alpha', 'working...');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);

    // Positive assertion — RED with stub
    expect(injectorSpy).toHaveBeenCalledOnce();

    // Advance past awaitingResponseTimeoutMs without delivering a response
    vi.advanceTimersByTime(TIMEOUT_MS + 1);

    // (1) error:recorded emitted with 'timeout' in message
    expect(emitSpy).toHaveBeenCalledWith(
      'error:recorded',
      expect.objectContaining({
        sessionName: 'alpha',
        message: expect.stringMatching(/timeout/i),
        timestamp: expect.any(String),
      }),
    );

    // (2) peer:turn-complete NOT emitted
    expect(emitSpy).not.toHaveBeenCalledWith('peer:turn-complete', expect.anything());

    // (3) State recovers to IDLE: subsequent quiescence re-fires summary prompt (2nd call)
    capturedObserver?.('alpha', 'new output after timeout');
    vi.advanceTimersByTime(QUIESCENCE_MS + 1);
    expect(injectorSpy).toHaveBeenCalledTimes(2);
  });
});
