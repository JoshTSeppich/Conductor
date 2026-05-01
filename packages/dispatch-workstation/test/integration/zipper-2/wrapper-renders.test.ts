// Zipper-2 Red criterion: wrapper page loads in main BrowserWindow with both
// regions (kanban + chat) present and splitter element in DOM.
//
// RED state: dist/main/workstation-shell.html absent (not built yet) →
// existsSync pre-check fails → FAIL.
// GREEN state: shell HTML built, app spawns with MB_TEST_HOOKS=1 → wrapper
// loads → WINDOW_READY fires → SHELL_READY sentinel emitted by shell HTML
// inline script (via console-message forwarding) → PASS.
//
// Testing mechanism: spawn-and-sentinel per MB-S04 ADR primitives.
// Sentinel WINDOW_READY: emitted by main.ts on did-finish-load.
// Sentinel SHELL_READY: emitted by shell HTML inline script after DOM init,
//   forwarded to stdout by main.ts console-message handler (MB_TEST_HOOKS=1).
// Sentinel RENDER_OK: emitted by ChatPanel useEffect via renderer.js,
//   forwarded via console-message to stdout.
//
// Build-before-test: run `pnpm --filter dispatch-workstation build` first.
// The build script (after Zipper-2 modifications) runs tsc + build-coarchitect.mjs
// + build-shell.mjs.
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');
const SHELL_HTML = resolve(PACKAGE_ROOT, 'dist/main/workstation-shell.html');
const COARCH_IPC_JS = resolve(PACKAGE_ROOT, 'dist/main/coarchitect-ipc.js');

interface ExitInfo {
  code: number | null;
  signal: NodeJS.Signals | null;
}

function spawnApp(): {
  child: ChildProcess;
  waitForSentinel(s: string, ms: number): Promise<string>;
  waitForExit(ms: number): Promise<ExitInfo>;
  getStderr(): string;
} {
  const child = spawn(ELECTRON_BIN, [MAIN_JS], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
      MB_TEST_HOOKS: '1',
    },
  });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
  child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

  function waitForSentinel(sentinel: string, timeoutMs: number): Promise<string> {
    return new Promise((res, rej) => {
      const check = () => stdout.split('\n').find((l) => l.startsWith(sentinel)) ?? null;
      const found = check();
      if (found) { res(found); return; }

      const onData = () => {
        const line = check();
        if (line) { clearTimeout(timer); res(line); }
      };
      const onExit = (code: number | null, sig: NodeJS.Signals | null) => {
        clearTimeout(timer);
        rej(new Error(`child exited before "${sentinel}": code=${code}, sig=${sig}, stdout="${stdout}", stderr="${stderr}"`));
      };
      const timer = setTimeout(() => {
        child.stdout?.off('data', onData);
        child.off('exit', onExit);
        rej(new Error(`timeout(${timeoutMs}ms) waiting for "${sentinel}"; stdout="${stdout}", stderr="${stderr}"`));
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

describe('Zipper-2: wrapper shell renders with both regions', () => {
  it(
    'workstation-shell.html loads, SHELL_READY emitted, RENDER_OK from chat panel',
    async () => {
      expect(
        existsSync(SHELL_HTML),
        `dist/main/workstation-shell.html not found — run \`pnpm --filter dispatch-workstation build\` first. ` +
          `This is the expected RED state before Zipper-2 implementation.`,
      ).toBe(true);

      expect(
        existsSync(COARCH_IPC_JS),
        `dist/main/coarchitect-ipc.js not found — Zipper-2 implementation not built yet. Expected RED state.`,
      ).toBe(true);

      const h = spawnApp();

      try {
        await h.waitForSentinel('WINDOW_READY', 15_000);
        await h.waitForSentinel('SHELL_READY', 10_000);
        await h.waitForSentinel('RENDER_OK', 10_000);

        h.child.stdin?.write('QUIT\n');
        const exit = await h.waitForExit(10_000);
        expect(
          exit.code,
          `expected exit code 0; code=${exit.code}, signal=${exit.signal}, stderr="${h.getStderr().slice(0, 500)}"`,
        ).toBe(0);
      } catch (e) {
        if (!h.child.killed) h.child.kill('SIGKILL');
        throw e;
      }
    },
    45_000,
  );
});
