// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB4 GREEN ·
// build-md-ipc.ts — `workstation:read-build-md` IPC handler.
//
// Bridges renderer `window.workstationBridge.readBuildMd()` to main-
// process `loadBuildMd()` (build-md/service.ts WB2 GREEN). Pattern
// mirrors `frame-c-ipc.ts` Controller-with-DI-seam + factory + `registerHandlers` (Wave C #3 precedent).
//
// Sub-Q-MBTWFT5-A=(i) operator-arbitrated 2026-05-12: default path =
// repo-root BUILD.md. Default path resolution lives behind a
// `defaultBuildMdPath()` dep so the controller stays testable without
// electron mocks. Production wiring in main.ts injects
// `() => resolve(app.getAppPath(), '..', '..', 'BUILD.md')` mirroring
// SwarmStateWriter path pattern (`main.ts:557`).

import { loadBuildMd } from '../build-md/service.js';
import type { BuildMdLoadResult } from '../build-md/types.js';

// ─── Dependency interfaces ─────────────────────────────────────────────

/** Minimal shape of Electron `ipcMain`. Tests inject a fake recording-Map; production passes the real `ipcMain` singleton. */
export interface BuildMdIpcMain {
  handle: (
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown,
  ) => void;
}

export interface BuildMdIpcDeps {
  /** Resolves the default BUILD.md path (called per-invocation; honors live env-var override in test contexts). */
  readonly defaultBuildMdPath: () => string;
  /** Optional override of the loader fn (test seam; defaults to `loadBuildMd` from service.ts). */
  readonly loadBuildMd?: (path: string) => Promise<BuildMdLoadResult>;
}

// ─── Payload validation ───────────────────────────────────────────────

interface ReadBuildMdPayload {
  readonly path?: string;
}

function validatePayload(
  payload: unknown,
): { ok: true; path: string | undefined } | { ok: false; error: string } {
  if (payload === undefined || payload === null) {
    return { ok: true, path: undefined };
  }
  if (typeof payload !== 'object') {
    return {
      ok: false,
      error: 'payload must be an object with optional {path: string}',
    };
  }
  const path = (payload as Record<string, unknown>)['path'];
  if (path === undefined) {
    return { ok: true, path: undefined };
  }
  if (typeof path !== 'string' || path.length === 0) {
    return {
      ok: false,
      error: 'payload.path must be a non-empty string when present',
    };
  }
  return { ok: true, path };
}

// ─── BuildMdIpcController ──────────────────────────────────────────────

export class BuildMdIpcController {
  private readonly deps: BuildMdIpcDeps;

  constructor(deps: BuildMdIpcDeps) {
    this.deps = deps;
  }

  async handleReadBuildMd(payload: unknown): Promise<BuildMdLoadResult> {
    const validated = validatePayload(payload);
    if (!validated.ok) {
      return {
        ok: false,
        error_type: 'IoError',
        message: `Invalid payload: ${validated.error}`,
      };
    }
    const path = validated.path ?? this.deps.defaultBuildMdPath();
    const load = this.deps.loadBuildMd ?? loadBuildMd;
    return load(path);
  }
}

// ─── Factory ───────────────────────────────────────────────────────────

export function registerBuildMdIpcHandlers(
  ipcMain: BuildMdIpcMain,
  controller: BuildMdIpcController,
): void {
  ipcMain.handle('workstation:read-build-md', async (_event, ...args) => {
    return controller.handleReadBuildMd(args[0]);
  });
}
