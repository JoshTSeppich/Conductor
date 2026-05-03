// MB-T06 cluster 3 RED — cap check fires before env construction.
//
// Per ticket spec ordering invariant: capacity check happens BEFORE
// buildSpawnEnv, BEFORE tmux invocation, BEFORE daemon registration. The
// purpose is "no wasted work on cap violation" — the most expensive
// operation in the pipeline (tmux process spawn) is gated behind the
// cheapest check (a single GET /v2/sessions read).
//
// We assert ordering by recording every dep-call into a shared sequence
// array. The first entry MUST be 'listSessions'.

import { describe, it, expect } from 'vitest';
import { spawnSession, type SpawnHandlerDeps } from '../../../src/main/spawn-handler.js';
import type { SessionListClient } from '../../../src/main/session-cap.js';

describe('MB-T06 cluster 3 — capacity check fires before env build / tmux / daemon', () => {
  it('listSessions is the first dep-call in the spawn pipeline', async () => {
    const calls: string[] = [];
    const client: SessionListClient = {
      async listSessions() {
        calls.push('listSessions');
        return { sessions: [{ name: 'a', state: 'armed' }] };
      },
    };
    const deps: SpawnHandlerDeps = {
      sessionListClient: client,
      sessionCap: 5,
      runTmuxNewSession: async () => {
        calls.push('runTmuxNewSession');
      },
      runTmuxKillSession: async () => {
        calls.push('runTmuxKillSession');
      },
      registerSession: async (req) => {
        calls.push('registerSession');
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
    };

    await spawnSession({ repoPath: '/r', sessionName: 'sherpa' }, deps);

    // listSessions MUST be first; the pipeline order is:
    //   listSessions → buildSpawnEnv (pure, no dep call) → runTmuxNewSession → registerSession.
    expect(calls[0]).toBe('listSessions');
    expect(calls).toEqual(['listSessions', 'runTmuxNewSession', 'registerSession']);
  });
});
