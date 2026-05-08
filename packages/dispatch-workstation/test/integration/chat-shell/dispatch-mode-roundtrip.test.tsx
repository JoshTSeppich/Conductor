// MB-T24 WB4b — dispatch-mode roundtrip integration test.
//
// Operator-confirmed Q-MBT24-5=c (hard gate at spawn-ipc.ts) at HALT 0
// 2026-05-08. Exercises the full composition of:
//
//   dispatch-mode-store (file-JSON persistence per Q-MBT24-1=a)
//   ↓
//   dispatch-mode-ipc.ts (DispatchModeIpcController, dispatch-mode:get +
//                         dispatch-mode:set channels per Q-MBT24-6=c)
//   ↑                       ↓
//   dispatchModeBridge       spawn-ipc.ts gate reads readDispatchMode()
//   (renderer)               directly (main-side, no IPC roundtrip)
//                            ↓
//                            SpawnConfirmGate.decide
//                            ↓ (when 'ask')
//                            'workstation:spawn-confirm-required'
//                            (renderer surfaces modal)
//                            ↓ operator clicks
//                            'workstation:spawn-confirm-response'
//                            ↓
//                            SpawnConfirmGate.handleResponse → fires
//                                                              onConfirm
//
// Both modes asserted end-to-end against tmpdir-isolated dispatch-mode
// store + fake ipcMain + fake spawn-handler.
//
// happy-dom only; no Electron boot. Per CLAUDE.md §3.6, integration test
// path is test/integration/chat-shell/ for chat-shell-domain integration.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DispatchModeIpcController,
  type DispatchModeIpcMain,
} from '../../../src/main/dispatch-mode-ipc.js';
import {
  readDispatchMode,
  writeDispatchMode,
  type DispatchMode,
} from '../../../src/main/dispatch-mode-store.js';
import {
  SpawnConfirmGate,
  type SpawnConfirmEventSink,
} from '../../../src/main/spawn-confirm-gate.js';
import type { SpawnSessionRequest } from '../../../src/main/spawn-handler.js';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

interface FakeIpcMain extends DispatchModeIpcMain {
  registered: Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  >;
}

function makeFakeIpcMain(): FakeIpcMain {
  const registered = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  >();
  return {
    registered,
    handle: (channel, fn) => {
      registered.set(channel, fn);
    },
  };
}

function makeFakeEvent(): {
  event: SpawnConfirmEventSink;
  sends: Array<{ channel: string; payload: unknown }>;
} {
  const sends: Array<{ channel: string; payload: unknown }> = [];
  return {
    event: {
      send: (channel, payload) => {
        sends.push({ channel, payload });
      },
    },
    sends,
  };
}

const samplePayload: SpawnSessionRequest = {
  repoPath: '/path/to/repo',
  sessionName: 'sess-int',
};

let stateDir: string;

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), 'mb-t24-roundtrip-'));
  process.env['MB_DISPATCH_MODE_STATE_DIR'] = stateDir;
});

