// MB-T02 Red criterion per operator OPEN-Q-B-1 arbitration (2026-04-30).
// Asserts: loadDispatchWeb(win) is callable from a spawned Electron process,
// returns without throwing, and emits the WEBVIEW_LOAD_ATTEMPTED sentinel within 15 s.
//
// RED state: dist/main/webview-loader.js absent → harness import fails → process
// exits before emitting sentinel → awaitStdoutLine detects early exit → FAIL.
// GREEN state: webview-loader.ts compiled → harness imports it → sentinel emits → PASS.
//
// DOM content assertion (kanban column headers, session cards) is NOT in scope for
// this test. Deferred to MB-T07; filed as MB-F-MB-T02-DOM-ASSERTION in FOLLOWUPS.md.
//
// Build-before-test requirement: run `pnpm --filter dispatch-workstation build`
// before executing this test suite. The harness imports dist/main/webview-loader.js
// which is a compiled artifact (dist/ is gitignored). This requirement mirrors
// MB-T01's dependency on dist/main/main.js.
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const WEBVIEW_LOADER_JS = resolve(PACKAGE_ROOT, 'dist/main/webview-loader.js');
const HARNESS_MJS = resolve(__dirname, 'mb-t02-harness.mjs');

const SENTINEL = 'WEBVIEW_LOAD_ATTEMPTED';

interface ExitInfo {
  code: number | null;
  signal: NodeJS.Signals | null;
}

function awaitStdoutLine(
  child: ChildProcess,
  sentinel: string,
  timeoutMs: number,
  stderrAccumulator: () => string,
): Promise<{ buffer: string }> {
  return new Promise((resolveP, rejectP) => {
    let buffer = '';
    const onData = (data: Buffer) => {
      buffer += data.toString();
      if (buffer.includes(sentinel)) {
        child.stdout?.off('data', onData);
        clearTimeout(timer);
        resolveP({ buffer });
      }
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      child.stdout?.off('data', onData);
      clearTimeout(timer);
      rejectP(
        new Error(
          `child exited before "${sentinel}" sentinel: code=${code}, signal=${signal}, stdout="${buffer}", stderr="${stderrAccumulator()}"`,
        ),
      );
    };
    const timer = setTimeout(() => {
      child.stdout?.off('data', onData);
      child.off('exit', onExit);
      rejectP(
        new Error(
          `timeout waiting for "${sentinel}" after ${timeoutMs}ms; stdout="${buffer}", stderr="${stderrAccumulator()}"`,
        ),
      );
    }, timeoutMs);
    child.stdout?.on('data', onData);
    child.once('exit', onExit);
  });
}

function awaitExit(child: ChildProcess, timeoutMs: number): Promise<ExitInfo> {
  return new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => {
      rejectP(new Error(`timeout waiting for child exit after ${timeoutMs}ms`));
    }, timeoutMs);
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      resolveP({ code, signal });
    });
  });
}

describe('MB-T02: webview-loader callable', () => {
  it(
    'loadDispatchWeb(win) is callable from a spawned Electron process, returns without throwing, and emits the WEBVIEW_LOAD_ATTEMPTED sentinel within 15 s',
    async () => {
      // Fast-fail diagnostic: missing dist/main/webview-loader.js means either
      // webview-loader.ts hasn't been written yet (RED state) or build wasn't run.
      // This check is diagnostic only — the real red signal is the harness import
      // failure causing the process to exit before emitting the sentinel.
      expect(
        existsSync(WEBVIEW_LOADER_JS),
        `dist/main/webview-loader.js not found. ` +
          `If webview-loader.ts does not yet exist, this is the expected RED state. ` +
          `Otherwise run \`pnpm --filter dispatch-workstation build\` first.`,
      ).toBe(true);

      const child = spawn(ELECTRON_BIN, [HARNESS_MJS], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
      });

      let stderr = '';
      child.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString();
      });

      try {
        await awaitStdoutLine(child, SENTINEL, 15_000, () => stderr);
        child.stdin?.write('QUIT\n');
        const exitInfo = await awaitExit(child, 10_000);
        expect(
          exitInfo.code,
          `expected exit code 0; got code=${exitInfo.code}, signal=${exitInfo.signal}, stderr="${stderr.slice(0, 500)}"`,
        ).toBe(0);
      } catch (e) {
        if (!child.killed) child.kill('SIGKILL');
        throw e;
      }
    },
    30_000,
  );
});
