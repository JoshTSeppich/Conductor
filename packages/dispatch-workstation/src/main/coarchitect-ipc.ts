// MB-T-HSO-WIRE WB14b refactor — surviving subset post-v3.0-path removal.
//
// Pre-WB14a this file was a 557-line v3.0 orchestrator entry point hosting
// the `coarchitect:sendAndStream` IPC handler (renderer → main → Anthropic
// API streaming → routeOrchestratorOutput → emitCardEnvelopes / dispatch
// Action → swarm-state-writer). The v3.5 HSO architecture (action-marker-
// router + dispatchActionVariant + swarm-state-writer at the construction
// chain in main.ts MB-T-HSO-WIRE zone) replaces the entire data flow; the
// only surviving responsibilities are:
//
//   - daemonClient singleton (HttpDaemonClient — load-bearing for v3.5 via
//     action-variant-ipc.ts firePullHandoff dep + downstream wiring).
//   - wirePtyRelay(broadcaster) — MB-T40 PTY relay wiring entry point
//     called from main.ts after consoleController is initialized.
//   - registerIpcHandlers() — survives with the renderer-facing handlers
//     that have non-v3.0 consumers:
//       fetchHistory          — chat-shell history reader
//       postMessage           — chat-shell history writer
//       getDailyCost          — CostMeter renderer ring (data source TBD
//                               per MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION
//                               Tier 3 follow-on; returns 0 until migrated)
//       getRateLimitState     — PlanUsageRing renderer ring (data source
//                               TBD per MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO
//                               Tier 2 follow-on; returns null until migrated)
//       shell:get/saveSplitterPos — workstation-shell splitter persistence
//       getBuildDocConfig / setBuildDocConfig / clearBuildDocConfig — build
//                               doc config bridge methods (CoArch panel).
//
// Removed:
//   - coarchitect:sendAndStream IPC handler (314-556 pre-WB14b).
//   - All v3.0 path imports (anthropic-client, anthropic-api-client,
//     orchestrator-output-router, orchestrator-card-emitter,
//     card-context-cache, orchestrator-action-handler, orchestrator-fire-
//     spawn — deleted in WB14a / this commit).
//   - Cost-meter capture helpers (broadcastCostUpdate, captureUsageToLedger)
//     and rate-limit capture helpers (broadcastRateLimitUpdate,
//     captureRateLimitToBroadcast, latestRateLimitState) — orphaned with
//     the sendAndStream handler. The IPC HANDLERS for getDailyCost +
//     getRateLimitState are preserved with stub returns per closure-claim
//     correction (MB-F-A2C + MB-F-A3 remain OPEN; data-source migration
//     is separate follow-on work).
//   - autopilot, sessionListClient, DAEMON_URL_FOR_TIER4, Tier 4 fan-out
//     plumbing — only consumed by the deleted sendAndStream handler.
//   - getOrchestratorSpawnController + _orchestratorSpawnControllerPromise
//     — only consumed by fireOrchestratorSpawn from the deleted handler.

import { ipcMain } from 'electron';
import { HttpDaemonClient } from './http-daemon-client.js';
import { readSplitterPosition, writeSplitterPosition } from './splitter-state.js';
import type { ChatMessageInput } from '../coarchitect/daemon-client.js';
import {
  readBuildDocConfig,
  writeBuildDocConfig,
  clearBuildDocConfig,
  type BuildDocConfig,
} from '../coarchitect/build-doc-state.js';
import { registerPtyRelay, type IConsoleBroadcaster } from './pty-stream-relay.js';
import {
  createRateLimitAggregator,
  createNullRateLimitSource,
} from './rate-limit-aggregator.js';

/**
 * Singleton HttpDaemonClient instance. Load-bearing for v3.5 — used by
 * action-variant-ipc.ts's firePullHandoff dep and downstream wiring.
 */
export const daemonClient = new HttpDaemonClient();

import { webContents as allWebContents } from 'electron';

