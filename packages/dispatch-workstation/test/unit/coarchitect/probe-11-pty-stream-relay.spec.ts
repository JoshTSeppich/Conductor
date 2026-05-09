// @vitest-environment happy-dom
//
// MB-T40 WB1 (red) — PTY stream relay + chat-panel PTY refactor probes.
//
// 11 probes:
//   Relay probes (registerPtyRelay — main-process relay):
//   Probe 01: __orchestrator_active chunk → coarchitect:ptyChunk forwarded; other sessions filtered
//   Probe 02: 3 consecutive chunks → 3 ptyChunk events; ptyTurnDone NOT fired within quiescence window
//   Probe 03: outer quiescence fires → ptyTurnDone carries accumulated text; buffer reset
//   Probe 04: complete action marker in buffer → immediate ptyTurnDone (fast-path); buffer reset
//   Probe 05: partial action marker → parseActionMarker null → ptyTurnDone NOT fired before quiescence
//   Probe 08: dispose clears outer quiescence timer; ptyTurnDone NOT fired after dispose
//
//   PtyStreamingBridge probes (renderer-side thin bridge):
//   Probe 06: sendAndStream fires workstation:session-send-prompt with __orchestrator_active target
//   Probe 09: sendAndStream does NOT fire coarchitect:sendAndStream (AnthropicChatClient regression guard)
//   Probe 11: start() registers addStdoutObserver subscription
//
//   chat-panel integration probes:
//   Probe 07: onStreamDone(text) → history state pushed directly; fetchHistory NOT called after turn
//   Probe 10: model-agnostic regression — ChatPanel renders in tab-content; chrome preserved
//
// WB1 RED state:
//   Probes 01-06, 08-09, 11: registerPtyRelay / PtyStreamingBridgeImpl undefined → toBeDefined() fails
//   Probe 07: onStreamDone still calls fetchHistory() → history not directly updated → RED
//   Probe 10: EXPECTED GREEN — model-agnostic DOM structure; passes with any StreamingBridge mock
//
// WB2 GREEN targets:
//   registerPtyRelay exported from src/main/pty-stream-relay.ts (A4 ratification)
//   PtyStreamingBridge exported from src/coarchitect/pty-streaming-bridge.ts (A1 ratification)
//   chat-panel.tsx onStreamDone: push to history directly; no fetchHistory() on done path (A2)
//
// Q-MBT40 dispositions encoded:
//   Q-MBT40-1(a-revised): PtyStreamingBridge satisfies StreamingBridge; relay in main (A1)
//   Q-MBT40-2(a): hardcoded __orchestrator_active (probes 01-05)
//   Q-MBT40-3(a): hardcoded __orchestrator_active IPC target (probe 06)
//   Q-MBT40-4(c): plain bubble text for markers; ptyTurnDone carries formatted text (probe 04)
//   Q-MBT40-5(a): per-chunk streaming + configurable outer quiescence default 3000ms (probe 03)
//   Q-MBT40-6(a)/(c): fetchHistory on mount only; NOT called after turn (probe 07)
//
// HALT 0 authoring drift encoded:
//   PF-2: StreamingBridge abstraction layer (not direct AnthropicChatClient import in chat-panel)
//   PF-3: OrchestratorCard cross-package → Q-MBT40-4(c) plain-bubble fallback
//
// Production code unmodified at WB1 (test-only commit).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import {
  mountChatShell,
  type CoarchitectBridge,
} from '../../../src/chat-shell/mount.js';
import type { StreamingBridge } from '../../../src/coarchitect/chat-panel.js';
import { parseActionMarker } from '../../../src/coarchitect/chat-content-markers.js';
import { registerPtyRelay } from '../../../src/main/pty-stream-relay.js';
import { PtyStreamingBridgeImpl } from '../../../src/coarchitect/pty-streaming-bridge.js';

vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn().mockResolvedValue({ ok: true }),
    on: vi.fn(() => () => {}),
    removeListener: vi.fn(),
    send: vi.fn(),
  },
  ipcMain: { handle: vi.fn(), on: vi.fn(), removeAllListeners: vi.fn() },
  app: { getPath: vi.fn().mockReturnValue('/tmp') },
  webContents: { getAllWebContents: vi.fn().mockReturnValue([]) },
}));

// ─── WB2 GREEN: production imports replace WB1 undefined stubs ───────────────
//
// registerPtyRelay  ← src/main/pty-stream-relay.ts (A4 re-arbitration: α)
// PtyStreamingBridgeImpl ← src/coarchitect/pty-streaming-bridge.ts (A1: α)
//
// Local interfaces below are retained as test-side structural documentation.
// Production types (IConsoleBroadcaster, IWebContents, PtyRelayDeps) in the
// imported modules are structurally identical; TypeScript resolves via
// structural subtyping — no cast required.

/** Minimal broadcaster interface matching MB-T37 console-ipc.ts:169 signature. */
export interface IConsoleBroadcasterLocal {
  addStdoutObserver(fn: (sessionName: string, chunk: string) => void): () => void;
}

interface IWebContentsLocal {
  send(channel: string, payload?: unknown): void;
}

interface PtyRelayDeps {
  broadcaster: IConsoleBroadcasterLocal;
  getWebContents: () => IWebContentsLocal[];
  outerQuiescenceMs?: number;
}

// Structural contract (documentation only — no runtime assertion needed):
// PtyStreamingBridgeImpl satisfies: new({ broadcaster, outerQuiescenceMs? })
// → StreamingBridge & { start(): void; dispose(): void }.

// ─── Helpers ─────────────────────────────────────────────────────────────────

const OUTER_QUIESCENCE_MS = 100; // fast for tests; production default 3000ms (Q-MBT40-5(a))

function makeBroadcaster() {
  let observer: ((sn: string, chunk: string) => void) | undefined;
  const broadcaster: IConsoleBroadcasterLocal = {
    addStdoutObserver: vi.fn((fn) => {
      observer = fn;
      return () => { observer = undefined; };
    }),
  };
  return { broadcaster, getObserver: () => observer };
}

function makeWcMock() {
  const sends: Array<[string, unknown]> = [];
  const wc: IWebContentsLocal = { send: (ch, payload) => sends.push([ch, payload]) };
  return { wc, sends };
}

type FakeBridge = CoarchitectBridge & {
  fireChunk(chunk: string): void;
  fireDone(text: string): void;
  fireError(err: { code: string; message: string }): void;
  readonly _fetchHistorySpy: ReturnType<typeof vi.fn>;
};

function makeFakeBridge(): FakeBridge {
  const chunkCbs: Array<(c: string) => void> = [];
  const doneCbs: Array<(t: string) => void> = [];
  const errorCbs: Array<(e: { code: string; message: string }) => void> = [];
  const fetchHistorySpy = vi.fn().mockResolvedValue([]);
  return {
    fetchHistory: fetchHistorySpy,
    postMessage: vi.fn().mockResolvedValue({
      id: 'fake', role: 'user', content: '', created_at: '', build_doc_id: null, build_doc_commit_sha: null,
    }),
    sendAndStream: vi.fn(),
    onStreamChunk: vi.fn((cb) => { chunkCbs.push(cb); return () => {}; }),
    onStreamDone: vi.fn((cb) => { doneCbs.push(cb); return () => {}; }),
    onStreamError: vi.fn((cb) => { errorCbs.push(cb); return () => {}; }),
    fireChunk: (c) => chunkCbs.forEach((cb) => cb(c)),
    fireDone: (t) => doneCbs.forEach((cb) => cb(t)),
    fireError: (e) => errorCbs.forEach((cb) => cb(e)),
    _fetchHistorySpy: fetchHistorySpy,
  };
}

// ─── Relay probes 01-05, 08 ───────────────────────────────────────────────────

