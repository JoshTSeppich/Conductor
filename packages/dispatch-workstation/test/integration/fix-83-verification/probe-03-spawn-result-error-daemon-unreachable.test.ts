// Fix-83 / Probe 3 — SPAWN_RESULT_ERROR DaemonUnreachable end-to-end.
//
// Cairn finding #83 / Fix-B resolution explicitly cites: "Live
// integration drive (ad-hoc, headless Electron with MB_TEST_HOOKS=1
// + FOXWORKS_DAEMON_URL=http://127.0.0.1:1 + pre-marked onboarding
// state to bypass keychain): observed `SPAWN_RESULT_ERROR
// DaemonUnreachable Daemon token not found at ~/.foxworks-dispatch/
// token` propagated to stdout end-to-end."
//
// This probe encodes that ad-hoc verification as a permanent
// regression. Boots Electron with FOXWORKS_DAEMON_URL pointing at
// :1 (almost certainly closed → ECONNREFUSED), drives the spawn
// modal via stdin (CLICK_SPAWN_BUTTON → FILL_AND_SUBMIT_SPAWN), and
// asserts the renderer's handleSpawnResult fires the SPAWN_RESULT_
// ERROR DaemonUnreachable sentinel via the workstation's main-
// process console-message forwarder.
//
// KNOWN: spawn-handler.ts cap-check fetches `${daemonUrl}/v2/
// sessions` BEFORE tmux is touched. Cap-check failure on a closed
// port produces DaemonUnreachable per spawn-handler.ts:240-249. So
// repoPath and claudeBinPath validity are irrelevant for this
// probe — the failure fires before the spawn-handler reaches them.
//
// MODELED: a host with anything actually listening on port 1 would
// invalidate the assertion. Defense: 127.0.0.1:1 is reserved
// (tcpmux) and effectively never bound on developer macs; if it ever
// is, the probe fails loud with full stdout/stderr diagnostic.
//
// Pattern reference: probe-89 (spawn shape) + workstation-shell
// FILL_AND_SUBMIT_SPAWN stdin-driven flow.
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');

const FAKE_TOKEN = 'probe-83-03-fake-token-do-not-deploy';

