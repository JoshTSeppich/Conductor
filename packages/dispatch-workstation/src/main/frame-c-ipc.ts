// MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS WB4 GREEN — Frame C
// detail-pane action-bar IPC controller.
//
// Three channels per consolidated `WORKSTATION_CONTRACT.md §6` amendment
// (`0f0e762`):
//   frame-c:diff — `git diff main...<branch>` via child_process
//   frame-c:merge — `git merge --no-commit --no-ff <branch>` via child_process
//   frame-c:focus — `writeFrameMode('A')` + `emitScroll({sessionName})`
//
// Pattern mirrors `dispatch-mode-ipc.ts` (MB-T24) Controller-with-DI-seam
// + factory + `registerHandlers(ipcMain)` method, with extensions for the
// 3-channel surface + discriminated-union result shape per coord note
// `9fe6358` §4. Action semantics per Sub-Q-MBTWBDPFA-B operator
// arbitration 2026-05-11 (diff=(i) / merge=(i) / focus=(i)).

import { spawn } from 'node:child_process';
import { writeFrameMode } from './frame-mode-state.js';

// ─── Dependency interfaces ─────────────────────────────────────────────

/** Minimal shape of Electron's `ipcMain` we depend on. Tests inject a
 *  fake recording-Map; production passes the real `ipcMain` singleton. */
export interface FrameCIpcMain {
  handle: (
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown,
  ) => void;
}

/** Session-to-cwd-and-branch lookup. Production wiring: closure-captures
 *  TileGridApp's session entries (cwd from SpawnSessionResult;
 *  branchName from TileGridSessionEntry per Q-MBT15-2 stub or future
 *  MB-T15-followup branch IPC). Tests inject a stub.
 *
 *  Returns `null` if session is not registered (e.g., operator-killed
 *  session; race; stale selection). Handlers translate null →
 *  `error_type: 'SessionNotFound'`. */
export interface SessionLookupFn {
  (sessionName: string): { cwd: string; branchName: string } | null;
}

/** Renderer-side scroll-event sink. Production: `mainWindow.webContents.
 *  send('frame-c:scroll-to-session', payload)`. Tests inject a recording
 *  spy. */
export interface ScrollEmitter {
  (payload: { sessionName: string }): void;
}

export interface FrameCIpcDeps {
  readonly lookupSession: SessionLookupFn;
  readonly emitScroll: ScrollEmitter;
  /** `frame-mode-state.ts` write helper. Production: the imported
   *  `writeFrameMode`. Tests inject a spy/throwing-stub. */
  readonly writeFrameMode: (mode: 'A' | 'C') => void;
  /** Override for tests; production uses `defaultRunGit` (spawn-based). */
  readonly runGit?: (
    args: readonly string[],
    cwd: string,
  ) => Promise<{ code: number; stdout: string; stderr: string }>;
}

// ─── Result types (discriminated unions per Sub-Q-MBTWBDPFA-C=α) ──────

export interface FrameCActionSuccess {
  readonly ok: true;
}

export interface FrameCActionError {
  readonly ok: false;
  readonly error_type: string;
  readonly message: string;
}

export type DiffResult =
  | (FrameCActionSuccess & { readonly diffText: string })
  | (FrameCActionError & {
      readonly error_type:
        | 'SessionNotFound'
        | 'NotARepository'
        | 'BranchNotFound'
        | 'GitInvocationFailed';
    });

export type MergeResult =
  | (FrameCActionSuccess & {
      readonly state: 'staged';
      readonly message: string;
    })
  | (FrameCActionError & {
      readonly error_type:
        | 'SessionNotFound'
        | 'MergeConflict'
        | 'NotARepository'
        | 'NothingToMerge'
        | 'DirtyWorkingTree'
        | 'GitInvocationFailed';
      readonly conflictFiles?: readonly string[];
    });

