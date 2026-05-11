// MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX WB1 RED — crash-recovery routes
// through _prepareReservedName probe.
//
// Closes Tier 2 finding row MB-F-POOL-CRASH-RECOVERY-NOT-PATH-E-AWARE
// (surfaced at Phase D-2 LAUNCH-2 2026-05-11, filed at `9dc19eb`):
// pool's crash-recovery paths (_promote at hso-pool.ts:502-512 and
// _onStandbyCrash at hso-pool.ts:525-531) call _spawnAndRegister
// directly at lines 511 + 530, bypassing the fix01e Path-(E) GET-first
// state machine. Under tmux-killed-out-of-band baselines, this produces
// a cascade-halt loop on existing-armed rows (8 halts observed at
// D-2 LAUNCH-2 in ~45s).
//
// Path (E) closure pattern: replace `void this._spawnAndRegister
// (RESERVED_STANDBY)` with `void this._prepareReservedName
// (RESERVED_STANDBY)` at both call sites — same GET-first state-machine
// semantics inherited from fix01e (`deca210`).
//
// Asserts the 5 conditions per ticket §4 WB1:
//   (1) _onStandbyCrash routes via _prepareReservedName — invoking
//       stream-close-observer with __orchestrator_standby triggers
//       daemonSessionsClient.getSession(RESERVED_STANDBY); spawn-
//       Controller only via the 404 branch.
//   (2) Held-row path: GET returns state='held' → PATCH state='armed';
//       NO spawnController call.
//   (3) Killed-row path: GET returns state='killed' → halt with
//       operator-actionable message (mirrors fix01e killed-branch
//       message structure); NO spawnController call.
//   (4) _promote (via _onActiveCrash) — invoking close-observer with
//       __orchestrator_active triggers daemonSessionsClient.getSession
//       (RESERVED_STANDBY) for the new-standby-spawn path.
//   (5) Idempotency guard preserved — double invocation of the close-
//       observer with the same sessionName is no-op (existing
//       _activeCrashHandled / _standbyCrashHandled guards).
//
// RED today (HEAD `4ef624f` ticket-body authored; pre-WB2 GREEN):
// _promote line 511 + _onStandbyCrash line 530 call _spawnAndRegister
// (RESERVED_STANDBY) directly. daemonSessionsClient.getSession is
// NEVER invoked from the crash-recovery flow → assertions (1)-(4)
// fail on the daemon-mock-not-called branch. After WB2 GREEN, all
// 5 assertions pass.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OrchestratorPoolManager,
  RESERVED_ACTIVE,
  RESERVED_STANDBY,
  type OrchestratorPoolManagerDeps,
} from '../../../src/coarchitect/hso-pool.js';

type DaemonSessionState = 'armed' | 'paused' | 'held' | 'killed';
type StreamCloseObs = (sessionName: string) => void;

interface SetupCaptures {
  closeObs: StreamCloseObs | null;
}

function setup(): {
  pool: OrchestratorPoolManager;
  daemonSessionsClient: {
    getSession: ReturnType<typeof vi.fn>;
    patchSessionState: ReturnType<typeof vi.fn>;
  };
  spawnController: { handleSpawnRequest: ReturnType<typeof vi.fn> };
  tileRegistry: {
    addSession: ReturnType<typeof vi.fn>;
    removeSession: ReturnType<typeof vi.fn>;
    renameSession: ReturnType<typeof vi.fn>;
  };
  halt: ReturnType<typeof vi.fn>;
  captures: SetupCaptures;
} {
  const captures: SetupCaptures = { closeObs: null };

  const daemonSessionsClient = {
    // Default behavior during start(): null (404). After start(), tests
    // reconfigure via mockResolvedValue per crash-recovery scenario.
    getSession: vi.fn(async (_name: string) => null),
    patchSessionState: vi.fn(async () => undefined),
  };

  const spawnController = {
    handleSpawnRequest: vi.fn(async (payload: { sessionName: string }) => ({
      type: 'success' as const,
      result: { sessionName: payload.sessionName },
    })),
  };

  const tileRegistry = {
    addSession: vi.fn(),
    removeSession: vi.fn(),
    renameSession: vi.fn(),
  };

  const consoleIpc = {
    addStdoutObserver: vi.fn(() => () => undefined),
    addStreamCloseObserver: vi.fn((fn: StreamCloseObs) => {
      captures.closeObs = fn;
      return () => undefined;
    }),
    handleSendStdin: vi.fn(async () => undefined),
  };

  const halt = vi.fn();

  const deps = {
    spawnController,
    tileRegistry,
    consoleIpc,
    stateWriter: {},
    orchestratorSystemPromptPath: '/tmp/test-orch.md',
    runTmuxHasSession: vi.fn(async () => undefined),
    dispatchModeReader: vi.fn(() => 'auto' as const),
    halt,
    daemonSessionsClient,
  } as unknown as OrchestratorPoolManagerDeps;

  const pool = new OrchestratorPoolManager(deps);
  return {
    pool,
    daemonSessionsClient,
    spawnController,
    tileRegistry,
    halt,
    captures,
  };
}

/**
 * Drain the microtask + immediate queue so fire-and-forget async work
 * inside crash-recovery (`void this._prepareReservedName(...)` post-fix
 * OR `void this._spawnAndRegister(...)` pre-fix) has a chance to invoke
 * its awaited mocks before assertions run. Two-pass setImmediate is the
 * cheapest+most-portable pattern.
 */
