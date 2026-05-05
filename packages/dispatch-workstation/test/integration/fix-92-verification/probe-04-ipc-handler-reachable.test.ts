// Probe-92 / Probe 4 — IPC handler reachable in main process.
//
// Verifies the live IPC roundtrip: kanban webview's card-bridge-preload
// invokes 'workstation:get-daemon-token', main.ts's handler reads the
// disk file via readDaemonTokenForBootstrap, returns the value over
// IPC, and the preload writes it into localStorage. Evidence: the
// BOOTSTRAP_TOKEN_WRITTEN <length> sentinel that card-bridge-preload
// emits ONLY on the success path (localStorage.setItem succeeded).
//
// Reframed from the original task brief's CDP / --remote-debugging-port
// approach — operator-acked 2026-05-05 (scout-phase Q5). Sentinel
// pattern is the codebase's idiomatic observability mechanism; CDP
// would have been a new auth model + dependency surface.
//
// KNOWN: the sentinel firing proves end-to-end:
//   - main.ts's ipcMain.handle('workstation:get-daemon-token', …) is
//     registered before the webview attaches (otherwise invoke would
//     reject with "no handler" → catch in preload → no sentinel).
//   - readDaemonTokenForBootstrap returned a non-null string of the
//     observed length.
//   - preload's typeof===string && length>0 branch was taken.
//   - localStorage.setItem succeeded.
//   - did-attach-webview forwarder in main.ts captured the message
//     and forwarded it to stdout.
//
// MODELED: <length> matches the file's length (asserted below).
// SPECULATIVE: nothing — every link in the chain has a direct test.
//
// Cold-launch isolation: MB_USER_DATA_DIR points Electron at a
// tmpdir userData so the probe doesn't contend with the operator's
// running workstation app for ~/Library/Application Support/Electron
// leveldb LOCK. MB_TEST_HOOKS_DAEMON_TOKEN_PATH is NOT set here — we
// want the IPC handler to read the operator's real token file (the
// thing fix-92 was designed to bootstrap). Probe 9 exercises the
// override path explicitly.
//
// Onboarding short-circuit: writes onboardingCompleted=true to the
// MB_ONBOARDING_STATE_DIR tmp config so the spawn skips the modal.
// Same pattern as app-launches-clean.test.ts:94-99.
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');
const TOKEN_PATH = join(homedir(), '.foxworks-dispatch', 'token');

interface SpawnResult {
  child: ChildProcess;
  stdoutBuffer: () => string;
  stderrBuffer: () => string;
}

function spawnWorkstation(envOverrides: Record<string, string>): SpawnResult {
  let stdout = '';
  let stderr = '';
  const child = spawn(ELECTRON_BIN, [MAIN_JS], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
      MB_TEST_HOOKS: '1',
      ...envOverrides,
    },
  });
  child.stdout?.on('data', (d: Buffer) => {
    stdout += d.toString();
  });
  child.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString();
  });
  return {
    child,
    stdoutBuffer: () => stdout,
    stderrBuffer: () => stderr,
  };
}

function awaitSentinel(
  buf: () => string,
  pattern: RegExp,
  timeoutMs: number,
  child: ChildProcess,
  errBuf: () => string,
): Promise<RegExpMatchArray> {
  return new Promise((resolveP, rejectP) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const m = buf().match(pattern);
      if (m) {
        clearInterval(timer);
        clearTimeout(deadline);
        resolveP(m);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        // handled by deadline
      }
    }, 50);
    const deadline = setTimeout(() => {
      clearInterval(timer);
      rejectP(
        new Error(
          `timeout waiting for ${pattern} after ${timeoutMs}ms; ` +
            `stdout=${JSON.stringify(buf().slice(-1500))}; ` +
            `stderr=${JSON.stringify(errBuf().slice(-1500))}`,
        ),
      );
    }, timeoutMs);
    child.once('exit', (code, signal) => {
      // If the child exits before the sentinel arrives, surface that
      // crisply rather than letting the timeout deadline fire.
      const m = buf().match(pattern);
      if (m) {
        clearInterval(timer);
        clearTimeout(deadline);
        resolveP(m);
        return;
      }
      clearInterval(timer);
      clearTimeout(deadline);
      rejectP(
        new Error(
          `child exited (code=${code}, signal=${signal}) before ` +
            `sentinel ${pattern}. stdout=${JSON.stringify(buf().slice(-1500))}; ` +
            `stderr=${JSON.stringify(errBuf().slice(-1500))}`,
        ),
      );
    });
  });
}

