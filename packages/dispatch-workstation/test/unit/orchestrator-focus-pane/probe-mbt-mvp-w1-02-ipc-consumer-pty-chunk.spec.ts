// MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE WB2 probe-02 — IPC consumer (coarchitect:ptyChunk).
//
// Verifies the renderer-side IPC consumer wiring per arbitration Q-MVP-W1-1=(a)
// (operator ack 17:55 MDT) — reuse the existing `coarchitect:ptyChunk`
// broadcast emitted by pty-stream-relay.ts:52. pty-stream-relay already
// filters for `__orchestrator_active` on the main-process side
// (pty-stream-relay.ts:48), so renderer receives only orchestrator chunks;
// no renderer-side filter is required.
//
// This probe tests the consumer module in isolation (pure-fn surface, no
// React/JSX/DOM) — the FocusPane component integration is exercised at
// WB6 probe-06 (integration test).

import { describe, it, expect, vi } from 'vitest';
import {
  consumePtyChunkStream,
  getDefaultPtyChunkBridge,
  type PtyChunkBridge,
} from '../../../src/orchestrator-focus-pane/focus-pane-ipc.js';

function makeFakeBridge(): PtyChunkBridge & {
  emit(chunk: string): void;
  listenerCount(): number;
} {
  const handlers = new Set<(chunk: string) => void>();
  return {
    onPtyChunk(cb) {
      handlers.add(cb);
      return () => {
        handlers.delete(cb);
      };
    },
    emit(chunk: string) {
      handlers.forEach((h) => h(chunk));
    },
    listenerCount() {
      return handlers.size;
    },
  };
}

describe('MB-T-MVP-W1 WB2 — consumePtyChunkStream subscription lifecycle', () => {
  it('subscribes to the bridge exactly once on registration', () => {
    const bridge = makeFakeBridge();
    expect(bridge.listenerCount()).toBe(0);
    consumePtyChunkStream(bridge, { write: vi.fn() });
    expect(bridge.listenerCount()).toBe(1);
  });

  it('forwards each emitted chunk to target.write in arrival order', () => {
    const bridge = makeFakeBridge();
    const target = { write: vi.fn() };
    consumePtyChunkStream(bridge, target);

    bridge.emit('hello ');
    bridge.emit('world\n');
    bridge.emit('next line');

    expect(target.write).toHaveBeenCalledTimes(3);
    expect(target.write.mock.calls).toEqual([['hello '], ['world\n'], ['next line']]);
  });

  it('cleanup-fn returned by consumePtyChunkStream unsubscribes from the bridge', () => {
    const bridge = makeFakeBridge();
    const target = { write: vi.fn() };
    const dispose = consumePtyChunkStream(bridge, target);
    expect(bridge.listenerCount()).toBe(1);

    dispose();
    expect(bridge.listenerCount()).toBe(0);

    bridge.emit('post-dispose chunk');
    expect(target.write).not.toHaveBeenCalled();
  });

  it('multiple consumers can subscribe to the same bridge independently', () => {
    const bridge = makeFakeBridge();
    const a = { write: vi.fn() };
    const b = { write: vi.fn() };
    consumePtyChunkStream(bridge, a);
    consumePtyChunkStream(bridge, b);

    bridge.emit('fanout');
    expect(a.write).toHaveBeenCalledWith('fanout');
    expect(b.write).toHaveBeenCalledWith('fanout');
  });

  it('does NOT call target.write before any chunk is emitted', () => {
    const bridge = makeFakeBridge();
    const target = { write: vi.fn() };
    consumePtyChunkStream(bridge, target);
    expect(target.write).not.toHaveBeenCalled();
  });
});

describe('MB-T-MVP-W1 WB2 — getDefaultPtyChunkBridge factory', () => {
  it('returns null when window.coarchitectBridge is undefined', () => {
    const savedBridge = (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge;
    delete (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge;
    try {
      expect(getDefaultPtyChunkBridge()).toBeNull();
    } finally {
      if (savedBridge !== undefined) {
        (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge = savedBridge;
      }
    }
  });

  it('returns null when window.coarchitectBridge.onStreamChunk is not a function', () => {
    const savedBridge = (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge;
    (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge = { foo: 'bar' };
    try {
      expect(getDefaultPtyChunkBridge()).toBeNull();
    } finally {
      if (savedBridge !== undefined) {
        (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge = savedBridge;
      } else {
        delete (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge;
      }
    }
  });

  it('returns a PtyChunkBridge wired to coarchitectBridge.onStreamChunk when available', () => {
    const handlers = new Set<(chunk: string) => void>();
    const fakeWindowBridge = {
      onStreamChunk: vi.fn((cb: (chunk: string) => void) => {
        handlers.add(cb);
        return () => handlers.delete(cb);
      }),
    };
    const savedBridge = (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge;
    (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge = fakeWindowBridge;
    try {
      const bridge = getDefaultPtyChunkBridge();
      expect(bridge).not.toBeNull();

      const writes: string[] = [];
      const dispose = bridge!.onPtyChunk((chunk) => writes.push(chunk));

      // The default bridge delegates to the underlying coarchitectBridge.
      expect(fakeWindowBridge.onStreamChunk).toHaveBeenCalledTimes(1);
      expect(handlers.size).toBe(1);

      handlers.forEach((h) => h('chunk-A'));
      handlers.forEach((h) => h('chunk-B'));
      expect(writes).toEqual(['chunk-A', 'chunk-B']);

      dispose();
      expect(handlers.size).toBe(0);
    } finally {
      if (savedBridge !== undefined) {
        (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge = savedBridge;
      } else {
        delete (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge;
      }
    }
  });
});