export type FocusResult =
  | (FrameCActionSuccess & { readonly message: string })
  | (FrameCActionError & {
      readonly error_type: 'SessionNotFound' | 'FrameModeWriteFailed';
    });

// ─── Default production git executor ──────────────────────────────────

async function defaultRunGit(
  args: readonly string[],
  cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('git', args, { cwd });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer | string) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d: Buffer | string) => {
      stderr += d.toString();
    });
    proc.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
    proc.on('error', (err: Error) => {
      // spawn-system error (git binary missing, permission denied, etc.)
      resolve({ code: -1, stdout, stderr: err.message });
    });
  });
}

// ─── Payload validation ───────────────────────────────────────────────

function validateSessionNamePayload(
  payload: unknown,
): { ok: true; sessionName: string } | { ok: false; error: string } {
  if (payload === null || typeof payload !== 'object') {
    return {
      ok: false,
      error: 'payload must be an object with {sessionName: string}',
    };
  }
  const sessionName = (payload as Record<string, unknown>)['sessionName'];
  if (typeof sessionName !== 'string' || sessionName.length === 0) {
    return {
      ok: false,
      error: 'payload.sessionName must be a non-empty string',
    };
  }
  return { ok: true, sessionName };
}

// ─── FrameCIpcController ──────────────────────────────────────────────

export class FrameCIpcController {
  private readonly deps: FrameCIpcDeps;

  constructor(deps: FrameCIpcDeps) {
    this.deps = deps;
  }

  registerHandlers(ipcMain: FrameCIpcMain): void {
    ipcMain.handle('frame-c:diff', async (_event, ...args) => {
      return this.handleDiff(args[0]);
    });
    ipcMain.handle('frame-c:merge', async (_event, ...args) => {
      return this.handleMerge(args[0]);
    });
    ipcMain.handle('frame-c:focus', async (_event, ...args) => {
      return this.handleFocus(args[0]);
    });
  }

  // ── diff ───────────────────────────────────────────────────────────

  private async handleDiff(payload: unknown): Promise<DiffResult> {
    const validated = validateSessionNamePayload(payload);
    if (!validated.ok) {
      return {
        ok: false,
        error_type: 'SessionNotFound',
        message: validated.error,
      };
    }
    const lookup = this.deps.lookupSession(validated.sessionName);
    if (lookup === null) {
      return {
        ok: false,
        error_type: 'SessionNotFound',
        message: `session "${validated.sessionName}" not registered with workstation`,
      };
    }
    const runGit = this.deps.runGit ?? defaultRunGit;
    const result = await runGit(['diff', `main...${lookup.branchName}`], lookup.cwd);
    if (result.code === 0) {
      return { ok: true, diffText: result.stdout };
    }
    // Error classification per coord note 9fe6358 §3.1
    if (/not a git repository/i.test(result.stderr)) {
      return {
        ok: false,
        error_type: 'NotARepository',
        message: result.stderr,
      };
    }
    if (
      /unknown revision/i.test(result.stderr) ||
      /bad revision/i.test(result.stderr)
    ) {
      return {
        ok: false,
        error_type: 'BranchNotFound',
        message: result.stderr,
      };
    }
    return {
      ok: false,
      error_type: 'GitInvocationFailed',
      message: result.stderr || `git exited with code ${result.code}`,
    };
  }

  // ── merge ──────────────────────────────────────────────────────────

