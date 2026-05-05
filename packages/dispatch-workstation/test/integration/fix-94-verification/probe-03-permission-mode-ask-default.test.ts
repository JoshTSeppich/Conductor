// Fix-94 / Probe 3 — live ps-aux negative-evidence: default/ask
// mode does NOT include --dangerously-skip-permissions.
//
// Cairn finding #94 / MB-T09 Phase 2: regression guard for the
// default branch. With permissionMode omitted (or explicit 'ask'),
// the spawned CC process must NOT carry the skip-permissions flag.
// A regression that injected the flag by default would silently
// strip operator approval prompts even when 'ask' was selected —
// the inverse of the bug finding #94 fixes.
//
// Pattern: same mechanism as probe-02 (standalone node-script,
// dist import, real tmux + daemon). Difference: assertion is
// negative-evidence — the line containing claudeBinPath in ps
// output must NOT contain --dangerously-skip-permissions.
//
// Auto-skip-with-MANUAL pattern (operator §7.5).
//
// Pattern reference: probe-94-02 (mechanism), fix-92-09 (negative-
// evidence probe shape).
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
  try {
    execSync('which tmux', { stdio: 'pipe' });
  } catch {
    return { ok: false, reason: 'tmux not on PATH; install tmux for KNOWN evidence' };
  }
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

describe('Fix-94 / Probe 3 — live ps-aux negative-evidence: default/ask mode does NOT include flag', () => {
  itDarwin(
    'spawnSession without permissionMode (default = ask) produces tmux session whose claude argv lacks --dangerously-skip-permissions',
    async (ctx) => {
      const pre = await checkPreconditions();
      if (!pre.ok) {
        ctx.skip(`SKIPPED: ${pre.reason}`);
        return;
      }

      const { spawnSession } = (await import(DIST_SPAWN_HANDLER)) as {
        spawnSession: (
          req: { repoPath: string; sessionName: string; permissionMode?: 'auto' | 'ask' },
          deps: Record<string, unknown>,
        ) => Promise<{ sessionName: string }>;
      };

      const sessionName = `probe-94-03-ask-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const repoPath = PACKAGE_ROOT;

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
          if (!res.ok) throw new Error(`daemon registration failed: HTTP ${res.status}`);
          return (await res.json()) as { name: string; cwd: string; tmux_target: string; handoff_path: string; state: string };
        },
        sourceEnv: process.env,
        apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
        sessionListClient: undefined,
        claudeBinPath: pre.claudeBinPath!,
        livenessCheckDelayMs: 0,
      };

      try {
        // Default-mode spawn: NO permissionMode field. Per finding #94
        // §7.2 operator arbitration: default ⇒ 'ask' (no flag).
        await spawnSession(
          { repoPath, sessionName },
          deps,
        );

        // ps-aux scoped to the unique sessionName. Anchor the search
        // on the session name so the assertion isn't polluted by the
        // operator's other claude processes (which may or may not
        // carry the flag depending on how they were launched).
        //
        // tmux invocation embeds the session name in its child's
        // command-line via the `-s NAME` arg. ps -ef -o command
        // shows the full argv string per process; grep for the
        // session name picks up the tmux child(ren) for OUR session.
        let psOut = '';
        try {
          psOut = execSync(
            `ps -ef -o command 2>&1 | grep -F ${JSON.stringify(sessionName)} | grep -v grep`,
            { encoding: 'utf8' },
          );
        } catch {
          /* grep -v grep can exit 1 on no-match; fall through */
        }

        const lines = psOut.split('\n').filter((l) => l.trim().length > 0);
        const diag =
          `psOut=${JSON.stringify(psOut.slice(-1500))}; ` +
          `claudeBinPath=${pre.claudeBinPath}; sessionName=${sessionName}; ` +
          `lines=${lines.length}`;

        // KNOWN: there must be at least one process line for our
        // unique session name (tmux + child). If zero, the spawn
        // failed silently or the session ended faster than the ps
        // sample — both diagnostically distinct from the negative-
        // evidence assertion below.
        expect(lines.length, `expected ≥ 1 process line for ${sessionName}; ${diag}`).toBeGreaterThanOrEqual(1);

        // KNOWN-negative: NONE of the lines for our session may
        // contain --dangerously-skip-permissions. A regression that
        // injected the flag by default would surface here.
        const flaggedLines = lines.filter((l) => l.includes('--dangerously-skip-permissions'));
        expect(
          flaggedLines.length,
          `expected zero lines with --dangerously-skip-permissions for default-mode spawn; ` +
            `flagged=${JSON.stringify(flaggedLines)}; ${diag}`,
        ).toBe(0);
      } finally {
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
            `[probe-94-03] daemon-side state→killed cleanup failed: ${(cleanupErr as Error).message}\n`,
          );
        }
        try {
          execSync(`tmux kill-session -t ${sessionName}`, { stdio: 'pipe' });
        } catch {
          /* tmux session may already be killed */
        }
      }
    },
    180_000,
  );

  itDarwin(
    'explicit permissionMode: ask also produces tmux session whose claude argv lacks the flag (regression guard)',
    async (ctx) => {
      const pre = await checkPreconditions();
      if (!pre.ok) {
        ctx.skip(`SKIPPED: ${pre.reason}`);
        return;
      }

      const { spawnSession } = (await import(DIST_SPAWN_HANDLER)) as {
        spawnSession: (
          req: { repoPath: string; sessionName: string; permissionMode?: 'auto' | 'ask' },
          deps: Record<string, unknown>,
        ) => Promise<{ sessionName: string }>;
      };

      const sessionName = `probe-94-03-explicit-ask-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const repoPath = PACKAGE_ROOT;

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
          if (!res.ok) throw new Error(`daemon registration failed: HTTP ${res.status}`);
          return (await res.json()) as { name: string; cwd: string; tmux_target: string; handoff_path: string; state: string };
        },
        sourceEnv: process.env,
        apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
        sessionListClient: undefined,
        claudeBinPath: pre.claudeBinPath!,
        livenessCheckDelayMs: 0,
      };

      try {
        // Explicit 'ask': byte-identical behavior to omitted-mode at
        // both the unit-test level (mb-t09/D2) and the live-process
        // level. This case proves the conditional in buildTmuxArgs
        // gates strictly on === 'auto' (not on truthy/defined).
        await spawnSession(
          { repoPath, sessionName, permissionMode: 'ask' },
          deps,
        );

        let psOut = '';
        try {
          psOut = execSync(
            `ps -ef -o command 2>&1 | grep -F ${JSON.stringify(sessionName)} | grep -v grep`,
            { encoding: 'utf8' },
          );
        } catch {
          /* no-match falls through */
        }
        const lines = psOut.split('\n').filter((l) => l.trim().length > 0);
        const diag =
          `psOut=${JSON.stringify(psOut.slice(-1500))}; sessionName=${sessionName}; lines=${lines.length}`;

        expect(lines.length, diag).toBeGreaterThanOrEqual(1);
        const flaggedLines = lines.filter((l) => l.includes('--dangerously-skip-permissions'));
        expect(flaggedLines.length, diag).toBe(0);
      } finally {
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
            `[probe-94-03] daemon-side state→killed cleanup failed: ${(cleanupErr as Error).message}\n`,
          );
        }
        try {
          execSync(`tmux kill-session -t ${sessionName}`, { stdio: 'pipe' });
        } catch {
          /* best-effort */
        }
      }
    },
    180_000,
  );
});
