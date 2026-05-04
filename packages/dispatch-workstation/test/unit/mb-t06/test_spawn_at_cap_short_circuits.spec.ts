// MB-T06 cluster 3 RED — at-cap spawn short-circuits before tmux/daemon.
//
// Asserts: when 5 sessions are active and cap is 5, spawnSession throws
// SessionCapExceededError BEFORE invoking runTmuxNewSession,
// runTmuxKillSession, or registerSession. No wasted tmux session
// creation, no orphaned daemon registration.

import { describe, it, expect } from 'vitest';
import { spawnSession, type SpawnHandlerDeps } from '../../../src/main/spawn-handler.js';
import {
  SessionCapExceededError,
  type SessionListClient,
} from '../../../src/main/session-cap.js';

function makeDeps(activeCount: number, cap: number): SpawnHandlerDeps & {
  tmuxCalls: number;
  killCalls: number;
  registerCalls: number;
} {
  let tmuxCalls = 0;
  let killCalls = 0;
  let registerCalls = 0;
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
    runTmuxNewSession: async () => {
      tmuxCalls += 1;
    },
    runTmuxKillSession: async () => {
      killCalls += 1;
    },
    registerSession: async (req) => {
      registerCalls += 1;
      return {
        name: req.name,
        cwd: req.cwd,
        tmux_target: req.tmux_target,
        handoff_path: `${req.cwd}/HANDOFF.md`,
        state: 'armed',
      };
    },
    sourceEnv: { HOME: '/h', USER: 'u' },
    apiKey: 'sk-ant-test',
    // cairn #72: stand-in absolute claude path; production wires via
    // resolveClaudeBin() at workstation startup.
    claudeBinPath: '/test/bin/claude',
    get tmuxCalls() {
      return tmuxCalls;
    },
    get killCalls() {
      return killCalls;
    },
    get registerCalls() {
      return registerCalls;
    },
  } as SpawnHandlerDeps & {
    tmuxCalls: number;
    killCalls: number;
    registerCalls: number;
  };
}

describe('MB-T06 cluster 3 — at-cap spawn short-circuits before any tmux/daemon work', () => {
  it('5 active === cap=5: throws SessionCapExceededError before tmux/daemon fire', async () => {
    const deps = makeDeps(5, 5);
    await expect(
      spawnSession({ repoPath: '/r', sessionName: 'sherpa' }, deps),
    ).rejects.toBeInstanceOf(SessionCapExceededError);
    // Pipeline did NOT run:
    expect(deps.tmuxCalls).toBe(0);
    expect(deps.killCalls).toBe(0);
    expect(deps.registerCalls).toBe(0);
  });
});