/**
 * MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB6 — rate-limit aggregator
 * singleton. Reauthors the post-MB-T-HSO-WIRE WB14a-removed
 * `latestRateLimitState` + `broadcastRateLimitUpdate` plumbing as a
 * pluggable architectural seam per ADR-MBTWFT9-A (Sub-Q-T9-A=(f)
 * skeleton-with-deferred-source).
 *
 * Production default source is `createNullRateLimitSource()` —
 * aggregator stays in `getLatestState() === null` until a real
 * source is plugged via follow-on ticket (workstation-direct
 * Anthropic ping behind key-provisioning, OR daemon-side ping behind
 * future WORKSTATION_CONTRACT.md §6.6 amendment). The handler at
 * `coarchitect:getRateLimitState` returns aggregator.getLatestState();
 * the renderer-side `coarchitect:rate-limit-update` broadcast fires
 * via aggregator.onUpdate.
 *
 * Why CC CLI PTY-scrape was NOT viable: docs/spike-evidence/HSO-01/
 * scenario-5-results.md (2026-05-08) — CC CLI does not emit
 * X-RateLimit-* equivalents continuously.
 *
 * Exported for test injection (probe-mbtwft9-* + future
 * follow-on tickets that need to swap source).
 */
export const rateLimitAggregator = createRateLimitAggregator({
  source: createNullRateLimitSource(),
});

/**
 * MB-T40 WB2: wirePtyRelay — called from main.ts after consoleController is
 * initialized. Single registerPtyRelay call; no inline relay logic.
 * Wired separately from registerIpcHandlers because consoleController is
 * null at the registerIpcHandlers call site; PTY output flows only after
 * createWindow(), so the late wiring is safe.
 */
export function wirePtyRelay(broadcaster: IConsoleBroadcaster): void {
  registerPtyRelay({
    broadcaster,
    getWebContents: () => allWebContents.getAllWebContents(),
  });
}

export function registerIpcHandlers(): void {
  ipcMain.handle('coarchitect:fetchHistory', async () => {
    return daemonClient.fetchHistory();
  });

  // Cost-meter renderer ring data source is currently UN-WIRED post-WB14
  // v3.0 removal. MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION (Tier 3)
  // tracks the PTY-scrape-based replacement; until migrated, returns 0.
  ipcMain.handle('coarchitect:getDailyCost', () => 0);

  // MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB6 — getRateLimitState
  // handler returns the rate-limit aggregator's latest cached state.
  // Aggregator default source is createNullRateLimitSource (returns
  // null indefinitely until a real source is plugged via follow-on
  // ticket — see ADR-MBTWFT9-A in mb-t-wireframe-t9-decisions-2026-
  // 05-12.md). MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO (Tier 2)
  // infrastructure ARM closed; source-of-truth ARM open.
  ipcMain.handle('coarchitect:getRateLimitState', () =>
    rateLimitAggregator.getLatestState(),
  );

  // MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB6 — rate-limit-update
  // broadcast emitter. Mirrors the removed MB-T-HSO-WIRE WB14a
  // `broadcastRateLimitUpdate` shape: each aggregator emission fans
  // out to every live renderer webContents via the
  // `coarchitect:rate-limit-update` channel (Sub-Q-T9-D=(i) reuse-
  // existing-channel per ADR-MBTWFT9-D). Both PlanTimerText (WB7
  // mount auto-wire) and PlanUsageRing (existing chat-shell/mount.ts
  // subscription) consume from this channel.
  //
  // Idempotent under null-source default: aggregator never emits, so
  // this callback never fires. Pure architectural seam.
  rateLimitAggregator.onUpdate((state) => {
    for (const wc of allWebContents.getAllWebContents()) {
      if (!wc.isDestroyed()) {
        wc.send('coarchitect:rate-limit-update', state);
      }
    }
  });

  ipcMain.handle('coarchitect:postMessage', async (_event, msg: unknown) => {
    return daemonClient.postMessage(msg as ChatMessageInput);
  });

  ipcMain.handle('shell:getSplitterPos', () => {
    return readSplitterPosition();
  });

  ipcMain.handle('shell:saveSplitterPos', (_event, pos: unknown) => {
    if (typeof pos === 'number' && pos > 0) {
      writeSplitterPosition(pos);
    }
  });

  ipcMain.handle('coarchitect:getBuildDocConfig', () => {
    return readBuildDocConfig();
  });

  ipcMain.handle('coarchitect:setBuildDocConfig', (_event, config: unknown) => {
    writeBuildDocConfig(config as BuildDocConfig);
  });

  ipcMain.handle('coarchitect:clearBuildDocConfig', () => {
    clearBuildDocConfig();
  });
}
