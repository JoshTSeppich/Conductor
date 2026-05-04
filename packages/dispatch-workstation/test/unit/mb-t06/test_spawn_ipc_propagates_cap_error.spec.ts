// MB-T06 cluster 4 RED — IPC handler propagates SessionCapExceeded.
//
// SpawnIpcController.handleSpawnRequest catches the cluster 3 thrown
// SessionCapExceededError and surfaces it via the SpawnErrorReply
// envelope so the renderer can render a "session cap reached" modal
// instead of treating the spawn as a generic failure.

import { describe, it, expect } from 'vitest';
import { SpawnIpcController } from '../../../src/main/spawn-ipc.js';
import type { SpawnHandlerDeps } from '../../../src/main/spawn-handler.js';
import type { SessionListClient } from '../../../src/main/session-cap.js';

function makeAtCapDeps(): SpawnHandlerDeps {
  const client: SessionListClient = {
    async listSessions() {
      // 5 active === cap=5 → at-cap.
      const sessions = Array.from({ length: 5 }, (_, i) => ({
        name: `s${i}`,
        state: 'armed',
      }));
      return { sessions };
    },
  };
  return {
    sessionListClient: client,
    sessionCap: 5,
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

describe('MB-T06 cluster 4 — IPC handler propagates SessionCapExceeded', () => {
  it('at-cap spawn surfaces error envelope with type=SessionCapExceeded + human-readable message', async () => {
    const controller = new SpawnIpcController(makeAtCapDeps());
    const reply = await controller.handleSpawnRequest({
      repoPath: '/r',
      sessionName: 'sherpa',
    });
    expect(reply.type).toBe('error');
    if (reply.type === 'error') {
      expect(reply.error.error_type).toBe('SessionCapExceeded');
      expect(reply.error.message).toMatch(/Session cap \(5\) reached/);
      expect(reply.error.sessionName).toBe('sherpa');
    }
  });
});
