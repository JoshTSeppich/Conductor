// MB-T05: spawn IPC handlers — replaces MB-T04's test-hook stdout-echo
// with the real spawn pipeline (env allowlist → tmux new-session →
// daemon registration).
//
// Two surfaces:
//   - workstation:open-repo-dialog (invoke, unchanged from MB-T04) —
//     opens the OS native directory picker.
//   - workstation:spawn-requested (one-way send, semantics changed) —
//     fires the SpawnIpcController.handleSpawnRequest pipeline; result
//     replied via workstation:spawn-result (one-way send to the
//     same renderer's webContents).
//
// SpawnIpcController is the unit-test seam (mirrors CONSOLE-T02's
// ConsoleIpcController). Tests inject SpawnHandlerDeps directly;
// production wires defaultSpawnHandlerDeps which uses real tmux
// execFile + HttpDaemonClient + Electron safeStorage for the
// ANTHROPIC_API_KEY (per WORKSTATION_CONTRACT.md §8.3).

import { ipcMain, dialog, safeStorage } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  spawnSession,
  type SpawnHandlerDeps,
  type SpawnSessionRequest,
  type SpawnSessionResult,
  type WorkstationSpawnError,
  type RegisteredSession,
  type SpawnErrorType,
} from './spawn-handler.js';
import type { SpawnEnv } from './spawn-env.js';
import { HttpSessionListClient } from './session-cap.js';
import { resolveClaudeBin } from './binary-resolver.js';
// === BEGIN: MB-T24 dispatch-mode gate imports ===
// Q-MBT24-5=c (hard gate at spawn-ipc.ts) operator-confirmed at HALT 0
// 2026-05-08 — re-disposed from tentative (a) soft system-prompt
// injection to (c) renderer-side hard gate at the operator-driven spawn
// surface (the only currently-firing spawn path; orchestrator-fired
// spawn throws per MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED).
import { readDispatchMode } from './dispatch-mode-store.js';
import {
  SpawnConfirmGate,
  type SpawnConfirmDecision,
} from './spawn-confirm-gate.js';
// === END: MB-T24 ===

const execFileP = promisify(execFile);

// ─── Wire shape for the renderer-bound IPC reply ─────────────────

export interface SpawnSuccessReply {
  type: 'success';
  result: SpawnSessionResult;
}

export interface SpawnErrorReply {
  type: 'error';
  error: {
    error_type: SpawnErrorType;
    message: string;
    sessionName?: string;
    stderr?: string;
    /** Active session count at cap-check time (SessionCapExceeded only). */
    activeCount?: number;
    /** Configured cap (SessionCapExceeded only). */
    cap?: number;
  };
}

export type SpawnReply = SpawnSuccessReply | SpawnErrorReply;

function toErrorReply(err: unknown): SpawnErrorReply {
  const e = err as Partial<WorkstationSpawnError>;
  return {
    type: 'error',
    error: {
      error_type: (e.error_type as SpawnErrorType) ?? 'SpawnFailed',
      message: e.message ?? String(err),
      sessionName: e.sessionName,
      stderr: e.stderr,
      activeCount: e.activeCount,
      cap: e.cap,
    },
  };
}

// ─── Controller (unit-test seam) ──────────────────────────────────

export class SpawnIpcController {
  constructor(private readonly deps: SpawnHandlerDeps) {}

  async handleSpawnRequest(payload: SpawnSessionRequest): Promise<SpawnReply> {
    try {
      const result = await spawnSession(payload, this.deps);
      return { type: 'success', result };
    } catch (err) {
      return toErrorReply(err);
    }
  }
}

// ─── Production deps wiring ───────────────────────────────────────

const TMUX_BIN = 'tmux';
const DAEMON_URL = process.env['FOXWORKS_DAEMON_URL'] ?? 'http://localhost:7878';

function readDaemonToken(): string | null {
  try {
    return readFileSync(join(homedir(), '.foxworks-dispatch', 'token'), 'utf8').trim();
  } catch {
    return null;
  }
}

/** Production runTmuxNewSession via execFile. */
async function defaultRunTmuxNewSession(
  args: readonly string[],
  env: SpawnEnv,
): Promise<void> {
  try {
    await execFileP(TMUX_BIN, [...args], { env: env as NodeJS.ProcessEnv });
  } catch (e) {
    // execFile errors carry stderr per Node docs; copy onto the thrown
    // Error so the spawn handler's heuristics (isDuplicateSessionError)
    // can match.
    const native = e as NodeJS.ErrnoException & { stderr?: string };
    const wrapped = new Error(native.message) as Error & { stderr?: string };
    wrapped.stderr = native.stderr;
    throw wrapped;
  }
}