afterEach(() => {
  delete process.env['MB_DISPATCH_MODE_STATE_DIR'];
  rmSync(stateDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: 'auto' mode roundtrip — bridge set → store persists → gate fires now
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T24 WB4b — dispatch-mode roundtrip: auto mode', () => {
  it('bridge set auto → store persists → gate fires immediately', async () => {
    // Step 1: set 'auto' via dispatchModeBridge → IPC → store
    const ctl = new DispatchModeIpcController({
      read: readDispatchMode,
      write: writeDispatchMode,
    });
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const setHandler = ipc.registered.get('dispatch-mode:set')!;

    const echoed = await setHandler(null, { mode: 'auto' });
    expect(echoed).toBe('auto');

    // Step 2: verify next get sees 'auto'
    const getHandler = ipc.registered.get('dispatch-mode:get')!;
    expect(await getHandler(null)).toBe('auto');

    // Step 3: spawn gate sees 'auto' → fire-now
    const gate = new SpawnConfirmGate({ readDispatchMode });
    const { event, sends } = makeFakeEvent();
    const onConfirm = vi.fn();

    const decision = gate.decide(event, samplePayload, onConfirm);

    expect(decision).toBe('fire-now');
    expect(sends).toHaveLength(0); // no confirm-required emitted
    expect(onConfirm).not.toHaveBeenCalled(); // gate doesn't call onConfirm
                                              // for fire-now; caller does
    expect(gate.pendingSize()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: 'ask' mode roundtrip → confirm decision
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T24 WB4b — dispatch-mode roundtrip: ask mode + confirm', () => {
  it('bridge set ask → store persists → gate emits required → confirm fires onConfirm', async () => {
    // Step 1: set 'ask' via bridge IPC
    const ctl = new DispatchModeIpcController({
      read: readDispatchMode,
      write: writeDispatchMode,
    });
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const setHandler = ipc.registered.get('dispatch-mode:set')!;
    await setHandler(null, { mode: 'ask' });

    // Step 2: spawn gate sees 'ask' → await-confirm
    const gate = new SpawnConfirmGate({
      readDispatchMode,
      genRequestId: () => 'req-42',
    });
    const { event, sends } = makeFakeEvent();
    const onConfirm = vi.fn();

    const decision = gate.decide(event, samplePayload, onConfirm);

    expect(decision).toBe('await-confirm');
    expect(onConfirm).not.toHaveBeenCalled(); // not yet
    expect(sends).toHaveLength(1);
    expect(sends[0]!.channel).toBe('workstation:spawn-confirm-required');
    expect(sends[0]!.payload).toEqual({
      requestId: 'req-42',
      repoPath: '/path/to/repo',
      sessionName: 'sess-int',
    });

    // Step 3: simulate operator clicks Confirm
    const result = gate.handleResponse('req-42', 'confirm');

    expect(result).toBe('fired');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(gate.pendingSize()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: 'ask' mode roundtrip → cancel decision
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T24 WB4b — dispatch-mode roundtrip: ask mode + cancel', () => {
  it('bridge set ask → gate emits required → cancel discards (onConfirm NOT fired)', async () => {
    const ctl = new DispatchModeIpcController({
      read: readDispatchMode,
      write: writeDispatchMode,
    });
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const setHandler = ipc.registered.get('dispatch-mode:set')!;
    await setHandler(null, { mode: 'ask' });

    const gate = new SpawnConfirmGate({
      readDispatchMode,
      genRequestId: () => 'req-cancel',
    });
    const { event } = makeFakeEvent();
    const onConfirm = vi.fn();

    gate.decide(event, samplePayload, onConfirm);
    expect(gate.pendingSize()).toBe(1);

    const result = gate.handleResponse('req-cancel', 'cancel');

    expect(result).toBe('cancelled');
    expect(onConfirm).not.toHaveBeenCalled(); // spawn never fires
    expect(gate.pendingSize()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: persistence survives "process restart" — store on disk, not memory
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T24 WB4b — dispatch-mode persistence across restart', () => {
  it("written 'auto' survives readDispatchMode after fresh import call", () => {
    writeDispatchMode('auto');
    expect(readDispatchMode()).toBe('auto');

    // Fresh state — no in-memory caching layer between reads.
    expect(readDispatchMode()).toBe('auto');
    expect(readDispatchMode()).toBe('auto');
  });

  it("written 'ask' survives + can flip back to 'auto'", () => {
    writeDispatchMode('ask');
    expect(readDispatchMode()).toBe('ask');

    writeDispatchMode('auto');
    expect(readDispatchMode()).toBe('auto');

    writeDispatchMode('ask');
    expect(readDispatchMode()).toBe('ask');
  });

  it("first read with no file returns 'ask' default (Q-MBT24-2=a)", () => {
    // No writeDispatchMode call — fresh tmpdir per beforeEach.
    expect(readDispatchMode()).toBe('ask');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: live-flip — gate honors mode change between two spawns
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T24 WB4b — live-flip: gate honors mode change between spawns', () => {
  it('mode flips auto → ask → auto and gate decision tracks each flip', async () => {
    const ctl = new DispatchModeIpcController({
      read: readDispatchMode,
      write: writeDispatchMode,
    });
    const ipc = makeFakeIpcMain();
    ctl.registerHandlers(ipc);
    const setHandler = ipc.registered.get('dispatch-mode:set')!;

    let counter = 0;
    const gate = new SpawnConfirmGate({
      readDispatchMode,
      genRequestId: () => `req-${++counter}`,
    });
    const { event } = makeFakeEvent();

    // Spawn 1: auto
    await setHandler(null, { mode: 'auto' as DispatchMode });
    expect(gate.decide(event, samplePayload, vi.fn())).toBe('fire-now');

    // Spawn 2: flip to ask
    await setHandler(null, { mode: 'ask' as DispatchMode });
    expect(gate.decide(event, samplePayload, vi.fn())).toBe('await-confirm');

    // Spawn 3: flip back to auto
    await setHandler(null, { mode: 'auto' as DispatchMode });
    expect(gate.decide(event, samplePayload, vi.fn())).toBe('fire-now');
  });
});
