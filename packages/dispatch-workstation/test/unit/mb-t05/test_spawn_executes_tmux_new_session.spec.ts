// MB-T05 cluster 2 — tmux session spawn execution.
//
// Per WORKSTATION_CONTRACT.md §3.3 (spawn-new-session payload) +
// §8.1 amended (cf1848a) three-clause bar (a)(b)(c).
//
// The spawn handler invokes `tmux new-session -d -s <sessionName> -c
// <repoPath> claude` with env from buildSpawnEnv. Tests inject a
// recording tmux runner so the args + env passed are observable
// without spawning a real tmux process.

import { describe, it, expect } from 'vitest';
import { spawnSession } from '../../../src/main/spawn-handler.js';
import { ALLOWLIST_PATH, ALLOWLIST_TERM } from '../../../src/main/spawn-env.js';

interface RecordedTmuxNewSession {
  args: readonly string[];
  env: Record<string, string | undefined>;
}

function recordingDeps() {
  const tmuxNewSessionCalls: RecordedTmuxNewSession[] = [];
  const tmuxKillCalls: string[] = [];
  return {
    tmuxNewSessionCalls,
    tmuxKillCalls,
    runTmuxNewSession: async (
      args: readonly string[],
      env: Record<string, string | undefined>,
    ): Promise<void> => {
      tmuxNewSessionCalls.push({ args, env });
    },
    runTmuxKillSession: async (sessionName: string): Promise<void> => {
      tmuxKillCalls.push(sessionName);
    },
    registerSession: async (req: {
      name: string;
      cwd: string;
      tmux_target: string;
    }) => {
      return {
        name: req.name,
        cwd: req.cwd,
        tmux_target: req.tmux_target,
        handoff_path: `${req.cwd}/HANDOFF.md`,
        state: 'armed' as const,
      };
    },
    sourceEnv: { HOME: '/Users/test', USER: 'test' },
    apiKey: 'sk-ant-test',
    // cairn #72: fixed test-stand-in absolute path. Real production
    // wiring resolves via `which claude` at startup (binary-resolver.ts).
    claudeBinPath: '/test/bin/claude',
  };
}

describe('MB-T05 cluster 2 — tmux spawn execution', () => {
  it('P1 spawnSession invokes tmux new-session with -d -s <name> -c <repoPath> <claudeBinPath>', async () => {
    // Cairn #72 amends the program token from the literal 'claude' to
    // the absolute path resolved at workstation startup via
    // resolveClaudeBin(). The test's recording deps inject a fixed
    // stand-in path; real production wiring uses `which claude`.
    const deps = recordingDeps();
    await spawnSession(
      { repoPath: '/Users/test/code/foo', sessionName: 'sherpa' },
      deps,
    );
    expect(deps.tmuxNewSessionCalls).toHaveLength(1);
    const { args } = deps.tmuxNewSessionCalls[0];
    expect(args).toEqual([
      'new-session',
      '-d',
      '-s', 'sherpa',
      '-c', '/Users/test/code/foo',
      '/test/bin/claude',
    ]);
  });

  it('P2 env passed to tmux new-session is exactly buildSpawnEnv output', async () => {
    const deps = recordingDeps();
    await spawnSession(
      { repoPath: '/Users/test/code/foo', sessionName: 'sherpa' },
      deps,
    );
    const { env } = deps.tmuxNewSessionCalls[0];
    expect(env.PATH).toBe(ALLOWLIST_PATH);
    expect(env.TERM).toBe(ALLOWLIST_TERM);
    expect(env.HOME).toBe('/Users/test');
    expect(env.USER).toBe('test');
    expect(env.LOGNAME).toBe('test');     // fallback from USER
    expect(env.LANG).toBe('en_US.UTF-8'); // default
    expect(env.SHELL).toBe('/bin/zsh');   // default
    expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-test');
    // Disallowed keys MUST NOT be present.
    expect('NVM_DIR' in env).toBe(false);
    expect('npm_config_prefix' in env).toBe(false);
    expect('TMUX' in env).toBe(false);
  });

  it('P3 tmux non-zero exit → WorkstationError type=SpawnFailed, stderr captured', async () => {
    const deps = recordingDeps();
    deps.runTmuxNewSession = async () => {
      const err = new Error('tmux exited 1: failed to create session');
      (err as Error & { stderr?: string }).stderr = 'failed to create session';
      throw err;
    };
    await expect(
      spawnSession({ repoPath: '/r', sessionName: 's' }, deps),
    ).rejects.toMatchObject({
      error_type: 'SpawnFailed',
      stderr: expect.stringContaining('failed to create session'),
    });
    // No registerSession call when tmux failed.
    // (No daemon-side cleanup either since session didn't exist.)
  });

  it('P4 tmux session-name collision (duplicate session) → WorkstationError type=SessionNameExists', async () => {
    const deps = recordingDeps();
    deps.runTmuxNewSession = async () => {
      const err = new Error('duplicate session: sherpa');
      (err as Error & { stderr?: string }).stderr = 'duplicate session: sherpa';
      throw err;
    };
    await expect(
      spawnSession({ repoPath: '/r', sessionName: 'sherpa' }, deps),
    ).rejects.toMatchObject({
      error_type: 'SessionNameExists',
      sessionName: 'sherpa',
    });
  });
});
