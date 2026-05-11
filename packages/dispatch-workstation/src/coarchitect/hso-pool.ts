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

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

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

// ── Path (E) fix01e — daemon-sessions client interface ───────────────────────
// Pool reads/writes daemon-side reserved-name registration state to avoid
// Blocker 3 collision (sessions.ts:155) on stale `state='killed'` rows from
// previous workstation lifecycles. Pool calls GET-then-PATCH at start(),
// PATCH-to-'held' at stop(). POST remains spawnController's responsibility
// (first-launch path only — GET 404 → spawnController.handleSpawnRequest).
//
// Operator-arbitrated 2026-05-11 (Path E selected after HALT-FIX01-PRE-RED
// surface). Aligns pool with daemon design intent: reserved names are
// permanent registrations per Blocker 3 + killed-state sink semantics
// (transitions.ts:97-102 `killed: []`).

export type DaemonSessionState = 'armed' | 'paused' | 'held' | 'killed';

export interface DaemonSessionInfo {
  readonly state: DaemonSessionState;
}

export interface IDaemonSessionsClient {
  /** GET /v2/sessions/:name — returns null on 404, info otherwise. */
  getSession(name: string): Promise<DaemonSessionInfo | null>;
  /** PATCH /v2/sessions/:name/state with body {state: targetState}. */
  patchSessionState(
    name: string,
    targetState: DaemonSessionState,
  ): Promise<void>;
}

function readDaemonTokenFromFile(): string | null {
  try {
    return readFileSync(
      join(homedir(), '.foxworks-dispatch', 'token'),
      'utf8',
    ).trim();
  } catch {
    return null;
  }
}

const DEFAULT_DAEMON_BASE_URL =
  process.env['FOXWORKS_DAEMON_URL'] ?? 'http://localhost:7878';

const VALID_DAEMON_STATES: readonly DaemonSessionState[] = [
  'armed',
  'paused',
  'held',
  'killed',
];

function isDaemonSessionState(v: unknown): v is DaemonSessionState {
  return (
    typeof v === 'string' &&
    (VALID_DAEMON_STATES as readonly string[]).includes(v)
  );
}

export class DefaultDaemonSessionsClient implements IDaemonSessionsClient {
  private readonly _baseUrl: string;
  private readonly _readToken: () => string | null;

  constructor(
    baseUrl: string = DEFAULT_DAEMON_BASE_URL,
    readToken: () => string | null = readDaemonTokenFromFile,
  ) {
    this._baseUrl = baseUrl;
    this._readToken = readToken;
  }

  async getSession(name: string): Promise<DaemonSessionInfo | null> {
    const headers: Record<string, string> = {};
    const token = this._readToken();
    if (token !== null) headers['x-conductor-token'] = token;
    const res = await fetch(
      `${this._baseUrl}/v2/sessions/${encodeURIComponent(name)}`,
      { headers },
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(
        `DefaultDaemonSessionsClient.getSession("${name}"): HTTP ${res.status}`,
      );
    }
    const body = (await res.json()) as { state?: unknown };
    if (!isDaemonSessionState(body.state)) {
      throw new Error(
        `DefaultDaemonSessionsClient.getSession("${name}"): unexpected state "${String(body.state)}"`,
      );
    }
    return { state: body.state };
  }

