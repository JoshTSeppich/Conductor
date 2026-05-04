// MB-F-#83 RED — workstationBridge.onSpawnResult listener attach + cleanup.
//
// Operator-acked spike (helper-vs-inline RED arbitration): a tiny pure helper
// `attachSpawnResultListener(ipcLike, cb): cleanup` is extracted to
// src/main/spawn-result-listener.ts. preload.mts wires it inline within the
// workstationBridge object literal:
//
//   onSpawnResult: (cb) => attachSpawnResultListener(ipcRenderer, cb)
//
// Runtime contract preserves the coarchitectBridge.onStream* pattern (subscribe
// via ipcRenderer.on, return cleanup). The helper is a pure function over a
// minimal ipc-like interface, so this spec runs without booting Electron and
// without any vi.mock('electron') boilerplate (zero precedent in the workstation
// test suite). Mirrors console-t02/test_preload_listener_cleanup.spec.ts shape.
//
// RED state: src/main/spawn-result-listener.ts does not exist; import fails.
// GREEN state: helper module exists, listener registers under
// 'workstation:spawn-result' channel, wrapper unwraps the event arg, cleanup
// removes the listener.
import { describe, it, expect } from 'vitest';
import {
  attachSpawnResultListener,
  type SpawnResultIpc,
} from '../../../src/main/spawn-result-listener.js';

interface SuccessReply {
  type: 'success';
  result: { sessionName: string };
}
interface ErrorReply {
  type: 'error';
  error: { error_type: string; message: string };
}
type AnyReply = SuccessReply | ErrorReply;

function makeFakeIpc(): {
  ipc: SpawnResultIpc;
  fire(reply: unknown): void;
  countFor(channel: string): number;
} {
  const listeners = new Map<
    string,
    Set<(event: unknown, ...args: unknown[]) => void>
  >();
  const ipc: SpawnResultIpc = {
    on: (channel, cb) => {
      const set = listeners.get(channel) ?? new Set();
      set.add(cb);
      listeners.set(channel, set);
    },
    removeListener: (channel, cb) => {
      const set = listeners.get(channel);
      if (set) set.delete(cb);
    },
  };
  return {
    ipc,
    fire(reply) {
      const set = listeners.get('workstation:spawn-result');
      if (!set) return;
      for (const cb of set) cb({}, reply);
    },
    countFor(ch) {
      return listeners.get(ch)?.size ?? 0;
    },
  };
}

describe('MB-F-#83 — attachSpawnResultListener', () => {
  it('registers listener on workstation:spawn-result channel', () => {
    const fake = makeFakeIpc();
    const seen: AnyReply[] = [];
    attachSpawnResultListener<AnyReply>(fake.ipc, (r) => seen.push(r));

    expect(fake.countFor('workstation:spawn-result')).toBe(1);
    // Defense: not registering on the wrong channel.
    expect(fake.countFor('coarchitect:streamChunk')).toBe(0);
  });

  it('forwards success reply payload to callback (event arg unwrapped)', () => {
    const fake = makeFakeIpc();
    const seen: AnyReply[] = [];
    attachSpawnResultListener<AnyReply>(fake.ipc, (r) => seen.push(r));

    const success: SuccessReply = {
      type: 'success',
      result: { sessionName: 'foo' },
    };
    fake.fire(success);

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual(success);
  });

  it('forwards error reply payload to callback', () => {
    const fake = makeFakeIpc();
    const seen: AnyReply[] = [];
    attachSpawnResultListener<AnyReply>(fake.ipc, (r) => seen.push(r));

    const err: ErrorReply = {
      type: 'error',
      error: { error_type: 'SessionCapExceeded', message: 'cap reached' },
    };
    fake.fire(err);

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual(err);
  });

  it('returns cleanup function that removes the listener', () => {
    const fake = makeFakeIpc();
    const cleanup = attachSpawnResultListener<AnyReply>(fake.ipc, () => {});
    expect(fake.countFor('workstation:spawn-result')).toBe(1);
    expect(typeof cleanup).toBe('function');

    cleanup();
    expect(fake.countFor('workstation:spawn-result')).toBe(0);
  });

  it('repeated subscribe/cleanup cycles do not leak handlers', () => {
    const fake = makeFakeIpc();
    for (let i = 0; i < 25; i++) {
      const cleanup = attachSpawnResultListener<AnyReply>(fake.ipc, () => {});
      cleanup();
    }
    expect(fake.countFor('workstation:spawn-result')).toBe(0);
  });
});
