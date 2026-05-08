// MB-T36 WB2 — Orchestrator-fired spawn: dispatch-mode-aware implementation.
//
// Closes MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED. Replaces the placeholder
// throw at coarchitect-ipc.ts fireSpawn dep with real behavior:
//
//   'auto'  → fire SpawnIpcController.handleSpawnRequest directly.
//   'ask'   → surface confirm modal via SpawnConfirmGate (same gate used by
//             the operator-driven 'workstation:spawn-requested' path); await
//             operator decision via 'workstation:spawn-confirm-response'.
//             On confirm: fire controller. On cancel: resolve { declined: true }.
//
// Architecture-independence: this module is substrate-agnostic. It is called
// from the orchestrator-action-handler fireSpawn dep wired in coarchitect-ipc.ts.
// No electron imports — deps-injected for unit testability (probe covers all cases).
//
// KNOWN: SpawnReply discriminant is { type: 'success' | 'error' } (NOT reply.ok).
// Verified at spawn-ipc.ts:54-73.

import type { SpawnSessionActionPayload } from 'dispatch-core/dist/v3/schema.js';
import type { DispatchMode } from './dispatch-mode-store.js';
import type { SpawnSessionRequest } from './spawn-handler.js';
import type { SpawnIpcResult } from './orchestrator-action-handler.js';
import type { SpawnConfirmGate } from './spawn-confirm-gate.js';
import type { SpawnIpcController } from './spawn-ipc.js';

export interface OrchestratorFireSpawnDeps {
  /** Read current dispatch mode (fresh per call — honors live toggling). */
  readonly readDispatchMode: () => DispatchMode;
  /** Lazily build or return the cached SpawnIpcController. */
  readonly getController: () => Promise<SpawnIpcController>;
  /** Shared gate instance — same as the operator-driven spawn path so
   *  'workstation:spawn-confirm-response' IPC handler resolves all pending
   *  entries regardless of spawn source. */
  readonly spawnConfirmGate: SpawnConfirmGate;
  /** Send to all renderer webContents. Used for spawn-confirm-required. */
  readonly broadcast: (channel: string, payload: unknown) => void;
}

/** Result type: success carries sessionName; declined carries the cancellation flag. */
export type OrchestratorSpawnResult = SpawnIpcResult | { readonly declined: true };

/**
 * Fire a session spawn from the orchestrator action handler, honoring the
 * current dispatch mode. Returns { sessionName } on success or { declined: true }
 * when the operator declines the confirmation modal.
 */
export async function fireOrchestratorSpawn(
  payload: SpawnSessionActionPayload,
  deps: OrchestratorFireSpawnDeps,
): Promise<OrchestratorSpawnResult> {
  const req: SpawnSessionRequest = {
    sessionName: payload.sessionName,
    repoPath: payload.repoPath,
  };

  const mode = deps.readDispatchMode();

  if (mode === 'auto') {
    const controller = await deps.getController();
    const reply = await controller.handleSpawnRequest(req);
    if (reply.type === 'error') {
      throw new Error(
        `orchestrator spawn failed (${reply.error.error_type}): ${reply.error.message}`,
      );
    }
    return { sessionName: req.sessionName };
  }

  // 'ask' mode: surface confirm modal via SpawnConfirmGate, await operator decision.
  // Promise resolves when SpawnConfirmGate.handleResponse() is called by the
  // existing 'workstation:spawn-confirm-response' IPC handler in spawn-ipc.ts.
  return new Promise<OrchestratorSpawnResult>((resolve, reject) => {
    deps.spawnConfirmGate.decide(
      { send: (channel, msg) => deps.broadcast(channel, msg) },
      req,
      // onConfirm: operator approved — fire controller, resolve promise.
      () => {
        deps
          .getController()
          .then((ctl) => ctl.handleSpawnRequest(req))
          .then((reply) => {
            if (reply.type === 'error') {
              reject(
                new Error(
                  `orchestrator spawn failed (${reply.error.error_type}): ${reply.error.message}`,
                ),
              );
            } else {
              resolve({ sessionName: req.sessionName });
            }
          })
          .catch((err: unknown) => reject(err));
      },
      // onCancel: operator declined — resolve with decline signal (not a rejection).
      () => resolve({ declined: true }),
    );
    // decide() returns 'await-confirm' since mode === 'ask' (invariant: readDispatchMode
    // is deterministic within a single call chain). Return value unused.
  });
}