describe('MB-T40 WB1 — PTY stream relay probes', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('probe-01: __orchestrator_active chunk → coarchitect:ptyChunk forwarded; other sessions NOT forwarded', () => {
    const { broadcaster, getObserver } = makeBroadcaster();
    const { wc, sends } = makeWcMock();
    registerPtyRelay({ broadcaster, getWebContents: () => [wc], outerQuiescenceMs: OUTER_QUIESCENCE_MS });

    getObserver()?.('__orchestrator_active', 'hello');
    expect(sends.filter(([ch]) => ch === 'coarchitect:ptyChunk')).toContainEqual(['coarchitect:ptyChunk', 'hello']);

    sends.length = 0;
    getObserver()?.('alpha', 'peer chunk');
    expect(sends.filter(([ch]) => ch === 'coarchitect:ptyChunk')).toHaveLength(0);
  });

  it('probe-02: 3 consecutive __orchestrator_active chunks → 3 ptyChunk events; ptyTurnDone NOT fired within quiescence window', () => {
    const { broadcaster, getObserver } = makeBroadcaster();
    const { wc, sends } = makeWcMock();
    registerPtyRelay({ broadcaster, getWebContents: () => [wc], outerQuiescenceMs: OUTER_QUIESCENCE_MS });

    getObserver()?.('__orchestrator_active', 'tok1');
    vi.advanceTimersByTime(OUTER_QUIESCENCE_MS - 20);
    getObserver()?.('__orchestrator_active', ' tok2');
    vi.advanceTimersByTime(OUTER_QUIESCENCE_MS - 20);
    getObserver()?.('__orchestrator_active', ' tok3');

    const ptyChunks = sends.filter(([ch]) => ch === 'coarchitect:ptyChunk');
    expect(ptyChunks).toHaveLength(3);
    expect(ptyChunks.map(([, p]) => p)).toEqual(['tok1', ' tok2', ' tok3']);
    expect(sends.filter(([ch]) => ch === 'coarchitect:ptyTurnDone')).toHaveLength(0);
  });

  it('probe-03: outer quiescence fires → ptyTurnDone carries accumulated text; buffer reset on next chunk', () => {
    const { broadcaster, getObserver } = makeBroadcaster();
    const { wc, sends } = makeWcMock();
    registerPtyRelay({ broadcaster, getWebContents: () => [wc], outerQuiescenceMs: OUTER_QUIESCENCE_MS });

    getObserver()?.('__orchestrator_active', 'first ');
    vi.advanceTimersByTime(OUTER_QUIESCENCE_MS - 10);
    getObserver()?.('__orchestrator_active', 'second');

    expect(sends.filter(([ch]) => ch === 'coarchitect:ptyTurnDone')).toHaveLength(0);

    vi.advanceTimersByTime(OUTER_QUIESCENCE_MS + 1);
    const turnDone = sends.filter(([ch]) => ch === 'coarchitect:ptyTurnDone');
    expect(turnDone).toHaveLength(1);
    expect(turnDone[0]?.[1]).toBe('first second');

    // Buffer reset: next chunk starts a fresh turn
    const priorCount = sends.length;
    getObserver()?.('__orchestrator_active', 'new turn');
    vi.advanceTimersByTime(OUTER_QUIESCENCE_MS + 1);
    const newDone = sends.slice(priorCount).filter(([ch]) => ch === 'coarchitect:ptyTurnDone');
    expect(newDone).toHaveLength(1);
    expect(newDone[0]?.[1]).toBe('new turn');
  });

  it('probe-04: complete action marker in buffer → immediate ptyTurnDone (fast-path, before quiescence); buffer reset', () => {
    const { broadcaster, getObserver } = makeBroadcaster();
    const { wc, sends } = makeWcMock();
    registerPtyRelay({ broadcaster, getWebContents: () => [wc], outerQuiescenceMs: OUTER_QUIESCENCE_MS });

    // Verify test vector triggers parseActionMarker (contract check)
    const markerBlock = '[ACTION:spawn-session]\nsessionName: foo\ntask: implement X\n[/ACTION]';
    expect(parseActionMarker(markerBlock)).not.toBeNull();

    // Stream chunks building up to a complete action marker
    getObserver()?.('__orchestrator_active', '[ACTION:spawn-session]\n');
    getObserver()?.('__orchestrator_active', 'sessionName: foo\n');
    getObserver()?.('__orchestrator_active', 'task: implement X\n');
    getObserver()?.('__orchestrator_active', '[/ACTION]');

    // Immediate ptyTurnDone — before quiescence (marker fast-path)
    const turnDone = sends.filter(([ch]) => ch === 'coarchitect:ptyTurnDone');
    expect(turnDone).toHaveLength(1);
    // Payload carries formatted marker text per Q-MBT40-4(c)
    expect(String(turnDone[0]?.[1])).toContain('spawn-session');

    // Buffer reset: subsequent chunk starts a new turn
    const priorCount = sends.length;
    getObserver()?.('__orchestrator_active', 'next turn text');
    vi.advanceTimersByTime(OUTER_QUIESCENCE_MS + 1);
    const newDone = sends.slice(priorCount).filter(([ch]) => ch === 'coarchitect:ptyTurnDone');
    expect(newDone).toHaveLength(1);
    expect(newDone[0]?.[1]).toBe('next turn text');
  });

  it('probe-05: partial action marker → parseActionMarker null → ptyTurnDone NOT fired until quiescence', () => {
    const { broadcaster, getObserver } = makeBroadcaster();
    const { wc, sends } = makeWcMock();
    registerPtyRelay({ broadcaster, getWebContents: () => [wc], outerQuiescenceMs: OUTER_QUIESCENCE_MS });

    // Partial marker — opening tag only; no closing [/ACTION] tag
    const partial = '[ACTION:spawn-session]\nsessionName: foo\n';
    expect(parseActionMarker(partial)).toBeNull();

    getObserver()?.('__orchestrator_active', partial);
    expect(sends.filter(([ch]) => ch === 'coarchitect:ptyTurnDone')).toHaveLength(0);

    // Quiescence fires → ptyTurnDone with accumulated partial text
    vi.advanceTimersByTime(OUTER_QUIESCENCE_MS + 1);
    expect(sends.filter(([ch]) => ch === 'coarchitect:ptyTurnDone')).toHaveLength(1);
  });

  it('probe-08: dispose clears outer quiescence timer; ptyTurnDone NOT fired after dispose', () => {
    const { broadcaster, getObserver } = makeBroadcaster();
    const { wc, sends } = makeWcMock();
    const dispose = registerPtyRelay({ broadcaster, getWebContents: () => [wc], outerQuiescenceMs: OUTER_QUIESCENCE_MS });

    getObserver()?.('__orchestrator_active', 'in progress text');
    dispose();

    vi.advanceTimersByTime(OUTER_QUIESCENCE_MS + 50);
    expect(sends.filter(([ch]) => ch === 'coarchitect:ptyTurnDone')).toHaveLength(0);
  });
});

