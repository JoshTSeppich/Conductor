// MB-T11 WB3 probe-05 — integration: real tmux. Spawn a detached bash
// session, kill via the SessionKillIpcController, verify the pane is gone
// within 500ms via `tmux has-session`.
//
// Uses standalone-node-script + dist-import pattern from MB-T05 probe-01.
// Skips when tmux is not on PATH (auto-skip-with-MANUAL per operator §7.5).
// patchSessionState is stubbed to a no-op since this probe targets the
// tmux-side cleanup path; daemon round-trip is tested separately at MB-T05
// probe-01 + the WB5 action-handler integration test.

import { describe, expect, it } from 'vitest';
import { execFile, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const DIST_SESSION_KILL_IPC = resolve(PACKAGE_ROOT, 'dist/main/session-kill-ipc.js');

interface PreconditionResult {
  ok: boolean;
  reason: string;
}

function checkPreconditions(): PreconditionResult {
  if (!existsSync(DIST_SESSION_KILL_IPC)) {
    return {
      ok: false,
      reason: `dist artifact missing at ${DIST_SESSION_KILL_IPC}; run \`pnpm --filter dispatch-workstation build\``,
    };
  }
  try {
    execSync('which tmux', { stdio: 'pipe' });
  } catch {
    return { ok: false, reason: 'tmux not on PATH; install tmux for KNOWN evidence' };
  }
  return { ok: true, reason: 'preconditions met' };
}

const itDarwinOrLinux =
  process.platform === 'darwin' || process.platform === 'linux' ? it : it.skip;

describe('MB-T11 WB3 / Probe 5 — kill IPC removes a real tmux session', () => {
  itDarwinOrLinux(
    'controller.handleKill terminates a live tmux session within 500ms',
    async (ctx) => {
      const pre = checkPreconditions();
      if (!pre.ok) {
        ctx.skip(`SKIPPED: ${pre.reason}`);
        return;
      }

      // Dynamic import of the dist artifact mirrors MB-T05 probe-01.
      const mod = (await import(DIST_SESSION_KILL_IPC)) as {
        SessionKillIpcController: new (deps: unknown) => {
          handleKill: (
            payload: unknown,
          ) => Promise<{ ok: true } | { ok: false; error: { error_type: string } }>;
        };
      };

      const sessionName = `probe-mbt11-wb3-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;

      // Spawn a detached bash session that will sit idle waiting for input.
      // -d detaches; -s sets the session name; bash with no args is the
      // running command. This is a smoke session — no claude, no daemon
      // registration, just a tmux pane to prove the kill helper works.
      try {
        await execFileP('tmux', ['new-session', '-d', '-s', sessionName, 'bash']);
      } catch (err) {
        ctx.skip(
          `SKIPPED: cannot spawn tmux smoke session: ${(err as Error).message}`,
        );
        return;
      }

      // Verify the session is alive before kill.
      let alivePre = false;
      try {
        await execFileP('tmux', ['has-session', '-t', sessionName]);
        alivePre = true;
      } catch {
        alivePre = false;
      }
      expect(alivePre, 'tmux smoke session should be alive pre-kill').toBe(true);

      // Build a controller with real tmux deps + stub patchSessionState.
      // This is the v3.0 integration boundary: tmux side authoritative,
      // daemon side mocked.
      const patchCalls: Array<[string, string]> = [];
      const ctl = new mod.SessionKillIpcController({
        hasSession: async (name: string) => {
          try {
            await execFileP('tmux', ['has-session', '-t', name]);
            return true;
          } catch {
            return false;
          }
        },
        killSession: async (name: string) => {
          await execFileP('tmux', ['kill-session', '-t', name]);
        },
        patchSessionState: async (name: string, state: string) => {
          patchCalls.push([name, state]);
        },
      });

      const tStart = Date.now();
      const reply = await ctl.handleKill({ sessionName });
      const tEnd = Date.now();

      expect(reply.ok, `expected ok:true, got ${JSON.stringify(reply)}`).toBe(true);
      expect(patchCalls).toEqual([[sessionName, 'killed']]);

      // Latency under 500ms (operator brief requirement).
      const elapsed = tEnd - tStart;
      expect(
        elapsed,
        `kill took ${elapsed}ms; expected under 500ms`,
      ).toBeLessThan(500);

      // Independent verification: tmux has-session must reject post-kill.
      let alivePost = false;
      try {
        await execFileP('tmux', ['has-session', '-t', sessionName]);
        alivePost = true;
      } catch {
        alivePost = false;
      }
      expect(alivePost, 'tmux session should be gone post-kill').toBe(false);
    },
    30_000,
  );
});