function awaitSentinel(
  buf: () => string,
  pattern: RegExp,
  timeoutMs: number,
  child: ChildProcess,
  errBuf: () => string,
): Promise<RegExpMatchArray> {
  return new Promise((resolveP, rejectP) => {
    const timer = setInterval(() => {
      const m = buf().match(pattern);
      if (m) {
        clearInterval(timer);
        clearTimeout(deadline);
        resolveP(m);
      }
    }, 50);
    const deadline = setTimeout(() => {
      clearInterval(timer);
      rejectP(
        new Error(
          `timeout waiting for ${pattern} after ${timeoutMs}ms; ` +
            `stdout=${JSON.stringify(buf().slice(-2000))}; ` +
            `stderr=${JSON.stringify(errBuf().slice(-2000))}`,
        ),
      );
    }, timeoutMs);
    child.once('exit', (code, signal) => {
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
            `sentinel ${pattern}. stdout=${JSON.stringify(buf().slice(-2000))}; ` +
            `stderr=${JSON.stringify(errBuf().slice(-2000))}`,
        ),
      );
    });
  });
}

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('Fix-83 / Probe 3 — SPAWN_RESULT_ERROR DaemonUnreachable end-to-end', () => {
  itDarwin(
    'spawn intent submitted with unreachable daemon emits SPAWN_RESULT_ERROR DaemonUnreachable on stdout',
    async () => {
      expect(
        existsSync(MAIN_JS),
        `expected built ${MAIN_JS}; run pnpm --filter dispatch-workstation build`,
      ).toBe(true);
      expect(existsSync(ELECTRON_BIN), `expected ${ELECTRON_BIN}`).toBe(true);

      const onbDir = mkdtempSync(join(tmpdir(), 'fix-83-probe-03-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'fix-83-probe-03-userdata-'));
      const fakeHome = mkdtempSync(join(tmpdir(), 'fix-83-probe-03-home-'));
      mkdirSync(join(fakeHome, '.foxworks-dispatch'), { recursive: true });
      writeFileSync(join(fakeHome, '.foxworks-dispatch', 'token'), FAKE_TOKEN, 'utf8');

      let stdout = '';
      let stderr = '';
      const child = spawn(ELECTRON_BIN, [MAIN_JS], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          HOME: fakeHome,
          ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
          MB_TEST_HOOKS: '1',
          MB_USER_DATA_DIR: userDataDir,
          MB_ONBOARDING_STATE_DIR: onbDir,
          // Port 1 (tcpmux) is reserved + ~never bound. fetch() lands
          // ECONNREFUSED → spawn-handler cap-check raises
          // DaemonUnreachable per spawn-handler.ts:240-249.
          FOXWORKS_DAEMON_URL: 'http://127.0.0.1:1',
          FOXWORKS_DAEMON_WS_URL: 'ws://127.0.0.1:1',
        },
      });
      child.stdout?.on('data', (d: Buffer) => {
        stdout += d.toString();
      });
      child.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString();
      });

      try {
        await awaitSentinel(
          () => stdout,
          /^ONBOARDING_READY$/m,
          30_000,
          child,
          () => stderr,
        );
        // Wait for the renderer to mount + emit SHELL_READY before
        // driving the spawn modal. The shell's onSpawnResult subscribe
        // runs at SHELL_READY time; without that, FILL_AND_SUBMIT_SPAWN
        // could fire before the listener attaches.
        await awaitSentinel(
          () => stdout,
          /^SHELL_READY$/m,
          30_000,
          child,
          () => stderr,
        );

        // Open the spawn modal.
        child.stdin?.write('CLICK_SPAWN_BUTTON\n');
        await awaitSentinel(
          () => stdout,
          /^SPAWN_MODAL_OPENED$/m,
          10_000,
          child,
          () => stderr,
        );

        // Submit. repoPath need only be a non-empty string; daemon
        // cap-check fails before tmux ever sees it (per spawn-handler
        // cap-check ordering). Use the worktree itself for realism.
        const repoPath = PACKAGE_ROOT;
        const sessionName = `probe-83-03-${Date.now().toString(36)}`;
        child.stdin?.write(
          `FILL_AND_SUBMIT_SPAWN ${repoPath}|${sessionName}\n`,
        );

        // Await the SPAWN_RESULT_ERROR sentinel forwarded by the Fix-B
        // sentinel region in main.ts. Format: 'SPAWN_RESULT_ERROR
        // DaemonUnreachable <message-with-spaces>'. Message body is
        // implementation-detail (fetch error string), so we only
        // anchor on type.
        const errMatch = await awaitSentinel(
          () => stdout,
          /^SPAWN_RESULT_ERROR (\w+) (.*)$/m,
          15_000,
          child,
          () => stderr,
        );
        // KNOWN: error_type must be DaemonUnreachable. Other types
        // (SessionCapExceeded, SpawnFailed, SessionNameExists,
        // SessionAlreadyRegistered) would indicate the cap-check failure
        // path was bypassed or the wrong error was wrapped.
        const diag =
          `errMatch=${JSON.stringify(errMatch[0])}; ` +
          `stdout=${JSON.stringify(stdout.slice(-1500))}; ` +
          `stderr=${JSON.stringify(stderr.slice(-1500))}`;
        expect(errMatch[1], diag).toBe('DaemonUnreachable');
        // KNOWN: a non-empty message body must accompany the type
        // (handleSpawnResult emits '(no message)' fallback otherwise).
        expect(errMatch[2].trim().length, diag).toBeGreaterThan(0);

        // KNOWN-negative: SPAWN_RESULT_OK must NOT appear before the
        // error. If both fire, the listener is double-handling or the
        // shell's banner state is inconsistent.
        const okBeforeError =
          stdout.split(/\r?\n/).find((l) => l.startsWith('SPAWN_RESULT_OK ')) !==
          undefined;
        expect(okBeforeError, diag).toBe(false);

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
        for (const dir of [onbDir, userDataDir, fakeHome]) {
          try {
            rmSync(dir, { recursive: true, force: true });
          } catch {
            /* best-effort */
          }
        }
      }
    },
    90_000,
  );
});
