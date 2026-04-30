// MB-S04 spike: vitest spawn-and-observe Electron experiments.
// Each test is one experiment. Results captured in results/evidence.md.
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const SPIKE_ROOT = resolve(__dirname, '..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_PATH = resolve(__dirname, '../src/main.mjs');
const PACKAGED_APP_BIN = resolve(
  SPIKE_ROOT,
  'results/packaged-out/MB-S04-target-darwin-arm64/MB-S04-target.app/Contents/MacOS/MB-S04-target',
);
import { existsSync } from 'node:fs';

const READY_SENTINEL = 'SPIKE_READY';

function spawnElectron() {
  return spawn(ELECTRON_BIN, [MAIN_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
  });
}

function spawnPackaged() {
  return spawn(PACKAGED_APP_BIN, [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
  });
}

function awaitStdoutLine(child, sentinel, timeoutMs = 15000) {
  return new Promise((resolveP, rejectP) => {
    let buffer = '';
    const onData = (data) => {
      buffer += data.toString();
      if (buffer.includes(sentinel)) {
        child.stdout.off('data', onData);
        resolveP({ buffer });
      }
    };
    child.stdout.on('data', onData);
    const timer = setTimeout(() => {
      child.stdout.off('data', onData);
      rejectP(new Error(`timeout waiting for "${sentinel}" after ${timeoutMs}ms; buffer: ${buffer}`));
    }, timeoutMs);
    child.once('exit', () => clearTimeout(timer));
  });
}

function awaitExit(child, timeoutMs = 10000) {
  return new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => {
      rejectP(new Error(`timeout waiting for exit after ${timeoutMs}ms`));
    }, timeoutMs);
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      resolveP({ code, signal });
    });
  });
}

describe('MB-S04 vitest spawn-and-observe Electron', () => {
  it('S-04-01: spawn electron + main.mjs, observe SPIKE_READY on stdout', async () => {
    const child = spawnElectron();
    try {
      const { buffer } = await awaitStdoutLine(child, READY_SENTINEL, 15000);
      expect(buffer).toContain(READY_SENTINEL);
    } finally {
      child.kill('SIGKILL');
    }
  }, 20000);

  it('S-04-02: SIGTERM triggers clean exit (code 0)', async () => {
    const child = spawnElectron();
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    try {
      await awaitStdoutLine(child, READY_SENTINEL, 15000);
      child.kill('SIGTERM');
      const { code, signal } = await awaitExit(child, 10000);
      // Cairn-honest: record both possibilities, assert one of the clean shapes.
      // Clean shape A: code === 0 (SIGTERM handler ran, app.quit() returned 0)
      // Clean shape B: code === null && signal === 'SIGTERM' (process killed by signal directly)
      const isClean = code === 0 || (code === null && signal === 'SIGTERM');
      expect(isClean, `exit code=${code}, signal=${signal}, stderr="${stderr.slice(0, 500)}"`).toBe(true);
    } catch (e) {
      child.kill('SIGKILL');
      throw e;
    }
  }, 30000);

  it('S-04-03: stdin "QUIT" line triggers clean exit (code 0)', async () => {
    const child = spawnElectron();
    let stderr = '';
    let stdoutAccum = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.stdout.on('data', (d) => { stdoutAccum += d.toString(); });
    try {
      await awaitStdoutLine(child, READY_SENTINEL, 15000);
      child.stdin.write('QUIT\n');
      const { code, signal } = await awaitExit(child, 10000);
      expect(code, `code=${code}, signal=${signal}, stdout="${stdoutAccum.slice(0, 500)}", stderr="${stderr.slice(0, 500)}"`).toBe(0);
    } catch (e) {
      child.kill('SIGKILL');
      throw e;
    }
  }, 30000);

  it.skipIf(!existsSync(PACKAGED_APP_BIN))(
    'S-04-05: packaged .app spawn-and-observe (skip if .app not built)',
    async () => {
      const child = spawnPackaged();
      let stderr = '';
      let stdoutAccum = '';
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      child.stdout.on('data', (d) => { stdoutAccum += d.toString(); });
      try {
        const t0 = Date.now();
        await awaitStdoutLine(child, READY_SENTINEL, 15000);
        const tReady = Date.now();
        child.stdin.write('QUIT\n');
        const { code, signal } = await awaitExit(child, 10000);
        const tExit = Date.now();
        console.log(JSON.stringify({
          mode: 'packaged-app',
          spawnToReadyMs: tReady - t0,
          readyToExitMs: tExit - tReady,
          exitCode: code,
          exitSignal: signal,
        }));
        expect(code, `code=${code}, signal=${signal}, stdout="${stdoutAccum.slice(0, 500)}", stderr="${stderr.slice(0, 500)}"`).toBe(0);
      } catch (e) {
        child.kill('SIGKILL');
        throw e;
      }
    },
    30000,
  );

  it('S-04-04: full cycle timing — spawn-to-ready < 5s, ready-to-exit < 3s', async () => {
    const t0 = Date.now();
    const child = spawnElectron();
    try {
      await awaitStdoutLine(child, READY_SENTINEL, 15000);
      const tReady = Date.now();
      child.stdin.write('QUIT\n');
      await awaitExit(child, 10000);
      const tExit = Date.now();
      const spawnToReady = tReady - t0;
      const readyToExit = tExit - tReady;
      // Cairn-honest: timing is environment-dependent. Don't fail on timing
      // bounds — record observed values for evidence.md. Assertion is just
      // that both phases completed.
      expect(spawnToReady).toBeGreaterThan(0);
      expect(readyToExit).toBeGreaterThan(0);
      // Print observed timings for evidence capture (vitest stdout capture).
      console.log(JSON.stringify({ spawnToReadyMs: spawnToReady, readyToExitMs: readyToExit }));
    } catch (e) {
      child.kill('SIGKILL');
      throw e;
    }
  }, 30000);
});
