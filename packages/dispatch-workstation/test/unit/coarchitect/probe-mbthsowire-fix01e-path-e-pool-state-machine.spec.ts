// MB-T-HSO-WIRE fix01e RED — Path (E) pool state machine probe.
//
// Path (E) operator-arbitrated 2026-05-11 closure for `MB-F-POOL-FALSE-
// POSITIVE-COLLISION-ON-STALE-KILLED-REGISTRATION` (Tier 1 ship-gate
// blocker surfaced at dogfood Phase D-1, commit 7c175f0).
//
// Path (E) aligns pool behavior with daemon design intent (sessions.ts:155
// Blocker 3 + transitions.ts:101 `killed: []` terminal-state). Reserved
// orchestrator names are de-facto permanent registrations; teardown
// PATCHes to 'held' (valid transition + tmux Ctrl+C side effect leaves
// the session detached but alive) instead of 'killed' (terminal +
// permanent name retirement). Startup queries existing rows via GET and
// branches on state instead of unconditionally POSTing.
//
// Asserts the 5 conditions per dispatch 2026-05-11:
//   (1) Pool teardown (stop/dispose) PATCHes reserved-name rows to
//       state='held' — NOT 'killed'.
//   (2) Pool start() on FIRST launch (GET returns null/404 for both
//       reserved names): POST via spawnController to create fresh rows.
//   (3) Pool start() on SUBSEQUENT launch (rows exist at state='held'
//       or 'armed'): GET checks state; PATCH to 'armed' if 'held';
//       PROCEED with tmux spawn (no POST collision).
//   (4) Pool start() on SUBSEQUENT launch (rows in TERMINAL 'killed'):
//       HALT-and-surface with operator-actionable message specifying
//       remediation (registry-v2.json edit OR daemon restart).
//   (5) Pool MUST NOT call POST /v2/sessions (i.e., spawnController.
//       handleSpawnRequest) when GET returns an existing row regardless
//       of state — avoids the daemon's Blocker 3 contradiction.
//
// RED today (commit 7c175f0, before fix01e GREEN): pool's start() calls
// spawnController.handleSpawnRequest unconditionally for both reserved
// names (hso-pool.ts:127-128) — no GET-first flow. pool's stop() at
// hso-pool.ts:132-139 disposes observers + clears poll timer but makes
// zero HTTP calls — no PATCH-to-held. After fix01e GREEN: daemonSessions
// Client dep is added; start() iterates reserved names via GET; stop()
// PATCHes to 'held'.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OrchestratorPoolManager,
  RESERVED_ACTIVE,
  RESERVED_STANDBY,
  type OrchestratorPoolManagerDeps,
} from '../../../src/coarchitect/hso-pool.js';

// State enum mirrors dispatch-core/src/v2/schema.ts:32 StateEnum.
type DaemonSessionState = 'armed' | 'paused' | 'held' | 'killed';

interface MockGetResult {
  readonly state: DaemonSessionState;
}

/**
 * Build a mock-deps shape for testing pool behavior. `getSessionReturns`
 * is a per-session-name map of what daemonSessionsClient.getSession should
 * resolve to; missing entries → null (404).
 *
 * Cast to OrchestratorPoolManagerDeps via `as unknown as` so the probe
 * compiles BEFORE fix01e GREEN adds `daemonSessionsClient` to the deps
 * interface. After GREEN, the cast can be removed for type-tightening.
 */
