// Zipper-2: splitter position persists across app launches.
//
// RED state: dist/main/splitter-state.js absent → existsSync pre-check fails → FAIL.
// GREEN state: two-spawn cycle — spawn 1: SAVE_SPLITTER 350 via stdin command
//   (MB_TEST_HOOKS=1) → SPLITTER_SAVED 350 sentinel; spawn 2: SPLITTER_LOADED 350
//   sentinel on load → position restored → PASS.
//
// Sentinel protocol (stdout, MB_TEST_HOOKS=1 gated):
//   SPLITTER_LOADED <pos> — shell HTML emits on initSplitter() completion,
//     forwarded by main.ts console-message handler.
//   SPLITTER_SAVED <pos> — main.ts emits after SAVE_SPLITTER stdin command writes
//     position to splitter-state JSON.
//   WINDOW_READY — main.ts emits on did-finish-load.
//   SHELL_READY — shell HTML emits after DOM init, forwarded by main.ts.
//
// State isolation: MB_SPLITTER_STATE_DIR env var overrides app.getPath('userData')
//   in splitter-state.ts (same pattern as MB_WINDOW_STATE_DIR in window-lifecycle.ts).
//
// Build-before-test: run `pnpm --filter dispatch-workstation build` first.
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');
const SPLITTER_STATE_JS = resolve(PACKAGE_ROOT, 'dist/main/splitter-state.js');

interface ExitInfo {
  code: number | null;
  signal: NodeJS.Signals | null;
}

interface SpawnHandle {
  child: ChildProcess;
  waitForSentinel(prefix: string, ms: number): Promise<string>;
  waitForExit(ms: number): Promise<ExitInfo>;
  getStderr(): string;
}

function spawnApp(stateDir: string): SpawnHandle {
  const child = spawn(ELECTRON_BIN, [MAIN_JS], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
      MB_TEST_HOOKS: '1',
      MB_SPLITTER_STATE_DIR: stateDir,
    },
  });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
  child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

  function waitForSentinel(prefix: string, timeoutMs: number): Promise<string> {
    return new Promise((res, rej) => {
      const check = () => stdout.split('\n').find((l) => l.startsWith(prefix)) ?? null;
      const found = check();
      if (found) { res(found); return; }

      const onData = () => {
        const line = check();
        if (line) { clearTimeout(timer); res(line); }
      };
      const onExit = (code: number | null, sig: NodeJS.Signals | null) => {
        clearTimeout(timer);
        rej(new Error(`child exited before "${prefix}": code=${code}, sig=${sig}, stdout="${stdout}", stderr="${stderr}"`));
      };
      const timer = setTimeout(() => {
        child.stdout?.off('data', onData);
        child.off('exit', onExit);
        rej(new Error(`timeout(${timeoutMs}ms) waiting for "${prefix}"; stdout="${stdout}", stderr="${stderr}"`));
      }, timeoutMs);
      child.stdout?.on('data', onData);
      child.once('exit', onExit);
    });
  }

  function waitForExit(timeoutMs: number): Promise<ExitInfo> {
    return new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error(`timeout waiting for exit after ${timeoutMs}ms`)), timeoutMs);
      child.once('exit', (code, signal) => { clearTimeout(timer); res({ code, signal }); });
    });
  }

  return { child, waitForSentinel, waitForExit, getStderr: () => stderr };
}

describe('Zipper-2: splitter position persists across launches', () => {
  it(
    'save splitter position → quit → relaunch asserts position restored (two-spawn cycle)',
    async () => {
      expect(
        existsSync(SPLITTER_STATE_JS),
        `dist/main/splitter-state.js not found — run \`pnpm --filter dispatch-workstation build\` first. ` +
          `This is the expected RED state before Zipper-2 implementation.`,
      ).toBe(true);

      const stateDir = resolve(tmpdir(), `zipper-2-splitter-${Date.now()}`);
      mkdirSync(stateDir, { recursive: true });

      // === SPAWN 1: load app, save splitter pos 350, quit ===
      const h1 = spawnApp(stateDir);
      try {
        await h1.waitForSentinel('WINDOW_READY', 15_000);
        await h1.waitForSentinel('SHELL_READY', 10_000);

        h1.child.stdin?.write('SAVE_SPLITTER 350\n');
        const savedLine = await h1.waitForSentinel('SPLITTER_SAVED ', 5_000);
        const savedPos = parseInt(savedLine.trim().split(' ')[1], 10);
        expect(savedPos, `expected SPLITTER_SAVED 350, got "${savedLine}"`).toBe(350);

        h1.child.stdin?.write('QUIT\n');
        const exit1 = await h1.waitForExit(10_000);
        expect(
          exit1.code,
          `spawn 1 exit code; code=${exit1.code}, signal=${exit1.signal}, stderr="${h1.getStderr().slice(0, 500)}"`,
        ).toBe(0);
      } catch (e) {
        if (!h1.child.killed) h1.child.kill('SIGKILL');
        rmSync(stateDir, { recursive: true, force: true });
        throw e;
      }

      // === SPAWN 2: relaunch, assert SPLITTER_LOADED shows 350 ===
      const h2 = spawnApp(stateDir);
      try {
        await h2.waitForSentinel('WINDOW_READY', 15_000);
        const loadedLine = await h2.waitForSentinel('SPLITTER_LOADED ', 10_000);
        const loadedPos = parseInt(loadedLine.trim().split(' ')[1], 10);

        expect(
          loadedPos,
          `expected restored splitter pos 350, got ${loadedPos}; line="${loadedLine}"; stderr="${h2.getStderr().slice(0, 800)}"`,
        ).toBe(350);

        h2.child.stdin?.write('QUIT\n');
        const exit2 = await h2.waitForExit(10_000);
        expect(
          exit2.code,
          `spawn 2 exit code; code=${exit2.code}, signal=${exit2.signal}, stderr="${h2.getStderr().slice(0, 500)}"`,
        ).toBe(0);
      } catch (e) {
        if (!h2.child.killed) h2.child.kill('SIGKILL');
        throw e;
      } finally {
        rmSync(stateDir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
