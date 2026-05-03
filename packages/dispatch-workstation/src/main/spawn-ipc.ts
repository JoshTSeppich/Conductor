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

export function defaultSpawnHandlerDeps(opts: DefaultDepsOpts = {}): SpawnHandlerDeps {
  return {
    runTmuxNewSession: defaultRunTmuxNewSession,
    runTmuxKillSession: defaultRunTmuxKillSession,
    registerSession: defaultRegisterSession,
    sourceEnv: process.env,
    apiKey: readApiKey(opts.persistedApiKey ?? null),
    // MB-T06: production cap-check wiring against GET /v2/sessions.
    // sessionCap omitted → DEFAULT_SESSION_CAP=5 from session-cap.ts applies.
    sessionListClient: new HttpSessionListClient(),
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
  const controller = opts.controller ?? new SpawnIpcController(defaultSpawnHandlerDeps());

  ipcMain.handle('workstation:open-repo-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select repository for new session',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.on('workstation:spawn-requested', (event, payload: unknown) => {
    // MB-F-MB-T04-PAYLOAD-VALIDATION followup tracks the Zod schema
    // boundary; for now we accept the shape implicitly (renderer is
    // trusted within Workstation) and let the handler surface
    // type errors via the error envelope.
    const req = payload as SpawnSessionRequest;
    void controller.handleSpawnRequest(req).then((reply) => {
      try {
        event.sender.send('workstation:spawn-result', reply);
      } catch {
        // Renderer may have closed; nothing to do.
      }
    });
  });
}