async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX — crash-recovery routes through _prepareReservedName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('(1) _onStandbyCrash routes via _prepareReservedName state machine', () => {
    it('standby close-observer with 404 GET → daemonClient.getSession(standby) invoked; spawnController called via 404 branch', async () => {
      const { pool, daemonSessionsClient, spawnController, captures } =
        setup();
      await pool.start();
      // start() consumed initial getSession calls for both reserved names
      // (first-launch null/404 baseline). Clear mocks + reconfigure for
      // the crash-recovery scenario under test.
      vi.clearAllMocks();
      daemonSessionsClient.getSession.mockResolvedValue(null);

      expect(captures.closeObs).not.toBeNull();
      captures.closeObs!(RESERVED_STANDBY);
      await flushAsync();

      expect(
        daemonSessionsClient.getSession,
        'crash-recovery must route through Path (E) GET-first state machine for RESERVED_STANDBY',
      ).toHaveBeenCalledWith(RESERVED_STANDBY);
      expect(
        spawnController.handleSpawnRequest,
        '404 branch of _prepareReservedName calls spawnController for first-launch path',
      ).toHaveBeenCalledWith(
        expect.objectContaining({ sessionName: RESERVED_STANDBY }),
      );
    });

    it('standby close-observer with state=held GET → PATCH state=armed; spawnController NOT called', async () => {
      const { pool, daemonSessionsClient, spawnController, captures } =
        setup();
      await pool.start();
      vi.clearAllMocks();
      daemonSessionsClient.getSession.mockResolvedValue({
        state: 'held' as DaemonSessionState,
      });

      expect(captures.closeObs).not.toBeNull();
      captures.closeObs!(RESERVED_STANDBY);
      await flushAsync();

      expect(
        daemonSessionsClient.getSession,
        'crash-recovery must GET standby state before deciding action',
      ).toHaveBeenCalledWith(RESERVED_STANDBY);
      expect(
        daemonSessionsClient.patchSessionState,
        'held-branch must PATCH standby state=armed (per fix01e _prepareReservedName held-branch)',
      ).toHaveBeenCalledWith(RESERVED_STANDBY, 'armed');
      expect(
        spawnController.handleSpawnRequest,
        'held-branch MUST NOT call spawnController (avoids daemon Blocker 3 409 on existing row)',
      ).not.toHaveBeenCalled();
    });

    it('standby close-observer with state=killed GET → halt with operator-actionable message; spawnController NOT called', async () => {
      const { pool, daemonSessionsClient, spawnController, halt, captures } =
        setup();
      await pool.start();
      vi.clearAllMocks();
      daemonSessionsClient.getSession.mockResolvedValue({
        state: 'killed' as DaemonSessionState,
      });

      expect(captures.closeObs).not.toBeNull();
      captures.closeObs!(RESERVED_STANDBY);
      await flushAsync();

      expect(
        daemonSessionsClient.getSession,
        'crash-recovery must GET standby state before halt decision',
      ).toHaveBeenCalledWith(RESERVED_STANDBY);
      expect(halt, 'killed-branch must trigger halt-and-surface').toHaveBeenCalled();
      const haltMessages = halt.mock.calls.map((c: unknown[]) => String(c[0]));
      const actionableKilled = haltMessages.find(
        (m) =>
          m.includes(RESERVED_STANDBY) &&
          m.toLowerCase().includes('killed') &&
          (m.includes('sessions.json') || m.includes('daemon')),
      );
      expect(
        actionableKilled,
        `killed-state halt must include operator-actionable remediation; got: ${JSON.stringify(haltMessages)}`,
      ).toBeDefined();
      expect(
        spawnController.handleSpawnRequest,
        'killed-branch MUST NOT call spawnController (terminal state per transitions.ts:101)',
      ).not.toHaveBeenCalled();
    });
  });

  describe('(2) _promote (via _onActiveCrash) routes through _prepareReservedName for new-standby spawn', () => {
    it('active close-observer triggers _promote → _prepareReservedName(RESERVED_STANDBY) for new-standby flow', async () => {
      const { pool, daemonSessionsClient, captures } = setup();
      await pool.start();
      vi.clearAllMocks();
      daemonSessionsClient.getSession.mockResolvedValue(null);

      expect(captures.closeObs).not.toBeNull();
      captures.closeObs!(RESERVED_ACTIVE);
      await flushAsync();

      // _onActiveCrash → _promote → (post-WB2-GREEN) _prepareReservedName(
      // RESERVED_STANDBY). The load-bearing assertion is that daemon
      // GET(standby) fires from the promotion path, not direct POST.
      expect(
        daemonSessionsClient.getSession,
        '_promote must route new-standby spawn through Path (E) GET-first (NOT direct _spawnAndRegister)',
      ).toHaveBeenCalledWith(RESERVED_STANDBY);
    });
  });

  describe('(3) idempotency guards preserved', () => {
    it('double invocation of standby close-observer = single crash-recovery (_standbyCrashHandled guard)', async () => {
      const { pool, daemonSessionsClient, captures } = setup();
      await pool.start();
      vi.clearAllMocks();
      daemonSessionsClient.getSession.mockResolvedValue(null);

      expect(captures.closeObs).not.toBeNull();
      captures.closeObs!(RESERVED_STANDBY);
      // Second invocation MUST be no-op per existing _standbyCrashHandled
      // guard at hso-pool.ts:526 (`if (this._standbyCrashHandled) return;`).
      captures.closeObs!(RESERVED_STANDBY);
      await flushAsync();

      const standbyGetCalls = daemonSessionsClient.getSession.mock.calls.filter(
        (c: unknown[]) => c[0] === RESERVED_STANDBY,
      );
      expect(
        standbyGetCalls,
        '_standbyCrashHandled guard must produce exactly 1 crash-recovery cycle for repeated close-observer invocations',
      ).toHaveLength(1);
    });
  });
});
