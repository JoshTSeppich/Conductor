// MB-T37 WB1 (red) — OrchestratorPoolManager pool lifecycle probes.
//
// Contract asserted (9 probes):
//   Probe 01: start() → handleSpawnRequest called with sessionName=__orchestrator_active
//             + permissionMode='auto' → tileRegistry.addSession(__orchestrator_active)
//   Probe 02: start() → handleSpawnRequest called for __orchestrator_standby
//             → tileRegistry.addSession(__orchestrator_standby)
//   Probe 03: PTY chunk last-line matches ≥130K tokens → handleSendStdin called with
//             [HANDOFF-NOW]\n → pool sets awaitingMarker
//   Probe 04: PTY chunk contains [HANDOFF-EMITTED] → active tracking terminated
//             → subsequent token-count chunk does NOT re-send [HANDOFF-NOW]
//   Probe 05: post-marker → tileRegistry.removeSession(__orchestrator_standby) then
//             tileRegistry.addSession(__orchestrator_active) called in order
//   Probe 06: post-promotion → handleSpawnRequest for fresh standby →
//             tileRegistry.addSession(__orchestrator_standby) (invariant restored)
//   Probe 07: active crash — (A) PTY stream-close without marker → promote standby;
//             (B) tmux poll session-not-found → promote standby
//   Probe 08: standby crash → pool spawns replacement standby; active unaffected
//   Probe 09: 3× consecutive parse failure → halt(reason) invoked
//
// WB1 RED: start() is a no-op stub; no observers registered; no spawn/tile calls made.
// All probes fail because the stub never calls any dep methods.
// WB2 GREEN: full implementation ships per dispatch §3.4 + HALT 0/1 arbitrations.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SpawnIpcController } from '../../../src/main/spawn-ipc.js';
import type { ConsoleIpcController } from '../../../src/main/console-ipc.js';
import type { SwarmStateWriter } from '../../../src/coarchitect/swarm-state-writer.js';
import {
  OrchestratorPoolManager,
  type ITileGridRegistry,
  RESERVED_ACTIVE,
  RESERVED_STANDBY,
  HANDOFF_TOKEN_THRESHOLD,
  HANDOFF_NOW_DIRECTIVE,
  HANDOFF_EMITTED_MARKER,
  PARSE_FAIL_MAX,
  POLL_INTERVAL_MS,
} from '../../../src/coarchitect/hso-pool.js';

// tile-grid-state.ts imports electron; mock so module loads in node test env.
vi.mock('electron', () => ({
  app: { getPath: vi.fn().mockReturnValue('/tmp/hso-pool-test-state') },
}));

// ── Test helpers ──────────────────────────────────────────────────────────────

type StdoutObs = (sessionName: string, chunk: string) => void;
type StreamCloseObs = (sessionName: string) => void;

interface MockDeps {
  spawnController: { handleSpawnRequest: ReturnType<typeof vi.fn> };
  tileRegistry: {
    addSession: ReturnType<typeof vi.fn>;
    removeSession: ReturnType<typeof vi.fn>;
    renameSession: ReturnType<typeof vi.fn>;
  };
  consoleIpc: {
    addStdoutObserver: ReturnType<typeof vi.fn>;
    addStreamCloseObserver: ReturnType<typeof vi.fn>;
    handleSendStdin: ReturnType<typeof vi.fn>;
  };
  halt: ReturnType<typeof vi.fn>;
  runTmuxHasSession: ReturnType<typeof vi.fn>;
  registeredStdoutObs: StdoutObs | null;
  registeredStreamCloseObs: StreamCloseObs | null;
}

function makeMockDeps(): MockDeps {
  const state = {
    registeredStdoutObs: null as StdoutObs | null,
    registeredStreamCloseObs: null as StreamCloseObs | null,
  };

  return {
    spawnController: {
      handleSpawnRequest: vi.fn().mockResolvedValue({
        type: 'success',
        result: { name: '__mock__', tmux_target: '__mock__', cwd: '/tmp' },
      }),
    },
    tileRegistry: {
      addSession: vi.fn(),
      removeSession: vi.fn(),
      renameSession: vi.fn(),
    },
    consoleIpc: {
      addStdoutObserver: vi.fn((fn: StdoutObs) => {
        state.registeredStdoutObs = fn;
        return vi.fn();
      }),
      addStreamCloseObserver: vi.fn((fn: StreamCloseObs) => {
        state.registeredStreamCloseObs = fn;
        return vi.fn();
      }),
      handleSendStdin: vi.fn().mockResolvedValue({ accepted: true, stdin_seq: 1 }),
    },
    halt: vi.fn(),
    runTmuxHasSession: vi.fn().mockResolvedValue(undefined),
    get registeredStdoutObs() { return state.registeredStdoutObs; },
    get registeredStreamCloseObs() { return state.registeredStreamCloseObs; },
  };
}

