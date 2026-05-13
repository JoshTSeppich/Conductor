// MB-T-PHASE-4-T8-SIBLING-EXEC WB1 RED — spawn-handler.ts extension contract.
//
// Build-doc §4 WB1: asserts `spawnSession()` returns a SpawnSessionResult
// envelope carrying the Cluster A extension fields (`model?`, `spawnedAtMs`)
// populated via `populateSpawnSessionResultExtensions` (Cluster A populator
// at `src/main/spawn-session-result-extensions.ts`).
//
// Conditions (per build-doc §4):
//   01a: spawnedAtMs populated from deps.nowMs (test-injected determinism)
//   01b: model populated from deps.model (test-injected)
//   01c: backward-compat — omitting both deps still yields a result whose
//        spawnedAtMs is a finite number (Date.now() fallback) and model is
//        undefined (no env CLAUDE_DEFAULT_MODEL set in test env)
//
// RED state at HEAD `414ed80`:
//   SpawnSessionResult declares `sessionName, sessionId, panelMounted, cwd,
//   spawnMode?` — NO `model` or `spawnedAtMs`. Access to either yields
//   undefined; conditions 01a + 01b fail at the strict-value assertion;
//   condition 01c fails at the `typeof spawnedAtMs === 'number'` guard.
//
// WB2 GREEN: extend SpawnSessionResult + SpawnHandlerDeps; call
// populateSpawnSessionResultExtensions at return site; spread fields.

import { describe, it, expect } from 'vitest';
import {
  spawnSession,
  type SpawnHandlerDeps,
  type SpawnSessionRequest,
  type SpawnSessionResult,
} from '../../../src/main/spawn-handler.js';

// Type-level shape the probe asserts post-WB2. Declared locally to keep
// the probe compilable at RED (when SpawnSessionResult lacks these
// fields) — narrows via `as unknown as` cast at the assertion site.
interface ExtensionFieldsShape {
  readonly spawnedAtMs?: number;
  readonly model?: string;
}

function buildMinimalDeps(
  overrides: Partial<SpawnHandlerDeps> = {},
): SpawnHandlerDeps {
  return {
    runTmuxNewSession: async () => undefined,
    runTmuxKillSession: async () => undefined,
    runTmuxHasSession: async () => undefined,
    registerSession: async (req) => ({
      name: req.name,
      cwd: req.cwd,
      tmux_target: req.tmux_target,
      handoff_path: `/tmp/handoff/${req.name}`,
      state: 'open',
    }),
    sourceEnv: {},
    apiKey: 'test-api-key',
    claudeBinPath: '/usr/bin/claude',
    livenessCheckDelayMs: 0,
    ...overrides,
  };
}

const baseRequest: SpawnSessionRequest = {
  repoPath: '/tmp/test-repo',
  sessionName: 'test-session-foo',
};

describe('spawn-handler MB-T-PHASE-4-T8-SIBLING-EXEC extensions', () => {
  it('01a: SpawnSessionResult.spawnedAtMs populated from injected deps.nowMs', async () => {
    const FIXED_NOW = 1_700_000_000_000;
    const result: SpawnSessionResult = await spawnSession(
      baseRequest,
      buildMinimalDeps({ nowMs: FIXED_NOW } as Partial<SpawnHandlerDeps>),
    );
    const ext = result as unknown as ExtensionFieldsShape;
    expect(ext.spawnedAtMs).toBe(FIXED_NOW);
  });

  it('01b: SpawnSessionResult.model populated from injected deps.model', async () => {
    const MODEL_ID = 'claude-opus-4-7';
    const result: SpawnSessionResult = await spawnSession(
      baseRequest,
      buildMinimalDeps({ model: MODEL_ID } as Partial<SpawnHandlerDeps>),
    );
    const ext = result as unknown as ExtensionFieldsShape;
    expect(ext.model).toBe(MODEL_ID);
  });

  it('01c: backward-compat — omitting deps yields a SpawnSessionResult whose spawnedAtMs is a finite number and model is undefined (no env fallback)', async () => {
    const before = Date.now();
    const result: SpawnSessionResult = await spawnSession(
      baseRequest,
      buildMinimalDeps(),
    );
    const after = Date.now();
    const ext = result as unknown as ExtensionFieldsShape;
    expect(typeof ext.spawnedAtMs).toBe('number');
    expect(Number.isFinite(ext.spawnedAtMs)).toBe(true);
    expect(ext.spawnedAtMs!).toBeGreaterThanOrEqual(before);
    expect(ext.spawnedAtMs!).toBeLessThanOrEqual(after);
    // CLAUDE_DEFAULT_MODEL is not set in the test env, so model defaults
    // to undefined per populator contract (Cluster A
    // spawn-session-result-extensions.ts:56-58).
    expect(ext.model).toBeUndefined();
  });
});
