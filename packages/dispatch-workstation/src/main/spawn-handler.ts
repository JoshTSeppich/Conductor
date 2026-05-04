// MB-T05 — spawn handler: tmux new-session + daemon registration.
//
// Per WORKSTATION_CONTRACT.md §8.1 amended (cf1848a) three-clause bar:
//   (a) registered session structurally identical to CLI-spawned (KNOWN per MB-S02 §5)
//   (b) PTY identity (KNOWN per MB-S02 §4)
//   (c) env compatibility within documented allowlist (this module)
//
// Per WORKSTATION_CONTRACT.md §3.3: spawn-new-session payload =
// repoPath + sessionName (+ optional initialPrompt deferred per
// MB-F-MB-T04-INITIAL-PROMPT followup).
//
// Cluster 2 ships tmux spawn execution; cluster 3 adds the daemon
// registration step. Both are in this single module so the handler
// is one cohesive read-end-to-end pipeline.
//
// Dependencies are injected for testability — production startup wires
// the real tmux + daemon-client implementations; unit tests inject
// recording stubs.

import type { SpawnEnv } from './spawn-env.js';
import { buildSpawnEnv } from './spawn-env.js';
import {
  checkSpawnCapacity,
  SessionCapExceededError,
  type SessionListClient,
} from './session-cap.js';

/**
 * Workstation-side error types per WORKSTATION_CONTRACT.md §6.5
 * discriminated-union shape. The error_type field is the discriminator;
 * additional fields per type carry context for the renderer.
 */
export type SpawnErrorType =
  | 'SpawnFailed'
  | 'SessionNameExists'
  | 'DaemonUnreachable'
  | 'SessionAlreadyRegistered'
  | 'SessionCapExceeded';

export interface WorkstationSpawnError extends Error {
  error_type: SpawnErrorType;
  sessionName?: string;
  stderr?: string;
  /** Active session count at cap-check time (SessionCapExceeded only). */
  activeCount?: number;
  /** Configured cap (SessionCapExceeded only). */
  cap?: number;
}

function makeError(
  error_type: SpawnErrorType,
  message: string,
  extra: Partial<WorkstationSpawnError> = {},
): WorkstationSpawnError {
  const e = new Error(message) as WorkstationSpawnError;
  e.error_type = error_type;
  Object.assign(e, extra);
  return e;
}

/**
 * Daemon registration response shape (subset of v2 SessionV2 per
 * dispatch-core/src/v2/schema.ts). The handler returns the daemon-
 * acknowledged session for the renderer to display.
 */
export interface RegisteredSession {
  name: string;
  cwd: string;
  tmux_target: string;
  handoff_path: string;
  state: string;
}

export interface SpawnSessionRequest {
  /** Absolute path to the repo cwd for the spawned tmux session. */
  repoPath: string;
  /** Operator-chosen session name; uniqueness enforced both tmux-side and daemon-side. */
  sessionName: string;
}

