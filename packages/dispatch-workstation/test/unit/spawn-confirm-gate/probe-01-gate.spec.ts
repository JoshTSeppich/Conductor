// MB-T24 WB4a probe-01 — SpawnConfirmGate state machine.
//
// Operator-confirmed Q-MBT24-5=c (hard gate at spawn-ipc.ts) re-disposed
// at HALT 0 2026-05-08. Closes acceptance bullets 2 + 3:
//   - "Auto mode bypasses spawn confirmation"
//   - "Ask mode surfaces quick-pick before each spawn"
//
// SpawnConfirmGate is the pure-fn state machine for the gate. It is
// invoked by spawn-ipc.ts handle('workstation:spawn-requested') and
// handle('workstation:spawn-confirm-response'). probe-02 (WB4b) will
// add the integration test that exercises this gate through real
// SpawnIpcController + workstation-shell renderer interaction.

import { describe, it, expect, vi } from 'vitest';
import {
  SpawnConfirmGate,
  type SpawnConfirmEventSink,
} from '../../../src/main/spawn-confirm-gate.js';
import type { DispatchMode } from '../../../src/main/dispatch-mode-store.js';
import type { SpawnSessionRequest } from '../../../src/main/spawn-handler.js';

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
  sessionName: 'sess-x',
};

describe('MB-T24 WB4a — SpawnConfirmGate.decide auto mode', () => {
  it("returns 'fire-now' when readDispatchMode returns 'auto'", () => {
    const gate = new SpawnConfirmGate({
      readDispatchMode: () => 'auto' as DispatchMode,
    });
    const { event, sends } = makeFakeEvent();
    const onConfirm = vi.fn();

    const result = gate.decide(event, samplePayload, onConfirm);

    expect(result).toBe('fire-now');
    expect(sends).toHaveLength(0); // no confirm-required emitted
    expect(onConfirm).not.toHaveBeenCalled();
    expect(gate.pendingSize()).toBe(0);
  });

  it("does NOT cache pending spawns in 'auto' mode", () => {
    const gate = new SpawnConfirmGate({
      readDispatchMode: () => 'auto' as DispatchMode,
    });
    const { event } = makeFakeEvent();
    gate.decide(event, samplePayload, vi.fn());
    gate.decide(event, samplePayload, vi.fn());
    gate.decide(event, samplePayload, vi.fn());
    expect(gate.pendingSize()).toBe(0);
  });
});

describe('MB-T24 WB4a — SpawnConfirmGate.decide ask mode', () => {
  it("returns 'await-confirm' when readDispatchMode returns 'ask'", () => {
    const gate = new SpawnConfirmGate({
      readDispatchMode: () => 'ask' as DispatchMode,
      genRequestId: () => 'req-001',
    });
    const { event, sends } = makeFakeEvent();
    const onConfirm = vi.fn();

    const result = gate.decide(event, samplePayload, onConfirm);

    expect(result).toBe('await-confirm');
    expect(onConfirm).not.toHaveBeenCalled(); // not yet
    expect(gate.pendingSize()).toBe(1);
  });

  it("emits 'workstation:spawn-confirm-required' with requestId + payload", () => {
    const gate = new SpawnConfirmGate({
      readDispatchMode: () => 'ask' as DispatchMode,
      genRequestId: () => 'req-abc',
    });
    const { event, sends } = makeFakeEvent();

    gate.decide(event, samplePayload, vi.fn());

    expect(sends).toHaveLength(1);
    expect(sends[0]!.channel).toBe('workstation:spawn-confirm-required');
    expect(sends[0]!.payload).toEqual({
      requestId: 'req-abc',
      repoPath: '/path/to/repo',
      sessionName: 'sess-x',
    });
  });

  it("re-reads dispatchMode per decide() (honors live flips)", () => {
    let mode: DispatchMode = 'ask';
    const gate = new SpawnConfirmGate({
      readDispatchMode: () => mode,
      genRequestId: () => 'req-001',
    });
    const { event } = makeFakeEvent();

    expect(gate.decide(event, samplePayload, vi.fn())).toBe('await-confirm');
    mode = 'auto';
    expect(gate.decide(event, samplePayload, vi.fn())).toBe('fire-now');
    mode = 'ask';
    expect(gate.decide(event, samplePayload, vi.fn())).toBe('await-confirm');
  });

  it("each ask-decide() generates a fresh requestId", () => {
    let counter = 0;
    const gate = new SpawnConfirmGate({
      readDispatchMode: () => 'ask' as DispatchMode,
      genRequestId: () => `req-${++counter}`,
    });
    const { event, sends } = makeFakeEvent();

    gate.decide(event, samplePayload, vi.fn());
    gate.decide(event, samplePayload, vi.fn());

    expect(sends).toHaveLength(2);
    expect((sends[0]!.payload as { requestId: string }).requestId).toBe(
      'req-1',
    );
    expect((sends[1]!.payload as { requestId: string }).requestId).toBe(
      'req-2',
    );
    expect(gate.pendingSize()).toBe(2);
  });
});

