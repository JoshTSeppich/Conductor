// MB-T24 WB4a — Operator-driven-spawn confirmation gate (Q-MBT24-5=c).
//
// Hard gate at spawn-ipc.ts handle('workstation:spawn-requested') per
// operator HALT 0 ack 2026-05-08 (Q-MBT24-5=c re-disposed from tentative
// (a) — soft system-prompt-injection — to (c) hard renderer-side gate at
// the only currently-firing spawn surface):
//
// > (c) is the only option that is testable end-to-end today (operator-
// > driven spawn is the only currently-firing spawn surface), provides a
// > real hard gate (not LLM-conditional), closes acceptance bullets 2 + 3
// > honestly without forcing "Capability enabled with known limitations"
// > framing, and stays in workstation-internal territory (no frozen-
// > contract amendment).
//
// Behavior:
//   1. Renderer fires 'workstation:spawn-requested' with payload as today.
//   2. spawn-ipc.ts handler invokes SpawnConfirmGate.decide(event, payload,
//      onConfirm).
//   3. Gate reads dispatchMode via injected deps.readDispatchMode():
//        - 'auto': returns 'fire-now'. spawn-ipc.ts proceeds with
//                  controller.handleSpawnRequest (existing flow).
//        - 'ask':  caches { event, payload, onConfirm } under a generated
//                  requestId, emits 'workstation:spawn-confirm-required'
//                  to the renderer with { requestId, repoPath, sessionName },
//                  returns 'await-confirm'. spawn-ipc.ts does NOT proceed.
//   4. Renderer renders confirmation modal (workstation-shell.html MB-T24
//      zone) with Confirm/Cancel buttons.
//   5. On click, renderer fires 'workstation:spawn-confirm-response' with
//      { requestId, decision: 'confirm' | 'cancel' }.
//   6. spawn-ipc.ts confirm-response handler invokes
//      SpawnConfirmGate.handleResponse(requestId, decision).
//   7. Gate looks up cached entry:
//        - 'confirm' + cache hit: invokes onConfirm() (which fires the
//          spawn through the controller using the original event), returns
//          'fired'.
//        - 'cancel' + cache hit: discards cache entry, returns 'cancelled'.
//          Renderer is responsible for closing the confirmation modal;
//          main does NOT send a spawn-result reply (operator cancellation
//          is silent — the spawn-modal close is the operator's signal that
//          they cancelled the operation).
//        - cache miss (stale or duplicate response): returns 'unknown';
//          no-op.
//
// Test seam: SpawnConfirmGate accepts { readDispatchMode } deps + an
// optional requestId generator (defaults to crypto.randomUUID). probe-02-
// dispatch-mode-gate exercises decide() + handleResponse() with FakeIpcMain
// + in-memory deps.

import { randomUUID } from 'node:crypto';
import type { DispatchMode } from './dispatch-mode-store.js';
import type { SpawnSessionRequest } from './spawn-handler.js';

/**
 * Minimal shape of the renderer-bound IPC event we send confirm-required
 * notifications over. Mirrors Electron's IpcMainEvent.sender.send surface.
 * Tests inject a fake.
 */
export interface SpawnConfirmEventSink {
  readonly send: (channel: string, payload: unknown) => void;
}

export interface SpawnConfirmRequiredPayload {
  readonly requestId: string;
  readonly repoPath: string;
  readonly sessionName: string;
}

export interface SpawnConfirmGateDeps {
  /** Read the persisted dispatch mode. Always called fresh per decision
   *  so flips while a spawn modal is open are honored. */
  readonly readDispatchMode: () => DispatchMode;
  /** Optional override for requestId generation (test seam). Defaults to
   *  crypto.randomUUID. */
  readonly genRequestId?: () => string;
}

export type SpawnConfirmDecision = 'confirm' | 'cancel';

export type DecideResult = 'fire-now' | 'await-confirm';

export type ResponseResult = 'fired' | 'cancelled' | 'unknown';

interface PendingSpawn {
  readonly event: SpawnConfirmEventSink;
  readonly payload: SpawnSessionRequest;
  readonly onConfirm: () => void;
  // MB-T36: orchestrator-fired spawn passes onCancel to resolve the awaiting
  // promise when the operator declines. Optional so the 3-arg operator-driven
  // path (registerSpawnIpcHandlers) is backward-compatible.
  readonly onCancel?: () => void;
}

export class SpawnConfirmGate {
  private readonly pending = new Map<string, PendingSpawn>();

  constructor(private readonly deps: SpawnConfirmGateDeps) {}

  /**
   * Decide what to do with an incoming 'workstation:spawn-requested':
   * fire immediately (auto mode) or surface a confirmation modal (ask).
   */
  decide(
    event: SpawnConfirmEventSink,
    payload: SpawnSessionRequest,
    onConfirm: () => void,
    onCancel?: () => void,
  ): DecideResult {
    const mode = this.deps.readDispatchMode();
    if (mode === 'auto') return 'fire-now';
    const requestId = (this.deps.genRequestId ?? randomUUID)();
    this.pending.set(requestId, { event, payload, onConfirm, onCancel });
    const requiredPayload: SpawnConfirmRequiredPayload = {
      requestId,
      repoPath: payload.repoPath,
      sessionName: payload.sessionName,
    };
    event.send('workstation:spawn-confirm-required', requiredPayload);
    return 'await-confirm';
  }

  /**
   * Process 'workstation:spawn-confirm-response' from the renderer. Looks
   * up the cached pending entry by requestId; on confirm, invokes the
   * cached onConfirm (which fires the spawn through the controller); on
   * cancel, discards the entry. Cache miss returns 'unknown' (no-op).
   */
  handleResponse(
    requestId: string,
    decision: SpawnConfirmDecision,
  ): ResponseResult {
    const cached = this.pending.get(requestId);
    if (!cached) return 'unknown';
    this.pending.delete(requestId);
    if (decision === 'confirm') {
      cached.onConfirm();
      return 'fired';
    }
    cached.onCancel?.();
    return 'cancelled';
  }

  /** Test introspection: number of pending spawns awaiting confirm. */
  pendingSize(): number {
    return this.pending.size;
  }
}