export interface SpawnHandlerDeps {
  /**
   * Run `tmux new-session` with the given args + env. Throws on
   * non-zero exit; the thrown Error MAY have a `stderr` field carrying
   * the tmux stderr output for SessionNameExists detection.
   */
  runTmuxNewSession(args: readonly string[], env: SpawnEnv): Promise<void>;
  /**
   * Run `tmux kill-session -t <sessionName>`. Best-effort cleanup;
   * errors are swallowed by the caller.
   */
  runTmuxKillSession(sessionName: string): Promise<void>;
  /**
   * Run `tmux has-session -t <sessionName>`. Resolves if the session
   * exists; rejects if not. Used for the cairn-#73 post-spawn liveness
   * check: tmux's `new-session` exit-0 only proves session-created,
   * not program-running. After a configurable sleep, has-session
   * confirms the program inside the session is still alive.
   */
  runTmuxHasSession(sessionName: string): Promise<void>;
  /**
   * POST to daemon /v2/sessions; throws WorkstationSpawnError on failure
   * (or a plain Error wrapped by the handler).
   */
  registerSession(req: {
    name: string;
    cwd: string;
    tmux_target: string;
  }): Promise<RegisteredSession>;
  /**
   * Source env (typically Electron's process.env). Filtered through
   * buildSpawnEnv per the §8.1 amended allowlist.
   */
  sourceEnv: NodeJS.ProcessEnv | Record<string, string | undefined>;
  /**
   * Anthropic API key decrypted from Electron safeStorage per
   * WORKSTATION_CONTRACT.md §8.3. Injected into the spawned env.
   */
  apiKey: string;
  /**
   * Daemon session-list client for the MB-T06 pre-spawn cap check.
   * Production wiring uses HttpSessionListClient against GET /v2/sessions
   * (defaultSpawnHandlerDeps in spawn-ipc.ts always supplies it).
   *
   * Optional for the test affordance: legacy MB-T05 unit tests that
   * exercise tmux/daemon paths and do not assert cap-check behavior may
   * omit this; cap check then no-ops (safe under test only). Cluster 3
   * tests explicitly supply it to verify cap behavior.
   */
  sessionListClient?: SessionListClient;
  /**
   * Concurrent-session cap (default DEFAULT_SESSION_CAP from session-cap.ts).
   * Configurable per MB-F-MB-T06-CAP-SETTINGS followup; threaded through
   * for tests + future settings UI.
   */
  sessionCap?: number;
  /**
   * Delay (milliseconds) between `runTmuxNewSession` resolving and the
   * post-spawn `runTmuxHasSession` liveness check (cairn #73). Default
   * 500ms in production; tests inject 0 for fast unit runs.
   *
   * 500ms is a heuristic: long enough for tmux's child-process exec
   * attempt to have happened and for an immediate-exit failure to
   * tear down the session, short enough to keep the spawn user-action
   * latency acceptable. Tunable via a future ticket with measured data
   * (per cairn #73 tradeoff note).
   */
  livenessCheckDelayMs?: number;
  /**
   * Absolute path to the `claude` executable. Resolved once at
   * workstation startup via `resolveClaudeBin()` (binary-resolver.ts)
   * and threaded through SpawnHandlerDeps so tmux argv contains the
   * absolute path, bypassing PATH lookup inside the closed-allowlist
   * env (which excludes `~/.local/bin`, the Anthropic official-
   * installer location). Per cairn finding #72 (MB-F-MB-T05-PATH-
   * ALLOWLIST-CLAUDE-RESOLUTION).
   *
   * spawnSession surfaces SpawnFailed if this is empty/undefined —
   * unresolved-bin guard prevents the dogfooded silent failure where
   * tmux exits 0 then claude fails to exec, leaving an orphaned
   * daemon record.
   */
  claudeBinPath: string;
}

export interface SpawnSessionResult {
  sessionName: string;
  /** Daemon-side identifier (currently same as sessionName per v2 schema). */
  sessionId: string;
  /**
   * Whether the CC-console panel is mounted in the renderer. CONSOLE-T03
   * mounts the panel separately; spawn-handler does NOT auto-mount.
   */
  panelMounted: false;
}

/**
 * Heuristic: tmux's "duplicate session" stderr is the canonical signal
 * for name collision. Match case-insensitively to be robust against
 * tmux-version variations.
 */
function isDuplicateSessionError(stderr: string | undefined): boolean {
  if (!stderr) return false;
  return /duplicate session/i.test(stderr);
}

/**
 * Construct the tmux argv for spawning a new claude-running session.
 * Args are stable contract per cluster 2 P1; cairn #72 amends the
 * final program token from the literal 'claude' to the absolute path
 * resolved at workstation startup.
 */
function buildTmuxArgs(
  req: SpawnSessionRequest,
  claudeBinPath: string,
): readonly string[] {
  return [
    'new-session',
    '-d',
    '-s', req.sessionName,
    '-c', req.repoPath,
    claudeBinPath,
  ];
}

/**
 * Spawn a new tmux session running `claude` in `repoPath`, then
 * register it with the daemon.
 *
 * Failure modes (per WORKSTATION_CONTRACT.md §6.5 typed error union):
 *   SessionNameExists       — tmux refused due to existing session of same name
 *   SpawnFailed             — tmux exited non-zero for any other reason
 *   DaemonUnreachable       — fetch to daemon failed; tmux session killed for cleanup
 *   SessionAlreadyRegistered— daemon returned 409; tmux session killed for cleanup
 */
