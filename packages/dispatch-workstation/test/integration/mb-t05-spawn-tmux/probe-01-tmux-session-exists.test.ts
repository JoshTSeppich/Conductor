// MB-T05 / Probe 1 — tmux session actually exists in `tmux ls` after spawn.
//
// Closes gap §4.1 #4 from docs/probe-coverage-gap-analysis-2026-05-05.md:
// "MB-T05 — tmux session actually exists in `tmux ls` after spawn (PARTIAL).
// fix-83 probe-04 trusts SPAWN_RESULT_OK sentinel; no independent
// `exec tmux ls` assertion. A failed-spawn-but-IPC-reports-OK regression
// would slip through."
//
// Probe shape (per Phase 1 diagnose §3.3):
//   - Standalone-node-script + dist-import pattern from fix-94 probe-03
//     (electron-free; spawn-handler imports only spawn-env + session-cap).
//   - checkPreconditions: daemon up at :7878, token present, tmux on
//     PATH, `which claude` resolves. Auto-skip-with-MANUAL pattern
//     (operator §7.5) — `ctx.skip()` with explicit reason on missing
//     precondition.
//   - Drive spawnSession with synthetic unique sessionName.
//   - After spawnSession resolves: `execSync('tmux ls')`, assert output
//     contains the unique sessionName.
//   - Independent verification: `fetch GET /v2/sessions`, assert daemon's
//     session list independently includes the new session by name (does
//     not trust the IPC envelope).
//   - Cleanup: PATCH /v2/sessions/<name>/state → killed, then `tmux
//     kill-session -t <name>`. Best-effort, in finally block.
//
// KNOWN: dist/main/spawn-handler.js exports spawnSession; same dist-
// import pattern works at fix-94-verification/probe-03 (verified by
// reading that file at sess-3 HEAD). MB-T09 Phase 2 did not change
// the dep contract.
//
// MODELED: tmux ls may briefly race with tmux server startup if
// spawnSession returns before tmux fully spawns. Empirically (fix-94
// probe-02/03) no such race observed on operator's machine; SPECULATIVE
// that this is benign on slower runtimes.
//
// Defense-in-depth: synthetic sessionName has a unique timestamp +
// random suffix to avoid collisions with operator's real sessions or
// past probe runs that left ghost entries.
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

interface SessionListResponseEntry {
  name?: unknown;
  state?: unknown;
}

async function fetchDaemonSessionNames(token: string): Promise<string[]> {
  const res = await fetch(`${DAEMON_URL}/v2/sessions`, {
    headers: { 'X-Conductor-Token': token },
  });
  if (res.status !== 200) {
    throw new Error(`/v2/sessions returned HTTP ${res.status}`);
  }
  const body = (await res.json()) as { sessions?: SessionListResponseEntry[] };
  if (!Array.isArray(body.sessions)) return [];
  return body.sessions
    .map((s) => (typeof s?.name === 'string' ? s.name : null))
    .filter((n): n is string => n !== null);
}

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('MB-T05 / Probe 1 — tmux session actually exists in `tmux ls` after spawn', () => {
  itDarwin(
    'spawnSession produces a tmux session whose name appears in `tmux ls` AND in daemon /v2/sessions',
    async (ctx) => {
      const pre = await checkPreconditions();
      if (!pre.ok) {
        ctx.skip(`SKIPPED: ${pre.reason}`);
        return;
      }

      const { spawnSession } = (await import(DIST_SPAWN_HANDLER)) as {
        spawnSession: (
          req: {
            repoPath: string;
            sessionName: string;
            permissionMode?: 'auto' | 'ask';
          },
          deps: Record<string, unknown>,
        ) => Promise<{ sessionName: string }>;
      };

      const sessionName = `probe-mb-t05-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const repoPath = PACKAGE_ROOT;

      const deps = {
        runTmuxNewSession: async (
          args: readonly string[],
          env: Record<string, string | undefined>,
        ) => {
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
        registerSession: async (req: {
          name: string;
          cwd: string;
          tmux_target: string;
        }) => {
          const res = await fetch(`${DAEMON_URL}/v2/sessions`, {
            method: 'POST',
            headers: {
              'X-Conductor-Token': pre.token!,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              name: req.name,
              cwd: req.cwd,
              tmux_target: req.tmux_target,
              handoff_path: join(req.cwd, 'HANDOFF.md'),
            }),
          });
          if (!res.ok) throw new Error(`daemon registration failed: HTTP ${res.status}`);
          return (await res.json()) as {
            name: string;
            cwd: string;
            tmux_target: string;
            handoff_path: string;
            state: string;
          };
        },
        sourceEnv: process.env,
        apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
        sessionListClient: undefined,
        claudeBinPath: pre.claudeBinPath!,
        livenessCheckDelayMs: 0,
      };

      try {
        // Drive the spawn. After this resolves, fix-83's IPC layer would
        // emit SPAWN_RESULT_OK — but here we are at the dist-import
        // level, beneath the IPC envelope. The probe's whole point is
        // to assert the SUBSTRATE (tmux + daemon) state independent of
        // the IPC sentinel.
        await spawnSession({ repoPath, sessionName }, deps);

        // ── KNOWN-positive #1: `tmux ls` lists the session ───────────
        // Anchor the search on the unique sessionName so the assertion
        // isn't polluted by the operator's other tmux sessions.
        let tmuxLsOut = '';
        try {
          tmuxLsOut = execSync('tmux ls', { encoding: 'utf8' });
        } catch (err) {
          // tmux ls exits 1 on no sessions; treat as empty
          const e = err as { stdout?: Buffer };
          tmuxLsOut = (e.stdout?.toString() ?? '').trim();
        }
        const tmuxHasOurSession = tmuxLsOut
          .split('\n')
          .some((l) => l.startsWith(`${sessionName}:`));
        expect(
          tmuxHasOurSession,
          `expected \`tmux ls\` to list session "${sessionName}"; ` +
            `got tmux ls output:\n${tmuxLsOut}`,
        ).toBe(true);

        // ── KNOWN-positive #2: daemon /v2/sessions independently
        // registers the new session ──────────────────────────────────
        // This is the assertion the gap analysis specifically calls out:
        // "no probe asserts daemon /v2/sessions includes the new session
        // entry independently (probe trusts the IPC envelope)". Here we
        // verify daemon state directly via HTTP, bypassing the IPC layer.
        const daemonSessions = await fetchDaemonSessionNames(pre.token!);
        expect(
          daemonSessions,
          `expected daemon /v2/sessions to include "${sessionName}"; ` +
            `got names=${JSON.stringify(daemonSessions)}`,
        ).toContain(sessionName);
      } finally {
        // Cleanup. Same pattern as fix-94 probe-03: PATCH state→killed
        // first (so the daemon's session count drops back below cap),
        // then tmux kill-session (so the tmux server doesn't hold a
        // dead session). Both best-effort; never mask the assertion
        // outcome behind cleanup noise.
        try {
          await fetch(
            `${DAEMON_URL}/v2/sessions/${encodeURIComponent(sessionName)}/state`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'X-Conductor-Token': pre.token!,
              },
              body: JSON.stringify({ state: 'killed' }),
            },
          );
        } catch (cleanupErr) {
          process.stderr.write(
            `[mb-t05-probe-01] daemon-side state→killed cleanup failed: ` +
              `${(cleanupErr as Error).message}\n`,
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
});
