// MB-T05 cluster 4 — spawn-ipc handler integration.
//
// Replaces MB-T04's test-hook stdout-echo behavior with the real
// spawn pipeline. The handler:
//   1. Receives workstation:spawn-requested IPC payload {repoPath, sessionName}
//   2. Invokes spawnSession (cluster 2 + 3) which runs:
//      buildSpawnEnv → tmux new-session → daemon registration
//   3. Replies to the renderer with {type:'success', result} OR
//      {type:'error', error: {error_type, message, sessionName?}}
//
// Test approach mirrors CONSOLE-T02: a SpawnIpcController class is
// the unit-test seam. Electron IPC plumbing is wired in
// registerSpawnIpcHandlers; tests exercise the controller directly.

import { describe, it, expect, vi } from 'vitest';
import { SpawnIpcController } from '../../../src/main/spawn-ipc.js';
import type { SpawnHandlerDeps } from '../../../src/main/spawn-handler.js';

function makeRecordingDeps(overrides: Partial<SpawnHandlerDeps> = {}): SpawnHandlerDeps & {
  tmuxNewSessionCalls: { args: readonly string[] }[];
  tmuxKillCalls: string[];
  registerCalls: { name: string; cwd: string; tmux_target: string }[];
} {
  const tmuxNewSessionCalls: { args: readonly string[] }[] = [];
  const tmuxKillCalls: string[] = [];
  const registerCalls: { name: string; cwd: string; tmux_target: string }[] = [];
  return {
    tmuxNewSessionCalls,
    tmuxKillCalls,
    registerCalls,
    runTmuxNewSession: async (args) => {
      tmuxNewSessionCalls.push({ args });
    },
    runTmuxKillSession: async (name) => {
      tmuxKillCalls.push(name);
    },
    // cairn #73: liveness check stub (no-op success).
    runTmuxHasSession: async () => {},
    registerSession: async (req) => {
      registerCalls.push(req);
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
    // cairn #72: stand-in absolute path; production wiring resolves
    // via `which claude` at workstation startup.
    claudeBinPath: '/test/bin/claude',
    // cairn #73: 0ms delay keeps unit tests fast; production default 500ms.
    livenessCheckDelayMs: 0,
    ...overrides,
  };
}

describe('MB-T05 cluster 4 — spawn-ipc handler replaces test-hook', () => {
  it('P1 controller.handleSpawnRequest fires the full pipeline (env → tmux → daemon)', async () => {
    const deps = makeRecordingDeps();
    const controller = new SpawnIpcController(deps);
    const reply = await controller.handleSpawnRequest({
      repoPath: '/Users/test/code/foo',
      sessionName: 'sherpa',
    });
    // Pipeline ran:
    expect(deps.tmuxNewSessionCalls).toHaveLength(1);
    expect(deps.tmuxNewSessionCalls[0].args).toEqual([
      'new-session',
      '-d',
      '-s', 'sherpa',
      '-c', '/Users/test/code/foo',
      // cairn #72: tmux argv ends in absolute path, not literal 'claude'.
      '/test/bin/claude',
    ]);
    expect(deps.registerCalls).toHaveLength(1);
    expect(deps.registerCalls[0]).toEqual({
      name: 'sherpa',
      cwd: '/Users/test/code/foo',
      tmux_target: 'sherpa:0.0',
    });
    // Reply success shape:
    expect(reply.type).toBe('success');
    if (reply.type === 'success') {
      expect(reply.result).toEqual({
        sessionName: 'sherpa',
        sessionId: 'sherpa',
        panelMounted: false,
      });
    }
  });

  it('P2 successful spawn returns session to renderer via IPC reply (panelMounted=false)', async () => {
    const deps = makeRecordingDeps();
    const controller = new SpawnIpcController(deps);
    const reply = await controller.handleSpawnRequest({
      repoPath: '/r',
      sessionName: 'foo',
    });
    expect(reply).toEqual({
      type: 'success',
      result: { sessionName: 'foo', sessionId: 'foo', panelMounted: false },
    });
  });

  it('P3 SpawnFailed surfaces to renderer with typed error envelope', async () => {
    const deps = makeRecordingDeps({
      runTmuxNewSession: async () => {
        const e = new Error('tmux exec failed') as Error & { stderr?: string };
        e.stderr = 'tmux: bad target';
        throw e;
      },
    });
    const controller = new SpawnIpcController(deps);
    const reply = await controller.handleSpawnRequest({
      repoPath: '/r',
      sessionName: 'foo',
    });
    expect(reply.type).toBe('error');
    if (reply.type === 'error') {
      expect(reply.error.error_type).toBe('SpawnFailed');
      expect(reply.error.message).toContain('tmux');
      expect(reply.error.sessionName).toBe('foo');
    }
  });

  it('P4 SessionNameExists surfaces to renderer with typed error envelope', async () => {
    const deps = makeRecordingDeps({
      runTmuxNewSession: async () => {
        const e = new Error('duplicate session: sherpa') as Error & { stderr?: string };
        e.stderr = 'duplicate session: sherpa';
        throw e;
      },
    });
    const controller = new SpawnIpcController(deps);
    const reply = await controller.handleSpawnRequest({
      repoPath: '/r',
      sessionName: 'sherpa',
    });
    expect(reply.type).toBe('error');
    if (reply.type === 'error') {
      expect(reply.error.error_type).toBe('SessionNameExists');
      expect(reply.error.sessionName).toBe('sherpa');
    }
  });

  it('P5 DaemonUnreachable surfaces to renderer (and tmux is cleaned up)', async () => {
    const deps = makeRecordingDeps({
      registerSession: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    const controller = new SpawnIpcController(deps);
    const reply = await controller.handleSpawnRequest({
      repoPath: '/r',
      sessionName: 'foo',
    });
    expect(reply.type).toBe('error');
    if (reply.type === 'error') {
      expect(reply.error.error_type).toBe('DaemonUnreachable');
    }
    // Cleanup happened:
    expect(deps.tmuxKillCalls).toEqual(['foo']);
  });

  it('P6 the legacy MB_TEST_HOOKS=1 stdout-echo path is REMOVED', async () => {
    // MB-T04 RED relied on `process.stdout.write('SPAWN_REQUESTED ...')`
    // to assert IPC roundtrip. MB-T05 deletes that test-hook entirely
    // — the real handler does the work.
    process.env.MB_TEST_HOOKS = '1';
    const writes: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      // @ts-expect-error narrowing the overloaded write signature
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        writes.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
        return true;
      });
    try {
      const deps = makeRecordingDeps();
      const controller = new SpawnIpcController(deps);
      await controller.handleSpawnRequest({
        repoPath: '/r',
        sessionName: 'foo',
      });
      // No SPAWN_REQUESTED line emitted to stdout — that test-hook is gone.
      expect(writes.some((w) => w.includes('SPAWN_REQUESTED'))).toBe(false);
    } finally {
      stdoutSpy.mockRestore();
      delete process.env.MB_TEST_HOOKS;
      // Restore origWrite reference so we don't leak a mock binding.
      void origWrite;
    }
  });
});