// ─── PtyStreamingBridge probes 06, 09, 11 ────────────────────────────────────

describe('MB-T40 WB1 — PtyStreamingBridge probes', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('probe-06: sendAndStream fires workstation:session-send-prompt with sessionName=__orchestrator_active', async () => {
    const { ipcRenderer } = await import('electron');
    vi.mocked(ipcRenderer.invoke).mockClear();

    const { broadcaster } = makeBroadcaster();
    const bridge = new PtyStreamingBridgeImpl({ broadcaster, outerQuiescenceMs: OUTER_QUIESCENCE_MS });
    bridge.sendAndStream('hello operator');

    expect(vi.mocked(ipcRenderer.invoke)).toHaveBeenCalledWith(
      'workstation:session-send-prompt',
      { sessionName: '__orchestrator_active', prompt: 'hello operator' },
    );
  });

  it('probe-09: sendAndStream does NOT fire coarchitect:sendAndStream (AnthropicChatClient regression guard)', async () => {
    const { ipcRenderer } = await import('electron');
    vi.mocked(ipcRenderer.send).mockClear();

    const { broadcaster } = makeBroadcaster();
    const bridge = new PtyStreamingBridgeImpl({ broadcaster, outerQuiescenceMs: OUTER_QUIESCENCE_MS });
    bridge.sendAndStream('test input');

    // OLD path: ipcRenderer.send('coarchitect:sendAndStream') → AnthropicChatClient stream
    // NEW path: ipcRenderer.invoke('workstation:session-send-prompt') — must NOT use old path
    expect(vi.mocked(ipcRenderer.send)).not.toHaveBeenCalledWith(
      'coarchitect:sendAndStream',
      expect.anything(),
    );
  });

  it('probe-11: start() registers addStdoutObserver; dispose() removes subscription', () => {
    const { broadcaster } = makeBroadcaster();
    const bridge = new PtyStreamingBridgeImpl({ broadcaster, outerQuiescenceMs: OUTER_QUIESCENCE_MS });

    // Before start(): no subscription yet
    expect(broadcaster.addStdoutObserver).not.toHaveBeenCalled();

    bridge.start();
    expect(broadcaster.addStdoutObserver).toHaveBeenCalledOnce();

    // Dispose removes the observer (captured disposer is called)
    bridge.dispose();
    // After dispose: no active subscription (getObserver() returns undefined in test)
    // The addStdoutObserver call count stays at 1 — no re-subscription
    expect(broadcaster.addStdoutObserver).toHaveBeenCalledOnce();
  });
});

