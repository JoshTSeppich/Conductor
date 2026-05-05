// Fix-83 / Probe 4 — SPAWN_RESULT_OK live (daemon-gated).
//
// Cairn finding #83 / Fix-B resolution explicitly notes: "Manual
// operator drive of the success path is the v3.0 ship-gate
// validation surface and is part of the next dogfood pass." This
// probe automates that drive when the operator's environment has
// the prerequisites in place (daemon up + claude binary resolvable);
// otherwise it dynamically skips with a loud message per operator
// arbitration on auto-skip framing.
//
// Preconditions checked at runtime (ctx.skip() with explicit
// reason if any fails):
//   1. ~/.foxworks-dispatch/token exists + is readable
//   2. GET http://localhost:7878/v2/sessions returns 200 + JSON with
//      a `sessions` array (auth roundtrip live)
//   3. `claude` binary resolvable via `which claude`
//   4. tmux available via `which tmux`
//
// On success: drive the spawn modal end-to-end with a probe-named
// session (collision-resistant timestamp suffix), assert
// SPAWN_RESULT_OK <name> on stdout, then best-effort cleanup
// (PATCH /v2/sessions/:name/state to 'killed' to release cap +
// remove from cap-counted active set; tmux kill-session in case
// the daemon kill-on-state-transition didn't reach tmux).
//
// KNOWN: defense-in-depth cleanup is best-effort. A failed cleanup
// is logged via stderr but does not fail the probe — the probe's
// load-bearing assertion is SPAWN_RESULT_OK firing, not perfect
// teardown. Operator-visible orphan sessions (per finding #85)
// would surface in the next probe run as cap-blocked spawn → that
// is itself diagnostic.
//
// MODELED: SPAWN_RESULT_OK message body shape comes from
// workstation-shell.html handleSpawnResult; we anchor on `'SPAWN_
// RESULT_OK ' + name` literal.
//
// Pattern reference: probe-83-03 (spawn modal stdin drive) +
// probe-92-02 (daemon precondition) + ctx.skip() for runtime gate.
import { describe, it, expect } from 'vitest';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');
const DAEMON_URL = 'http://localhost:7878';

interface PreconditionResult {
  ok: boolean;
  reason: string;
  token?: string;
}