  async patchSessionState(
    name: string,
    targetState: DaemonSessionState,
  ): Promise<void> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    const token = this._readToken();
    if (token !== null) headers['x-conductor-token'] = token;
    const res = await fetch(
      `${this._baseUrl}/v2/sessions/${encodeURIComponent(name)}/state`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ state: targetState }),
      },
    );
    if (!res.ok) {
      throw new Error(
        `DefaultDaemonSessionsClient.patchSessionState("${name}", "${targetState}"): HTTP ${res.status}`,
      );
    }
  }
}

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
  /**
   * Path (E) fix01e — pool reads/writes daemon-side reserved-name state to
   * avoid Blocker 3 collision on stale killed rows. See
   * IDaemonSessionsClient interface above. Production wiring uses
   * `new DefaultDaemonSessionsClient()` in main.ts; tests inject mocks.
   */
  daemonSessionsClient: IDaemonSessionsClient;
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
    // Path (E) fix01e: GET each reserved name before spawning. The 4-branch
    // state machine (404 / armed / held / paused / killed) avoids the
    // unconditional POST that triggered Blocker 3 (sessions.ts:184-187) on
    // stale killed rows. Only the 404 branch calls spawnController (POST
    // + tmux spawn — first-launch). Existing rows survive across workstation
    // lifecycles because teardown PATCHes to 'held' (Ctrl+C side effect
    // leaves tmux detached but alive).
    await this._prepareReservedName(RESERVED_ACTIVE);
    await this._prepareReservedName(RESERVED_STANDBY);
    this._startPoll();
  }

  async stop(): Promise<void> {
    this._stdoutDisposer?.();
    this._streamCloseDisposer?.();
    if (this._pollTimer !== null) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    // Path (E) fix01e: PATCH reserved names to 'held' so subsequent launches
    // GET-then-PATCH-to-'armed' without POST collision. Best-effort —
    // teardown does not block app exit on daemon-connectivity issues.
    // 'held' is a valid transition from 'armed' (transitions.ts:98) with
    // tmux Ctrl+C side effect (transitions.ts:143-149); tmux session
    // survives detached for re-attachment on next launch.
    for (const name of [RESERVED_ACTIVE, RESERVED_STANDBY]) {
      try {
        await this._deps.daemonSessionsClient.patchSessionState(name, 'held');
      } catch {
        // Daemon unreachable / registry write fail — non-fatal at teardown.
      }
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

  /**
   * Path (E) fix01e: GET-then-branch state machine for reserved-name startup.
   *
   *   GET 404                 → POST via spawnController (first-launch path).
   *   GET 200 state='armed'   → tmux session should be alive from prior
   *                             launch; register tile + bookkeeping; no
   *                             POST, no PATCH.
   *   GET 200 state='held'    → PATCH state='armed' (valid transition per
   *                             contract §6.1); register tile; no POST.
   *   GET 200 state='paused'  → operator intentionally paused; halt-and-
   *                             surface (pool does not auto-resume operator
   *                             intent).
   *   GET 200 state='killed'  → TERMINAL state per transitions.ts:101 (no
   *                             outbound transitions). Halt with
   *                             operator-actionable remediation message
   *                             (registry-v2.json edit OR daemon restart).
   */
  private async _prepareReservedName(sessionName: string): Promise<void> {
    let existing: DaemonSessionInfo | null;
    try {
      existing = await this._deps.daemonSessionsClient.getSession(sessionName);
    } catch (err) {
      this._deps.halt(
        `OrchestratorPoolManager: daemon-side GET /v2/sessions/${sessionName} failed: ${(err as Error).message}`,
      );
      return;
    }
    if (existing === null) {
      // First-launch: no row exists. POST + tmux spawn via spawnController.
      await this._spawnAndRegister(sessionName);
      return;
    }
    switch (existing.state) {
      case 'armed':
        // Row exists + armed. tmux session should be alive (survived from
        // a prior workstation lifecycle's teardown which PATCHed to 'held'
        // → operator/auto re-armed → tmux still detached-alive). Register
        // tile + bookkeeping; no daemon mutation.
        this._registerExistingSession(sessionName);
        return;
      case 'held':
        // Row exists + held (graceful teardown state from prior lifecycle).
        // PATCH to 'armed' (valid transition per transitions.ts:100), then
        // register. tmux session survives across PATCHes (Ctrl+C left it
        // detached; PATCH-to-armed has no destructive side effect).
        try {
          await this._deps.daemonSessionsClient.patchSessionState(
            sessionName,
            'armed',
          );
        } catch (err) {
          this._deps.halt(
            `OrchestratorPoolManager: daemon-side PATCH ${sessionName} held→armed failed: ${(err as Error).message}`,
          );
          return;
        }
        this._registerExistingSession(sessionName);
        return;
      case 'paused':
        this._deps.halt(
          `OrchestratorPoolManager: ${sessionName} is in 'paused' state (operator-initiated pause). Pool will not auto-resume; operator must PATCH state='armed' to resume.`,
        );
        return;
      case 'killed':
        this._deps.halt(
          `OrchestratorPoolManager: ${sessionName} is in terminal 'killed' state — the daemon registry row is permanently retired per contract §6.1 (killed has no outbound transitions per transitions.ts:101). To resume pool auto-spawn, remove the row from ~/.foxworks-dispatch/registry-v2.json or restart the daemon.`,
        );
        return;
    }
  }

  /**
   * Path (E) fix01e: bookkeeping for an EXISTING reserved-name row (no
   * spawnController call; no daemon mutation). Mirrors the success branch
   * of _spawnAndRegister (lines 188-195 of pre-fix01e hso-pool.ts).
   */
  private _registerExistingSession(sessionName: string): void {
    const orderIndex = sessionName === RESERVED_ACTIVE ? 0 : 1;
    this._deps.tileRegistry.addSession(
      sessionName,
      defaultTileLayoutState(orderIndex),
    );
    if (sessionName === RESERVED_ACTIVE) {
      this._activeSessionName = RESERVED_ACTIVE;
      this._activeCrashHandled = false;
    } else if (sessionName === RESERVED_STANDBY) {
      this._standbySessionName = RESERVED_STANDBY;
      this._standbyCrashHandled = false;
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
