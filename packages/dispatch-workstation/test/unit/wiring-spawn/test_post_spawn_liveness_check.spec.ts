// Batch 6 Session A — followup MB-F-MB-T05-POST-SPAWN-LIVENESS-CHECK
// (cairn finding #73).
//
// Defense-in-depth companion to cairn #72. Even after the absolute-
// path fix, the spawn handler architecture trusts `tmux new-session`
// exit-0 as proof of spawn success. tmux returns 0 once the session
// is created — BEFORE its child process attempts exec. If the child
// dies for any reason (corrupt binary, license refused, immediate
// crash), the session ends asynchronously with no signal to the
// workstation. Daemon record orphaned silently.
//
// Fix: post-spawn liveness verification. After runTmuxNewSession
// returns success, sleep `livenessCheckDelayMs` (default 500ms),
// then run `tmux has-session -t <sessionName>`. If has-session
// rejects, throw SpawnFailed; daemon registration is then skipped
// via the existing throw path (no orphaned record).
//
// RED: SpawnHandlerDeps.runTmuxHasSession does not exist yet (only
// the stub-pass-through in cairn #72's test fixtures). spawn-handler
// does not invoke a liveness check. Tests assert the new behavior
// and fail until GREEN lands.

import { describe, it, expect } from 'vitest';
import { spawnSession } from '../../../src/main/spawn-handler.js';

interface RecordingDeps {
  tmuxNewSessionCalls: number;
  hasSessionCalls: string[];
  tmuxKillCalls: string[];
  registerCalls: number;
  callOrder: string[];
}

function makeDeps(overrides: {
  hasSessionImpl?: (sessionName: string) => Promise<void>;
  livenessCheckDelayMs?: number;
} = {}) {
  const state: RecordingDeps = {
    tmuxNewSessionCalls: 0,
    hasSessionCalls: [],
    tmuxKillCalls: [],
    registerCalls: 0,
    callOrder: [],
  };
  const deps = {
    state,
    runTmuxNewSession: async (): Promise<void> => {
      state.tmuxNewSessionCalls += 1;
      state.callOrder.push('runTmuxNewSession');
    },
    runTmuxKillSession: async (sessionName: string): Promise<void> => {
      state.tmuxKillCalls.push(sessionName);
      state.callOrder.push('runTmuxKillSession');
    },
    runTmuxHasSession:
      overrides.hasSessionImpl ??
      (async (sessionName: string): Promise<void> => {
        state.hasSessionCalls.push(sessionName);
        state.callOrder.push('runTmuxHasSession');
      }),
    registerSession: async (req: { name: string; cwd: string; tmux_target: string }) => {
      state.registerCalls += 1;
      state.callOrder.push('registerSession');
      return {
        name: req.name,
        cwd: req.cwd,
        tmux_target: req.tmux_target,
        handoff_path: `${req.cwd}/HANDOFF.md`,
        state: 'armed' as const,
      };
    },
    sourceEnv: { HOME: '/h', USER: 'u' },
    apiKey: 'sk-ant-test',
    claudeBinPath: '/test/bin/claude',
    livenessCheckDelayMs: overrides.livenessCheckDelayMs ?? 0,
  };
  // Wrap runTmuxHasSession to also record the call when caller
  // overrides hasSessionImpl, so order/counts are observable.
  if (overrides.hasSessionImpl) {
    const orig = deps.runTmuxHasSession;
    deps.runTmuxHasSession = async (sessionName: string) => {
      state.hasSessionCalls.push(sessionName);
      state.callOrder.push('runTmuxHasSession');
      return orig(sessionName);
    };
  }
  return deps;
}

describe('cairn #73 — post-spawn liveness check', () => {
  it('R1 calls runTmuxHasSession after runTmuxNewSession and before registerSession', async () => {
    const deps = makeDeps();
    await spawnSession(
      { repoPath: '/r', sessionName: 'sherpa' },
      deps,
    );
    // Order MUST be: tmux new → has-session → register.
    expect(deps.state.callOrder).toEqual([
      'runTmuxNewSession',
      'runTmuxHasSession',
      'registerSession',
    ]);
    expect(deps.state.hasSessionCalls).toEqual(['sherpa']);
  });

  it('R2 throws SpawnFailed when has-session rejects (program died after tmux exit-0)', async () => {
    const deps = makeDeps({
      hasSessionImpl: async () => {
        throw new Error("can't find session: sherpa");
      },
    });
    await expect(
      spawnSession({ repoPath: '/r', sessionName: 'sherpa' }, deps),
    ).rejects.toMatchObject({
      error_type: 'SpawnFailed',
      sessionName: 'sherpa',
    });
  });

  it('R3 daemon registration is NOT called when has-session check fails', async () => {
    const deps = makeDeps({
      hasSessionImpl: async () => {
        throw new Error("can't find session: foo");
      },
    });
    await expect(
      spawnSession({ repoPath: '/r', sessionName: 'foo' }, deps),
    ).rejects.toMatchObject({ error_type: 'SpawnFailed' });
    expect(deps.state.registerCalls).toBe(0);
  });

  it('R4 SpawnFailed message names a likely cause (binary install / immediate crash)', async () => {
    const deps = makeDeps({
      hasSessionImpl: async () => {
        throw new Error("can't find session: foo");
      },
    });
    try {
      await spawnSession({ repoPath: '/r', sessionName: 'foo' }, deps);
      throw new Error('expected throw');
    } catch (err) {
      const e = err as Error & { error_type?: string };
      expect(e.error_type).toBe('SpawnFailed');
      // Message should hint at the dogfooded failure shape so the
      // operator can act (check binary, restart workstation, etc.).
      expect(e.message.toLowerCase()).toMatch(/died|exit|install|liveness|has-session/);
    }
  });

  it('R5 livenessCheckDelayMs is honored — the check runs after the configured sleep', async () => {
    // Use a larger delay to make the wait observable. We measure the
    // wall-clock time between the runTmuxNewSession resolution and the
    // runTmuxHasSession call. The default is 500ms in production; the
    // test seam allows shorter delays for fast unit tests, but we
    // assert the field is honored end-to-end with a 50ms value.
    const delay = 50;
    let tmuxResolvedAt = 0;
    let hasSessionCalledAt = 0;
    const deps = makeDeps({ livenessCheckDelayMs: delay });
    deps.runTmuxNewSession = async () => {
      deps.state.tmuxNewSessionCalls += 1;
      deps.state.callOrder.push('runTmuxNewSession');
      tmuxResolvedAt = Date.now();
    };
    deps.runTmuxHasSession = async (sessionName: string) => {
      hasSessionCalledAt = Date.now();
      deps.state.hasSessionCalls.push(sessionName);
      deps.state.callOrder.push('runTmuxHasSession');
    };
    await spawnSession({ repoPath: '/r', sessionName: 'foo' }, deps);
    const elapsed = hasSessionCalledAt - tmuxResolvedAt;
    expect(elapsed).toBeGreaterThanOrEqual(delay - 5); // allow 5ms scheduler slack
  });

  it('R6 successful liveness check followed by daemon registration returns success', async () => {
    // Sanity regression — when has-session succeeds, the pipeline
    // proceeds to daemon registration as before, and the handler
    // returns the success envelope.
    const deps = makeDeps();
    const result = await spawnSession(
      { repoPath: '/r', sessionName: 'foo' },
      deps,
    );
    expect(result).toEqual({
      sessionName: 'foo',
      sessionId: 'foo',
      panelMounted: false,
      cwd: '/r',
      spawnMode: 'ask',
    });
    expect(deps.state.registerCalls).toBe(1);
  });
});