async function checkPreconditions(): Promise<PreconditionResult> {
  // Step 1: token file readable
  let token: string;
  try {
    const tokenPath = join(homedir(), '.foxworks-dispatch', 'token');
    if (!existsSync(tokenPath)) {
      return {
        ok: false,
        reason:
          'daemon token absent at ~/.foxworks-dispatch/token; install + run dispatch-daemon for KNOWN evidence',
      };
    }
    token = readFileSync(tokenPath, 'utf8').trim();
    if (token.length === 0) {
      return { ok: false, reason: 'daemon token file empty' };
    }
  } catch (err) {
    return {
      ok: false,
      reason: `daemon token unreadable: ${(err as Error).message}`,
    };
  }
  // Step 2: live daemon ping with auth
  try {
    const res = await fetch(`${DAEMON_URL}/v2/sessions`, {
      headers: { 'X-Conductor-Token': token },
    });
    if (res.status !== 200) {
      return {
        ok: false,
        reason: `daemon at ${DAEMON_URL}/v2/sessions returned HTTP ${res.status}; re-run with daemon for KNOWN evidence`,
      };
    }
    const body = (await res.json()) as { sessions?: unknown[] };
    if (!Array.isArray(body.sessions)) {
      return {
        ok: false,
        reason: 'daemon /v2/sessions returned 200 but body has no sessions[] array',
      };
    }
  } catch (err) {
    return {
      ok: false,
      reason: `daemon at ${DAEMON_URL} unreachable: ${(err as Error).message}; re-run with daemon for KNOWN evidence`,
    };
  }
  // Step 3: claude binary
  try {
    execSync('which claude', { stdio: 'pipe' });
  } catch {
    return {
      ok: false,
      reason: 'claude binary not on PATH (which claude failed); install claude CLI for KNOWN evidence',
    };
  }
  // Step 4: tmux
  try {
    execSync('which tmux', { stdio: 'pipe' });
  } catch {
    return { ok: false, reason: 'tmux not on PATH; install tmux for KNOWN evidence' };
  }
  return { ok: true, reason: 'preconditions met', token };
}

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
          `child exited (code=${code}, signal=${signal}) before sentinel ${pattern}. ` +
            `stdout=${JSON.stringify(buf().slice(-2000))}; ` +
            `stderr=${JSON.stringify(errBuf().slice(-2000))}`,
        ),
      );
    });
  });
}

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('Fix-83 / Probe 4 — SPAWN_RESULT_OK live (daemon-gated)', () => {
  itDarwin(
    'spawn submitted against running daemon emits SPAWN_RESULT_OK <sessionName> on stdout',
    async (ctx) => {
      const pre = await checkPreconditions();
      if (!pre.ok) {
        // Loud-skip per operator arbitration: dynamic skip with explicit
        // reason text. Operator running the suite sees exactly what
        // precondition is missing and what to do.
        ctx.skip(
          `SKIPPED: ${pre.reason} — re-run with full daemon stack for KNOWN evidence`,
        );
        return;
      }

      expect(existsSync(MAIN_JS), `expected ${MAIN_JS}`).toBe(true);
      const userDataDir = mkdtempSync(join(tmpdir(), 'fix-83-probe-04-userdata-'));
      const onbDir = mkdtempSync(join(tmpdir(), 'fix-83-probe-04-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );

      const sessionName = `probe-83-04-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      // Real worktree path → claude/tmux can chdir into it.
      const repoPath = PACKAGE_ROOT;

      let stdout = '';
      let stderr = '';
      const child = spawn(ELECTRON_BIN, [MAIN_JS], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Operator's real $HOME so ~/.foxworks-dispatch/token is the
          // production read site (this is the live-daemon path the
          // probe is verifying).
          ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
          MB_TEST_HOOKS: '1',
          MB_USER_DATA_DIR: userDataDir,
          MB_ONBOARDING_STATE_DIR: onbDir,
          // Explicit DAEMON_URL = default; documents the assumption.
          FOXWORKS_DAEMON_URL: DAEMON_URL,
        },
      });
      child.stdout?.on('data', (d: Buffer) => {
        stdout += d.toString();
      });
      child.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString();
      });

      try {
        await awaitSentinel(() => stdout, /^ONBOARDING_READY$/m, 30_000, child, () => stderr);
        await awaitSentinel(() => stdout, /^SHELL_READY$/m, 30_000, child, () => stderr);

        child.stdin?.write('CLICK_SPAWN_BUTTON\n');
        await awaitSentinel(() => stdout, /^SPAWN_MODAL_OPENED$/m, 10_000, child, () => stderr);

        child.stdin?.write(`FILL_AND_SUBMIT_SPAWN ${repoPath}|${sessionName}\n`);

        // Daemon round-trip + tmux new-session + daemon register +
        // result envelope back to renderer can take several seconds
        // on a real machine. 25s is generous; the existing dogfood
        // observation timing (per finding #83) shows sub-second.
        const okMatch = await awaitSentinel(
          () => stdout,
          new RegExp(`^SPAWN_RESULT_OK (${sessionName})$`, 'm'),
          25_000,
          child,
          () => stderr,
        );
        const diag =
          `okMatch=${JSON.stringify(okMatch[0])}; ` +
          `stdout=${JSON.stringify(stdout.slice(-1500))}; ` +
          `stderr=${JSON.stringify(stderr.slice(-1500))}`;
        expect(okMatch[1], diag).toBe(sessionName);

        // KNOWN-negative: SPAWN_RESULT_ERROR must NOT appear before OK.
        const errBeforeOk = stdout
          .split(/\r?\n/)
          .slice(0, stdout.split(/\r?\n/).indexOf(okMatch[0]))
          .find((l) => l.startsWith('SPAWN_RESULT_ERROR '));
        expect(errBeforeOk, diag).toBeUndefined();

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
        // Best-effort cleanup. Failure logged but does not fail the
        // probe (per docstring above).
        try {
          await fetch(`${DAEMON_URL}/v2/sessions/${encodeURIComponent(sessionName)}/state`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Conductor-Token': pre.token!,
            },
            body: JSON.stringify({ state: 'killed' }),
          });
        } catch (cleanupErr) {
          process.stderr.write(
            `[probe-83-04] daemon-side state→killed cleanup failed: ${(cleanupErr as Error).message}\n`,
          );
        }
        try {
          execSync(`tmux kill-session -t ${sessionName}`, { stdio: 'pipe' });
        } catch {
          /* tmux session may already be killed by daemon-side state transition */
        }
        for (const dir of [onbDir, userDataDir]) {
          try {
            rmSync(dir, { recursive: true, force: true });
          } catch {
            /* best-effort */
          }
        }
      }
    },
    180_000,
  );
});
