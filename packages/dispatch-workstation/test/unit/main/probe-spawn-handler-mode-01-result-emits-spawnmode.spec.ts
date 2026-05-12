// MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING closure (a) — WB2 RED.
//
// Contract spec: `SpawnSessionResult` (packages/dispatch-workstation/src/
// main/spawn-handler.ts :190-208) gains an optional `spawnMode: 'auto' |
// 'ask'` field that is populated by `spawnSession()` from
// `req.permissionMode ?? 'ask'`. This is the source-of-truth for the
// renderer's downstream session-entry plumbing — FrameCRoot's
// onSpawnResult subscription reads `reply.result.spawnMode` at WB3 and
// writes it into the appended `TileGridSessionEntry.spawnMode`
// (TileGridSessionEntry field added at WB1 GREEN, commit 228a2da).
//
// Vocabulary: 'auto' | 'ask' mirrors SpawnPermissionMode in
// spawn-handler.ts:91 verbatim. The default-when-omitted is 'ask' to
// match the docstring at spawn-handler.ts:88-91 — "Field is optional;
// omitted ⇒ 'ask' (operator-arbitrated §7.2: 'ask' on first launch;
// operator opts INTO 'auto' consciously)."
//
// RED state: at HEAD pre-WB2-GREEN, SpawnSessionResult has 4 fields
// (sessionName, sessionId, panelMounted, cwd) — no spawnMode. The
// spawnSession() return statement at spawn-handler.ts :400-405 does
// not populate spawnMode. Therefore:
//   - TypeScript: `result.spawnMode` is a property access on a type
//     without that property → TS error, suppressed by
//     `@ts-expect-error WB2 RED:`.
//   - Runtime: `result['spawnMode']` is `undefined` → all 3 assertions
//     comparing to 'auto'/'ask' FAIL.
//
// GREEN flip: spawn-handler.ts adds `spawnMode?: 'auto' | 'ask'` to
// SpawnSessionResult + `spawnMode: req.permissionMode ?? 'ask'` in the
// spawnSession() return literal → @ts-expect-error becomes unused →
// removing the annotations + the runtime cast yields a passing probe.

import { describe, it, expect } from 'vitest';
import {
  spawnSession,
  type RegisteredSession,
  type SpawnHandlerDeps,
  type SpawnPermissionMode,
} from '../../../src/main/spawn-handler.js';

function makeDeps(): SpawnHandlerDeps & {
  tmuxNewSessionCalls: { args: readonly string[] }[];
} {
  const tmuxNewSessionCalls: { args: readonly string[] }[] = [];
  return {
    tmuxNewSessionCalls,
    runTmuxNewSession: async (args) => {
      tmuxNewSessionCalls.push({ args });
    },
    runTmuxKillSession: async () => {
      /* no-op */
    },
    runTmuxHasSession: async () => {
      /* alive — resolve void */
    },
    registerSession: async (req): Promise<RegisteredSession> => ({
      name: req.name,
      cwd: req.cwd,
      tmux_target: req.tmux_target,
      handoff_path: `${req.cwd}/HANDOFF.md`,
      state: 'armed',
    }),
    sourceEnv: { HOME: '/Users/test', USER: 'test' },
    apiKey: 'sk-ant-test',
    claudeBinPath: '/usr/local/bin/claude',
    livenessCheckDelayMs: 0,
  };
}

describe('MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING (a) — WB2 spawn-handler plumbing', () => {
  it('result.spawnMode === "auto" when req.permissionMode === "auto"', async () => {
    const deps = makeDeps();
    const result = await spawnSession(
      { repoPath: '/r', sessionName: 's-auto', permissionMode: 'auto' },
      deps,
    );
    expect(result.spawnMode).toBe('auto');
  });

  it('result.spawnMode === "ask" when req.permissionMode === "ask"', async () => {
    const deps = makeDeps();
    const result = await spawnSession(
      { repoPath: '/r', sessionName: 's-ask', permissionMode: 'ask' },
      deps,
    );
    expect(result.spawnMode).toBe('ask');
  });

  it('result.spawnMode === "ask" when req.permissionMode is omitted (default per docstring §7.2)', async () => {
    const deps = makeDeps();
    const result = await spawnSession(
      { repoPath: '/r', sessionName: 's-default' },
      deps,
    );
    expect(result.spawnMode).toBe('ask');
  });

  it('SpawnPermissionMode union shape verified — type-level guard for WB2 contract', () => {
    // The renderer-side TileGridSessionEntry.spawnMode (WB1 228a2da) is
    // typed `'auto' | 'ask'`. This assertion ensures the spawn-handler
    // source-of-truth union remains compatible (assignability sanity).
    const auto: SpawnPermissionMode = 'auto';
    const ask: SpawnPermissionMode = 'ask';
    expect(auto).toBe('auto');
    expect(ask).toBe('ask');
  });
});
