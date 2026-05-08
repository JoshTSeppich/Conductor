// MB-T24 WB3 — Dispatch-mode IPC controller.
//
// Operator-confirmed Q-MBT24-6=c (NEW dispatchModeBridge — additive surface
// per commitsBridge precedent; separate from coarchitectBridge +
// workstationBridge for clean separation of concerns) 2026-05-08.
//
// Main-process IPC controller for the workstation-wide dispatch-mode
// toggle. Two invoke channels:
//   - 'dispatch-mode:get' — returns persisted DispatchMode
//                           (defaults to 'ask' when no file / malformed)
//   - 'dispatch-mode:set' — { mode: 'auto'|'ask' } payload; persists then
//                           returns the persisted value (echo).
//
// Pattern mirrors approval-policy-ipc.ts (MB-T16 WB2) — controller class
// with DI seam (deps), registerHandlers method, factory for production
// default. Significant simplification: no daemon HTTP — workstation-
// internal persistence only (mirrors autopilot-ipc.ts pattern, MB-T17).

import {
  readDispatchMode,
  writeDispatchMode,
  type DispatchMode,
} from './dispatch-mode-store.js';

/** Minimal shape of Electron's ipcMain we depend on. Tests inject a fake;
 *  production passes the real `ipcMain` singleton. */
export interface DispatchModeIpcMain {
  handle: (
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown,
  ) => void;
}

export interface DispatchModeIpcDeps {
  readonly read: () => DispatchMode;
  readonly write: (mode: DispatchMode) => void;
}

function isDispatchMode(v: unknown): v is DispatchMode {
  return v === 'auto' || v === 'ask';
}

/**
 * IPC controller registering two invoke channels. Each handler validates
 * the payload (throws on missing/invalid mode for the set channel), then
 * delegates to the controller's read/write deps.
 */
export class DispatchModeIpcController {
  private readonly deps: DispatchModeIpcDeps;

  constructor(deps: DispatchModeIpcDeps) {
    this.deps = deps;
  }

  registerHandlers(ipcMain: DispatchModeIpcMain): void {
    ipcMain.handle('dispatch-mode:get', async () => {
      return this.deps.read();
    });

    ipcMain.handle('dispatch-mode:set', async (_event, ...args) => {
      const payload = args[0];
      if (payload === null || typeof payload !== 'object') {
        throw new Error(
          "dispatch-mode:set requires { mode: 'auto' | 'ask' }",
        );
      }
      const mode = (payload as Record<string, unknown>)['mode'];
      if (!isDispatchMode(mode)) {
        throw new Error(
          `dispatch-mode:set invalid mode: ${JSON.stringify(mode)}`,
        );
      }
      this.deps.write(mode);
      // Echo persisted value back so renderer can reconcile after the
      // write (matches MB-T16 picker pattern + supports optimistic-UI
      // rollback if a future read returns a different value).
      return this.deps.read();
    });
  }
}

/**
 * Production factory. main.ts MB-T24 sentinel zone calls this to construct
 * the controller with default deps (workstation-internal fs persistence
 * via dispatch-mode-store.ts).
 */
export function createDefaultDispatchModeIpcController(): DispatchModeIpcController {
  return new DispatchModeIpcController({
    read: readDispatchMode,
    write: writeDispatchMode,
  });
}
