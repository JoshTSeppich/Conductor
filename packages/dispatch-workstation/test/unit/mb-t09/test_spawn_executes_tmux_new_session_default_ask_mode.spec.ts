// MB-T09 RED — default-ask mode preserves 6-element argv contract.
//
// Cairn finding #94 / Phase 2: when permissionMode is omitted OR
// explicitly 'ask', `buildTmuxArgs` must return the existing
// 6-element argv (`new-session -d -s NAME -c CWD CLAUDEBINPATH`)
// unchanged. This is the regression guard for the GREEN phase: the
// conditional flag-append must NOT perturb default behavior.
//
// Runtime state at commit time (HEAD post-RED-1): omitted-mode case
// passes today because current SpawnSessionRequest already accepts
// {repoPath, sessionName} and buildTmuxArgs returns 6-element argv.
// The 'ask'-explicit case also passes at runtime today because
// `payload as SpawnSessionRequest` cast is structural — extra fields
// flow through silently. Both cases are GREEN-at-creation; the
// test is a CONTRACT GUARD that locks the default behavior in
// before the GREEN edit so the new conditional cannot regress it.
//
// "RED" label on the commit reflects RED-first discipline (test
// added before implementation) per cairn commit grammar, not RED-
// at-runtime. Documented honestly in commit body.
//
// Pattern reference: test/unit/mb-t05/test_spawn_executes_tmux_new_session.spec.ts
// P1 (the existing 6-element argv assertion this test mirrors).

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

describe('MB-T09 — default/ask mode preserves 6-element argv (regression guard)', () => {
  it('D1 omitted permissionMode produces 6-element argv (default contract)', async () => {
    // KNOWN: default behavior — request without permissionMode field
    // must produce the existing 6-element argv. After GREEN ships
    // the conditional flag, this case must remain identical.
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
    // KNOWN-negative: --dangerously-skip-permissions MUST NOT appear.
    expect(args).not.toContain('--dangerously-skip-permissions');
  });

  it('D2 explicit permissionMode: ask produces same 6-element argv', async () => {
    // KNOWN: explicit ask-mode is byte-identical to omitted-mode
    // (both produce default CC permission prompts; the flag is the
    // only differentiator).
    const deps = recordingDeps();
    await spawnSession(
      {
        repoPath: '/Users/test/code/foo',
        sessionName: 'sherpa',
        permissionMode: 'ask',
      },
      deps,
    );
    const { args } = deps.tmuxNewSessionCalls[0];
    expect(args).toEqual([
      'new-session',
      '-d',
      '-s', 'sherpa',
      '-c', '/Users/test/code/foo',
      '/test/bin/claude',
    ]);
    expect(args).not.toContain('--dangerously-skip-permissions');
    expect(args).toHaveLength(7); // ['new-session','-d','-s','sherpa','-c','/Users/test/code/foo','/test/bin/claude']
  });

  it('D3 sessionName + repoPath threading unaffected by permissionMode field', async () => {
    // KNOWN-regression-guard: the existing tmux argv positions
    // (-s NAME at index 3, -c CWD at index 5, claudeBinPath at
    // index 6) must remain stable. A sloppy GREEN that re-orders
    // would break this even if the total length is right.
    const deps = recordingDeps();
    await spawnSession(
      {
        repoPath: '/r/path',
        sessionName: 'myname',
        permissionMode: 'ask',
      },
      deps,
    );
    const { args } = deps.tmuxNewSessionCalls[0];
    expect(args[3]).toBe('myname');
    expect(args[5]).toBe('/r/path');
    expect(args[6]).toBe('/test/bin/claude');
  });
});
