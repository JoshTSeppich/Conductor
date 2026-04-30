// MB-T03 Red criterion (V3_TICKETS.md L121): "launch, resize, quit, relaunch,
// assert size/position restored." Test shape per MB-S04 ADR (commit fa6e3cd).
// Uses MB-S04 primitives: WINDOW_READY stdout sentinel, stdin QUIT for exit code 0.
// Extensions for MB-T03: WINDOW_STATE sentinel (emitted by createManagedWindow),
// RESIZE stdin command (gated behind MB_TEST_HOOKS=1 env var).
//
// Fixture used: test/integration/mb-t03/lifecycle-fixture-main.mjs — Electron
// entry that calls createManagedWindow() + registerLifecycleHooks() from
// dist/main/window-lifecycle.js. Allows test to go GREEN without Zipper-1 wiring
// main.ts, satisfying §7.2 pre-condition ("test suites pass before Zipper-1").
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const FIXTURE_MAIN = resolve(__dirname, 'lifecycle-fixture-main.mjs');
const DIST_LIFECYCLE_JS = resolve(PACKAGE_ROOT, 'dist/main/window-lifecycle.js');

const READY_SENTINEL = 'WINDOW_READY';
const STATE_SENTINEL_PREFIX = 'WINDOW_STATE ';
const RESIZED_SENTINEL_PREFIX = 'WINDOW_RESIZED ';

interface ExitInfo {
  code: number | null;
  signal: NodeJS.Signals | null;
}

interface SpawnHandle {
  child: ChildProcess;
  waitForSentinel(prefix: string, timeoutMs: number): Promise<string>;
  waitForExit(timeoutMs: number): Promise<ExitInfo>;
  getStderr(): string;
}

function spawnFixture(stateDir: string): SpawnHandle {
  const child = spawn(ELECTRON_BIN, [FIXTURE_MAIN], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
      MB_TEST_HOOKS: '1',
      MB_WINDOW_STATE_DIR: stateDir,
    },
  });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (d: Buffer) => {
    stdout += d.toString();
  });
  child.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString();
  });

  const waitForSentinel = (prefix: string, timeoutMs: number): Promise<string> => {
    return new Promise((res, rej) => {
      const check = () => {
        const line = stdout.split('\n').find((l) => l.startsWith(prefix));
        if (line) return line;
        return null;
      };

      const found = check();
      if (found) {
        res(found);
        return;
      }

      const onData = () => {
        const line = check();
        if (line) {
          clearTimeout(timer);
          res(line);
        }
      };

      const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
        clearTimeout(timer);
        rej(
          new Error(
            `child exited before "${prefix}" sentinel: code=${code}, signal=${signal}, stdout="${stdout}", stderr="${stderr}"`,
          ),
        );
      };

      const timer = setTimeout(() => {
        child.stdout?.off('data', onData);
        child.off('exit', onExit);
        rej(
          new Error(
            `timeout waiting for "${prefix}" after ${timeoutMs}ms; stdout="${stdout}", stderr="${stderr}"`,
          ),
        );
      }, timeoutMs);

      child.stdout?.on('data', onData);
      child.once('exit', onExit);
    });
  };

  const waitForExit = (timeoutMs: number): Promise<ExitInfo> => {
    return new Promise((res, rej) => {
      const timer = setTimeout(() => {
        rej(new Error(`timeout waiting for child exit after ${timeoutMs}ms; stderr="${stderr}"`));
      }, timeoutMs);
      child.once('exit', (code, signal) => {
        clearTimeout(timer);
        res({ code, signal });
      });
    });
  };

  return { child, waitForSentinel, waitForExit, getStderr: () => stderr };
}

describe('MB-T03: window state persists across launches', () => {
  it(
    'launch → resize → quit → relaunch asserts restored size (two-spawn cycle)',
    async () => {
      // Preconditions: compiled lifecycle module and fixture file must exist.
      expect(
        existsSync(DIST_LIFECYCLE_JS),
        `expected compiled lifecycle module at ${DIST_LIFECYCLE_JS}; run \`pnpm --filter dispatch-workstation build\` first`,
      ).toBe(true);
      expect(
        existsSync(FIXTURE_MAIN),
        `expected fixture main at ${FIXTURE_MAIN}`,
      ).toBe(true);
      expect(
        existsSync(ELECTRON_BIN),
        `expected Electron binary at ${ELECTRON_BIN}`,
      ).toBe(true);

      const stateDir = resolve(tmpdir(), `mb-t03-test-${Date.now()}`);
      mkdirSync(stateDir, { recursive: true });

      // === SPAWN 1: open at default size, resize, quit → state saved ===
      const h1 = spawnFixture(stateDir);
      let resizedW: number;
      let resizedH: number;

      try {
        await h1.waitForSentinel(READY_SENTINEL, 15_000);
        // WINDOW_STATE is emitted before WINDOW_READY (createManagedWindow fires
        // before did-finish-load). By the time we await STATE, it's already in
        // the accumulated stdout buffer.
        await h1.waitForSentinel(STATE_SENTINEL_PREFIX, 5_000);

        // Resize to non-default dimensions.
        h1.child.stdin?.write('RESIZE 820 580\n');
        const resizedLine = await h1.waitForSentinel(RESIZED_SENTINEL_PREFIX, 5_000);
        const resizedParts = resizedLine.trim().split(' ');
        resizedW = parseInt(resizedParts[1], 10);
        resizedH = parseInt(resizedParts[2], 10);
        expect(resizedW).toBeGreaterThan(0);
        expect(resizedH).toBeGreaterThan(0);

        h1.child.stdin?.write('QUIT\n');
        const exit1 = await h1.waitForExit(10_000);
        expect(
          exit1.code,
          `spawn 1 expected exit code 0; got code=${exit1.code}, signal=${exit1.signal}, stderr="${h1.getStderr().slice(0, 500)}"`,
        ).toBe(0);
      } catch (e) {
        if (!h1.child.killed) h1.child.kill('SIGKILL');
        rmSync(stateDir, { recursive: true, force: true });
        throw e;
      }

      // === SPAWN 2: relaunch → assert size restored from saved state ===
      const h2 = spawnFixture(stateDir);

      try {
        await h2.waitForSentinel(READY_SENTINEL, 15_000);
        const stateLine = await h2.waitForSentinel(STATE_SENTINEL_PREFIX, 5_000);
        const stateParts = stateLine.trim().split(' ');
        const restoredW = parseInt(stateParts[1], 10);
        const restoredH = parseInt(stateParts[2], 10);

        expect(
          restoredW,
          `expected restored width=${resizedW}, got=${restoredW}; state line="${stateLine}"`,
        ).toBe(resizedW);
        expect(
          restoredH,
          `expected restored height=${resizedH}, got=${restoredH}; state line="${stateLine}"`,
        ).toBe(resizedH);

        h2.child.stdin?.write('QUIT\n');
        const exit2 = await h2.waitForExit(10_000);
        expect(
          exit2.code,
          `spawn 2 expected exit code 0; got code=${exit2.code}, signal=${exit2.signal}, stderr="${h2.getStderr().slice(0, 500)}"`,
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
