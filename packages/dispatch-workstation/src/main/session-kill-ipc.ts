// MB-T11 WB3 — workstation:session-kill IPC handler.
//
// New IPC channel for orchestrator-callable kill (per Q-MBT11-3=a).
// Mirrors session-send-prompt-ipc.ts pattern: ipc.handle (request/reply),
// SessionKillIpcController unit-test seam, defaultSessionKillDeps for
// production wiring.
//
// Two-step kill pipeline:
//   1. tmux kill-session -t <sessionName> (workstation-side)
//   2. PATCH /v2/sessions/:name/state with body { state: 'killed' }
//      (daemon-side — keeps registry in sync with tmux reality)
//
// Failure modes (workstation-local SessionKillReply.error.error_type):
//   - SchemaValidationError → invalid IPC payload shape
//   - SessionNotFoundError  → tmux says no such session at hasSession check
//   - TmuxKillError         → tmux kill-session rejected (sessionName lives
//                             but kill-session returned non-zero)
//   - DaemonUnreachable     → tmux step succeeded BUT daemon PATCH failed.
//                             tmuxKillSucceeded:true so the caller can
//                             decide whether to retry the daemon side or
//                             surface the inconsistency to the operator.
//
// Schema-territory note: this module does NOT extend v3 WorkstationErrorSchema
// (§8); the SessionKillError type is workstation-local. v3 schema territory
// for sess-mbt11 is §12-only per coordination doc Rule 2 + R1 disposition.
// Future v3.0.x ticket may promote these variants into v3 §8 if a
// renderer-side consumer needs schema-validated reply parsing.
//
// Import-path discipline (per MB-F-DISPATCH-CORE-DUAL-IMPORT-PATTERN-DRIFT):
// dispatch-core symbols ALWAYS imported from `dispatch-core/dist/...js`.

import { ipcMain } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  WorkstationSessionKillRequestSchema,
  type WorkstationSessionKillRequest,
} from 'dispatch-core/dist/v3/schema.js';
import { hasSession as coreHasSession } from 'dispatch-core/dist/transport/tmux.js';

const execFileP = promisify(execFile);

const TMUX_BIN = 'tmux';
const DAEMON_URL = process.env['FOXWORKS_DAEMON_URL'] ?? 'http://localhost:7878';

// ─────────────────────────────────────────────────────────────────────────────
// Wire types
// ─────────────────────────────────────────────────────────────────────────────

/** IPC payload type alias for `workstation:session-kill` — schema in v3 §12. */
export type SessionKillRequest = WorkstationSessionKillRequest;

/**
 * Workstation-local error union for the kill reply. Field set is closely
 * patterned after v3 WorkstationErrorSchema (schema.ts §8) so a future
 * v3.0.x schema extension can drop this in with minimal churn.
 */
export type SessionKillError =
  | {
      error_type: 'SchemaValidationError';
      field_path: string;
      reason: string;
    }
  | {
      error_type: 'SessionNotFoundError';
      sessionName: string;
    }
  | {
      error_type: 'TmuxKillError';
      sessionName: string;
      reason: string;
    }
  | {
      error_type: 'DaemonUnreachable';
      sessionName: string;
      reason: string;
      /** Whether the tmux step before the daemon PATCH succeeded. */
      tmuxKillSucceeded: boolean;
    };

export type SessionKillReply =
  | { ok: true }
  | { ok: false; error: SessionKillError };

// ─────────────────────────────────────────────────────────────────────────────
// Controller (unit-test seam)
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionKillDeps {
  /** Returns true iff a tmux session/pane with this name exists right now. */
  hasSession: (sessionName: string) => Promise<boolean>;
  /** Run `tmux kill-session -t <sessionName>`. Throws on tmux failure. */
  killSession: (sessionName: string) => Promise<void>;
  /**
   * Patch daemon session state to `state`. Throws on HTTP failure. v3.0
   * only fires this with state='killed'; the parameter is retained for
   * future flexibility.
   */
  patchSessionState: (sessionName: string, state: 'killed') => Promise<void>;
}

export class SessionKillIpcController {
  constructor(private readonly deps: SessionKillDeps) {}

  async handleKill(payload: unknown): Promise<SessionKillReply> {
    const parsed = WorkstationSessionKillRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        ok: false,
        error: {
          error_type: 'SchemaValidationError',
          field_path: firstIssue?.path.join('.') ?? '',
          reason: firstIssue?.message ?? parsed.error.message,
        },
      };
    }
    const { sessionName } = parsed.data;

    const alive = await this.deps.hasSession(sessionName);
    if (!alive) {
      return {
        ok: false,
        error: {
          error_type: 'SessionNotFoundError',
          sessionName,
        },
      };
    }

    try {
      await this.deps.killSession(sessionName);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        error: {
          error_type: 'TmuxKillError',
          sessionName,
          reason: reason.length > 0 ? reason : 'unknown tmux kill failure',
        },
      };
    }

    try {
      await this.deps.patchSessionState(sessionName, 'killed');
      return { ok: true };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        error: {
          error_type: 'DaemonUnreachable',
          sessionName,
          reason: reason.length > 0 ? reason : 'unknown daemon error',
          tmuxKillSucceeded: true,
        },
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default deps (production wiring)
// ─────────────────────────────────────────────────────────────────────────────

function readDaemonToken(): string | null {
  try {
    return readFileSync(join(homedir(), '.foxworks-dispatch', 'token'), 'utf8').trim();
  } catch {
    return null;
  }
}

async function defaultPatchSessionState(
  sessionName: string,
  state: 'killed',
): Promise<void> {
  const token = readDaemonToken();
  if (!token) {
    throw new Error('Daemon token not found at ~/.foxworks-dispatch/token');
  }
  const res = await fetch(
    `${DAEMON_URL}/v2/sessions/${encodeURIComponent(sessionName)}/state`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Conductor-Token': token,
      },
      body: JSON.stringify({ state }),
    },
  );
  if (!res.ok) {
    throw new Error(`daemon returned HTTP ${res.status}`);
  }
}

async function defaultKillSession(sessionName: string): Promise<void> {
  await execFileP(TMUX_BIN, ['kill-session', '-t', sessionName]);
}

export function defaultSessionKillDeps(): SessionKillDeps {
  return {
    hasSession: coreHasSession,
    killSession: defaultKillSession,
    patchSessionState: defaultPatchSessionState,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC registration
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisterSessionKillIpcOpts {
  controller?: SessionKillIpcController;
}

export function registerSessionKillIpcHandlers(
  opts: RegisterSessionKillIpcOpts = {},
): void {
  const controller =
    opts.controller ??
    new SessionKillIpcController(defaultSessionKillDeps());

  ipcMain.handle('workstation:session-kill', async (_event, payload) => {
    return controller.handleKill(payload);
  });
}