/** Production runTmuxKillSession (best-effort). */
async function defaultRunTmuxKillSession(sessionName: string): Promise<void> {
  try {
    await execFileP(TMUX_BIN, ['kill-session', '-t', sessionName]);
  } catch {
    // Best-effort cleanup; tmux may already be gone.
  }
}

/**
 * Production runTmuxHasSession (cairn #73). Resolves on exit-0,
 * rejects on non-zero (Node's execFile rejects non-zero by default).
 * Caller wraps the rejection in SpawnFailed.
 */
async function defaultRunTmuxHasSession(sessionName: string): Promise<void> {
  await execFileP(TMUX_BIN, ['has-session', '-t', sessionName]);
}

/**
 * Production registerSession via daemon POST /v2/sessions. Mirrors the
 * shape from packages/dispatch-cli/src/lib/daemon-client.ts:206
 * runInitV2 (KNOWN-correct per CLI v1 + DAEMON-T07). 409 conflict
 * surfaces as SessionAlreadyRegistered; ECONNREFUSED / fetch failure
 * surfaces as DaemonUnreachable; other failures wrap as
 * DaemonUnreachable too (caller's default fallback path).
 */
async function defaultRegisterSession(req: {
  name: string;
  cwd: string;
  tmux_target: string;
}): Promise<RegisteredSession> {
  const token = readDaemonToken();
  if (!token) {
    const err = new Error('Daemon token not found at ~/.foxworks-dispatch/token') as Error & { error_type: string };
    err.error_type = 'DaemonUnreachable';
    throw err;
  }
  let res: Response;
  try {
    res = await fetch(`${DAEMON_URL}/v2/sessions`, {
      method: 'POST',
      headers: { 'X-Conductor-Token': token, 'content-type': 'application/json' },
      body: JSON.stringify({
        name: req.name,
        cwd: req.cwd,
        tmux_target: req.tmux_target,
        handoff_path: join(req.cwd, 'HANDOFF.md'),
      }),
    });
  } catch (e) {
    const err = new Error(`fetch failed: ${(e as Error).message}`) as Error & { error_type: string };
    err.error_type = 'DaemonUnreachable';
    throw err;
  }
  if (res.status === 409) {
    const err = new Error('Session already registered with daemon') as Error & { error_type: string };
    err.error_type = 'SessionAlreadyRegistered';
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`daemon returned HTTP ${res.status}`) as Error & { error_type: string };
    err.error_type = 'DaemonUnreachable';
    throw err;
  }
  const body = (await res.json()) as RegisteredSession;
  return body;
}

/**
 * Read ANTHROPIC_API_KEY from Electron safeStorage per
 * WORKSTATION_CONTRACT.md §8.3. v3.0 wiring detail: the persisted
 * value lives in electron-store under a fixed key (settings UI ships
 * in MB-T11/W-T19; until then operator can populate via DevTools or
 * env var). Falls back to process.env.ANTHROPIC_API_KEY for
 * dev-mode parity with COARCH-T03's MB_MOCK_ANTHROPIC pattern.
 */
function readApiKey(persistedEncrypted: Buffer | null): string {
  if (persistedEncrypted && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(persistedEncrypted);
    } catch {
      /* fall through to env */
    }
  }
  return process.env['ANTHROPIC_API_KEY'] ?? '';
}

export interface DefaultDepsOpts {
  /** Persisted encrypted API key (electron-store byte buffer). */
  persistedApiKey?: Buffer | null;
}

/**
 * Production deps factory. Async because cairn #72 requires resolving
 * the absolute `claude` binary path at startup via `which claude`
 * before deps can be considered complete. Caller (registerSpawnIpcHandlers)
 * holds onto the returned promise and awaits it on first spawn.
 *
 * Resolution failure surfaces as SpawnFailed in the IPC reply for the
 * first spawn the operator attempts (the unresolved-bin guard in
 * spawnSession sees an empty claudeBinPath and rejects with a typed
 * envelope).
 */
export async function defaultSpawnHandlerDeps(
  opts: DefaultDepsOpts = {},
): Promise<SpawnHandlerDeps> {
  let claudeBinPath = '';
  try {
    claudeBinPath = await resolveClaudeBin();
  } catch {
    // Leave empty. The unresolved-bin guard in spawnSession surfaces
    // SpawnFailed with a clear error message on first spawn rather
    // than crashing the workstation at startup.
  }
  return {
    runTmuxNewSession: defaultRunTmuxNewSession,
    runTmuxKillSession: defaultRunTmuxKillSession,
    runTmuxHasSession: defaultRunTmuxHasSession,
    registerSession: defaultRegisterSession,
    sourceEnv: process.env,
    apiKey: readApiKey(opts.persistedApiKey ?? null),
    // MB-T06: production cap-check wiring against GET /v2/sessions.
    // sessionCap omitted → DEFAULT_SESSION_CAP=5 from session-cap.ts applies.
    sessionListClient: new HttpSessionListClient(),
    claudeBinPath,
    // cairn #73: livenessCheckDelayMs unset → spawn-handler default
    // 500ms applies. A future ticket may wire this through settings UI.
  };
}

