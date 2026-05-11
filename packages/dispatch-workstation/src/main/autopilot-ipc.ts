// MB-T17 WB2 — autopilot IPC controller + helpers.
//
// Main-process IPC controller for the per-session autopilot enabled
// toggle. Per Q-MBT17-1..13 operator dispositions
// (`docs/coordination/mb-t17-decisions-2026-05-07.md`).
//
// Pattern mirrors `src/main/approval-policy-ipc.ts` (MB-T16 WB2) and
// `src/main/audit-modal-ipc.ts` (sess-mbt13 WB7) and
// `src/main/session-kill-ipc.ts` (sess-mbt11 WB3): top-level pure-fn
// helpers exported with DI seam, controller class with DI-injectable
// options.
//
// Significant DEVIATION from MB-T16 pattern (KNOWN per Phase 1 diagnose
// §I-E): MB-T17 has NO daemon route and NO HTTP layer. Autopilot state
// is workstation-side only (autopilot-state-store.ts), persisted to
// JSON file in `<userData>/autopilot-state.json` (MB-T11 WB6). The IPC
// handlers operate directly on the AutopilotLoop class which performs
// sync fs ops via its DI'd deps. NO daemonUrl, NO readToken, NO
// fetchImpl — only an injectable AutopilotLoop instance for test seams.
//
// Per Q-MBT17-9=a: the IPC controller's AutopilotLoop instance is
// SAFE to coexist with the one in coarchitect-ipc.ts:84 — autopilot-
// loop.ts:102 file header explicitly endorses parallel instances:
// "stateless class — every method reads + writes through the injected
// store deps so multiple instances ... see the same persisted state".
//
// Per Q-MBT17-12=a: toggle is a pure flag mutation. Toggle ON sets
// enabled=true; the v3.5 dispatchActionVariant call path reads isEnabled()
// on next call. NO background loop, NO resources to allocate, NO side effects
// beyond the JSON write.

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
 * Behavior on no-row: AutopilotLoop.isEnabled returns the
 * defaultAutopilotState().enabled value (false per Q-MBT17-8=a).
 *
 * AutopilotLoop best-effort fs reads swallow corrupt-JSON / missing-
 * file errors and return defaultAutopilotState() — so this helper
 * cannot itself throw in v3.0. SPECULATIVE that future AutopilotLoop
 * invariant additions might surface read errors; no current path does.
 *
 * Exported for unit-test injection.
 */
export async function getSessionAutopilotEnabled(
  sessionName: string,
  autopilot: AutopilotLoop = new AutopilotLoop(),
): Promise<{ enabled: boolean }> {
  return { enabled: autopilot.isEnabled(sessionName) };
}

/**
 * Pure-function helper for writing per-session autopilot enabled state.
 * Returns `{ enabled: boolean }` echoing the persisted value.
 *
 * Behavior on errors: AutopilotLoop best-effort fs writes swallow
 * write failures (disk-full, permission-denied) per its file header
 * — the in-memory state machine's view is consistent but the next
 * read won't see the silently-dropped write. Caller (renderer
 * TileAutopilotToggle per Q-MBT17-3=a) cannot detect a silent disk
 * write loss in v3.0; tracked at WB5 followup
 * MB-F-T17-OPTIMISTIC-ROLLBACK-OBSERVABILITY for v3.1 prominent
 * indicator.
 *
 * Exported for unit-test injection.
 */
export async function setSessionAutopilotEnabled(
  sessionName: string,
  enabled: boolean,
  autopilot: AutopilotLoop = new AutopilotLoop(),
): Promise<{ enabled: boolean }> {
  autopilot.setEnabled(sessionName, enabled);
  return { enabled };
}

/**
 * IPC controller registering two invoke channels:
 *   - 'workstation:autopilot-get'  invoked with { sessionName }
 *   - 'workstation:autopilot-put'  invoked with { sessionName, enabled }
 *
 * Each handler validates the payload (throws on missing sessionName or
 * non-boolean enabled), then delegates to the pure-fn helpers above
 * with the controller's AutopilotLoop instance.
 */
export class AutopilotIpcController {
  private readonly autopilot: AutopilotLoop;

  constructor(opts: AutopilotIpcOptions = {}) {
    this.autopilot = opts.autopilot ?? new AutopilotLoop();
  }

  registerHandlers(ipcMain: AutopilotIpcMain): void {
    ipcMain.handle(
      'workstation:autopilot-get',
      async (_event, ...args) => {
        const payload = args[0];
        const sessionName =
          payload !== null && typeof payload === 'object'
            ? (payload as Record<string, unknown>)['sessionName']
            : undefined;
        if (typeof sessionName !== 'string' || sessionName.length === 0) {
          throw new Error(
            "workstation:autopilot-get requires { sessionName: string }",
          );
        }
        return getSessionAutopilotEnabled(sessionName, this.autopilot);
      },
    );

    ipcMain.handle(
      'workstation:autopilot-put',
      async (_event, ...args) => {
        const payload = args[0];
        if (payload === null || typeof payload !== 'object') {
          throw new Error(
            "workstation:autopilot-put requires { sessionName: string, enabled: boolean }",
          );
        }
        const r = payload as Record<string, unknown>;
        const sessionName = r['sessionName'];
        const enabled = r['enabled'];
        if (typeof sessionName !== 'string' || sessionName.length === 0) {
          throw new Error(
            'workstation:autopilot-put requires non-empty sessionName',
          );
        }
        if (typeof enabled !== 'boolean') {
          throw new Error(
            'workstation:autopilot-put requires enabled: boolean',
          );
        }
        return setSessionAutopilotEnabled(sessionName, enabled, this.autopilot);
      },
    );
  }
}

/**
 * Production factory. main.ts (WB4) calls this to construct the
 * controller with default deps (a fresh AutopilotLoop reading/writing
 * autopilot-state-store via the production fs path).
 */
export function createDefaultAutopilotIpcController(): AutopilotIpcController {
  return new AutopilotIpcController({});
}
