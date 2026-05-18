// MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE WB6 probe-06 — End-to-end broadcast pipeline.
//
// Exercises the full Wave-1 path-disjoint composition WITHOUT booting Electron:
//
//   ConsoleBroadcaster (fake)
//     → registerPtyRelay (REAL, src/main/pty-stream-relay.ts)
//       → IWebContents.send(channel,chunk) (fake collector)
//         → PtyChunkBridge (REAL, src/orchestrator-focus-pane/focus-pane-ipc.ts)
//           → consumePtyChunkStream
//             → TerminalAdapter.write (fake)
//
// The probe replaces the Electron IPC seam (ipcMain emit on main side /
// ipcRenderer.on on renderer side) with two collaborating fakes: the
// IWebContents collector captures channel/payload tuples; the PtyChunkBridge
// re-injects payloads as if delivered by ipcRenderer.on('coarchitect:ptyChunk').
//
// Per CLAUDE.md §4.5 this lives under test/integration/ and is deliberately
// deterministic — no setTimeout-based action-marker fast-path needed for the
// chunk-forwarding contract verification.
//
// Per arbitration Q-MVP-W1-1=(a) (operator ack 17:55 MDT): reuses existing
// coarchitect:ptyChunk broadcast.

import { describe, it, expect } from 'vitest';
import {
  registerPtyRelay,
  type IConsoleBroadcaster,
  type IWebContents,
} from '../../src/main/pty-stream-relay.js';
import {
  consumePtyChunkStream,
  type PtyChunkBridge,
} from '../../src/orchestrator-focus-pane/focus-pane-ipc.js';

function makeFakeBroadcaster(): IConsoleBroadcaster & {
  emit(sessionName: string, chunk: string): void;
} {
  const observers = new Set<(sessionName: string, chunk: string) => void>();
  return {
    addStdoutObserver(fn) {
      observers.add(fn);
      return () => {
        observers.delete(fn);
      };
    },
    emit(sessionName: string, chunk: string) {
      observers.forEach((o) => o(sessionName, chunk));
    },
  };
}

function makeFakeWebContents(): IWebContents & { sends: Array<{ channel: string; payload: unknown }> } {
  const sends: Array<{ channel: string; payload: unknown }> = [];
  return {
    send(channel: string, payload?: unknown) {
      sends.push({ channel, payload });
    },
    sends,
  };
}

function makeBridgeFromMainCollector(wc: ReturnType<typeof makeFakeWebContents>): PtyChunkBridge {
  // Renderer-side adapter: walks the main-collector's 'coarchitect:ptyChunk'
  // sends and re-emits them to subscribed listeners. This is the
  // ipcMain.send → ipcRenderer.on seam under test.
  const handlers = new Set<(chunk: string) => void>();
  // Patch wc.send so each new send fans out to subscribed listeners.
  const originalSend = wc.send.bind(wc);
  wc.send = (channel: string, payload?: unknown) => {
    originalSend(channel, payload);
    if (channel === 'coarchitect:ptyChunk' && typeof payload === 'string') {
      handlers.forEach((h) => h(payload));
    }
  };
  return {
    onPtyChunk(cb) {
      handlers.add(cb);
      return () => {
        handlers.delete(cb);
      };
    },
  };
}

