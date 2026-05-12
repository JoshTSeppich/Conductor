// MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH · WB3 RED · MBTWFT5-02
//
// Probes the `workstation:read-build-md` IPC handler — the bridge
// between renderer-side `window.workstationBridge.readBuildMd()` and
// the main-process `loadBuildMd()` service factory (WB2 GREEN).
//
// Pattern mirrors `frame-c-ipc.ts` Controller-with-DI-seam + factory
// + `registerHandlers(ipcMain)` (Wave C #3 precedent at
// `packages/dispatch-workstation/src/main/frame-c-ipc.ts:155-172`).
//
// At WB3 RED time `src/main/build-md-ipc.ts` does NOT exist; vitest
// fails the suite at module-resolve. WB4 GREEN ships the controller
// + registerBuildMdIpcHandlers factory + WORKSTATION_CONTRACT.md §6.6
// Channel #5 amendment (HALT-WB4-PRE-COMMIT mandatory) and flips
// RED → GREEN.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// @ts-expect-error — WB3 RED: import target absent until WB4 GREEN ships build-md-ipc.ts.
import { BuildMdIpcController, registerBuildMdIpcHandlers } from '../../../src/main/build-md-ipc.js';

// Fake ipcMain — records handlers via Map for probe inspection (matches
// FrameCIpcMain test pattern from frame-c-ipc.test.ts).
interface FakeIpcMain {
  handle: (channel: string, fn: (...args: unknown[]) => unknown) => void;
  invoke: (channel: string, payload?: unknown) => Promise<unknown>;
  registered: Map<string, (...args: unknown[]) => unknown>;
}

function createFakeIpcMain(): FakeIpcMain {
  const registered = new Map<string, (...args: unknown[]) => unknown>();
  return {
    registered,
    handle(channel, fn) {
      registered.set(channel, fn);
    },
    async invoke(channel, payload) {
      const fn = registered.get(channel);
      if (!fn) throw new Error(`no handler for ${channel}`);
      return fn({}, payload);
    },
  };
}

const VALID_BUILD_MD = `# BUILD

**Repo:** mbtwft5-ipc-test
**Plan rev:** 2026-05-12.B

## §1 — Task A

**Goal:** First task in fixture for IPC probe.

**Branch:** feat/task-a

**Depends on:** —

**Acceptance:**
- Task A parses

## §2 — Task B

**Goal:** Second task; depends on §1 to test blocked-count.

**Branch:** feat/task-b

**Depends on:** §1

**Acceptance:**
- Task B parses + dependsOn=[1]
`;

describe('MBTWFT5-02 build-md IPC handler (workstation:read-build-md)', () => {
  let tmpDir: string;
  let buildMdPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mbtwft5-02-'));
    buildMdPath = join(tmpDir, 'BUILD.md');
    writeFileSync(buildMdPath, VALID_BUILD_MD, 'utf8');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('registers workstation:read-build-md handler via registerBuildMdIpcHandlers', () => {
    const ipcMain = createFakeIpcMain();
    const controller = new BuildMdIpcController({
      defaultBuildMdPath: () => buildMdPath,
    });
    registerBuildMdIpcHandlers(ipcMain, controller);

    expect(ipcMain.registered.has('workstation:read-build-md')).toBe(true);
  });

  it('returns ok=true BuildMdLoadResult when fixture parses cleanly (with explicit path payload)', async () => {
    const ipcMain = createFakeIpcMain();
    const controller = new BuildMdIpcController({
      defaultBuildMdPath: () => '/nonexistent/should-not-be-used',
    });
    registerBuildMdIpcHandlers(ipcMain, controller);

    const result = (await ipcMain.invoke('workstation:read-build-md', { path: buildMdPath })) as { ok: boolean; dag?: { tasks: unknown[] }; status?: { taskCount: number; readyCount: number; blockedCount: number } };
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dag!.tasks.length).toBe(2);
      expect(result.status!.taskCount).toBe(2);
      expect(result.status!.readyCount).toBe(1); // §1 (no deps)
      expect(result.status!.blockedCount).toBe(1); // §2 (depends on §1)
    }
  });

  it('uses defaultBuildMdPath() when payload omits path', async () => {
    const ipcMain = createFakeIpcMain();
    const controller = new BuildMdIpcController({
      defaultBuildMdPath: () => buildMdPath,
    });
    registerBuildMdIpcHandlers(ipcMain, controller);

    const result = (await ipcMain.invoke('workstation:read-build-md', {})) as { ok: boolean; path?: string };
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path).toBe(buildMdPath);
    }
  });

  it('returns NotFound when default path missing AND no payload override', async () => {
    const ipcMain = createFakeIpcMain();
    const controller = new BuildMdIpcController({
      defaultBuildMdPath: () => join(tmpDir, 'never-existed-BUILD.md'),
    });
    registerBuildMdIpcHandlers(ipcMain, controller);

    const result = (await ipcMain.invoke('workstation:read-build-md', undefined)) as { ok: false; error_type: string };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_type).toBe('NotFound');
    }
  });

  it('returns ParseError with parseErrors[] when BUILD.md is malformed', async () => {
    const badPath = join(tmpDir, 'BAD.md');
    writeFileSync(badPath, '# Not a valid BUILD doc — no preamble or tasks\n', 'utf8');

    const ipcMain = createFakeIpcMain();
    const controller = new BuildMdIpcController({
      defaultBuildMdPath: () => '/nonexistent',
    });
    registerBuildMdIpcHandlers(ipcMain, controller);

    const result = (await ipcMain.invoke('workstation:read-build-md', { path: badPath })) as { ok: false; error_type: string; parseErrors?: unknown[] };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_type).toBe('ParseError');
      expect(Array.isArray(result.parseErrors)).toBe(true);
      expect(result.parseErrors!.length).toBeGreaterThan(0);
    }
  });
});
