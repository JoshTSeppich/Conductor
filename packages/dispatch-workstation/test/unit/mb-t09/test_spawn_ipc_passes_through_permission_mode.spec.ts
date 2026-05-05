// MB-T09 RED — IPC controller threads permissionMode payload field
// through to spawn handler verbatim.
//
// Cairn finding #94 / Phase 2: the renderer-side toggle (Phase 3
// UI) sends `permissionMode: 'auto' | 'ask'` in the IPC payload to
// `workstation:spawn-requested`. SpawnIpcController.handleSpawnRequest
// receives that payload and must thread it to spawnSession verbatim
// so buildTmuxArgs sees the field. If the controller drops or
// renames the field at the boundary, GREEN's conditional flag-append
// becomes unreachable in production despite passing unit tests at
// the spawn-handler level.
//
// This RED commit fences the cross-layer contract: IPC payload →
// controller → spawn-handler → tmux argv.
//
// Runtime state at commit time: tests pass today because (a) test/
// is excluded from tsc and (b) the existing `payload as
// SpawnSessionRequest` cast in spawn-ipc.ts:292 is structural —
// extra fields flow through silently. After GREEN extends the
// SpawnSessionRequest interface AND wires buildTmuxArgs to read
// the field, this test continues to pass; it locks the cross-layer
// thread in. Honesty note matches RED-2's framing — RED-first
// commit grammar, not RED-at-runtime today.
//
// Pattern reference: SpawnIpcController.handleSpawnRequest at
// packages/dispatch-workstation/src/main/spawn-ipc.ts:80-91 (the
// thin wrapper around spawnSession that the controller test in
// test/unit/spawn-ipc/ already exercises with mocked spawnSession;
// this RED uses recording-deps so the full handler→buildTmuxArgs
// path is observed end-to-end).

import { describe, it, expect } from 'vitest';
import { SpawnIpcController } from '../../../src/main/spawn-ipc.js';

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

describe('MB-T09 — SpawnIpcController threads permissionMode payload field to spawn handler', () => {
  it('I1 controller-routed auto-mode payload reaches buildTmuxArgs → 8-element argv with flag', async () => {
    // KNOWN: cross-layer contract assertion. The IPC entry point
    // (handleSpawnRequest) must preserve permissionMode through to
    // the tmux invocation. If the controller drops or renames the
    // field at the boundary, this test goes RED even though direct
    // spawnSession invocation (test 1) still passes.
    const deps = recordingDeps();
    const ctrl = new SpawnIpcController(deps);
    const reply = await ctrl.handleSpawnRequest({
      repoPath: '/Users/test/code/foo',
      sessionName: 'sherpa',
      permissionMode: 'auto',
    });
    expect(reply.type).toBe('success');
    expect(deps.tmuxNewSessionCalls).toHaveLength(1);
    const { args } = deps.tmuxNewSessionCalls[0];
    // KNOWN: same 8-element shape as direct test 1 A1; this test's
    // contribution is proving the IPC layer doesn't strip the field.
    expect(args).toEqual([
      'new-session',
      '-d',
      '-s', 'sherpa',
      '-c', '/Users/test/code/foo',
      '/test/bin/claude',
      '--dangerously-skip-permissions',
    ]);
  });

  it('I2 controller-routed default payload (no permissionMode) reaches buildTmuxArgs → 7-element argv unchanged', async () => {
    // KNOWN-regression: the controller must not inject a default
    // 'auto' mode where none was sent. Default behavior MUST be ask
    // (operator-arbitrated §7.2: 'ask' on first launch).
    const deps = recordingDeps();
    const ctrl = new SpawnIpcController(deps);
    const reply = await ctrl.handleSpawnRequest({
      repoPath: '/r',
      sessionName: 's',
    });
    expect(reply.type).toBe('success');
    expect(deps.tmuxNewSessionCalls).toHaveLength(1);
    const { args } = deps.tmuxNewSessionCalls[0];
    expect(args).toEqual([
      'new-session',
      '-d',
      '-s', 's',
      '-c', '/r',
      '/test/bin/claude',
    ]);
    expect(args).not.toContain('--dangerously-skip-permissions');
  });

  it('I3 controller-routed explicit ask-mode payload also produces 7-element argv', async () => {
    // KNOWN: explicit ask is byte-identical to omitted-mode at the
    // controller boundary. After GREEN, this is what the Phase 3 UI
    // toggle's "Ask" position will send when operator wants explicit
    // approval-mode.
    const deps = recordingDeps();
    const ctrl = new SpawnIpcController(deps);
    const reply = await ctrl.handleSpawnRequest({
      repoPath: '/r',
      sessionName: 's',
      permissionMode: 'ask',
    });
    expect(reply.type).toBe('success');
    const { args } = deps.tmuxNewSessionCalls[0];
    expect(args).not.toContain('--dangerously-skip-permissions');
    expect(args).toHaveLength(7);
  });
});
