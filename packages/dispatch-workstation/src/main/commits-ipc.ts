// MB-T22 WB3 — `commits:list` IPC handler.
//
// Operator-confirmed Q-MBT22-1=a (workstation child_process for git
// log; no daemon route) + Q-MBT22-7=a (static window.commitsBridge).
// Decisions doc 2026-05-07.
//
// Wires the renderer-side window.commitsBridge.listCommits → main-
// process commits-reader.readCommits pipeline. Reads the workstation's
// primary repoRoot via readBuildDocConfig() — `BuildDocConfig.repoRoot`
// is the established source of truth (head-watcher.ts + build-doc-
// reader.ts both read it). No new persistence; no daemon round-trip.
//
// Result shape: a discriminated `{ groups, error? }` envelope.
//   - Happy path: `{ groups: CommitGroup[] }` — empty array if zero
//     commits or graceful-empty (per readCommits catch block).
//   - Error path: `{ groups: [], error: string }` — surfaced to the
//     renderer as the empty-state / error-row content. Used when the
//     build-doc config is unset (operator hasn't selected a repo yet)
//     so the commits-tab can prompt rather than silently render empty.
//
// Pattern mirrors src/main/audit-modal-ipc.ts shape: a top-level
// `registerCommitsIpc()` that registers exactly one ipcMain.handle
// channel, with optional dep-injection for unit tests. main.ts calls
// it once during the post-whenReady IPC-registration block per a new
// `=== BEGIN: MB-T22 commits-ipc registration ===` sentinel zone.

import { ipcMain } from 'electron';
import {
  readCommits,
  type CommitGroup,
  type ReadCommitsOptions,
} from '../chat-shell/commits-reader.js';
import {
  readBuildDocConfig,
  type BuildDocConfig,
} from '../coarchitect/build-doc-state.js';

export interface CommitsListRequest {
  /** Default 50 per ticket acceptance. */
  readonly limit?: number;
}

export interface CommitsListResponse {
  readonly groups: readonly CommitGroup[];
  /** Set when build-doc config is unset / repoRoot unresolvable. */
  readonly error?: string;
}

/** Test seam — production callers omit; tests inject for determinism. */
export interface CommitsIpcDeps {
  readonly readBuildDocConfig?: () => BuildDocConfig | null;
  readonly readCommits?: (
    opts: ReadCommitsOptions,
  ) => Promise<readonly CommitGroup[]>;
  /** Injected for tests; production uses the real `ipcMain`. */
  readonly registerHandler?: (
    channel: string,
    handler: (
      _event: Electron.IpcMainInvokeEvent,
      ...args: unknown[]
    ) => Promise<CommitsListResponse>,
  ) => void;
}

/**
 * Pure-function handler — exported so unit tests can call it directly
 * without spinning up Electron. Mirrors the audit-modal-ipc.ts +
 * session-kill-ipc.ts dep-inject pattern.
 */
export async function handleCommitsList(
  req: CommitsListRequest,
  deps: Required<Pick<CommitsIpcDeps, 'readBuildDocConfig' | 'readCommits'>>,
): Promise<CommitsListResponse> {
  const config = deps.readBuildDocConfig();
  if (!config || !config.repoRoot) {
    return {
      groups: [],
      error:
        'No build-doc selected. Use the menu to configure a build-doc, then commits will appear here.',
    };
  }
  const groups = await deps.readCommits({
    repoRoot: config.repoRoot,
    limit: req.limit ?? 50,
  });
  return { groups };
}

export function registerCommitsIpc(deps: CommitsIpcDeps = {}): void {
  const readConfigImpl = deps.readBuildDocConfig ?? readBuildDocConfig;
  const readCommitsImpl = deps.readCommits ?? readCommits;
  const register =
    deps.registerHandler ??
    ((channel, handler) => {
      ipcMain.handle(channel, handler);
    });
  register('commits:list', async (_event, ...args) => {
    const req = (args[0] ?? {}) as CommitsListRequest;
    return handleCommitsList(req, {
      readBuildDocConfig: readConfigImpl,
      readCommits: readCommitsImpl,
    });
  });
}
