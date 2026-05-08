// MB-T36 WB1 — RED probe: fireSpawn dispatch-mode-aware implementation.
//
// Probe will FAIL against HEAD 7040cb5 for two reasons:
//   1. orchestrator-spawn-gate.ts does not exist — import throws ModuleNotFound
//   2. SpawnConfirmGate.decide() has no onCancel hook — case-3 ask+decline
//      would never resolve even if the module existed
//
// Cases per dispatch §2 WB1:
//   case-1: 'auto' mode — fires SpawnIpcController.handleSpawnRequest with
//           correct SpawnSessionRequest args, resolves { sessionName }
//   case-2: 'ask' mode — gates through SpawnConfirmGate; pendingSize=1 after
//           call; controller NOT fired until confirm; resolves { sessionName }
//           after gate.handleResponse(id, 'confirm')
//   case-3: 'ask' mode, operator cancel — controller NOT fired, promise
//           resolves { declined: true } after gate.handleResponse(id, 'cancel')
//   case-4: regression — SpawnConfirmGate.decide() still returns 'fire-now'
//           in auto mode (backward-compatible after onCancel extension in WB2)
//
// MODELED: SpawnReply discriminant is { type: 'success' | 'error' }, not
// { ok: true | false } (dispatch §6 round-7: dispatch cited reply.ok but
// actual spawn-ipc.ts lines 54-73 use type discriminant).

import { describe, it, expect, vi } from 'vitest';
import { SpawnConfirmGate } from '../../../src/main/spawn-confirm-gate.js';
import { fireOrchestratorSpawn } from '../../../src/main/orchestrator-spawn-gate.js';

// ─── case-1: auto mode ────────────────────────────────────────────────────────

