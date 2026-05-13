// MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW WB3 RED —
// probe: spawn-handler integrates with BypassPermsSource via
// optional `bypassPermsSource?: BypassPermsSource` field on
// SpawnHandlerDeps; calls source.recordSpawn(name, mode) after
// successful spawn-result construction.
//
// Round 11 §3.9 Wave 4 manifest-bound. Path matches manifest glob
// test/unit/main/probe-mbtwfbypass-*.spec.ts.
//
// Per ticket body §3.5 Sub-Q-E=(α) sync post-spawn-success
// integration cadence: spawn-handler invokes source.recordSpawn
// immediately after runTmuxNewSession + daemon registration
// succeed, BEFORE returning the SpawnSessionResult to the caller.
//
// Encoded contract (5 conditions, all RED at HEAD 469a5e1):
//   (1) Source-text: spawn-handler.ts declares
//       `bypassPermsSource?: BypassPermsSource` on SpawnHandlerDeps.
//   (2) When `bypassPermsSource` supplied with `permissionMode='auto'`,
//       source.recordSpawn(sessionName, 'auto') is called exactly
//       once after successful spawn-result.
//   (3) When `bypassPermsSource` supplied with `permissionMode='ask'`,
//       source.recordSpawn(sessionName, 'ask') is called exactly
//       once.
//   (4) When `bypassPermsSource` supplied with permissionMode
//       OMITTED, source.recordSpawn(sessionName, 'ask') is called
//       (default-when-omitted matches SpawnPermissionMode docstring
//       at spawn-handler.ts:88-91).
//   (5) When `bypassPermsSource` is OMITTED from deps, spawn-handler
//       proceeds normally (backward-compat; existing call sites
//       unaffected).
//
// Flips RED → GREEN at WB4 (spawn-handler MOD).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  spawnSession,
  type RegisteredSession,
  type SpawnHandlerDeps,
} from '../../../src/main/spawn-handler.js';
import {
  createBypassPermsSource,
  type BypassPermsMode,
} from '../../../src/main/bypass-perms-source.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const SPAWN_HANDLER_PATH = resolve(
  WORKSTATION_ROOT,
  'src/main/spawn-handler.ts',
);

function makeBaseDeps(): SpawnHandlerDeps {
  return {
    runTmuxNewSession: async () => {
      /* no-op */
    },
    runTmuxKillSession: async () => {
      /* no-op */
    },
    runTmuxHasSession: async () => {
      /* alive */
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

function makeRecordingSource(): {
  source: {
    recordSpawn(name: string, mode: BypassPermsMode): void;
    getActiveBypassCount(): number;
    onUpdate(cb: (count: number) => void): () => void;
  };
  calls: Array<{ name: string; mode: BypassPermsMode }>;
} {
  const calls: Array<{ name: string; mode: BypassPermsMode }> = [];
  const inner = createBypassPermsSource();
  return {
    source: {
      recordSpawn(name, mode): void {
        calls.push({ name, mode });
        inner.recordSpawn(name, mode);
      },
      getActiveBypassCount: inner.getActiveBypassCount,
      onUpdate: inner.onUpdate,
    },
    calls,
  };
}

describe('MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW WB3 RED — spawn-handler integration', () => {
  describe('Condition (1): SpawnHandlerDeps source-text declares bypassPermsSource? field', () => {
    it('spawn-handler.ts declares optional bypassPermsSource?: BypassPermsSource on SpawnHandlerDeps', () => {
      expect(existsSync(SPAWN_HANDLER_PATH)).toBe(true);
      const source = readFileSync(SPAWN_HANDLER_PATH, 'utf8');
      // Sentinel: field declaration with optional marker. Robust to
      // whitespace + TSDoc presence.
      expect(
        source,
        'spawn-handler.ts must declare optional `bypassPermsSource?: BypassPermsSource` on SpawnHandlerDeps (WB4 GREEN adds it)',
      ).toMatch(/bypassPermsSource\?\s*:\s*BypassPermsSource/);
    });
  });

  describe('Condition (2): recordSpawn(name, "auto") called on auto spawn', () => {
    it('source.recordSpawn invoked exactly once with auto mode after successful spawn', async () => {
      const { source, calls } = makeRecordingSource();
      const deps: SpawnHandlerDeps & {
        bypassPermsSource?: typeof source;
      } = { ...makeBaseDeps(), bypassPermsSource: source };
      await spawnSession(
        { repoPath: '/r', sessionName: 'auto-session', permissionMode: 'auto' },
        deps,
      );
      expect(calls).toEqual([{ name: 'auto-session', mode: 'auto' }]);
    });
  });

  describe('Condition (3): recordSpawn(name, "ask") called on ask spawn', () => {
    it('source.recordSpawn invoked exactly once with ask mode after successful spawn', async () => {
      const { source, calls } = makeRecordingSource();
      const deps: SpawnHandlerDeps & {
        bypassPermsSource?: typeof source;
      } = { ...makeBaseDeps(), bypassPermsSource: source };
      await spawnSession(
        { repoPath: '/r', sessionName: 'ask-session', permissionMode: 'ask' },
        deps,
      );
      expect(calls).toEqual([{ name: 'ask-session', mode: 'ask' }]);
    });
  });

  describe('Condition (4): permissionMode omitted defaults to ask', () => {
    it('source.recordSpawn invoked with mode="ask" when permissionMode omitted from request', async () => {
      const { source, calls } = makeRecordingSource();
      const deps: SpawnHandlerDeps & {
        bypassPermsSource?: typeof source;
      } = { ...makeBaseDeps(), bypassPermsSource: source };
      await spawnSession(
        { repoPath: '/r', sessionName: 'omitted-session' },
        deps,
      );
      expect(calls).toEqual([{ name: 'omitted-session', mode: 'ask' }]);
    });
  });

  describe('Condition (5): bypassPermsSource omitted → spawn proceeds normally (backward-compat)', () => {
    it('spawn-handler does not throw when bypassPermsSource is absent from deps', async () => {
      const deps: SpawnHandlerDeps = makeBaseDeps();
      const result = await spawnSession(
        { repoPath: '/r', sessionName: 'no-source-session', permissionMode: 'auto' },
        deps,
      );
      expect(result.sessionName).toBe('no-source-session');
      // spawnMode field already shipped at MB-F-TILEGRIDSESSIONENTRY-
      // SPAWNMODE-MISSING closure (a) (5328a97) — regression check.
      expect(result.spawnMode).toBe('auto');
    });
  });
});