describe('MB-T-MVP-W1 WB6 — end-to-end orchestrator pty broadcast pipeline', () => {
  it('a chunk emitted on __orchestrator_active reaches the focus-pane terminal target via the real pty-stream-relay + consumer', () => {
    const broadcaster = makeFakeBroadcaster();
    const wc = makeFakeWebContents();
    const bridge = makeBridgeFromMainCollector(wc);

    const dispose = registerPtyRelay({
      broadcaster,
      getWebContents: () => [wc],
    });

    const writes: string[] = [];
    const consumerDispose = consumePtyChunkStream(bridge, {
      write(chunk) {
        writes.push(chunk);
      },
    });

    broadcaster.emit('__orchestrator_active', 'first orchestrator chunk\n');
    broadcaster.emit('__orchestrator_active', 'second chunk with [PROBE] tokens\n');

    expect(writes).toEqual([
      'first orchestrator chunk\n',
      'second chunk with [PROBE] tokens\n',
    ]);
    expect(wc.sends.some((s) => s.channel === 'coarchitect:ptyChunk')).toBe(true);

    consumerDispose();
    dispose();
  });

  it('a chunk emitted on a NON-orchestrator session is filtered out by pty-stream-relay (line 48) and never reaches the focus-pane', () => {
    const broadcaster = makeFakeBroadcaster();
    const wc = makeFakeWebContents();
    const bridge = makeBridgeFromMainCollector(wc);

    const dispose = registerPtyRelay({
      broadcaster,
      getWebContents: () => [wc],
    });

    const writes: string[] = [];
    const consumerDispose = consumePtyChunkStream(bridge, {
      write(chunk) {
        writes.push(chunk);
      },
    });

    // Emit chunks on a sibling tile (e.g. an active sub-session) and confirm
    // they're not delivered to the focus-pane.
    broadcaster.emit('sess-bg-worker-a', 'should-not-appear-in-focus-pane');
    broadcaster.emit('sess-bg-worker-b', 'also-should-not-appear');

    // Then emit one chunk on __orchestrator_active to prove the path works.
    broadcaster.emit('__orchestrator_active', 'real orchestrator output\n');

    expect(writes).toEqual(['real orchestrator output\n']);

    consumerDispose();
    dispose();
  });

  it('multiple chunks emitted in rapid sequence on __orchestrator_active preserve arrival order', () => {
    const broadcaster = makeFakeBroadcaster();
    const wc = makeFakeWebContents();
    const bridge = makeBridgeFromMainCollector(wc);

    const dispose = registerPtyRelay({
      broadcaster,
      getWebContents: () => [wc],
    });

    const writes: string[] = [];
    const consumerDispose = consumePtyChunkStream(bridge, {
      write(chunk) {
        writes.push(chunk);
      },
    });

    const expected: string[] = [];
    for (let i = 0; i < 25; i++) {
      const chunk = `chunk-${i}\n`;
      expected.push(chunk);
      broadcaster.emit('__orchestrator_active', chunk);
    }

    expect(writes).toEqual(expected);

    consumerDispose();
    dispose();
  });

  it('disposing the consumer stops new chunks from reaching the target while the relay keeps broadcasting to webContents', () => {
    const broadcaster = makeFakeBroadcaster();
    const wc = makeFakeWebContents();
    const bridge = makeBridgeFromMainCollector(wc);

    const dispose = registerPtyRelay({
      broadcaster,
      getWebContents: () => [wc],
    });

    const writes: string[] = [];
    const consumerDispose = consumePtyChunkStream(bridge, {
      write(chunk) {
        writes.push(chunk);
      },
    });

    broadcaster.emit('__orchestrator_active', 'pre-dispose chunk\n');
    consumerDispose();
    broadcaster.emit('__orchestrator_active', 'post-dispose chunk\n');

    // Consumer no longer receives — but the relay still fan-outs to webContents.
    expect(writes).toEqual(['pre-dispose chunk\n']);
    const ptyChunks = wc.sends.filter((s) => s.channel === 'coarchitect:ptyChunk');
    expect(ptyChunks.length).toBe(2);

    dispose();
  });

  it('disposing the relay stops further fan-out even from __orchestrator_active', () => {
    const broadcaster = makeFakeBroadcaster();
    const wc = makeFakeWebContents();
    const bridge = makeBridgeFromMainCollector(wc);

    const dispose = registerPtyRelay({
      broadcaster,
      getWebContents: () => [wc],
    });

    const writes: string[] = [];
    consumePtyChunkStream(bridge, {
      write(chunk) {
        writes.push(chunk);
      },
    });

    broadcaster.emit('__orchestrator_active', 'before relay-dispose\n');
    dispose();
    broadcaster.emit('__orchestrator_active', 'after relay-dispose\n');

    // Only the pre-dispose chunk reaches the consumer.
    expect(writes).toEqual(['before relay-dispose\n']);
  });
});