function setup(
  getSessionReturns: Record<string, MockGetResult | null> = {},
): {
  pool: OrchestratorPoolManager;
  daemonSessionsClient: {
    getSession: ReturnType<typeof vi.fn>;
    patchSessionState: ReturnType<typeof vi.fn>;
  };
  spawnController: { handleSpawnRequest: ReturnType<typeof vi.fn> };
  halt: ReturnType<typeof vi.fn>;
  tileRegistry: {
    addSession: ReturnType<typeof vi.fn>;
    removeSession: ReturnType<typeof vi.fn>;
    renameSession: ReturnType<typeof vi.fn>;
  };
} {
  const daemonSessionsClient = {
    getSession: vi.fn(
      async (name: string): Promise<MockGetResult | null> =>
        getSessionReturns[name] ?? null,
    ),
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
    addStreamCloseObserver: vi.fn(() => () => undefined),
    handleSendStdin: vi.fn(async () => undefined),
  };

  const stateWriter = {
    /* SwarmStateWriter has no methods pool actually calls during start/stop */
  };

  const halt = vi.fn();

  const deps = {
    spawnController,
    tileRegistry,
    consoleIpc,
    stateWriter,
    orchestratorSystemPromptPath: '/tmp/test-orchestrator.md',
    runTmuxHasSession: vi.fn(async () => undefined),
    dispatchModeReader: vi.fn(() => 'auto' as const),
    halt,
    // Path-(E) NEW dep — present here for fix01e GREEN; pool today
    // does not read this field. Cast bypasses the interface check until
    // GREEN adds the field to OrchestratorPoolManagerDeps.
    daemonSessionsClient,
  } as unknown as OrchestratorPoolManagerDeps;

  const pool = new OrchestratorPoolManager(deps);

  return { pool, daemonSessionsClient, spawnController, halt, tileRegistry };
}

