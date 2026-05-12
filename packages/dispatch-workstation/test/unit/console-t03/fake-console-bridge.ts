// Shared test fixture: a fake ConsoleBridge that records calls and lets tests
// emit events on demand. Mirrors the shape of window.consoleBridge produced by
// makeConsoleBridge() in src/main/console-bridge.ts (CONSOLE-T02 b138548); only
// the surface CONSOLE-T03 consumes is faked.
//
// Used by all CONSOLE-T03 cluster tests so the panel can be rendered with a
// deterministic bridge and the test can drive shell→webview events
// (open/close/stdout-chunk/gap/error) by calling fake.emit*(payload).
import type {
  ConsoleBridge,
  Cleanup,
  OpenPayload,
  ClosePayload,
  StdoutChunkPayload,
  GapPayload,
  ErrorPayload,
  StdinAck,
  SignalAck,
  Encoding,
  SignalName,
} from '../../../src/main/console-bridge.js';

export interface FakeConsoleBridge {
  bridge: ConsoleBridge;
  /** Calls captured from the renderer side. */
  sendStdinCalls: Array<{ sessionName: string; bytes: string; encoding: Encoding }>;
  signalCalls: Array<{ sessionName: string; signal: SignalName }>;
  /** Drive shell→webview events; calls every registered handler. */
  emitOpen(payload: OpenPayload): void;
  emitClose(payload: ClosePayload): void;
  emitChunk(payload: StdoutChunkPayload): void;
  emitGap(payload: GapPayload): void;
  emitError(payload: ErrorPayload): void;
  /** Counts to verify cleanup fired (cluster 3 listener-cleanup parity). */
  listenerCounts(): {
    open: number;
    close: number;
    chunk: number;
    gap: number;
    error: number;
  };
  /** Configurable acks for cluster 3 sendStdin / cluster 4 signal tests. */
  setStdinAck(ack: StdinAck): void;
  setSignalAck(ack: SignalAck): void;
}

export function makeFakeConsoleBridge(): FakeConsoleBridge {
  const sendStdinCalls: FakeConsoleBridge['sendStdinCalls'] = [];
  const signalCalls: FakeConsoleBridge['signalCalls'] = [];
  let stdinAck: StdinAck = { accepted: true, stdin_seq: 1 };
  let signalAck: SignalAck = { accepted: true, dispatch_method: 'pty_byte' };

  const openHandlers = new Set<(p: OpenPayload) => void>();
  const closeHandlers = new Set<(p: ClosePayload) => void>();
  const chunkHandlers = new Set<(p: StdoutChunkPayload) => void>();
  const gapHandlers = new Set<(p: GapPayload) => void>();
  const errorHandlers = new Set<(p: ErrorPayload) => void>();

  function makeOn<T>(set: Set<(p: T) => void>): (h: (p: T) => void) => Cleanup {
    return (h) => {
      set.add(h);
      return () => {
        set.delete(h);
      };
    };
  }

  const bridge: ConsoleBridge = {
    sendStdin: async (sessionName, bytes, encoding = 'utf8') => {
      sendStdinCalls.push({ sessionName, bytes, encoding });
      return stdinAck;
    },
    signal: async (sessionName, signal) => {
      signalCalls.push({ sessionName, signal });
      return signalAck;
    },
    // MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB2 fixture-maintenance
    // addition: production ConsoleBridge (console-bridge.ts:67, Fix-C /
    // cairn finding #82) requires openPanel; this fake predated the
    // addition and omitted it. T2 TerminalStream invokes openPanel on
    // mount per spike outcome 2 (ADR docs/coordination/mb-t-wireframe-t2-
    // console-stream-spike-2026-05-12.md). No-op resolve here; CONSOLE-T03
    // tests do not assert openPanel behavior so this is non-impacting.
    openPanel: async () => {
      /* no-op for tests; CONSOLE-T03 doesn't assert; T2 just needs the
       * call to not throw */
    },
    onConsoleOpen: makeOn(openHandlers),
    onConsoleClose: makeOn(closeHandlers),
    onStdoutChunk: makeOn(chunkHandlers),
    onGap: makeOn(gapHandlers),
    onError: makeOn(errorHandlers),
  };

  return {
    bridge,
    sendStdinCalls,
    signalCalls,
    emitOpen: (p) => openHandlers.forEach((h) => h(p)),
    emitClose: (p) => closeHandlers.forEach((h) => h(p)),
    emitChunk: (p) => chunkHandlers.forEach((h) => h(p)),
    emitGap: (p) => gapHandlers.forEach((h) => h(p)),
    emitError: (p) => errorHandlers.forEach((h) => h(p)),
    listenerCounts: () => ({
      open: openHandlers.size,
      close: closeHandlers.size,
      chunk: chunkHandlers.size,
      gap: gapHandlers.size,
      error: errorHandlers.size,
    }),
    setStdinAck: (ack) => {
      stdinAck = ack;
    },
    setSignalAck: (ack) => {
      signalAck = ack;
    },
  };
}
