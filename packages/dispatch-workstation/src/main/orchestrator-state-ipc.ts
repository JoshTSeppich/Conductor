// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB8 — orchestrator-state
// IPC controller (Channel #8 invoke/handle + Channel #9 broadcast).
//
// Pattern mirrors frame-c-ipc.ts (Controller-with-DI-seam + factory +
// registerHandlers(ipcMain) method, MB-T-WIREFRAME-C1P3 WB4 GREEN per
// commit 0f0e762). Diverges from frame-c by ALSO managing a broadcast
// subscription to aggregator.onUpdate — registerHandlers returns a
// dispose function teardowning the subscription. This is needed
// because orchestrator-state is subscription-based (Channel #9 fan-
// out), not purely request/response.
//
// Two channels owned by this controller:
//   - Channel #8: `orchestrator-state:get-snapshot` (renderer → main
//                 invoke/handle; returns aggregator.getSnapshot())
//   - Channel #9: `orchestrator-state:update` (main → renderer
//                 broadcast; fired on every aggregator emission)
//
// Both channels operate against the SAME OrchestratorStateSnapshot
// payload shape (workstation-local TypeScript interface per Q4
// arbitration; lives at orchestrator-state-types.ts).
//
// Production wiring at WB9:
//   - main.ts constructs the aggregator with real sources (poll +
//     stores from WB4-WB7) inside a sentinel-zone block.
//   - main.ts constructs this controller with deps {aggregator,
//     broadcast: fanOutToAllWindows}.
//   - main.ts calls controller.registerHandlers(ipcMain).
//   - main.ts holds the returned dispose function for shutdown.

import type {
  OrchestratorStateAggregator,
} from './orchestrator-state-aggregator.js';
import type { OrchestratorStateSnapshot } from './orchestrator-state-types.js';

// ─── Dependency interfaces ─────────────────────────────────────────────

/**
 * Minimal shape of Electron's `ipcMain` we depend on. Tests inject a
 * fake recording-Map; production passes the real `ipcMain` singleton.
 * Mirrors FrameCIpcMain at frame-c-ipc.ts:23.
 */
export interface OrchestratorStateIpcMain {
  handle: (
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown,
  ) => void;
}

/**
 * Broadcast seam — production calls `BrowserWindow.getAllWindows().
 * forEach(w => w.webContents.send(channel, payload))`. Tests inject a
 * spy + recording-Array. Mirrors ScrollEmitter at frame-c-ipc.ts:45.
 */
export interface OrchestratorStateBroadcast {
  (channel: string, payload: OrchestratorStateSnapshot): void;
}

export interface OrchestratorStateIpcDeps {
  /** Aggregator from WB3 — source of snapshots + subscription seam. */
  readonly aggregator: OrchestratorStateAggregator;
  /** Renderer-fan-out seam. Production: BrowserWindow.getAllWindows
   *  forEach webContents.send. Tests: recording spy. */
  readonly broadcast: OrchestratorStateBroadcast;
}

// ─── Channel-name constants ────────────────────────────────────────────

/** Channel #8 — `orchestrator-state:get-snapshot` (invoke/handle).
 *  Frozen at WORKSTATION_CONTRACT.md §6.6 STAMPED 2026-05-18. */
export const CHANNEL_GET_SNAPSHOT = 'orchestrator-state:get-snapshot';

/** Channel #9 — `orchestrator-state:update` (main → renderer broadcast).
 *  Frozen at WORKSTATION_CONTRACT.md §6.6 STAMPED 2026-05-18. */
export const CHANNEL_UPDATE = 'orchestrator-state:update';

// ─── OrchestratorStateIpcController ────────────────────────────────────

export class OrchestratorStateIpcController {
  private readonly deps: OrchestratorStateIpcDeps;

  constructor(deps: OrchestratorStateIpcDeps) {
    this.deps = deps;
  }

  /**
   * Register Channel #8 invoke handler + subscribe to aggregator
   * emissions for Channel #9 broadcast. Returns a dispose function
   * that teardowns the broadcast subscription. The invoke handler is
   * left in place — Electron's ipcMain.removeHandler is not a stable
   * API surface for our pattern; in production, process lifetime
   * equals handler lifetime, and at shutdown the aggregator.stop()
   * stops further emissions making the handler effectively idle.
   */
  registerHandlers(ipcMain: OrchestratorStateIpcMain): () => void {
    ipcMain.handle(CHANNEL_GET_SNAPSHOT, async () => {
      return this.deps.aggregator.getSnapshot();
    });
    const unsubscribe = this.deps.aggregator.onUpdate((snapshot) => {
      this.deps.broadcast(CHANNEL_UPDATE, snapshot);
    });
    return unsubscribe;
  }
}

// ─── Production factory ────────────────────────────────────────────────

/**
 * Production factory. main.ts (WB9 sentinel-zone block) calls this
 * with closure-captured deps:
 *   - aggregator: createOrchestratorStateAggregator({...sources from WB4-WB7})
 *   - broadcast: (channel, payload) => {
 *       BrowserWindow.getAllWindows().forEach((w) =>
 *         w.webContents.send(channel, payload),
 *       );
 *     }
 */
export function createDefaultOrchestratorStateIpcController(
  deps: OrchestratorStateIpcDeps,
): OrchestratorStateIpcController {
  return new OrchestratorStateIpcController(deps);
}