function makeManager(deps: MockDeps): OrchestratorPoolManager {
  return new OrchestratorPoolManager({
    spawnController: deps.spawnController as unknown as SpawnIpcController,
    tileRegistry: deps.tileRegistry as ITileGridRegistry,
    consoleIpc: deps.consoleIpc as unknown as ConsoleIpcController,
    stateWriter: {} as unknown as SwarmStateWriter,
    orchestratorSystemPromptPath: '/fake/orchestrator.md',
    runTmuxHasSession: deps.runTmuxHasSession,
    dispatchModeReader: () => 'auto' as const,
    halt: deps.halt,
    // Path (E) fix01e: pre-existing MB-T37 WB1 probes pre-date the
    // daemonSessionsClient dep; default to "first-launch" semantics
    // (GET returns null/404) so probe-01..09 retain their pre-fix01e
    // behavioral assertions (start() calls spawnController on 404).
    // Probes that exercise the Path (E) state-machine branches live in
    // probe-mbthsowire-fix01e-path-e-pool-state-machine.spec.ts and
    // inject explicit GET-return shapes there.
    daemonSessionsClient: {
      getSession: vi.fn().mockResolvedValue(null),
      patchSessionState: vi.fn().mockResolvedValue(undefined),
    },
  });
}

// ── Probes ────────────────────────────────────────────────────────────────────

