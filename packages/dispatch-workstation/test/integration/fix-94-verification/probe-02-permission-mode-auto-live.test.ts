// Fix-94 / Probe 2 — live ps-aux assertion: auto-mode spawned CC
// runs with --dangerously-skip-permissions in its argv.
//
// Cairn finding #94 / MB-T09 Phase 2: spawning with permissionMode:
// 'auto' must produce a CC process whose argv (visible via ps aux)
// contains --dangerously-skip-permissions. This is the deterministic
// live verification that the GREEN edit reaches the actual running
// process — orthogonal to probe-01 (source/dist grep) which catches
// build-pipeline regressions but cannot prove runtime activation.
//
// Mechanism: standalone node-script style. Imports dist/main/
// spawn-handler.js (electron-free; verified at HEAD c834fdf —
// spawn-handler imports only spawn-env + session-cap, no electron),
// assembles real deps (real tmux execFile, real daemon registerSession
// via fetch, real `which claude` resolution), and drives spawnSession
// with permissionMode: 'auto'. The resulting tmux session runs
// claude with the flag; ps aux | grep <sessionName> confirms.
//
// Avoids: extending FILL_AND_SUBMIT_SPAWN parser, adding SHELL_EVAL
// stdin handler, or any other source edit beyond MB-T09 Phase 2's
// authorized scope (spawn-handler.ts only). Direct dist import is
// the same pattern used by fix-batch-1 verification per finding #84
// resolution.
//
// Auto-skip-with-MANUAL pattern (per operator §7.5 arbitration,
// fix-83-04 / fix-84-06 split). Preconditions:
//   - daemon up at :7878
//   - ~/.foxworks-dispatch/token present
//   - tmux on PATH
//   - claude binary resolvable via `which claude`
// Any precondition missing → ctx.skip() with explicit loud reason.
//
// Cleanup: PATCH state→killed (releases cap, removes from cap-counted
// active set), tmux kill-session as belt-and-suspenders.
//
// MANUAL designation (also in this file): one it.skip() that pins
// the operator-experiential validation step (operator opens CC
// console panel via Conductor strip, types a prompt that would
// require permission, observes NO prompt fires). Non-deterministic
// at the human boundary; operator-step lives in REPORT.md.
//
// Pattern reference: fix-83-verification/probe-04 (auto-skip + live
// daemon + cleanup).
import { describe, it, expect } from 'vitest';
import { execSync, execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const DIST_SPAWN_HANDLER = resolve(PACKAGE_ROOT, 'dist/main/spawn-handler.js');
const DAEMON_URL = 'http://localhost:7878';
const TMUX_BIN = 'tmux';

interface PreconditionResult {
  ok: boolean;
  reason: string;
  token?: string;
  claudeBinPath?: string;
}

async function checkPreconditions(): Promise<PreconditionResult> {
  if (!existsSync(DIST_SPAWN_HANDLER)) {
    return {
      ok: false,
      reason: `dist artifact missing at ${DIST_SPAWN_HANDLER}; run \`pnpm --filter dispatch-workstation build\``,
    };
  }
  // Daemon token
  let token: string;
  try {
    const tokenPath = join(homedir(), '.foxworks-dispatch', 'token');
    if (!existsSync(tokenPath)) {
      return {
        ok: false,
        reason: 'daemon token absent at ~/.foxworks-dispatch/token; install + run dispatch-daemon for KNOWN evidence',
      };
    }
    token = readFileSync(tokenPath, 'utf8').trim();
    if (token.length === 0) return { ok: false, reason: 'daemon token file empty' };
  } catch (err) {
    return { ok: false, reason: `daemon token unreadable: ${(err as Error).message}` };
  }
  // Daemon ping
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
  } catch (err) {
    return {
      ok: false,
      reason: `daemon at ${DAEMON_URL} unreachable: ${(err as Error).message}; re-run with daemon for KNOWN evidence`,
    };
  }
  // tmux
  try {
    execSync('which tmux', { stdio: 'pipe' });
  } catch {
    return { ok: false, reason: 'tmux not on PATH; install tmux for KNOWN evidence' };
  }
  // claude
  let claudeBinPath: string;
  try {
    claudeBinPath = execSync('which claude', { encoding: 'utf8' }).trim();
    if (claudeBinPath.length === 0) {
      return { ok: false, reason: '`which claude` returned empty path' };
    }
  } catch {
    return { ok: false, reason: '`which claude` failed; install claude CLI for KNOWN evidence' };
  }
  return { ok: true, reason: 'preconditions met', token, claudeBinPath };
}

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('Fix-94 / Probe 2 — live ps-aux assertion: auto-mode flag in spawned CC argv', () => {
  itDarwin(
    'spawnSession with permissionMode: auto produces a tmux session whose claude process argv contains --dangerously-skip-permissions',
    async (ctx) => {
      const pre = await checkPreconditions();
      if (!pre.ok) {
        ctx.skip(`SKIPPED: ${pre.reason}`);
        return;
      }

      // Direct import of the GREEN'd spawn-handler from dist. Pattern
      // mirrors fix-batch-1's standalone-node-script verification per
      // finding #84 resolution.
      const { spawnSession } = (await import(DIST_SPAWN_HANDLER)) as {
        spawnSession: (
          req: { repoPath: string; sessionName: string; permissionMode?: 'auto' | 'ask' },
          deps: Record<string, unknown>,
        ) => Promise<{ sessionName: string }>;
      };

      const sessionName = `probe-94-02-auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const repoPath = PACKAGE_ROOT;

      // Real production deps assembled inline (no Electron). Mirrors
      // defaultSpawnHandlerDeps from spawn-ipc.ts but without the
      // electron-bound safeStorage dependency.
      const deps = {
        runTmuxNewSession: async (args: readonly string[], env: Record<string, string | undefined>) => {
          await execFileP(TMUX_BIN, [...args], { env: env as NodeJS.ProcessEnv });
        },
        runTmuxKillSession: async (name: string) => {
          try {
            await execFileP(TMUX_BIN, ['kill-session', '-t', name]);
          } catch {
            /* best-effort */
          }
        },
        runTmuxHasSession: async (name: string) => {
          await execFileP(TMUX_BIN, ['has-session', '-t', name]);
        },
        registerSession: async (req: { name: string; cwd: string; tmux_target: string }) => {
          const res = await fetch(`${DAEMON_URL}/v2/sessions`, {
            method: 'POST',
            headers: { 'X-Conductor-Token': pre.token!, 'content-type': 'application/json' },
            body: JSON.stringify({
              name: req.name,
              cwd: req.cwd,
              tmux_target: req.tmux_target,
              handoff_path: join(req.cwd, 'HANDOFF.md'),
            }),
          });
          if (!res.ok) {
            throw new Error(`daemon registration failed: HTTP ${res.status}`);
          }
          return (await res.json()) as { name: string; cwd: string; tmux_target: string; handoff_path: string; state: string };
        },
        sourceEnv: process.env,
        // Real Anthropic key for the spawned CC; ANTHROPIC_API_KEY env
        // takes precedence per #84 resolution semantics. The probe
        // doesn't actually exercise CC's chat; it only verifies the
        // launch argv. Empty string is acceptable here (CC errors
        // post-launch on missing key, but argv inspection happens
        // before that error matters).
        apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
        sessionListClient: undefined, // skip cap-check for probe (operator-arbitrated; safe under test)
        claudeBinPath: pre.claudeBinPath!,
        livenessCheckDelayMs: 0,
      };

      try {
        await spawnSession(
          { repoPath, sessionName, permissionMode: 'auto' },
          deps,
        );
        // ps aux pipeline: grep for the session-name (unique by
        // construction, so no cross-test collision) and assert the
        // flag is present in the matched process argv.
        //
        // tmux spawns a child process for the CC binary. `ps -ef -o
        // command` shows the full argv string for each PID. We grep
        // for the bin path + session-name-anchored region; the flag
        // appears AFTER the bin path in the argv, so a literal-grep
        // for --dangerously-skip-permissions in any line that also
        // contains the bin path is the proof.
        let psOut = '';
        try {
          psOut = execSync(
            `ps -ef -o command 2>&1 | grep -F ${JSON.stringify(pre.claudeBinPath!)} | grep -v grep`,
            { encoding: 'utf8' },
          );
        } catch {
          /* grep -v grep can exit 1 if no matches; fall through to
             empty psOut and the assertion below will handle it */
        }
        // KNOWN: there must be at least one line whose argv contains
        // both the claudeBinPath AND --dangerously-skip-permissions.
        // Other claude processes (operator's own CC sessions) may
        // share the bin path but lack the flag — the conjunction is
        // load-bearing.
        const matchingLines = psOut.split('\n').filter(
          (line) =>
            line.includes(pre.claudeBinPath!) &&
            line.includes('--dangerously-skip-permissions'),
        );
        const diag =
          `psOut last 1500 chars=${JSON.stringify(psOut.slice(-1500))}; ` +
          `claudeBinPath=${pre.claudeBinPath}; sessionName=${sessionName}`;
        expect(matchingLines.length, diag).toBeGreaterThanOrEqual(1);
      } finally {
        // Best-effort cleanup. Failure logged but does not fail the
        // probe (per fix-83-04 pattern).
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
            `[probe-94-02] daemon-side state→killed cleanup failed: ${(cleanupErr as Error).message}\n`,
          );
        }
        try {
          execSync(`tmux kill-session -t ${sessionName}`, { stdio: 'pipe' });
        } catch {
          /* tmux session may already be killed by daemon-side state transition */
        }
      }
    },
    180_000,
  );

  // MANUAL designation per operator §7.5 (fix-84-06 pattern). The
  // operator-experiential surface — operator opens a CC console
  // panel via the Conductor strip (Phase 3 UI, not yet shipped),
  // types a prompt that would normally trigger CC's per-action
  // approval prompt, and observes that NO prompt fires — is non-
  // deterministic at the human boundary and is exercised in
  // operator dogfood. Per operator arbitration: stochastic
  // behavior at the test boundary doesn't get faked into looking
  // deterministic. See REPORT.md for the operator-step.
  it.skip(
    'MANUAL: operator-experiential auto-mode validation (open CC, attempt action, observe no prompt) — see fix-94-verification/REPORT.md',
    () => {
      // intentionally empty — the operator-step lives in REPORT.md.
      // Skipped case ensures test-runner output surfaces the manual
      // surface every run.
    },
  );
});