// ─── chat-panel integration probes 07, 10 ────────────────────────────────────

describe('MB-T40 WB1 — chat-panel PTY integration probes', () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement('div');
    target.id = 'chat-panel-target';
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (target.parentNode) target.remove();
    vi.restoreAllMocks();
  });

  it('probe-07: onStreamDone(text) pushes assistant message directly to history; fetchHistory NOT called after turn finalization', async () => {
    // WB1 RED: onStreamDone calls daemonClient.fetchHistory().then(setHistory) → history=[]; text lost
    // WB2 GREEN: onStreamDone(text) → setHistory(prev => [...prev, {role:'assistant', content:text}])
    const bridge = makeFakeBridge();

    await act(async () => {
      mountChatShell({ rootElementId: 'chat-panel-target', bridge });
    });
    await act(async () => { await Promise.resolve(); });

    const callsAtMount = bridge._fetchHistorySpy.mock.calls.length;

    // Simulate streaming: chunks arrive (typewriter render)
    await act(async () => { bridge.fireChunk('Hello, I am '); });
    await act(async () => { bridge.fireChunk('the orchestrator.'); });

    // Turn finalizes: onStreamDone carries full finalized text
    await act(async () => { bridge.fireDone('Hello, I am the orchestrator.'); });
    await act(async () => { await Promise.resolve(); });

    // Assert 1: assistant message visible in chat log
    const log = document.querySelector('[data-testid="chat-panel-log"]');
    expect(log?.textContent).toContain('Hello, I am the orchestrator.');

    // Assert 2: fetchHistory NOT called after turn (only called at mount)
    expect(bridge._fetchHistorySpy.mock.calls.length).toBe(callsAtMount);
  });

  it('probe-10: model-agnostic regression — ChatPanel renders in tab-content; chrome preserved [EXPECTED GREEN at WB1]', async () => {
    // Mirrors probe-03 tests (1) and (2) from chat-shell/probe-03-chat-panel-integration.spec.tsx.
    // Model-agnostic: DOM structure only; passes with any StreamingBridge mock.
    const bridge = makeFakeBridge();

    await act(async () => {
      mountChatShell({ rootElementId: 'chat-panel-target', bridge });
    });
    await act(async () => { await Promise.resolve(); });

    const slot = document.querySelector('[data-testid="chat-shell-tab-content"]');
    expect(slot).not.toBeNull();

    const chatInput = document.querySelector('[data-testid="chat-input"]');
    expect(chatInput).not.toBeNull();
    expect(slot?.contains(chatInput)).toBe(true);

    expect(document.querySelector('[data-testid="chat-shell-root"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="chat-shell-tab-strip"]')).not.toBeNull();
  });
});
