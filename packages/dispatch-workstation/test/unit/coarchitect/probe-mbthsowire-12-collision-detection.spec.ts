// MB-T-HSO-WIRE WB12 (red) — __orchestrator_active collision-with-manual-spawn
// detection probe (Path β: spawn-side error-mapping per Q-WB12-1 ack 2026-05-11).
//
// Asserts the WB13 contract: when operator manual `tmux new-session -s
// __orchestrator_active` exists before workstation startup, the daemon
// responds to pool's spawn request with 409 → spawn-handler returns
// `{type: 'error', error: {error_type: 'SessionAlreadyRegistered', ...}}`
// → pool MUST halt with a SPECIFIC operator-actionable message and MUST
// NOT retry or overwrite.
//
// Path β rationale (Q-WB12-1 = β):
//   - T3's WB11 commit a02ddae explicitly framed WB12/WB13 as "tighten
//     user surface" (existing 409 detection placeholder, not new mechanism).
//   - spawn-handler.ts:33-38 + :270 confirm SessionAlreadyRegistered is
//     already a known error_type returned from a 409 daemon response; the
//     spawn-side already cleans up the partial tmux session per :270.
//   - Path β minimizes scope (single-file hso-pool.ts modification at
//     WB13; no main.ts touch; no new dep on HttpDaemonClient). Pre-flight
//     HTTP path (Path α) deferred to optional Tier 3 followup
//     MB-F-HSO-POOL-COLLISION-PRE-FLIGHT-HTTP-CHECK if operator wants
//     stricter UX post-MB-T-HSO-WIRE.
//
// WB13 contract encoded by this probe:
//   (1) `spawnController.handleSpawnRequest` is called EXACTLY ONCE per
//       _spawnAndRegister call; pool does NOT retry on error (preserves
//       T3-WB11 anti-pattern guard).
//   (2) `tileRegistry.addSession` is NOT called when spawn returns an
//       error (no overwrite of daemon-authoritative state).
//   (3) `halt` is called with a message containing both
//       "Manual __orchestrator_active session exists" AND
//       "Kill the manual session OR disable pool auto-spawn"
//       when result.error.error_type === 'SessionAlreadyRegistered'.
//       Current generic message at hso-pool.ts:165-169 does NOT contain
//       these phrases → RED. WB13 GREEN updates the error path to emit
//       the actionable message on the SessionAlreadyRegistered branch.
//   (4) Generic (non-SessionAlreadyRegistered) error_types preserve the
//       current generic halt-message behavior — no regression for other
//       spawn failure modes.
//
// RED state today: assertion (3) fails because pool emits the current
// generic `OrchestratorPoolManager: spawn failed for ... : ...` message.
// Assertions (1), (2), (4) already pass at HEAD a02ddae — they encode
// the WB13 contract preservation invariants that WB13 must not break.

import { describe, it, expect, vi } from 'vitest';
import {
  OrchestratorPoolManager,
  type OrchestratorPoolManagerDeps,
} from '../../../src/coarchitect/hso-pool.js';

// ─────────────────────────────────────────────────────────────────────────────
// Stub helpers — minimal shape for _spawnAndRegister code path.
// Other dep methods (consoleIpc.addStdoutObserver, addStreamCloseObserver,
// runTmuxHasSession, dispatchModeReader, stateWriter) are wired but not
// invoked by _spawnAndRegister itself, so cheap stubs suffice.
// ─────────────────────────────────────────────────────────────────────────────

type SpawnResult =
  | {
      type: 'success';
      sessionName: string;
      sessionId: string;
      panelMounted: boolean;
      cwd: string;
    }
  | {
      type: 'error';
      error: { error_type: string; message: string };
    };

function makeDeps(
  spawnResult: SpawnResult,
  haltMock: ReturnType<typeof vi.fn>,
  addSessionMock: ReturnType<typeof vi.fn>,
  handleSpawnRequestMock: ReturnType<typeof vi.fn>,
): OrchestratorPoolManagerDeps {
  handleSpawnRequestMock.mockImplementation(async () => spawnResult);
  return {
    spawnController: {
      handleSpawnRequest: handleSpawnRequestMock,
    } as unknown as OrchestratorPoolManagerDeps['spawnController'],
    tileRegistry: {
      addSession: addSessionMock,
      removeSession: vi.fn(),
      renameSession: vi.fn(),
    },
    consoleIpc: {
      addStdoutObserver: vi.fn(() => () => undefined),
      addStreamCloseObserver: vi.fn(() => () => undefined),
    } as unknown as OrchestratorPoolManagerDeps['consoleIpc'],
    stateWriter: {} as OrchestratorPoolManagerDeps['stateWriter'],
    orchestratorSystemPromptPath: '/stub/orchestrator.md',
    runTmuxHasSession: vi.fn(async () => undefined),
    dispatchModeReader: () => 'auto',
    halt: haltMock,
  };
}