// ─── Electron IPC registration ────────────────────────────────────

export interface RegisterSpawnIpcOpts {
  /**
   * Pre-built controller, optional. When omitted, a controller is
   * created with defaultSpawnHandlerDeps. Tests call the controller
   * directly without registering IPC; production startup uses this
   * registration path.
   */
  controller?: SpawnIpcController;
}

export function registerSpawnIpcHandlers(opts: RegisterSpawnIpcOpts = {}): void {
  // Cairn #72: defaultSpawnHandlerDeps is async (resolves `claude`
  // absolute path at startup). To avoid changing main.ts's
  // synchronous registerSpawnIpcHandlers() call site, we kick off
  // the resolution here and cache the controller promise. The first
  // spawn awaits the same promise; by the time the operator clicks
  // "+ Spawn Session" (multi-second user action minimum), the
  // resolution has long completed.
  const controllerPromise: Promise<SpawnIpcController> = opts.controller
    ? Promise.resolve(opts.controller)
    : defaultSpawnHandlerDeps().then((deps) => new SpawnIpcController(deps));

  ipcMain.handle('workstation:open-repo-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select repository for new session',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // === BEGIN: MB-T24 dispatch-mode gate ===
  // Per Q-MBT24-5=c, every operator-driven spawn passes through the gate
  // before reaching SpawnIpcController. Gate reads the persisted
  // dispatchMode fresh per request (so live toggle flips between modal
  // open and Spawn-click are honored). Auto → fire-now (today's flow).
  // Ask → emit 'workstation:spawn-confirm-required' to renderer; await
  // 'workstation:spawn-confirm-response' before invoking the controller.
  const spawnConfirmGate = new SpawnConfirmGate({
    readDispatchMode,
  });

  // Helper: kicks off the actual spawn through the controller and routes
  // the reply back to the renderer's webContents. Used by both the
  // 'auto' fire-now path AND the 'ask' confirm-then-fire path.
  function fireSpawnAndReply(
    event: Electron.IpcMainEvent,
    req: SpawnSessionRequest,
  ): void {
    void controllerPromise
      .then((controller) => controller.handleSpawnRequest(req))
      .then((reply) => {
        try {
          event.sender.send('workstation:spawn-result', reply);
        } catch {
          // Renderer may have closed; nothing to do.
        }
      })
      .catch((err) => {
        // Defense-in-depth: deps construction itself threw (rare —
        // resolveClaudeBin already swallows its error). Surface a
        // typed envelope so the renderer doesn't see a hung promise.
        const reply = toErrorReply(err);
        try {
          event.sender.send('workstation:spawn-result', reply);
        } catch {
          // Renderer may have closed.
        }
      });
  }

  ipcMain.on('workstation:spawn-requested', (event, payload: unknown) => {
    // MB-F-MB-T04-PAYLOAD-VALIDATION followup tracks the Zod schema
    // boundary; for now we accept the shape implicitly (renderer is
    // trusted within Workstation) and let the handler surface
    // type errors via the error envelope.
    const req = payload as SpawnSessionRequest;

    // MB-T24: gate routes 'auto' through fire-now (existing flow);
    // 'ask' caches the request and emits confirm-required to renderer.
    const decision = spawnConfirmGate.decide(
      { send: (channel, msg) => event.sender.send(channel, msg) },
      req,
      () => fireSpawnAndReply(event, req),
    );
    if (decision === 'fire-now') {
      fireSpawnAndReply(event, req);
    }
    // 'await-confirm' path: fireSpawnAndReply will run later when
    // 'workstation:spawn-confirm-response' arrives with decision='confirm'.
  });

  // MB-T24: 'workstation:spawn-confirm-response' handler. Renderer fires
  // this from the confirmation modal's Confirm/Cancel buttons.
  ipcMain.on(
    'workstation:spawn-confirm-response',
    (_event, payload: unknown) => {
      if (payload === null || typeof payload !== 'object') return;
      const r = payload as Record<string, unknown>;
      const requestId = r['requestId'];
      const decision = r['decision'];
      if (typeof requestId !== 'string' || requestId.length === 0) return;
      if (decision !== 'confirm' && decision !== 'cancel') return;
      spawnConfirmGate.handleResponse(
        requestId,
        decision as SpawnConfirmDecision,
      );
    },
  );
  // === END: MB-T24 ===
}
