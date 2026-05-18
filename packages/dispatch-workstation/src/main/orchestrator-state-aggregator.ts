// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB3 (GREEN) — unified
// orchestrator-state aggregator (pluggable-source DI).
//
// Single-aggregator pattern eliminating the three independent polls
// that Topbar / OrchestratorStrip / ConductorChat would otherwise
// perform against `GET /v2/sessions` + build-md service + pause-state
// store + narration store. Mirrors rate-limit-aggregator.ts factory
// shape (CreateRateLimitAggregatorDeps + RateLimitSource pattern at
// rate-limit-aggregator.ts:48-120), generalized to a multi-source
// composition deriving a single OrchestratorStateSnapshot per §6.6
// frozen contract.
//
// Architecture (per dispatch §0 Q1/Q2/Q3/Q4 pre-authorization):
//
//   sessions source  ──┐
//   build-md source  ──┤
//   pause source     ──┼─→ deriveSnapshot() ─→ latestSnapshot cache
//   narration source ──┤                         │
//   daemon-reach     ──┘                         ├─→ onUpdate subscribers
//                                                │      (renderer windows)
//                                                └─→ getSnapshot() readers
//                                                       (initial-render path)
//
// Sources are pluggable interfaces — tests inject deterministic stubs;
// production main.ts wires real sources at WB9 sentinel-zone block.
// The aggregator itself is a pure-fn derivation (no electron imports);
// fan-out to webContents.send is OWNED BY orchestrator-state-ipc.ts
// at WB8 (the aggregator only fans out to in-process onUpdate
// subscribers; the IPC layer subscribes ONCE and forwards to renderer
// windows).
//
// Snapshot derivation rules (per §6.6 STAMPED amendment):
//   - seq: monotonic counter; increments on every emit() where the
//     derived snapshot diverges from latestSnapshot (dedup at the
//     aggregator boundary prevents thread-flicker per R-B3 risk-
//     register).
//   - polledAt: latest poll-success wall-clock ISO; null until first
//     successful sessions poll.
//   - sessions: ReadonlyArray<OrchestratorSessionLite>; mapped from
//     sessionsSource latest emission via passthrough (caller projects
//     daemon SessionRecord to the lite shape).
//   - attached: AttachedBuildMdState | null; from buildMdSource (Q3=(a)
//     attached-build-md-state-store → loadBuildMd → BuildMdStatus
//     projection).
//   - messages: ReadonlyArray<OrchestratorMessage>; from narration-
//     Source (Q1=(c) persisted JSON ring; aggregator passthrough).
//   - paused: boolean; from pauseSource (Q2=(a) workstation-side
//     pause-state-store).
//   - daemonReachable: boolean; from sessionsSource last-poll outcome
//     (true on success; false on rejection).
//
// Dedup semantics: emit() compares the candidate snapshot to
// latestSnapshot using structural equality on the non-seq fields.
// When unchanged, seq stays + no emission to subscribers (R-B3
// thread-flicker mitigation). When changed, seq increments + emit
// fires. The seq field is a renderer-side hint for out-of-order
// broadcasts (Electron IPC delivers in-order on main side, but
// renderer subscription ordering is renderer-side concern).

import type {
  OrchestratorStateSnapshot,
  OrchestratorSessionLite,
  OrchestratorMessage,
  AttachedBuildMdState,
} from './orchestrator-state-types.js';

// ── source seams ─────────────────────────────────────────────────────

/**
 * Sessions source — emits the lite-shape session array each time the
 * daemon poll completes (success or failure). Failure emissions
 * include daemonReachable=false so the aggregator can encode it in
 * the snapshot. Production source is the WB4 poll seam
 * (orchestrator-state-source-poll.ts mirroring session-status-source-
 * poll.ts cadence + backoff pattern).
 */
export interface OrchestratorSessionsSource {
  /** Begin polling. Idempotent — repeated calls are no-ops if already running. */
  start(): void;
  /** Stop polling. */
  stop(): void;
  /**
   * Subscribe to sessions emissions. The callback receives the full
   * sessions array + daemonReachable outcome per poll. Returns a
   * dispose function deregistering the callback.
   */
  onState(
    cb: (state: {
      readonly sessions: ReadonlyArray<OrchestratorSessionLite>;
      readonly polledAt: string;
      readonly daemonReachable: boolean;
    }) => void,
  ): () => void;
}

