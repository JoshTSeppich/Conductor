// MB-T37 WB2 (green) — OrchestratorPoolManager full lifecycle implementation.
//
// ITileGridRegistry interface + TileGridRegistryAdapter authored here per HALT 0 V2(a)
// arbitration. tile-grid-state.ts lives at src/main/ (dispatch §1 claimed src/coarchitect/
// — authoring drift caught at HALT 0); it exposes functional module exports, not a class.
// TileGridRegistryAdapter wraps those exports; tile-grid-state.ts NOT modified.
//
// HALT 1 V3(A): ConsoleIpcController injected directly (concrete class); addStdoutObserver
// tap co-shipped in this WB. addStreamCloseObserver tap also co-shipped (Q-MBT37-4(c)).
//
// Pool lifecycle per dispatch §3.4:
//   - start(): spawn active → tile → spawn standby → tile → subscribe stdout + stream-close
//   - Token threshold: HANDOFF_TOKEN_THRESHOLD (130K) → send [HANDOFF-NOW]
//   - Marker detection: [HANDOFF-EMITTED] → promote standby → spawn fresh standby
//   - Crash paths: PTY stream-close (first-fires-wins) + tmux poll (POLL_INTERVAL_MS)
//   - Parse fail: PARSE_FAIL_MAX consecutive non-parseable lines → halt

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
    // WB11 incidental fix: readTileLayoutState returns TileLayoutState | null
    // (tile-grid-state.ts:147); writeTileLayoutState requires TileLayoutState.
    // Pre-existing null-guard gap surfaced by tsc when WB11 main.ts wired
    // the first external consumer of TileGridRegistryAdapter. Renaming an
    // unknown session is a no-op (caller must register first).
    if (existing === null) return;
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
  private _activeSessionName: string = RESERVED_ACTIVE;
  private _standbySessionName: string | null = RESERVED_STANDBY;
  private _awaitingMarker = false;
  private _midAction = false;
  private _parseFailCount = 0;
  private _activeCrashHandled = false;
  private _standbyCrashHandled = false;
  private _stdoutDisposer: (() => void) | null = null;
  private _streamCloseDisposer: (() => void) | null = null;
  private _pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly _deps: OrchestratorPoolManagerDeps) {}

  async start(): Promise<void> {
    this._stdoutDisposer = this._deps.consoleIpc.addStdoutObserver(
      (sn, chunk) => { this._onPtyChunk(sn, chunk); },
    );
    this._streamCloseDisposer = this._deps.consoleIpc.addStreamCloseObserver(
      (sn) => { this._onSessionClose(sn); },
    );
    await this._spawnAndRegister(RESERVED_ACTIVE);
    await this._spawnAndRegister(RESERVED_STANDBY);
    this._startPoll();
  }

  stop(): void {
    this._stdoutDisposer?.();
    this._streamCloseDisposer?.();
    if (this._pollTimer !== null) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  private async _spawnAndRegister(sessionName: string): Promise<void> {
    const orderIndex = sessionName === RESERVED_ACTIVE ? 0 : 1;
    // MB-T-HSO-WIRE WB11 Sub-Q-A=b env-var argv injection. Pool sets
    // CLAUDE_APPEND_SYSTEM_PROMPT to the absolute path of the operator-
    // authored orchestrator system prompt before invoking the spawn
    // controller. spawn-handler.ts buildTmuxArgs reads this env var and
    // appends `--append-system-prompt <path>` to the claude argv when
    // present. Operator-driven spawns from the renderer modal observe an
    // unset env var (restored in `finally`) and skip the branch — confines
    // argv-shape coupling to spawn-handler.ts without touching
    // SpawnSessionRequest (schema.ts §1-§13 frozen surface).
    //
    // Sequential awaits in `start()` (active then standby) guarantee no
    // overlapping pool spawns; _onStandbyCrash respawns are also sequential
    // (single setInterval poll handler). No mutex needed.
    const previousEnv = process.env.CLAUDE_APPEND_SYSTEM_PROMPT;
    process.env.CLAUDE_APPEND_SYSTEM_PROMPT = this._deps.orchestratorSystemPromptPath;
    let result;
    try {
      result = await this._deps.spawnController.handleSpawnRequest({
        repoPath: process.cwd(),
        sessionName,
        permissionMode: 'auto',
      });
      if (result.type === 'error') {
        // MB-T-HSO-WIRE WB13 Path β (Q-WB12-1 ack 2026-05-11): tighten the
        // user-visible surface for the SessionAlreadyRegistered collision
        // case. Daemon 409 (operator manual `tmux new-session -s
        // <reserved>` predates pool start) surfaces as error_type
        // 'SessionAlreadyRegistered' per spawn-handler.ts:33-38; spawn-
        // handler:270 confirms the partial tmux session is already cleaned
        // up by the spawn-side. Pool emits an operator-actionable message
        // so the renderer chat error surface tells the operator exactly
        // what to do; non-collision errors keep the existing generic
        // halt-message format (no regression for SpawnFailed / Daemon-
        // Unreachable / SessionNameExists / SessionCapExceeded).
        if (result.error.error_type === 'SessionAlreadyRegistered') {
          this._deps.halt(
            `Manual ${sessionName} session exists; pool cannot auto-spawn. Kill the manual session OR disable pool auto-spawn.`,
          );
        } else {
          this._deps.halt(
            `OrchestratorPoolManager: spawn failed for ${sessionName}: ${result.error.message}`,
          );
        }
        return;
      }
      this._deps.tileRegistry.addSession(sessionName, defaultTileLayoutState(orderIndex));
      if (sessionName === RESERVED_ACTIVE) {
        this._activeSessionName = RESERVED_ACTIVE;
        this._activeCrashHandled = false;
      } else if (sessionName === RESERVED_STANDBY) {
        this._standbySessionName = RESERVED_STANDBY;
        this._standbyCrashHandled = false;
      }
    } finally {
      if (previousEnv === undefined) {
        delete process.env.CLAUDE_APPEND_SYSTEM_PROMPT;
      } else {
        process.env.CLAUDE_APPEND_SYSTEM_PROMPT = previousEnv;
      }
    }
  }

  private _startPoll(): void {
    this._pollTimer = setInterval(() => {
      void this._pollOnce();
    }, POLL_INTERVAL_MS);
  }

  private async _pollOnce(): Promise<void> {
    try {
      await this._deps.runTmuxHasSession(this._activeSessionName);
    } catch {
      this._onActiveCrash();
    }
    if (this._standbySessionName !== null) {
      try {
        await this._deps.runTmuxHasSession(this._standbySessionName);
      } catch {
        this._onStandbyCrash();
      }
    }
  }

  private _onPtyChunk(sessionName: string, chunk: string): void {
    if (sessionName !== this._activeSessionName) return;

    if (chunk.includes('[ACTION:')) this._midAction = true;
    if (chunk.includes('[/ACTION]')) this._midAction = false;

    if (chunk.includes(HANDOFF_EMITTED_MARKER)) {
      this._awaitingMarker = false;
      this._promote();
      return;
    }

    const lastNonEmpty =
      chunk.split('\n').filter((l) => l.trim().length > 0).at(-1) ?? '';
    const match = TOKEN_COUNT_REGEX.exec(lastNonEmpty);

    if (match === null) {
      this._parseFailCount++;
      if (this._parseFailCount === PARSE_FAIL_MAX) {
        this._deps.halt(
          `OrchestratorPoolManager: status-bar parse failure ${PARSE_FAIL_MAX}× consecutive`,
        );
      }
      return;
    }

    this._parseFailCount = 0;
    const tokenCount = parseInt(match[1]!, 10);
    if (tokenCount >= HANDOFF_TOKEN_THRESHOLD && !this._awaitingMarker && !this._midAction) {
      void this._deps.consoleIpc.handleSendStdin(
        this._activeSessionName,
        HANDOFF_NOW_DIRECTIVE,
        'utf8',
      );
      this._awaitingMarker = true;
    }
  }

  private _promote(): void {
    this._deps.tileRegistry.removeSession(RESERVED_STANDBY);
    this._deps.tileRegistry.addSession(RESERVED_ACTIVE, defaultTileLayoutState(0));
    this._activeSessionName = this._standbySessionName ?? RESERVED_STANDBY;
    this._standbySessionName = null;
    this._awaitingMarker = false;
    this._parseFailCount = 0;
    this._midAction = false;
    this._activeCrashHandled = false;
    void this._spawnAndRegister(RESERVED_STANDBY);
  }

  private _onSessionClose(sessionName: string): void {
    if (sessionName === this._activeSessionName) this._onActiveCrash();
    else if (sessionName === this._standbySessionName) this._onStandbyCrash();
  }

  private _onActiveCrash(): void {
    if (this._activeCrashHandled) return;
    this._activeCrashHandled = true;
    this._promote();
  }

  private _onStandbyCrash(): void {
    if (this._standbyCrashHandled) return;
    this._standbyCrashHandled = true;
    this._deps.tileRegistry.removeSession(RESERVED_STANDBY);
    this._standbySessionName = null;
    void this._spawnAndRegister(RESERVED_STANDBY);
  }
}
