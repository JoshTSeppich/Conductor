// MB-T17 WB1 — autopilot IPC stub module.
//
// Main-process IPC controller + helper functions for the per-session
// autopilot enabled/disabled toggle. Per Q-MBT17-1..13 operator
// dispositions (decisions doc 2026-05-07). WB1 ships type signatures +
// Q-disposition comments; impls land at WB2 alongside their unit tests.
// Stubs throw with WB2-deferral messages to keep the RED state honest.
//
// Pattern mirrors src/main/approval-policy-ipc.ts (MB-T16 WB2) and
// src/main/audit-modal-ipc.ts (sess-mbt13 WB7) and src/main/
// session-kill-ipc.ts (sess-mbt11 WB3): top-level pure-fn helpers
// (getSessionAutopilotEnabled, setSessionAutopilotEnabled), and a
// controller class that registers ipcMain.handle channels.
//
// Significant DEVIATION from MB-T16 pattern (KNOWN per Phase 1 diagnose
// §I-E): MB-T17 has NO daemon route and NO HTTP layer. Autopilot state
// is workstation-side only (autopilot-state-store.ts), persisted to
// JSON file in `<userData>/autopilot-state.json` (MB-T11 WB6). The IPC
// handlers operate directly on the AutopilotLoop class which performs
// sync fs ops via its DI'd deps. NO daemonUrl, NO readToken, NO
// fetchImpl — only an injectable AutopilotLoop instance for test seams.
//
// Per Q-MBT17-9=a: a parallel AutopilotLoop instance is explicitly safe
// (autopilot-loop.ts:102 file header — "stateless class — every method
// reads + writes through the injected store deps so multiple instances
// ... see the same persisted state"). This IPC controller's
// AutopilotLoop instance coexists with the one in coarchitect-ipc.ts:84.
//
// Per Q-MBT17-12=a: the toggle is a pure flag mutation with no
// side effects beyond the JSON write. Toggle ON sets enabled=true;
// orchestrator-action-handler reads isEnabled() on its next call. NO
// background loop to start/stop, NO resources to allocate.

import { AutopilotLoop } from './autopilot-loop.js';

/** Minimal shape of Electron's ipcMain that we depend on. Tests inject a
 *  fake; production passes the real `ipcMain` singleton. */
export interface AutopilotIpcMain {
  handle: (
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown,
  ) => void;
}

export interface AutopilotIpcOptions {
  /** Test seam: AutopilotLoop instance. Defaults to `new AutopilotLoop()`
   *  which uses the production autopilot-state-store read/write path. */
  readonly autopilot?: AutopilotLoop;
}

/**
 * Pure-function helper for reading per-session autopilot enabled state.
 * Returns `{ enabled: boolean }` for IPC reply parity with the renderer-
 * side bridge method shape.
 *
 * Behavior on errors: AutopilotLoop best-effort fs reads; returns
 * defaultAutopilotState() (enabled: false) on missing/corrupt file
 * (Q-MBT17-8=a default-off-on-no-row).
 *
 * Exported for unit-test injection. WB2 implementation; WB1 stub throws.
 */
export async function getSessionAutopilotEnabled(
  _sessionName: string,
  _autopilot: AutopilotLoop = new AutopilotLoop(),
): Promise<{ enabled: boolean }> {
  throw new Error(
    'MB-T17 WB1 stub: getSessionAutopilotEnabled implementation lands at WB2',
  );
}

/**
 * Pure-function helper for writing per-session autopilot enabled state.
 * Returns `{ enabled: boolean }` echoing the persisted value.
 *
 * Behavior on errors: AutopilotLoop best-effort fs writes; swallowed
 * write failures still return the requested `enabled` value (caller
 * cannot detect a silent disk write loss in v3.0; tracked for v3.1
 * polish via R-MBT17-3 followup).
 *
 * Exported for unit-test injection. WB2 implementation; WB1 stub throws.
 */
export async function setSessionAutopilotEnabled(
  _sessionName: string,
  _enabled: boolean,
  _autopilot: AutopilotLoop = new AutopilotLoop(),
): Promise<{ enabled: boolean }> {
  throw new Error(
    'MB-T17 WB1 stub: setSessionAutopilotEnabled implementation lands at WB2',
  );
}

/**
 * IPC controller registering two invoke channels:
 *   - 'workstation:autopilot-get'
 *   - 'workstation:autopilot-put'
 *
 * Each handler delegates to the pure-fn helpers above with the controller's
 * AutopilotLoop instance. WB2 wires the handlers; WB1 stub throws on
 * registerHandlers.
 */
export class AutopilotIpcController {
  constructor(_opts: AutopilotIpcOptions = {}) {
    // WB1 no-op constructor; opts captured at WB2 impl.
  }

  registerHandlers(_ipcMain: AutopilotIpcMain): void {
    throw new Error(
      'MB-T17 WB1 stub: AutopilotIpcController.registerHandlers implementation lands at WB2',
    );
  }
}

/**
 * Factory for production wiring (main.ts WB4 callsite). Defaults to a
 * fresh AutopilotLoop reading/writing autopilot-state-store via the
 * production fs path (or env override `MB_AUTOPILOT_STATE_DIR`). WB2
 * impl; WB1 stub throws.
 */
export function createDefaultAutopilotIpcController(): AutopilotIpcController {
  throw new Error(
    'MB-T17 WB1 stub: createDefaultAutopilotIpcController implementation lands at WB2',
  );
}