describe('Probe-92 / Probe 4 — IPC handler reachable in main process', () => {
  it(
    'BOOTSTRAP_TOKEN_WRITTEN sentinel fires with length matching ~/.foxworks-dispatch/token',
    async () => {
      // Precondition: built artifact present (probe 3 verifies; this is
      // a per-test fast-fail).
      expect(
        existsSync(MAIN_JS),
        `expected built ${MAIN_JS}; run pnpm --filter dispatch-workstation build`,
      ).toBe(true);

      // KNOWN: read the token file's length so we can compare against
      // the sentinel's reported length. The sentinel is ALREADY length-
      // only (never echoes the value), so this comparison is also
      // non-leaky — both sides are integers.
      const expectedLength = readFileSync(TOKEN_PATH, 'utf8').trim().length;

      // Onboarding short-circuit + isolated userData.
      const onbDir = mkdtempSync(join(tmpdir(), 'probe-92-04-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'probe-92-04-userdata-'));

      const { child, stdoutBuffer, stderrBuffer } = spawnWorkstation({
        MB_ONBOARDING_STATE_DIR: onbDir,
        MB_USER_DATA_DIR: userDataDir,
      });

      try {
        // KNOWN: BOOTSTRAP_TOKEN_WRITTEN <length> is emitted by
        // card-bridge-preload.mts (Fix-92 region) ONLY after a
        // successful IPC roundtrip + non-null token + successful
        // localStorage.setItem. The forwarder in main.ts (Probe-92
        // obs-infra region) routes it to stdout under MB_TEST_HOOKS=1.
        const match = await awaitSentinel(
          stdoutBuffer,
          /^BOOTSTRAP_TOKEN_WRITTEN (\d+)$/m,
          30_000,
          child,
          stderrBuffer,
        );
        const observedLength = parseInt(match[1], 10);

        // KNOWN: length must be > 0. Zero-length would mean the IPC
        // returned empty string, which the preload's typeof+length
        // branch would have filtered out — sentinel wouldn't fire.
        // Asserting anyway so a future preload regression is caught.
        expect(observedLength).toBeGreaterThan(0);

        // KNOWN: length must match the token file. Mismatch would
        // mean readDaemonTokenForBootstrap returned a different
        // string than readFileSync sees — extremely unlikely (same
        // path, same trim semantics) but the assertion pins the
        // contract.
        expect(
          observedLength,
          `BOOTSTRAP_TOKEN_WRITTEN reported length ${observedLength}; ` +
            `~/.foxworks-dispatch/token trimmed length is ${expectedLength}. ` +
            `Mismatch suggests the IPC handler is reading a different file ` +
            `or applying different normalization than readFileSync(...).trim().`,
        ).toBe(expectedLength);

        // Diagnostic — ensure we actually saw an Electron lifecycle, not
        // just a stray sentinel. WINDOW_READY is emitted by main.ts:81
        // after did-finish-load on the host shell page; its presence
        // confirms the spawn produced a real BrowserWindow before the
        // BOOTSTRAP_TOKEN_WRITTEN sentinel.
        expect(
          stdoutBuffer().includes('WINDOW_READY'),
          `expected WINDOW_READY in stdout (real Electron lifecycle); ` +
            `stdout sample: ${JSON.stringify(stdoutBuffer().slice(0, 500))}`,
        ).toBe(true);

        // Clean shutdown.
        child.stdin?.write('QUIT\n');
        await new Promise<void>((resolveP) => {
          const t = setTimeout(() => {
            if (!child.killed) child.kill('SIGKILL');
            resolveP();
          }, 10_000);
          child.once('exit', () => {
            clearTimeout(t);
            resolveP();
          });
        });
      } catch (e) {
        if (!child.killed) child.kill('SIGKILL');
        throw e;
      } finally {
        rmSync(onbDir, { recursive: true, force: true });
        rmSync(userDataDir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
