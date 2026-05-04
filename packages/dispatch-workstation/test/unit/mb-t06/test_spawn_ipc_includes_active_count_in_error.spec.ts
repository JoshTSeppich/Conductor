// MB-T06 cluster 4 RED — IPC envelope carries activeCount + cap fields.
//
// Renderer-side display ("5 sessions active. Close one to spawn.")
// requires the cap-error envelope to include the activeCount + cap
// fields. The current SpawnErrorReply shape only carries error_type,
// message, sessionName, stderr — cluster 4 GREEN extends it with
// activeCount + cap (optional, present only for SessionCapExceeded).

import { describe, it, expect } from 'vitest';
import { SpawnIpcController } from '../../../src/main/spawn-ipc.js';
import type { SpawnHandlerDeps } from '../../../src/main/spawn-handler.js';
import type { SessionListClient } from '../../../src/main/session-cap.js';

function makeAtCapDeps(activeCount: number, cap: number): SpawnHandlerDeps {
  const client: SessionListClient = {
    async listSessions() {
      const sessions = Array.from({ length: activeCount }, (_, i) => ({
        name: `s${i}`,
        state: 'armed',
      }));
      return { sessions };
    },
  };
  return {
    sessionListClient: client,
    sessionCap: cap,
    runTmuxNewSession: async () => {},
    runTmuxKillSession: async () => {},
    // cairn #73: liveness check stub (no-op success).
    runTmuxHasSession: async () => {},
    registerSession: async (req) => ({
      name: req.name,
      cwd: req.cwd,
      tmux_target: req.tmux_target,
      handoff_path: `${req.cwd}/HANDOFF.md`,
      state: 'armed',
    }),
    sourceEnv: { HOME: '/h', USER: 'u' },
    apiKey: 'sk-ant-test',
    // cairn #72: stand-in absolute claude path.
    claudeBinPath: '/test/bin/claude',
    // cairn #73: 0ms delay keeps unit tests fast.
    livenessCheckDelayMs: 0,
  };
}

describe('MB-T06 cluster 4 — IPC envelope includes activeCount + cap', () => {
  it('SessionCapExceeded reply carries activeCount=5 + cap=5 for renderer display', async () => {
    const controller = new SpawnIpcController(makeAtCapDeps(5, 5));
    const reply = await controller.handleSpawnRequest({
      repoPath: '/r',
      sessionName: 'sherpa',
    });
    expect(reply.type).toBe('error');
    if (reply.type === 'error') {
      expect(reply.error.error_type).toBe('SessionCapExceeded');
      expect(reply.error.activeCount).toBe(5);
      expect(reply.error.cap).toBe(5);
    }
  });

  it('over-cap data-drift case (6 active, cap=5) reports activeCount=6 cap=5', async () => {
    const controller = new SpawnIpcController(makeAtCapDeps(6, 5));
    const reply = await controller.handleSpawnRequest({
      repoPath: '/r',
      sessionName: 'foo',
    });
    expect(reply.type).toBe('error');
    if (reply.type === 'error') {
      expect(reply.error.error_type).toBe('SessionCapExceeded');
      expect(reply.error.activeCount).toBe(6);
      expect(reply.error.cap).toBe(5);
    }
  });
});