type Internal = { _spawnAndRegister: (sessionName: string) => Promise<void> };

const COLLISION_RESULT: SpawnResult = {
  type: 'error',
  error: {
    error_type: 'SessionAlreadyRegistered',
    message: 'tmux session __orchestrator_active already exists',
  },
};

const GENERIC_ERROR_RESULT: SpawnResult = {
  type: 'error',
  error: {
    error_type: 'DaemonUnreachable',
    message: 'daemon connection refused',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T-HSO-WIRE WB12 — collision detection on SessionAlreadyRegistered', () => {
  it('(3) halt is called with actionable manual-collision message (RED until WB13)', async () => {
    const halt = vi.fn();
    const addSession = vi.fn();
    const handleSpawnRequest = vi.fn();
    const deps = makeDeps(COLLISION_RESULT, halt, addSession, handleSpawnRequest);
    const pool = new OrchestratorPoolManager(deps);

    await (pool as unknown as Internal)._spawnAndRegister('__orchestrator_active');

    expect(halt).toHaveBeenCalledTimes(1);
    const haltMessage = halt.mock.calls[0]![0] as string;
    // Specific actionable phrasing per dispatch §COMMIT 2:
    //   "Manual __orchestrator_active session exists; pool cannot auto-spawn.
    //    Kill the manual session OR disable pool auto-spawn."
    expect(haltMessage).toMatch(/Manual __orchestrator_active session exists/);
    expect(haltMessage).toMatch(/Kill the manual session OR disable pool auto-spawn/);
  });

  it('(1) spawnController.handleSpawnRequest is called EXACTLY ONCE — no retry', async () => {
    const halt = vi.fn();
    const addSession = vi.fn();
    const handleSpawnRequest = vi.fn();
    const deps = makeDeps(COLLISION_RESULT, halt, addSession, handleSpawnRequest);
    const pool = new OrchestratorPoolManager(deps);

    await (pool as unknown as Internal)._spawnAndRegister('__orchestrator_active');

    expect(handleSpawnRequest).toHaveBeenCalledTimes(1);
  });

  it('(2) tileRegistry.addSession is NOT called — no overwrite of daemon-authoritative state', async () => {
    const halt = vi.fn();
    const addSession = vi.fn();
    const handleSpawnRequest = vi.fn();
    const deps = makeDeps(COLLISION_RESULT, halt, addSession, handleSpawnRequest);
    const pool = new OrchestratorPoolManager(deps);

    await (pool as unknown as Internal)._spawnAndRegister('__orchestrator_active');

    expect(addSession).not.toHaveBeenCalled();
  });
});

describe('MB-T-HSO-WIRE WB12 — fall-through: non-SessionAlreadyRegistered errors preserve generic halt', () => {
  it('(4) generic spawn error (e.g., DaemonUnreachable) uses the existing generic halt-message format', async () => {
    const halt = vi.fn();
    const addSession = vi.fn();
    const handleSpawnRequest = vi.fn();
    const deps = makeDeps(GENERIC_ERROR_RESULT, halt, addSession, handleSpawnRequest);
    const pool = new OrchestratorPoolManager(deps);

    await (pool as unknown as Internal)._spawnAndRegister('__orchestrator_active');

    expect(halt).toHaveBeenCalledTimes(1);
    const haltMessage = halt.mock.calls[0]![0] as string;
    // Generic pre-WB13 format: `OrchestratorPoolManager: spawn failed for ... : ...`
    // WB13 must NOT touch this fall-through path.
    expect(haltMessage).toMatch(/spawn failed for __orchestrator_active/);
    expect(haltMessage).toMatch(/daemon connection refused/);
    // And must NOT pollute the generic path with the collision-specific phrasing.
    expect(haltMessage).not.toMatch(/Manual __orchestrator_active session exists/);
  });
});