describe('MB-T24 WB4a — SpawnConfirmGate.handleResponse', () => {
  it("'confirm' fires the cached onConfirm + clears pending entry", () => {
    const gate = new SpawnConfirmGate({
      readDispatchMode: () => 'ask' as DispatchMode,
      genRequestId: () => 'req-001',
    });
    const { event } = makeFakeEvent();
    const onConfirm = vi.fn();
    gate.decide(event, samplePayload, onConfirm);

    expect(gate.pendingSize()).toBe(1);
    const result = gate.handleResponse('req-001', 'confirm');

    expect(result).toBe('fired');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(gate.pendingSize()).toBe(0);
  });

  it("'cancel' discards cached entry WITHOUT firing onConfirm", () => {
    const gate = new SpawnConfirmGate({
      readDispatchMode: () => 'ask' as DispatchMode,
      genRequestId: () => 'req-001',
    });
    const { event } = makeFakeEvent();
    const onConfirm = vi.fn();
    gate.decide(event, samplePayload, onConfirm);

    const result = gate.handleResponse('req-001', 'cancel');

    expect(result).toBe('cancelled');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(gate.pendingSize()).toBe(0);
  });

  it("returns 'unknown' for stale/duplicate requestId", () => {
    const gate = new SpawnConfirmGate({
      readDispatchMode: () => 'ask' as DispatchMode,
      genRequestId: () => 'req-001',
    });
    const { event } = makeFakeEvent();
    const onConfirm = vi.fn();
    gate.decide(event, samplePayload, onConfirm);
    gate.handleResponse('req-001', 'confirm'); // first response: fires
    expect(onConfirm).toHaveBeenCalledTimes(1);

    // Duplicate response for the same requestId → unknown, no double-fire.
    const result = gate.handleResponse('req-001', 'confirm');
    expect(result).toBe('unknown');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("returns 'unknown' when requestId never existed", () => {
    const gate = new SpawnConfirmGate({
      readDispatchMode: () => 'ask' as DispatchMode,
    });
    expect(gate.handleResponse('never-was', 'confirm')).toBe('unknown');
    expect(gate.handleResponse('never-was', 'cancel')).toBe('unknown');
  });

  it("multi-pending: each requestId resolves independently", () => {
    let counter = 0;
    const gate = new SpawnConfirmGate({
      readDispatchMode: () => 'ask' as DispatchMode,
      genRequestId: () => `req-${++counter}`,
    });
    const { event } = makeFakeEvent();
    const onConfirm1 = vi.fn();
    const onConfirm2 = vi.fn();
    const onConfirm3 = vi.fn();
    gate.decide(event, samplePayload, onConfirm1);
    gate.decide(event, samplePayload, onConfirm2);
    gate.decide(event, samplePayload, onConfirm3);

    expect(gate.pendingSize()).toBe(3);
    gate.handleResponse('req-2', 'confirm'); // fires #2 only
    expect(onConfirm1).not.toHaveBeenCalled();
    expect(onConfirm2).toHaveBeenCalledTimes(1);
    expect(onConfirm3).not.toHaveBeenCalled();
    expect(gate.pendingSize()).toBe(2);

    gate.handleResponse('req-1', 'cancel'); // cancels #1
    gate.handleResponse('req-3', 'confirm'); // fires #3
    expect(onConfirm1).not.toHaveBeenCalled();
    expect(onConfirm3).toHaveBeenCalledTimes(1);
    expect(gate.pendingSize()).toBe(0);
  });
});
