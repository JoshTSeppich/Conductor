// MB-T37 WB1 (red) — OrchestratorPoolManager skeleton + ITileGridRegistry thin wrapper.
//
// ITileGridRegistry interface + TileGridRegistryAdapter authored here per HALT 0 V2(a)
// arbitration. tile-grid-state.ts lives at src/main/ (dispatch §1 claimed src/coarchitect/
// — authoring drift caught at HALT 0); it exposes functional module exports, not a class.
// TileGridRegistryAdapter wraps those exports; tile-grid-state.ts NOT modified.
//
// HALT 1 V3(A): ConsoleIpcController injected directly (concrete class); addStdoutObserver
// tap authored in WB2 GREEN scope. addStreamCloseObserver tap also authored in WB2
// (stream-close observer ratified at HALT 1(a) for Q-MBT37-4 (c) PTY EOF path).
//
// WB1 stub: start() + stop() are no-ops. All 9 pool-lifecycle probes fail.
// WB2 GREEN ships full lifecycle per dispatch §3.4 + HALT 0/1 arbitrations.

import type { SpawnIpcController } from '../main/spawn-ipc.js';
import type { ConsoleIpcController } from '../main/console-ipc.js';
import type { SwarmStateWriter } from './swarm-state-writer.js';
import type { DispatchMode } from '../main/dispatch-mode-store.js';
import {
  type TileLayoutState,
  defaultTileLayoutState,
  readAllTileLayoutStates,
  writeAllTileLayoutStates,
  writeTileLayoutState,
  readTileLayoutState,
} from '../main/tile-grid-state.js';

// ── ITileGridRegistry ─────────────────────────────────────────────────────────
// Thin wrapper interface over tile-grid-state.ts functional exports.
// Injected into OrchestratorPoolManager constructor for testability.
// Default production impl: TileGridRegistryAdapter below.

export interface ITileGridRegistry {
  addSession(name: string, state: TileLayoutState): void;
  removeSession(name: string): void;
  renameSession(fromName: string, toName: string): void;
}

export class TileGridRegistryAdapter implements ITileGridRegistry {
  addSession(name: string, state: TileLayoutState): void {
    writeTileLayoutState(name, state);
  }

  removeSession(name: string): void {
    const all = readAllTileLayoutStates();
    writeAllTileLayoutStates(
      Object.fromEntries(Object.entries(all).filter(([k]) => k !== name)),
    );
  }

  renameSession(fromName: string, toName: string): void {
    const existing = readTileLayoutState(fromName);
    writeTileLayoutState(toName, existing);
    const all = readAllTileLayoutStates();
    writeAllTileLayoutStates(
      Object.fromEntries(Object.entries(all).filter(([k]) => k !== fromName)),
    );
  }
}

// Re-exported for pool manager spawn path (WB2 uses to build initial tile state)
export { defaultTileLayoutState };

// ── Constants ─────────────────────────────────────────────────────────────────

export const RESERVED_ACTIVE = '__orchestrator_active';
export const RESERVED_STANDBY = '__orchestrator_standby';

// D3 (SPIKE-HSO-01): 65% of 200K context window = 130K tokens
export const HANDOFF_TOKEN_THRESHOLD = 130_000;
// BUILD §2 amendment 1: match token count at end of status-bar line
export const TOKEN_COUNT_REGEX = /([0-9]+) tokens$/m;
// MB-T41 §8.1: marker the active orchestrator emits at handoff completion
export const HANDOFF_EMITTED_MARKER = '[HANDOFF-EMITTED]';
// Q-MBT37-3: directive pool sends to active when threshold crossed
export const HANDOFF_NOW_DIRECTIVE = '[HANDOFF-NOW]\n';
// Q-MBT37-2b: polling interval for tmux crash detection
export const POLL_INTERVAL_MS = 5_000;
// Q-MBT37-2a: consecutive parse failures before halt-and-surface
export const PARSE_FAIL_MAX = 3;

// ── OrchestratorPoolManager ───────────────────────────────────────────────────

export interface OrchestratorPoolManagerDeps {
  spawnController: SpawnIpcController;
  tileRegistry: ITileGridRegistry;
  consoleIpc: ConsoleIpcController;
  stateWriter: SwarmStateWriter;
  /** Absolute path to the operator-authored orchestrator system prompt file */
  orchestratorSystemPromptPath: string;
  /** Resolves if tmux session exists; rejects if not (for crash detection) */
  runTmuxHasSession: (sessionName: string) => Promise<void>;
  dispatchModeReader: () => DispatchMode;
  halt: (reason: string) => void;
}

export class OrchestratorPoolManager {
  constructor(private readonly _deps: OrchestratorPoolManagerDeps) {}

  async start(): Promise<void> {
    // WB1 stub: no-op
    // WB2: spawn active → register tile → subscribe stdout/stream-close observers
    //      → spawn standby → register tile → start tmux poll interval
  }

  stop(): void {
    // WB1 stub: no-op
    // WB2: dispose all observers, clear poll interval
  }
}