describe('fireOrchestratorSpawn — case-1: auto mode', () => {
  it('fires handleSpawnRequest with correct SpawnSessionRequest and resolves {sessionName}', async () => {
    const handleSpawnRequest = vi.fn().mockResolvedValue({
      type: 'success',
      result: { sessionName: 'auto-sess' },
    });
    const getController = vi.fn().mockResolvedValue({ handleSpawnRequest });
    const readDispatchMode = vi.fn().mockReturnValue('auto');
    const gate = new SpawnConfirmGate({ readDispatchMode });
    const broadcast = vi.fn();

    const result = await fireOrchestratorSpawn(
      { sessionName: 'auto-sess', repoPath: '/repo/proj' },
      { readDispatchMode, getController, spawnConfirmGate: gate, broadcast },
    );

    expect(handleSpawnRequest).toHaveBeenCalledOnce();
    expect(handleSpawnRequest).toHaveBeenCalledWith({
      sessionName: 'auto-sess',
      repoPath: '/repo/proj',
    });
    expect(result).toEqual({ sessionName: 'auto-sess' });
    // auto mode never touches the confirm-required channel
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('propagates controller error as thrown Error', async () => {
    const handleSpawnRequest = vi.fn().mockResolvedValue({
      type: 'error',
      error: { error_type: 'SessionNameExists', message: 'already exists' },
    });
    const getController = vi.fn().mockResolvedValue({ handleSpawnRequest });
    const readDispatchMode = vi.fn().mockReturnValue('auto');
    const gate = new SpawnConfirmGate({ readDispatchMode });

    await expect(
      fireOrchestratorSpawn(
        { sessionName: 'dup-sess', repoPath: '/repo' },
        {
          readDispatchMode,
          getController,
          spawnConfirmGate: gate,
          broadcast: vi.fn(),
        },
      ),
    ).rejects.toThrow('SessionNameExists');
  });
});

// ─── case-2: ask mode + confirm ───────────────────────────────────────────────

describe('fireOrchestratorSpawn — case-2: ask mode + operator confirm', () => {
  it('gates spawn, broadcasts confirm-required, resolves {sessionName} after handleResponse confirm', async () => {
    const KNOWN_ID = 'probe-req-02';
    const handleSpawnRequest = vi.fn().mockResolvedValue({
      type: 'success',
      result: { sessionName: 'ask-sess' },
    });
    const getController = vi.fn().mockResolvedValue({ handleSpawnRequest });
    const readDispatchMode = vi.fn().mockReturnValue('ask');
    const gate = new SpawnConfirmGate({
      readDispatchMode,
      genRequestId: () => KNOWN_ID,
    });
    const broadcast = vi.fn();

    // Start the spawn — does NOT resolve until operator confirms
    const firePromise = fireOrchestratorSpawn(
      { sessionName: 'ask-sess', repoPath: '/repo/proj' },
      { readDispatchMode, getController, spawnConfirmGate: gate, broadcast },
    );

    // Synchronous assertions: decide() runs inside the Promise constructor
    // before fireOrchestratorSpawn() yields control.
    expect(broadcast).toHaveBeenCalledOnce();
    expect(broadcast).toHaveBeenCalledWith('workstation:spawn-confirm-required', {
      requestId: KNOWN_ID,
      repoPath: '/repo/proj',
      sessionName: 'ask-sess',
    });
    expect(gate.pendingSize()).toBe(1);
    expect(handleSpawnRequest).not.toHaveBeenCalled();

    // Simulate operator clicking Confirm in the renderer modal
    gate.handleResponse(KNOWN_ID, 'confirm');

    const result = await firePromise;
    expect(result).toEqual({ sessionName: 'ask-sess' });
    expect(handleSpawnRequest).toHaveBeenCalledOnce();
    expect(handleSpawnRequest).toHaveBeenCalledWith({
      sessionName: 'ask-sess',
      repoPath: '/repo/proj',
    });
    expect(gate.pendingSize()).toBe(0);
  });
});

// ─── case-3: ask mode + cancel ────────────────────────────────────────────────

describe('fireOrchestratorSpawn — case-3: ask mode + operator cancel', () => {
  it('does NOT fire controller, resolves {declined: true} after handleResponse cancel', async () => {
    const KNOWN_ID = 'probe-req-03';
    const handleSpawnRequest = vi.fn();
    const getController = vi.fn().mockResolvedValue({ handleSpawnRequest });
    const readDispatchMode = vi.fn().mockReturnValue('ask');
    const gate = new SpawnConfirmGate({
      readDispatchMode,
      genRequestId: () => KNOWN_ID,
    });
    const broadcast = vi.fn();

    const firePromise = fireOrchestratorSpawn(
      { sessionName: 'ask-sess', repoPath: '/repo/proj' },
      { readDispatchMode, getController, spawnConfirmGate: gate, broadcast },
    );

    // Gate has 1 pending entry; controller not yet fired
    expect(gate.pendingSize()).toBe(1);
    expect(handleSpawnRequest).not.toHaveBeenCalled();

    // Simulate operator clicking Cancel
    gate.handleResponse(KNOWN_ID, 'cancel');

    const result = await firePromise;
    // Spawn must NOT have fired
    expect(handleSpawnRequest).not.toHaveBeenCalled();
    // Promise resolves with { declined: true } (not a rejection)
    expect(result).toEqual({ declined: true });
    expect(gate.pendingSize()).toBe(0);
  });
});

// ─── case-4: regression — SpawnConfirmGate.decide() backward compat ───────────

describe('fireOrchestratorSpawn — case-4: SpawnConfirmGate operator-path regression', () => {
  it('decide() returns fire-now in auto mode after onCancel extension (backward compat)', () => {
    const readDispatchMode = vi.fn().mockReturnValue('auto');
    const gate = new SpawnConfirmGate({ readDispatchMode });
    const onConfirm = vi.fn();
    const eventSink = { send: vi.fn() };

    const decision = gate.decide(
      eventSink,
      { sessionName: 'op-sess', repoPath: '/repo' },
      onConfirm,
      // onCancel omitted — existing operator path passes 3 args
    );

    expect(decision).toBe('fire-now');
    expect(eventSink.send).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('decide() in ask mode still caches pending without onCancel (3-arg legacy call)', () => {
    const KNOWN_ID = 'probe-req-04-legacy';
    const readDispatchMode = vi.fn().mockReturnValue('ask');
    const gate = new SpawnConfirmGate({
      readDispatchMode,
      genRequestId: () => KNOWN_ID,
    });
    const onConfirm = vi.fn();
    const eventSink = { send: vi.fn() };

    const decision = gate.decide(
      eventSink,
      { sessionName: 'op-sess', repoPath: '/repo' },
      onConfirm,
      // no onCancel — 3-arg legacy form, must not throw
    );

    expect(decision).toBe('await-confirm');
    expect(gate.pendingSize()).toBe(1);

    // Cancel with no onCancel: must not throw; returns 'cancelled'
    const cancelResult = gate.handleResponse(KNOWN_ID, 'cancel');
    expect(cancelResult).toBe('cancelled');
    expect(gate.pendingSize()).toBe(0);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