/**
 * Build-md source — emits attached state each time the workstation-
 * side attached-build-md-state-store changes OR the underlying
 * BUILD.md file is re-loaded (parse refresh on dispatch tick). null
 * emission = nothing attached. Production source is the WB6 store
 * + loadBuildMd composition.
 */
export interface OrchestratorBuildMdSource {
  start(): void;
  stop(): void;
  onState(cb: (state: AttachedBuildMdState | null) => void): () => void;
}

/**
 * Pause source — emits the boolean pause flag each time the
 * workstation-side pause-state-store changes. Production source is
 * the WB5 store with watch-on-write fan-out.
 */
export interface OrchestratorPauseSource {
  start(): void;
  stop(): void;
  onState(cb: (paused: boolean) => void): () => void;
}

/**
 * Narration source — emits the message log array each time the
 * workstation-side narration-store appends a new entry. Production
 * source is the WB7 store with watch-on-append fan-out.
 */
export interface OrchestratorNarrationSource {
  start(): void;
  stop(): void;
  onState(cb: (messages: ReadonlyArray<OrchestratorMessage>) => void): () => void;
}

// ── aggregator surface ───────────────────────────────────────────────

export interface OrchestratorStateAggregator {
  /**
   * Latest cached snapshot. Always returns a valid snapshot per §6.6
   * Channel #8 "no failure modes" contract — the seed snapshot at
   * construction time satisfies the OrchestratorStateSnapshot shape
   * with polledAt=null + empty sessions/messages + attached=null +
   * paused=initial-pause-state + daemonReachable=false. Called by
   * the WB8 IPC handler's orchestrator-state:get-snapshot response.
   */
  getSnapshot(): OrchestratorStateSnapshot;
  /**
   * Start all source pollers. Aggregator subscribes to each source's
   * onState channel at construction; start() forwards lifecycle to
   * sources so they begin emitting.
   */
  start(): void;
  /** Stop all source pollers. */
  stop(): void;
  /**
   * Subscribe to snapshot updates. Each source emission triggers a
   * re-derivation; if the candidate snapshot diverges from the cached
   * snapshot, seq increments + subscribers fire. Returns a dispose
   * function deregistering the callback.
   */
  onUpdate(cb: (snapshot: OrchestratorStateSnapshot) => void): () => void;
}

export interface CreateOrchestratorStateAggregatorDeps {
  readonly sessionsSource: OrchestratorSessionsSource;
  readonly buildMdSource: OrchestratorBuildMdSource;
  readonly pauseSource: OrchestratorPauseSource;
  readonly narrationSource: OrchestratorNarrationSource;
  /**
   * Initial pause state — read from pause-state-store on aggregator
   * construction so the seed snapshot reflects persisted state
   * BEFORE the pauseSource has emitted. Production wiring at WB9
   * passes the value read from MB_ORCHESTRATOR_PAUSE_STATE_DIR-
   * scoped store; tests pass any boolean.
   */
  readonly initialPaused?: boolean;
  /**
   * Initial narration log — read from narration-store on aggregator
   * construction so the seed snapshot reflects persisted log BEFORE
   * narrationSource has emitted. Production wiring at WB9 passes
   * the array read from MB_ORCHESTRATOR_NARRATION_DIR-scoped store.
   */
  readonly initialMessages?: ReadonlyArray<OrchestratorMessage>;
  /**
   * Initial attached state — read from attached-build-md-state-store
   * on aggregator construction. Production wiring at WB9 passes the
   * value read from MB_ATTACHED_BUILD_MD_STATE_DIR-scoped store.
   */
  readonly initialAttached?: AttachedBuildMdState | null;
}

// ── factory ──────────────────────────────────────────────────────────

/**
 * Construct an OrchestratorStateAggregator wrapping the four pluggable
 * sources. Subscribes to each source at construction time; derives
 * the seed snapshot from supplied initial state; fans out to
 * onUpdate subscribers on every source emission that changes the
 * derived snapshot.
 */
