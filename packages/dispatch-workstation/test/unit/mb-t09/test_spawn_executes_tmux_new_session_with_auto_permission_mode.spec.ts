// MB-T09 RED — permissionMode: 'auto' produces 7-element argv ending
// in --dangerously-skip-permissions.
//
// Cairn finding #94 (MB-F-CONDUCTOR-SPAWN-DEFAULT-PERMISSION-MODE).
// In v3.0 swarm-conductor, orchestrator-driven CC sessions need to
// run without per-action permission prompts because the operator's
// approval gate is at the Conductor level (cards / audit / frozen
// contracts / halt discipline), not per-CC-action. The CC binary's
// `--dangerously-skip-permissions` flag is the supported escape.
//
// SpawnSessionRequest gains an optional `permissionMode: 'auto' |
// 'ask'` field. When 'auto', `buildTmuxArgs` must append
// `--dangerously-skip-permissions` AFTER `claudeBinPath` so tmux
// exec's the CC binary with the flag.
//
// RED today (HEAD 0216326): SpawnSessionRequest has only
// { repoPath, sessionName }; buildTmuxArgs returns 6-element argv.
// This test will fail until GREEN extends the interface + the
// argv-builder.
//
// Pattern reference: test/unit/mb-t05/test_spawn_executes_tmux_new_session.spec.ts
// (the deterministic recording-deps harness this test mirrors).

import { describe, it, expect } from 'vitest';
import { spawnSession } from '../../../src/main/spawn-handler.js';

interface RecordedTmuxNewSession {
  args: readonly string[];
  env: Record<string, string | undefined>;
}

function recordingDeps() {
  const tmuxNewSessionCalls: RecordedTmuxNewSession[] = [];
  return {
    tmuxNewSessionCalls,
    runTmuxNewSession: async (
      args: readonly string[],
      env: Record<string, string | undefined>,
    ): Promise<void> => {
      tmuxNewSessionCalls.push({ args, env });
    },
    runTmuxKillSession: async (_sessionName: string): Promise<void> => {},
    runTmuxHasSession: async (_sessionName: string): Promise<void> => {},
    registerSession: async (req: {
      name: string;
      cwd: string;
      tmux_target: string;
    }) => ({
      name: req.name,
      cwd: req.cwd,
      tmux_target: req.tmux_target,
      handoff_path: `${req.cwd}/HANDOFF.md`,
      state: 'armed' as const,
    }),
    sourceEnv: { HOME: '/Users/test', USER: 'test' },
    apiKey: 'sk-ant-test',
    claudeBinPath: '/test/bin/claude',
    livenessCheckDelayMs: 0,
  };
}

describe('MB-T09 — permissionMode: auto produces 7-element argv with --dangerously-skip-permissions', () => {
  it('A1 auto-mode argv = [new-session, -d, -s, name, -c, repoPath, claudeBinPath, --dangerously-skip-permissions]', async () => {
    // KNOWN claim under #94 fix: when the renderer-side toggle
    // (Phase 3 UI) sends permissionMode='auto' via IPC, the spawn
    // pipeline must thread that to tmux argv so the CC binary
    // launches with the prompt-skip flag enabled.
    //
    // Without this, orchestrator-spawned CC sessions block on
    // per-action prompts (the symptom finding #94 cites). With it,
    // operator-in-the-loop control surface remains the Conductor
    // level (cards + audit), which is the v3.0 design.
    const deps = recordingDeps();
    await spawnSession(
      {
        repoPath: '/Users/test/code/foo',
        sessionName: 'sherpa',
        permissionMode: 'auto',
      },
      deps,
    );
    expect(deps.tmuxNewSessionCalls).toHaveLength(1);
    const { args } = deps.tmuxNewSessionCalls[0];
    // KNOWN: the canonical argv ordering. Flag appears AFTER
    // claudeBinPath so tmux exec's `claude --dangerously-skip-permissions`
    // (the bin path is the program; the flag is its argv[1]).
    expect(args).toEqual([
      'new-session',
      '-d',
      '-s', 'sherpa',
      '-c', '/Users/test/code/foo',
      '/test/bin/claude',
      '--dangerously-skip-permissions',
    ]);
    // KNOWN: the bin path remains penultimate (the flag is appended
    // AFTER it). Regression guard mirroring wiring-spawn R4.
    expect(args[args.length - 2]).toBe('/test/bin/claude');
    expect(args[args.length - 1]).toBe('--dangerously-skip-permissions');
  });

  it('A2 auto-mode does NOT modify tmux flags before claudeBinPath', async () => {
    // KNOWN-negative: the conditional append must not perturb the
    // existing tmux invocation contract (`new-session -d -s NAME -c
    // CWD CLAUDE`). The 6-element prefix is identical to default-
    // ask-mode argv; only the 7th element differs.
    const deps = recordingDeps();
    await spawnSession(
      {
        repoPath: '/r',
        sessionName: 's',
        permissionMode: 'auto',
      },
      deps,
    );
    const { args } = deps.tmuxNewSessionCalls[0];
    expect(args.slice(0, 7)).toEqual([
      'new-session',
      '-d',
      '-s', 's',
      '-c', '/r',
      '/test/bin/claude',
    ]);
    expect(args).toHaveLength(8);
  });
});
