// MB-T06 cluster 3 RED — under-cap spawn proceeds normally.
//
// Asserts: when 3 sessions are active and cap is 5, spawnSession runs
// the full MB-T05 pipeline (tmux + daemon registration). Cap check
// silently passes; no SessionCapExceeded error surfaces.

import { describe, it, expect } from 'vitest';
import { spawnSession, type SpawnHandlerDeps } from '../../../src/main/spawn-handler.js';
import type { SessionListClient } from '../../../src/main/session-cap.js';

function makeDeps(activeCount: number, cap: number): SpawnHandlerDeps & {
  tmuxCalls: number;
  registerCalls: number;
  listCalls: number;
} {
  let tmuxCalls = 0;
  let registerCalls = 0;
  let listCalls = 0;
  const client: SessionListClient = {
    async listSessions() {
      listCalls += 1;
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
    runTmuxKillSession: async () => {},
    // cairn #73: liveness check stub (no-op success).
    runTmuxHasSession: async () => {},
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
    // cairn #73: 0ms delay keeps unit tests fast.
    livenessCheckDelayMs: 0,
    get tmuxCalls() {
      return tmuxCalls;
    },
    get registerCalls() {
      return registerCalls;
    },
    get listCalls() {
      return listCalls;
    },
  } as SpawnHandlerDeps & { tmuxCalls: number; registerCalls: number; listCalls: number };
}

describe('MB-T06 cluster 3 — under-cap spawn proceeds normally', () => {
  it('3 active < cap=5: cap check passes, MB-T05 pipeline runs end-to-end', async () => {
    const deps = makeDeps(3, 5);
    const result = await spawnSession(
      { repoPath: '/r', sessionName: 'sherpa' },
      deps,
    );
    expect(deps.listCalls).toBe(1);
    expect(deps.tmuxCalls).toBe(1);
    expect(deps.registerCalls).toBe(1);
    expect(result.sessionName).toBe('sherpa');
  });
});