export function createOrchestratorStateAggregator(
  deps: CreateOrchestratorStateAggregatorDeps,
): OrchestratorStateAggregator {
  const {
    sessionsSource,
    buildMdSource,
    pauseSource,
    narrationSource,
    initialPaused = false,
    initialMessages = [],
    initialAttached = null,
  } = deps;

  // Mutable source-view state. Aggregator owns these; sources fire
  // partial updates, aggregator merges into a snapshot.
  let sessions: ReadonlyArray<OrchestratorSessionLite> = [];
  let polledAt: string | null = null;
  let daemonReachable = false;
  let attached: AttachedBuildMdState | null = initialAttached;
  let paused = initialPaused;
  let messages: ReadonlyArray<OrchestratorMessage> = initialMessages;

  // Cached snapshot — seeded from initial deps; updated on every
  // diverging source emission.
  let seq = 0;
  let latestSnapshot: OrchestratorStateSnapshot = {
    seq,
    polledAt,
    sessions,
    attached,
    messages,
    paused,
    daemonReachable,
  };

  const subscribers = new Set<(snapshot: OrchestratorStateSnapshot) => void>();

  function deriveSnapshot(): OrchestratorStateSnapshot {
    return {
      seq,
      polledAt,
      sessions,
      attached,
      messages,
      paused,
      daemonReachable,
    };
  }

  function snapshotsEqual(
    a: OrchestratorStateSnapshot,
    b: OrchestratorStateSnapshot,
  ): boolean {
    // Compare every field EXCEPT seq (seq is the divergence indicator
    // we increment ONLY when other fields change). Reference equality
    // on arrays/objects is the dedup boundary — sources emit fresh
    // references on change, same reference on repeat.
    return (
      a.polledAt === b.polledAt &&
      a.sessions === b.sessions &&
      a.attached === b.attached &&
      a.messages === b.messages &&
      a.paused === b.paused &&
      a.daemonReachable === b.daemonReachable
    );
  }

  function emit(): void {
    const candidate = deriveSnapshot();
    if (snapshotsEqual(candidate, latestSnapshot)) {
      return;
    }
    seq += 1;
    latestSnapshot = { ...candidate, seq };
    subscribers.forEach((cb) => cb(latestSnapshot));
  }

  // Subscribe to each source at construction. Aggregator deregisters
  // these on stop() via the dispose functions captured here.
  const disposeSessions = sessionsSource.onState((state) => {
    sessions = state.sessions;
    polledAt = state.polledAt;
    daemonReachable = state.daemonReachable;
    emit();
  });

  const disposeBuildMd = buildMdSource.onState((state) => {
    attached = state;
    emit();
  });

  const disposePause = pauseSource.onState((state) => {
    paused = state;
    emit();
  });

  const disposeNarration = narrationSource.onState((state) => {
    messages = state;
    emit();
  });

  return {
    getSnapshot(): OrchestratorStateSnapshot {
      return latestSnapshot;
    },
    start(): void {
      sessionsSource.start();
      buildMdSource.start();
      pauseSource.start();
      narrationSource.start();
    },
    stop(): void {
      sessionsSource.stop();
      buildMdSource.stop();
      pauseSource.stop();
      narrationSource.stop();
      disposeSessions();
      disposeBuildMd();
      disposePause();
      disposeNarration();
    },
    onUpdate(cb): () => void {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
  };
}

// ── null sources (test + null-prod fallbacks) ────────────────────────

/**
 * Null sessions source — never emits. Useful as a default at
 * aggregator construction before the WB4 poll seam is wired. Mirrors
 * createNullRateLimitSource precedent at rate-limit-aggregator.ts:129.
 */
export function createNullSessionsSource(): OrchestratorSessionsSource {
  return {
    start(): void {},
    stop(): void {},
    onState(): () => void {
      return () => {};
    },
  };
}

export function createNullBuildMdSource(): OrchestratorBuildMdSource {
  return {
    start(): void {},
    stop(): void {},
    onState(): () => void {
      return () => {};
    },
  };
}

export function createNullPauseSource(): OrchestratorPauseSource {
  return {
    start(): void {},
    stop(): void {},
    onState(): () => void {
      return () => {};
    },
  };
}

export function createNullNarrationSource(): OrchestratorNarrationSource {
  return {
    start(): void {},
    stop(): void {},
    onState(): () => void {
      return () => {};
    },
  };
}
