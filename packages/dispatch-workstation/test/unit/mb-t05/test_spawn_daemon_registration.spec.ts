// MB-T05 cluster 3 — daemon registration + cleanup-on-failure paths.
//
// Per CONDUCTOR_API_CONTRACT.md §4.3 (POST /v2/sessions, KNOWN per
// CLI v1 + DAEMON-T07) + WORKSTATION_CONTRACT.md §8.1 amended (a)
// structural-parity-at-registration clause.
//
// Cluster 2 already established that registerSession is invoked
// after tmux spawn succeeds. Cluster 3 validates:
//   - Successful registration: handler returns daemon-acknowledged
//     session matching the (a) clause shape
//   - Daemon unreachable: tmux session killed for cleanup, error_type
//     surfaced
//   - Daemon 409: tmux session killed for cleanup, error_type surfaced

import { describe, it, expect } from 'vitest';
import { spawnSession } from '../../../src/main/spawn-handler.js';

interface RecordedRegisterCall {
  name: string;
  cwd: string;
  tmux_target: string;
}

function recordingDeps() {
  const tmuxNewSessionCalls: { args: readonly string[] }[] = [];
  const tmuxKillCalls: string[] = [];
  const registerCalls: RecordedRegisterCall[] = [];
  return {
    tmuxNewSessionCalls,
    tmuxKillCalls,
    registerCalls,
    runTmuxNewSession: async (args: readonly string[]): Promise<void> => {
      tmuxNewSessionCalls.push({ args });
    },
    runTmuxKillSession: async (sessionName: string): Promise<void> => {
      tmuxKillCalls.push(sessionName);
    },
    // cairn #73: liveness check stub (no-op success).
    runTmuxHasSession: async (_sessionName: string): Promise<void> => {},
    registerSession: async (req: RecordedRegisterCall) => {
      registerCalls.push(req);
      // Default success: daemon mirrors back the registration.
      return {
        name: req.name,
        cwd: req.cwd,
        tmux_target: req.tmux_target,
        handoff_path: `${req.cwd}/HANDOFF.md`,
        state: 'armed' as const,
      };
    },
    sourceEnv: { HOME: '/h', USER: 'u' },
    apiKey: 'k',
    // cairn #72: stand-in absolute path; production wiring resolves
    // via `which claude` at workstation startup.
    claudeBinPath: '/test/bin/claude',
    // cairn #73: 0ms delay keeps unit tests fast; production default 500ms.
    livenessCheckDelayMs: 0,
  };
}

describe('MB-T05 cluster 3 — daemon registration + cleanup-on-failure', () => {
  it('P1 successful tmux + registration → handler returns sessionName/sessionId/panelMounted=false', async () => {
    const deps = recordingDeps();
    const result = await spawnSession(
      { repoPath: '/r', sessionName: 'sherpa' },
      deps,
    );
    expect(result).toEqual({
      sessionName: 'sherpa',
      sessionId: 'sherpa',
      panelMounted: false,
    });
    // §8.1 (a) structural parity: registerSession was called with the
    // shape that DAEMON-T07 POST /v2/sessions expects (name + cwd +
    // tmux_target).
    expect(deps.registerCalls).toHaveLength(1);
    expect(deps.registerCalls[0]).toEqual({
      name: 'sherpa',
      cwd: '/r',
      tmux_target: 'sherpa:0.0',
    });
    // Tmux session NOT killed on success path.
    expect(deps.tmuxKillCalls).toEqual([]);
  });

  it('P2 daemon unreachable → WorkstationError type=DaemonUnreachable, tmux session killed', async () => {
    const deps = recordingDeps();
    deps.registerSession = async () => {
      // Simulate fetch failure: a plain Error (NOT pre-typed) — handler
      // wraps as DaemonUnreachable.
      throw new Error('fetch failed: ECONNREFUSED 127.0.0.1:7878');
    };
    await expect(
      spawnSession({ repoPath: '/r', sessionName: 'sherpa' }, deps),
    ).rejects.toMatchObject({
      error_type: 'DaemonUnreachable',
      sessionName: 'sherpa',
    });
    // Cleanup: tmux session killed so we don't orphan it.
    expect(deps.tmuxKillCalls).toEqual(['sherpa']);
  });

  it('P3 daemon 409 conflict → WorkstationError type=SessionAlreadyRegistered, tmux session killed', async () => {
    const deps = recordingDeps();
    deps.registerSession = async () => {
      // Daemon-typed error — handler must preserve the error_type
      // (NOT wrap as DaemonUnreachable).
      const err = new Error(
        'Session name in use (killed record exists). Pick a new name.',
      ) as Error & { error_type: string };
      err.error_type = 'SessionAlreadyRegistered';
      throw err;
    };
    await expect(
      spawnSession({ repoPath: '/r', sessionName: 'sherpa' }, deps),
    ).rejects.toMatchObject({
      error_type: 'SessionAlreadyRegistered',
    });
    // Cleanup: tmux session killed.
    expect(deps.tmuxKillCalls).toEqual(['sherpa']);
  });

  it('P4 daemon registration error wraps non-typed errors as DaemonUnreachable (default fallback)', async () => {
    const deps = recordingDeps();
    deps.registerSession = async () => {
      throw new Error('some generic network blip');
    };
    await expect(
      spawnSession({ repoPath: '/r', sessionName: 'foo' }, deps),
    ).rejects.toMatchObject({
      error_type: 'DaemonUnreachable',
    });
    expect(deps.tmuxKillCalls).toEqual(['foo']);
  });

  it('P5 cleanup is best-effort: kill-session failure does not mask the original registration error', async () => {
    const deps = recordingDeps();
    deps.registerSession = async () => {
      const err = new Error('econnrefused') as Error & { error_type: string };
      err.error_type = 'DaemonUnreachable';
      throw err;
    };
    deps.runTmuxKillSession = async () => {
      throw new Error('kill-session also failed');
    };
    await expect(
      spawnSession({ repoPath: '/r', sessionName: 'foo' }, deps),
    ).rejects.toMatchObject({
      error_type: 'DaemonUnreachable',
    });
  });
});