describe('MB-T37 WB1 — OrchestratorPoolManager pool lifecycle', () => {
  let deps: MockDeps;
  let manager: OrchestratorPoolManager;

  beforeEach(() => {
    deps = makeMockDeps();
    manager = makeManager(deps);
  });

  afterEach(() => {
    manager.stop();
    vi.clearAllMocks();
  });

  it('probe-01: start() spawns active orchestrator with canonical permissionMode + registers __orchestrator_active tile', async () => {
    await manager.start();

    expect(deps.spawnController.handleSpawnRequest).toHaveBeenCalledWith(
      expect.objectContaining({ sessionName: RESERVED_ACTIVE, permissionMode: 'auto' }),
    );
    expect(deps.tileRegistry.addSession).toHaveBeenCalledWith(
      RESERVED_ACTIVE,
      expect.any(Object),
    );
  });

  it('probe-02: start() spawns standby orchestrator + registers __orchestrator_standby tile', async () => {
    await manager.start();

    expect(deps.spawnController.handleSpawnRequest).toHaveBeenCalledWith(
      expect.objectContaining({ sessionName: RESERVED_STANDBY, permissionMode: 'auto' }),
    );
    expect(deps.tileRegistry.addSession).toHaveBeenCalledWith(
      RESERVED_STANDBY,
      expect.any(Object),
    );
  });

  it('probe-03: PTY chunk last-line ≥ threshold → handleSendStdin called with [HANDOFF-NOW]', async () => {
    await manager.start();

    const aboveThreshold = `${HANDOFF_TOKEN_THRESHOLD + 1} tokens`;
    deps.registeredStdoutObs?.(RESERVED_ACTIVE, aboveThreshold);

    expect(deps.consoleIpc.handleSendStdin).toHaveBeenCalledWith(
      RESERVED_ACTIVE,
      HANDOFF_NOW_DIRECTIVE,
      'utf8',
    );
  });

  it('probe-04: [HANDOFF-EMITTED] in PTY → active tracking terminated → subsequent token chunk does NOT re-send [HANDOFF-NOW]', async () => {
    await manager.start();

    // First: threshold crossing triggers directive
    deps.registeredStdoutObs?.(RESERVED_ACTIVE, `${HANDOFF_TOKEN_THRESHOLD + 1} tokens`);
    expect(deps.consoleIpc.handleSendStdin).toHaveBeenCalledWith(
      RESERVED_ACTIVE, HANDOFF_NOW_DIRECTIVE, 'utf8',
    );

    // Then: marker received → active tracking terminated
    deps.registeredStdoutObs?.(RESERVED_ACTIVE, HANDOFF_EMITTED_MARKER);

    // Reset call count
    vi.mocked(deps.consoleIpc.handleSendStdin).mockClear();

    // Another token-count chunk: must NOT re-fire [HANDOFF-NOW]
    deps.registeredStdoutObs?.(RESERVED_ACTIVE, `${HANDOFF_TOKEN_THRESHOLD + 5000} tokens`);
    expect(deps.consoleIpc.handleSendStdin).not.toHaveBeenCalledWith(
      RESERVED_ACTIVE, HANDOFF_NOW_DIRECTIVE, 'utf8',
    );
  });

  it('probe-05: post-marker → removeSession(__orchestrator_standby) then addSession(__orchestrator_active) in order', async () => {
    await manager.start();
    vi.mocked(deps.tileRegistry.addSession).mockClear();
    vi.mocked(deps.tileRegistry.removeSession).mockClear();

    deps.registeredStdoutObs?.(RESERVED_ACTIVE, HANDOFF_EMITTED_MARKER);

    const removeCalls = vi.mocked(deps.tileRegistry.removeSession).mock.invocationCallOrder;
    const addCalls = vi.mocked(deps.tileRegistry.addSession).mock.invocationCallOrder;

    expect(vi.mocked(deps.tileRegistry.removeSession)).toHaveBeenCalledWith(RESERVED_STANDBY);
    expect(vi.mocked(deps.tileRegistry.addSession)).toHaveBeenCalledWith(
      RESERVED_ACTIVE, expect.any(Object),
    );
    // remove-standby must precede add-active
    expect(removeCalls[0]).toBeLessThan(addCalls[0]!);
  });

  it('probe-06: post-promotion → fresh standby spawned + __orchestrator_standby tile registered (invariant restored)', async () => {
    await manager.start();
    vi.mocked(deps.spawnController.handleSpawnRequest).mockClear();
    vi.mocked(deps.tileRegistry.addSession).mockClear();

    deps.registeredStdoutObs?.(RESERVED_ACTIVE, HANDOFF_EMITTED_MARKER);
    // MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX adjacent fix: deeper microtask
    // drain so _prepareReservedName's getSession await + spawnAndRegister's
    // spawnController await both resolve before assertions. Pre-fix01e
    // _spawnAndRegister had spawnController as its first await; post-fix01e
    // _prepareReservedName has getSession first → one extra microtask cycle.
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(deps.spawnController.handleSpawnRequest).toHaveBeenCalledWith(
      expect.objectContaining({ sessionName: RESERVED_STANDBY }),
    );
    expect(deps.tileRegistry.addSession).toHaveBeenCalledWith(
      RESERVED_STANDBY, expect.any(Object),
    );
  });

  it('probe-07: active crash (PTY stream-close + tmux not-found) → promotes standby + spawns new standby', async () => {
    await manager.start();
    vi.mocked(deps.tileRegistry.removeSession).mockClear();
    vi.mocked(deps.tileRegistry.addSession).mockClear();
    vi.mocked(deps.spawnController.handleSpawnRequest).mockClear();

    // Path A: PTY stream-close without preceding [HANDOFF-EMITTED]
    deps.registeredStreamCloseObs?.(RESERVED_ACTIVE);
    // MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX adjacent fix: microtask drain
    // for fix01e _prepareReservedName getSession-then-spawnAndRegister
    // async chain (see probe-06 comment).
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(deps.tileRegistry.removeSession).toHaveBeenCalledWith(RESERVED_STANDBY);
    expect(deps.tileRegistry.addSession).toHaveBeenCalledWith(
      RESERVED_ACTIVE, expect.any(Object),
    );
    expect(deps.spawnController.handleSpawnRequest).toHaveBeenCalledWith(
      expect.objectContaining({ sessionName: RESERVED_STANDBY }),
    );
  });

  it('probe-08: standby crash (tmux not-found for standby) → spawns replacement standby; active entry unaffected', async () => {
    await manager.start();
    const activeAddCount = vi.mocked(deps.tileRegistry.addSession).mock.calls
      .filter(([name]) => name === RESERVED_ACTIVE).length;

    deps.registeredStreamCloseObs?.(RESERVED_STANDBY);

    // New standby spawned
    expect(deps.spawnController.handleSpawnRequest).toHaveBeenCalledWith(
      expect.objectContaining({ sessionName: RESERVED_STANDBY }),
    );
    // Active tile-registry entry NOT removed
    expect(deps.tileRegistry.removeSession).not.toHaveBeenCalledWith(RESERVED_ACTIVE);
    // Active addSession count unchanged (no spurious re-registration of active)
    const activeAddCountAfter = vi.mocked(deps.tileRegistry.addSession).mock.calls
      .filter(([name]) => name === RESERVED_ACTIVE).length;
    expect(activeAddCountAfter).toBe(activeAddCount);
  });

  it(`probe-09: ${PARSE_FAIL_MAX}× consecutive parse failure → halt(reason) invoked`, async () => {
    await manager.start();

    const noTokenLine = 'no token count in this output';
    for (let i = 0; i < PARSE_FAIL_MAX; i++) {
      deps.registeredStdoutObs?.(RESERVED_ACTIVE, noTokenLine);
    }

    expect(deps.halt).toHaveBeenCalledWith(expect.stringContaining('parse'));
  });
});