export async function spawnSession(
  req: SpawnSessionRequest,
  deps: SpawnHandlerDeps,
): Promise<SpawnSessionResult> {
  // MB-T06 pre-spawn cap check. Fires BEFORE buildSpawnEnv + tmux invocation
  // to avoid spawning a tmux session that would immediately need to be
  // killed for cap violation (per ticket spec ordering invariant).
  // Daemon-unreachable failures fail closed per WORKSTATION_CONTRACT.md §6.5
  // — we route them through the same DaemonUnreachable typed envelope used
  // by the registration step. If sessionListClient is absent (legacy test
  // fixtures), the cap check is skipped — production always supplies it.
  if (deps.sessionListClient) {
    try {
      await checkSpawnCapacity(deps.sessionListClient, deps.sessionCap);
    } catch (err) {
      if (err instanceof SessionCapExceededError) {
        // Attach sessionName for the IPC envelope; the error already
        // carries error_type='SessionCapExceeded' + activeCount + cap as
        // typed fields per session-cap.ts.
        (err as SessionCapExceededError & { sessionName?: string }).sessionName =
          req.sessionName;
        throw err;
      }
      const we = err as Partial<WorkstationSpawnError>;
      if (we.error_type === 'DaemonUnreachable') {
        throw makeError('DaemonUnreachable', (err as Error).message, {
          sessionName: req.sessionName,
        });
      }
      throw makeError(
        'DaemonUnreachable',
        `cap check failed: ${(err as Error).message}`,
        { sessionName: req.sessionName },
      );
    }
  }

  // Cairn #72 unresolved-bin guard. SpawnHandlerDeps.claudeBinPath is
  // populated at workstation startup by resolveClaudeBin (in
  // spawn-ipc's defaultSpawnHandlerDeps). Empty/undefined here means
  // the resolver failed at startup OR a caller forgot to thread the
  // field through; either way, surfacing SpawnFailed up-front avoids
  // the dogfooded "tmux exit-0, claude exec'd nothing, daemon record
  // orphaned" failure mode.
  if (!deps.claudeBinPath || deps.claudeBinPath.length === 0) {
    throw makeError(
      'SpawnFailed',
      'claude binary path not resolved at workstation startup — check claude installation or restart the app',
      { sessionName: req.sessionName },
    );
  }

  const env = buildSpawnEnv(deps.sourceEnv, deps.apiKey);
  const args = buildTmuxArgs(req, deps.claudeBinPath);

  // Step 1: tmux new-session.
  try {
    await deps.runTmuxNewSession(args, env);
  } catch (err) {
    const stderr = (err as Error & { stderr?: string }).stderr;
    if (isDuplicateSessionError(stderr)) {
      throw makeError(
        'SessionNameExists',
        `tmux session "${req.sessionName}" already exists`,
        { sessionName: req.sessionName, stderr },
      );
    }
    throw makeError(
      'SpawnFailed',
      `tmux new-session failed: ${(err as Error).message}`,
      { sessionName: req.sessionName, stderr },
    );
  }

  // Step 1.5 (cairn #73): post-spawn liveness check.
  // tmux's `new-session` exit-0 proves session-created, NOT program-
  // running. tmux returns 0 once the session struct exists; the child
  // process attempts exec asynchronously after that point. If the
  // child dies immediately (binary missing, license refused, crash),
  // the session ends silently. Without this check, the workstation
  // would proceed to register the session with the daemon — leaving an
  // orphaned daemon record once the session-died-on-exec event ripples
  // through.
  //
  // Sleep then `tmux has-session -t <name>`. If has-session rejects,
  // surface SpawnFailed; daemon registration is skipped via the throw.
  // Best-effort tmux kill-session is NOT issued here — has-session
  // failing means the session is already gone (or never properly
  // started), so no cleanup is needed.
  const livenessDelay = deps.livenessCheckDelayMs ?? 500;
  if (livenessDelay > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, livenessDelay));
  }
  try {
    await deps.runTmuxHasSession(req.sessionName);
  } catch (err) {
    throw makeError(
      'SpawnFailed',
      `tmux session created but program died on exec — claude binary may be missing or crashed (has-session check failed: ${(err as Error).message})`,
      { sessionName: req.sessionName },
    );
  }

  // Step 2: daemon registration. Tmux target is conventionally
  // <sessionName>:0.0 (window 0, pane 0) for a freshly-created
  // detached session.
  const tmuxTarget = `${req.sessionName}:0.0`;
  let registered: RegisteredSession;
  try {
    registered = await deps.registerSession({
      name: req.sessionName,
      cwd: req.repoPath,
      tmux_target: tmuxTarget,
    });
  } catch (err) {
    // Cleanup: kill the tmux session so we don't orphan it.
    await deps.runTmuxKillSession(req.sessionName).catch(() => {});
    const we = err as Partial<WorkstationSpawnError>;
    if (we.error_type === 'DaemonUnreachable' || we.error_type === 'SessionAlreadyRegistered') {
      throw err;
    }
    throw makeError(
      'DaemonUnreachable',
      `daemon registration failed: ${(err as Error).message}`,
      { sessionName: req.sessionName },
    );
  }

  return {
    sessionName: registered.name,
    sessionId: registered.name,
    panelMounted: false,
  };
}
