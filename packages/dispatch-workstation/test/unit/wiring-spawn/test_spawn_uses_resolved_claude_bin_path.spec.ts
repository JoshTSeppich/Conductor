// Batch 6 Session A — followup MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION
// (cairn finding #72).
//
// spawn-handler.ts must thread an absolute claudeBinPath from
// SpawnHandlerDeps into the tmux argv, replacing the literal 'claude'
// string. This test asserts:
//   R1 buildTmuxArgs uses deps.claudeBinPath (absolute path) rather
//      than the literal 'claude'.
//   R2 spawnSession surfaces SpawnFailed (typed error) when
//      claudeBinPath is empty/undefined — a startup-time misconfig
//      shouldn't silently spawn a tmux session that immediately dies.
//   R3 The tmux argv shape is otherwise unchanged from MB-T05's
//      contract (`new-session -d -s <name> -c <cwd> <claudeBinPath>`).
//
// RED: SpawnHandlerDeps does not yet have a claudeBinPath field, and
// buildTmuxArgs uses the literal 'claude'. Tests fail until GREEN
// extends the deps interface + buildTmuxArgs signature.

import { describe, it, expect } from 'vitest';
import { spawnSession } from '../../../src/main/spawn-handler.js';

interface RecordedTmuxNewSession {
  args: readonly string[];
}

function recordingDepsWithBin(claudeBinPath: string) {
  const tmuxNewSessionCalls: RecordedTmuxNewSession[] = [];
  const tmuxKillCalls: string[] = [];
  return {
    tmuxNewSessionCalls,
    tmuxKillCalls,
    runTmuxNewSession: async (args: readonly string[]): Promise<void> => {
      tmuxNewSessionCalls.push({ args });
    },
    runTmuxKillSession: async (sessionName: string): Promise<void> => {
      tmuxKillCalls.push(sessionName);
    },
    runTmuxHasSession: async (_sessionName: string): Promise<void> => {
      // Liveness check stub — followup #73 tests cover its semantics.
      // Returning void here means the session is alive.
    },
    registerSession: async (req: { name: string; cwd: string; tmux_target: string }) => ({
      name: req.name,
      cwd: req.cwd,
      tmux_target: req.tmux_target,
      handoff_path: `${req.cwd}/HANDOFF.md`,
      state: 'armed' as const,
    }),
    sourceEnv: { HOME: '/Users/test', USER: 'test' },
    apiKey: 'sk-ant-test',
    claudeBinPath,
    livenessCheckDelayMs: 0,
  };
}

describe('cairn #72 — spawn pipeline uses resolved absolute claude path', () => {
  it('R1 tmux argv contains the absolute claudeBinPath verbatim, not the literal "claude"', async () => {
    const deps = recordingDepsWithBin('/Users/operator/.local/bin/claude');
    await spawnSession(
      { repoPath: '/Users/operator/code/foo', sessionName: 'sherpa' },
      deps,
    );
    expect(deps.tmuxNewSessionCalls).toHaveLength(1);
    const { args } = deps.tmuxNewSessionCalls[0];
    expect(args).toEqual([
      'new-session',
      '-d',
      '-s', 'sherpa',
      '-c', '/Users/operator/code/foo',
      '/Users/operator/.local/bin/claude',
    ]);
    // Bare 'claude' must NOT appear as the program argv.
    expect(args[args.length - 1]).not.toBe('claude');
  });

  it('R2 spawnSession throws SpawnFailed when claudeBinPath is empty', async () => {
    const deps = recordingDepsWithBin('');
    await expect(
      spawnSession({ repoPath: '/r', sessionName: 's' }, deps),
    ).rejects.toMatchObject({
      error_type: 'SpawnFailed',
      sessionName: 's',
    });
    // tmux MUST NOT be invoked when the path is unresolved.
    expect(deps.tmuxNewSessionCalls).toEqual([]);
  });

  it('R3 spawnSession throws SpawnFailed when claudeBinPath is undefined (deps drift safety)', async () => {
    // Cast undefined into the deps to exercise the runtime guard. This
    // models a future caller-side bug where defaultSpawnHandlerDeps fails
    // to resolve the bin and silently leaves the field unset.
    const baseDeps = recordingDepsWithBin('placeholder');
    const deps = {
      ...baseDeps,
      claudeBinPath: undefined as unknown as string,
    };
    await expect(
      spawnSession({ repoPath: '/r', sessionName: 's' }, deps),
    ).rejects.toMatchObject({
      error_type: 'SpawnFailed',
      sessionName: 's',
    });
    expect(deps.tmuxNewSessionCalls).toEqual([]);
  });

  it('R4 the homebrew install path also threads through verbatim (regression guard)', async () => {
    const deps = recordingDepsWithBin('/opt/homebrew/bin/claude');
    await spawnSession(
      { repoPath: '/r', sessionName: 's' },
      deps,
    );
    const { args } = deps.tmuxNewSessionCalls[0];
    expect(args[args.length - 1]).toBe('/opt/homebrew/bin/claude');
  });
});