  private async handleMerge(payload: unknown): Promise<MergeResult> {
    const validated = validateSessionNamePayload(payload);
    if (!validated.ok) {
      return {
        ok: false,
        error_type: 'SessionNotFound',
        message: validated.error,
      };
    }
    const lookup = this.deps.lookupSession(validated.sessionName);
    if (lookup === null) {
      return {
        ok: false,
        error_type: 'SessionNotFound',
        message: `session "${validated.sessionName}" not registered with workstation`,
      };
    }
    const runGit = this.deps.runGit ?? defaultRunGit;
    const result = await runGit(
      ['merge', '--no-commit', '--no-ff', lookup.branchName],
      lookup.cwd,
    );
    if (result.code === 0) {
      return {
        ok: true,
        state: 'staged',
        message:
          'Merge staged successfully; no commit made. Operator must commit (git commit) or abort (git merge --abort) manually.',
      };
    }
    // Conflict detection per coord note 9fe6358 §3.2
    const combined = result.stdout + '\n' + result.stderr;
    if (/automatic merge failed/i.test(combined) || /\bCONFLICT\b/.test(combined)) {
      const conflictFiles: string[] = [];
      const conflictRe = /CONFLICT[^:\n]*: Merge conflict in ([^\n]+)/g;
      let m: RegExpExecArray | null;
      while ((m = conflictRe.exec(combined)) !== null) {
        conflictFiles.push(m[1]!.trim());
      }
      return {
        ok: false,
        error_type: 'MergeConflict',
        message:
          'Automatic merge failed. Resolve conflicts manually or run `git merge --abort`.',
        conflictFiles,
      };
    }
    if (/not a git repository/i.test(result.stderr)) {
      return {
        ok: false,
        error_type: 'NotARepository',
        message: result.stderr,
      };
    }
    if (
      /already up to date/i.test(result.stdout) ||
      /merge requires a single/i.test(result.stderr)
    ) {
      return {
        ok: false,
        error_type: 'NothingToMerge',
        message: result.stdout || result.stderr,
      };
    }
    if (/your local changes/i.test(result.stderr)) {
      return {
        ok: false,
        error_type: 'DirtyWorkingTree',
        message: result.stderr,
      };
    }
    return {
      ok: false,
      error_type: 'GitInvocationFailed',
      message: result.stderr || `git exited with code ${result.code}`,
    };
  }

  // ── focus ──────────────────────────────────────────────────────────

  private async handleFocus(payload: unknown): Promise<FocusResult> {
    const validated = validateSessionNamePayload(payload);
    if (!validated.ok) {
      return {
        ok: false,
        error_type: 'SessionNotFound',
        message: validated.error,
      };
    }
    const lookup = this.deps.lookupSession(validated.sessionName);
    if (lookup === null) {
      return {
        ok: false,
        error_type: 'SessionNotFound',
        message: `session "${validated.sessionName}" not registered with workstation`,
      };
    }
    // writeFrameMode is best-effort at source (frame-mode-state.ts:26-33
    // swallows errors silently and returns void). Try/catch here is
    // defense-in-depth for any future writeFrameMode that throws (e.g.,
    // a stricter variant or a test-injected throwing stub).
    try {
      this.deps.writeFrameMode('A');
    } catch (e) {
      return {
        ok: false,
        error_type: 'FrameModeWriteFailed',
        message: e instanceof Error ? e.message : String(e),
      };
    }
    this.deps.emitScroll({ sessionName: validated.sessionName });
    return {
      ok: true,
      message: 'Focused to compact-tile mode; tile scrolled/highlighted.',
    };
  }
}

// ─── Production factory ───────────────────────────────────────────────

/**
 * Production factory. `main.ts` calls this with closure-captured deps
 * (session lookup from TileGridApp; scroll emit via
 * `mainWindow.webContents.send`; `writeFrameMode` from frame-mode-state).
 *
 * NOTE: at WB4 ship time, the `main.ts` call site is NOT YET wired —
 * deferred per dispatch serialization rule until Wave B WB10 GREEN
 * lands. WB4 ships the controller + bridge surface; production wiring
 * follows.
 */
export function createDefaultFrameCIpcController(
  deps: FrameCIpcDeps,
): FrameCIpcController {
  return new FrameCIpcController(deps);
}

// Re-export writeFrameMode signature type for the deps shape so callers
// can declare deps without importing frame-mode-state directly.
export type { writeFrameMode };