describe('MB-T-HSO-WIRE fix01e — Path (E) pool state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('(1) teardown PATCHes reserved-name rows to state=held (NOT killed)', () => {
    it('stop() PATCHes __orchestrator_active state=held via daemonSessionsClient', async () => {
      const { pool, daemonSessionsClient } = setup({
        [RESERVED_ACTIVE]: { state: 'armed' },
        [RESERVED_STANDBY]: { state: 'armed' },
      });
      await pool.start();
      // Pool may be async-await on stop too; cast .stop() result for both
      // sync-and-async post-GREEN shapes.
      await Promise.resolve((pool as { stop(): unknown }).stop());
      expect(
        daemonSessionsClient.patchSessionState,
        'stop() must PATCH __orchestrator_active state=held per Path (E) teardown',
      ).toHaveBeenCalledWith(RESERVED_ACTIVE, 'held');
    });

    it('stop() PATCHes __orchestrator_standby state=held via daemonSessionsClient', async () => {
      const { pool, daemonSessionsClient } = setup({
        [RESERVED_ACTIVE]: { state: 'armed' },
        [RESERVED_STANDBY]: { state: 'armed' },
      });
      await pool.start();
      await Promise.resolve((pool as { stop(): unknown }).stop());
      expect(
        daemonSessionsClient.patchSessionState,
        'stop() must PATCH __orchestrator_standby state=held per Path (E) teardown',
      ).toHaveBeenCalledWith(RESERVED_STANDBY, 'held');
    });

    it('stop() MUST NOT PATCH to killed (terminal state retired by Path (E))', async () => {
      const { pool, daemonSessionsClient } = setup({
        [RESERVED_ACTIVE]: { state: 'armed' },
        [RESERVED_STANDBY]: { state: 'armed' },
      });
      await pool.start();
      await Promise.resolve((pool as { stop(): unknown }).stop());
      const killedCalls = daemonSessionsClient.patchSessionState.mock.calls.filter(
        (call: unknown[]) => call[1] === 'killed',
      );
      expect(
        killedCalls,
        'stop() must NOT PATCH to killed — kills are terminal per contract §6.1',
      ).toHaveLength(0);
    });
  });

  describe('(2) start() on FIRST launch (404 for both reserved names) → POST creates fresh rows', () => {
    it('start() with no existing rows calls spawnController for both reserved names', async () => {
      const { pool, daemonSessionsClient, spawnController } = setup({
        // No entries → mock returns null (404) for both names
      });
      await pool.start();
      expect(
        daemonSessionsClient.getSession,
        'start() must GET __orchestrator_active to check existence',
      ).toHaveBeenCalledWith(RESERVED_ACTIVE);
      expect(
        daemonSessionsClient.getSession,
        'start() must GET __orchestrator_standby to check existence',
      ).toHaveBeenCalledWith(RESERVED_STANDBY);
      expect(
        spawnController.handleSpawnRequest,
        'first-launch (404) must call spawnController for active',
      ).toHaveBeenCalledWith(
        expect.objectContaining({ sessionName: RESERVED_ACTIVE }),
      );
      expect(
        spawnController.handleSpawnRequest,
        'first-launch (404) must call spawnController for standby',
      ).toHaveBeenCalledWith(
        expect.objectContaining({ sessionName: RESERVED_STANDBY }),
      );
    });
  });

  describe('(3) start() on existing held → PATCH held→armed; spawnController NOT called', () => {
    it('start() with existing state=held PATCHes to armed and does NOT call spawnController for that name', async () => {
      const { pool, daemonSessionsClient, spawnController } = setup({
        [RESERVED_ACTIVE]: { state: 'held' },
        [RESERVED_STANDBY]: { state: 'held' },
      });
      await pool.start();
      expect(
        daemonSessionsClient.patchSessionState,
        'held existing row must be PATCHed to armed for active',
      ).toHaveBeenCalledWith(RESERVED_ACTIVE, 'armed');
      expect(
        daemonSessionsClient.patchSessionState,
        'held existing row must be PATCHed to armed for standby',
      ).toHaveBeenCalledWith(RESERVED_STANDBY, 'armed');
      expect(
        spawnController.handleSpawnRequest,
        'existing row → MUST NOT POST via spawnController (Blocker 3 avoidance)',
      ).not.toHaveBeenCalled();
    });

    it('start() with existing state=armed leaves state as-is and does NOT call spawnController', async () => {
      const { pool, daemonSessionsClient, spawnController } = setup({
        [RESERVED_ACTIVE]: { state: 'armed' },
        [RESERVED_STANDBY]: { state: 'armed' },
      });
      await pool.start();
      // state=armed is a no-op transition (valid endpoint state); pool
      // either no-ops the PATCH or PATCHes to 'armed' idempotently.
      // The load-bearing assertion: no POST call.
      expect(
        spawnController.handleSpawnRequest,
        'existing armed row → MUST NOT POST via spawnController',
      ).not.toHaveBeenCalled();
    });
  });

  describe('(4) start() on existing killed → halt-and-surface with actionable message', () => {
    it('start() with __orchestrator_active in terminal killed state calls halt with operator-actionable remediation', async () => {
      const { pool, halt, spawnController, daemonSessionsClient } = setup({
        [RESERVED_ACTIVE]: { state: 'killed' },
        [RESERVED_STANDBY]: { state: 'killed' },
      });
      await pool.start();
      expect(halt, 'killed terminal state must trigger halt').toHaveBeenCalled();
      const haltMessages = halt.mock.calls.map((c: unknown[]) => String(c[0]));
      const actionableActive = haltMessages.find(
        (m) =>
          m.includes(RESERVED_ACTIVE) &&
          m.toLowerCase().includes('killed') &&
          (m.includes('registry-v2.json') || m.includes('daemon restart')),
      );
      expect(
        actionableActive,
        `halt for ${RESERVED_ACTIVE} killed-row must include operator-actionable remediation (registry-v2.json edit OR daemon restart). Got: ${JSON.stringify(haltMessages)}`,
      ).toBeDefined();
      expect(
        spawnController.handleSpawnRequest,
        'killed terminal state → MUST NOT POST (would 409 from Blocker 3)',
      ).not.toHaveBeenCalled();
      // Should NOT PATCH from killed (invalid transition per contract §6.1).
      const killedFromPatches = daemonSessionsClient.patchSessionState.mock.calls.filter(
        (call: unknown[]) =>
          call[0] === RESERVED_ACTIVE || call[0] === RESERVED_STANDBY,
      );
      expect(
        killedFromPatches,
        'MUST NOT PATCH from killed (terminal — InvalidTransitionError 422)',
      ).toHaveLength(0);
    });
  });

  describe('(5) Pool MUST NOT POST /v2/sessions when GET returns existing row (Blocker 3 avoidance)', () => {
    it.each([
      { name: 'armed' as const, label: 'armed' },
      { name: 'held' as const, label: 'held' },
      { name: 'paused' as const, label: 'paused' },
    ])(
      'existing row with state=$label → spawnController.handleSpawnRequest NEVER called for that name',
      async ({ name }) => {
        const { pool, spawnController } = setup({
          [RESERVED_ACTIVE]: { state: name },
          [RESERVED_STANDBY]: { state: name },
        });
        await pool.start();
        expect(
          spawnController.handleSpawnRequest,
          `existing state=${name} → MUST NOT POST (avoids 409 from daemon Blocker 3)`,
        ).not.toHaveBeenCalled();
      },
    );
  });
});
