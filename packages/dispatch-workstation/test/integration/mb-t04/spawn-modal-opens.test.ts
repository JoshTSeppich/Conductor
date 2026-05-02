// MB-T04 Red criterion (V3_TICKETS.md L132): "test_spawn_modal_opens.spec.ts"
// Verifies: clicking the native Spawn button in the Electron shell makes the
// spawn modal visible. Asserted via SPAWN_MODAL_OPENED sentinel emitted from
// the renderer when the modal becomes visible, forwarded to stdout by main.ts
// console-message handler under MB_TEST_HOOKS=1.
//
// RED state: workstation-shell.html has no [data-testid="spawn-button"] and no
// modal markup → CLICK_SPAWN_BUTTON stdin command's executeJavaScript writes
// 'FIXTURE: spawn-button not found' to stderr → SPAWN_MODAL_OPENED never emitted
// → waitForSentinel times out → FAIL.
//
// GREEN state: shell HTML carries header bar with [data-testid="spawn-button"]
// + hidden modal with [data-testid="spawn-modal"]; click handler shows modal
// and emits console.log('SPAWN_MODAL_OPENED') → forwarded to stdout → PASS.
//
// Testing mechanism: spawn-and-sentinel per MB-S04 ADR + MB-S05 ADR primitives.
// Sentinels:
//   WINDOW_READY — emitted by main.ts on did-finish-load
//   SHELL_READY — emitted by shell HTML inline script after init
//   SPAWN_MODAL_OPENED — emitted by shell when spawn modal becomes visible
//
// stdin commands (MB_TEST_HOOKS=1):
//   CLICK_SPAWN_BUTTON — main.ts uses webContents.executeJavaScript to click
//     the [data-testid="spawn-button"] element
//   QUIT — deterministic exit code 0 (MB-S04 ADR K3)
//
// Build-before-test: run `pnpm --filter dispatch-workstation build` first.
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

interface ExitInfo {
  code: number | null;
  signal: NodeJS.Signals | null;
}

interface SpawnHandle {
  child: ChildProcess;
  waitForSentinel(s: string, ms: number): Promise<string>;
  waitForExit(ms: number): Promise<ExitInfo>;
  getStderr(): string;
  getStdout(): string;
}

function spawnApp(): SpawnHandle {
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
  child.stdout?.on('data', (d: Buffer) => {
    stdout += d.toString();
  });
  child.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString();
  });

  function waitForSentinel(sentinel: string, timeoutMs: number): Promise<string> {
    return new Promise((res, rej) => {
      const check = () => stdout.split('\n').find((l) => l.startsWith(sentinel)) ?? null;
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
      const onExit = (code: number | null, sig: NodeJS.Signals | null) => {
        clearTimeout(timer);
        rej(
          new Error(
            `child exited before "${sentinel}": code=${code}, sig=${sig}, stdout="${stdout}", stderr="${stderr}"`,
          ),
        );
      };
      const timer = setTimeout(() => {
        child.stdout?.off('data', onData);
        child.off('exit', onExit);
        rej(
          new Error(
            `timeout(${timeoutMs}ms) waiting for "${sentinel}"; stdout="${stdout}", stderr="${stderr}"`,
          ),
        );
      }, timeoutMs);
      child.stdout?.on('data', onData);
      child.once('exit', onExit);
    });
  }

  function waitForExit(timeoutMs: number): Promise<ExitInfo> {
    return new Promise((res, rej) => {
      const timer = setTimeout(
        () => rej(new Error(`timeout waiting for exit after ${timeoutMs}ms`)),
        timeoutMs,
      );
      child.once('exit', (code, signal) => {
        clearTimeout(timer);
        res({ code, signal });
      });
    });
  }

  return {
    child,
    waitForSentinel,
    waitForExit,
    getStderr: () => stderr,
    getStdout: () => stdout,
  };
}

describe('MB-T04: spawn modal opens on button click', () => {
  it(
    'clicking spawn button makes modal visible (SPAWN_MODAL_OPENED sentinel)',
    async () => {
      expect(
        existsSync(SHELL_HTML),
        `dist/main/workstation-shell.html not found — run \`pnpm --filter dispatch-workstation build\` first.`,
      ).toBe(true);

      const h = spawnApp();

      try {
        await h.waitForSentinel('WINDOW_READY', 15_000);
        await h.waitForSentinel('SHELL_READY', 10_000);

        // Send stdin command to click the spawn button via main.ts test hook.
        h.child.stdin?.write('CLICK_SPAWN_BUTTON\n');

        // Modal becomes visible → renderer emits console.log('SPAWN_MODAL_OPENED')
        // → forwarded to stdout by main.ts MB_TEST_HOOKS handler.
        const sentinelLine = await h.waitForSentinel('SPAWN_MODAL_OPENED', 10_000);
        expect(sentinelLine).toBe('SPAWN_MODAL_OPENED');

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
