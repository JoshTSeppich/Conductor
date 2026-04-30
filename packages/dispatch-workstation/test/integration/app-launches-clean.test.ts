// MB-T01 Red criterion (V3_TICKETS.md L104): "spawn built app, assert
// process starts, window appears, exits cleanly on quit." Test shape per
// MB-S04 ADR (commit fa6e3cd).
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');

const READY_SENTINEL = 'WINDOW_READY';

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

describe('MB-T01: app launches clean', () => {
  it(
    'spawns Electron, opens BrowserWindow (WINDOW_READY sentinel), exits with code 0 on stdin QUIT',
    async () => {
      // Precondition: built main.js must exist. Electron silently falls back
      // to its default app when given a missing path, which would mask the
      // real failure ("green code not yet present") behind a sentinel
      // timeout. Assert explicitly so RED is fast + crisp.
      expect(
        existsSync(MAIN_JS),
        `expected built main entry at ${MAIN_JS}; run \`pnpm --filter dispatch-workstation build\` first`,
      ).toBe(true);

      const child = spawn(ELECTRON_BIN, [MAIN_JS], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
      });

      let stderr = '';
      child.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString();
      });

      try {
        await awaitStdoutLine(child, READY_SENTINEL, 15_000, () => stderr);
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
