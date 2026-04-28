/**
 * Daemon startup orchestration.
 *
 * DAEMON-T01 scope: build server, listen on configured host/port,
 * register SIGTERM/SIGINT handlers for graceful shutdown. Returns a
 * handle with the bound port and an explicit close() for tests and
 * the main entrypoint to use.
 *
 * Downstream tickets extend startup:
 *   T05 schema migration runs before listen()
 *   T12 WS plugin registers after listen()
 *   T13-T15 watchers spin up per-session after listen()
 *
 * Each of those is an additive step; the T01 pattern stays intact.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { buildServer, type BuildServerOpts } from '../server.js';
import { createEventRing, type EventRing } from '../events/history.js';
import { createEventBus, type EmitFn } from '../events/bus.js';
import { createAuthHook, getOrCreateToken, type TokenRef } from './auth.js';
import { registerErrorHandler } from './error-handler.js';
import { registerAuthRoutes } from '../routes/auth.js';
import { registerEventsRoutes } from '../routes/events.js';
import { registerHandoffRoutes } from '../routes/handoff.js';
import { registerHealthRoutes } from '../routes/health.js';
import { registerPromptRoutes } from '../routes/prompts.js';
import { registerViolationsRoutes } from '../routes/violations.js';
import { registerWsRoutes } from '../routes/ws.js';
import {
  defaultNotify,
  probeNotificationsAvailable,
  startNotifications,
  type NotifyFn,
} from '../notifications/index.js';
import {
  defaultWatcherFactory,
  type WatcherFactory,
} from '../watchers/handoff.js';
import {
  createWatcherManager,
  type WatcherManager,
} from '../watchers/manager.js';
import { readRegistryV2 } from '../migration/schema-v2.js';
import {
  registerSessionsReadRoutes,
  registerSessionsStateRoutes,
  registerSessionsWriteRoutes,
} from '../routes/sessions.js';
import { shutdown } from './shutdown.js';

function defaultTokenPath(): string {
  return join(homedir(), '.foxworks-dispatch', 'token');
}

export interface StartupOpts {
  /** Bind host. Default `127.0.0.1` (localhost-only per contract §3.4). */
  host?: string;
  /** Bind port. Default `7878`. Pass `0` for ephemeral (tests). */
  port?: number;
  /** Logger configuration, passed through to buildServer. */
  logger?: BuildServerOpts['logger'];
  /**
   * Path to the auth token file. Default `~/.foxworks-dispatch/token`.
   * Extended in DAEMON-T02; wired up in the T02 green commit.
   */
  tokenPath?: string;
  /**
   * Test-only hook: runs after all production setup (error handler,
   * auth hook, auth routes) and BEFORE `app.listen()`. Added in
   * DAEMON-T04 because Fastify 5 rejects both `setErrorHandler` and
   * `app.get(...)` calls after listen. Tests use this to register
   * throwing routes that exercise the error handler. Production
   * startup leaves this unset.
   */
  beforeListen?: (app: FastifyInstance) => Promise<void> | void;
  /**
   * Path to sessions.json. Default `~/.foxworks-dispatch/sessions.json`.
   * Extended in DAEMON-T06; wired in the T06 green commit when the
   * first routes consume T05's readRegistryV2/writeRegistryV2.
   */
  registryPath?: string;
  /**
   * tmux operation injector. Default uses dispatch-core's transport
   * (KNOWN from SPIKES.md §Spike 01/03). Tests inject mocks to
   * observe side effects and simulate tmux failures without
   * touching real tmux. Added in DAEMON-T08.
   */
  tmuxOps?: import('../state/transitions.js').TmuxOps;
  /**
   * Archive root directory. Default
   * `~/.foxworks-dispatch/archive/`. Test-isolated per the
   * fixture's auto-isolation pattern. Added in DAEMON-T09 for
   * POST /v2/sessions/:name/prompts archive writes.
   */
  archiveRoot?: string;
  /**
   * Clipboard copy operation. Default delegates to
   * dispatch-core's pbcopy (frozen). Tests inject no-op or
   * recording stubs; fixture defaults to no-op for safety
   * (defense-in-depth per latent-default-path-drift finding
   * extended to clipboard side effects). Added in DAEMON-T10.
   */
  clipboardCopy?: (content: string) => Promise<void>;
  /**
   * In-memory event ring buffer. Default = fresh
   * createEventRing() instance at default capacity (10000).
   * Tests pass a pre-seeded ring to verify GET /v2/events
   * pagination (T11). Added in DAEMON-T17 (pulled forward
   * from D-5 per operator arbitration 1 on T11 pre-reg).
   */
  eventRing?: EventRing;
  /**
   * Watcher factory for FS-event-driven event emission.
   * Default uses node:fs.watch via defaultWatcherFactory
   * (S02-validated pattern). Tests inject a stub factory
   * whose returned watchers can be triggered synchronously,
   * avoiding real fs.watch flake in CI. Added in DAEMON-T13.
   */
  watcherFactory?: WatcherFactory;
  /**
   * Native notification dispatch fn. Default = defaultNotify
   * which wraps node-notifier. Tests inject a recording stub
   * (fixture default) or a per-test custom stub. Added in
   * DAEMON-T16.
   */
  notify?: NotifyFn;
  /**
   * Whether native notifications are available at startup.
   * When undefined, startup runs the S03 probe (2s timeout
   * via node-notifier). Tests pass an explicit boolean to
   * skip the probe and fix the value deterministically.
   * Added in DAEMON-T16.
   */
  notificationsAvailable?: boolean;
  /**
   * Z-3: dispatch-web/dist root path for @fastify/static
   * registration. When undefined, static-serve is NOT
   * registered (dev-mode where Vite serves the SPA). When
   * provided, daemon serves SPA assets at / + /assets/* +
   * SPA fall-through for client-routed paths.
   *
   * Added under operator-arbitrated §3.4 mechanical-translation
   * carve-out. Pattern matches existing tokenPath /
   * registryPath / archiveRoot opt precedent: test-injectable
   * + production-tunable + monorepo-default-friendly.
   */
  staticRoot?: string;
}

export interface StartupHandle {
  server: FastifyInstance;
  port: number;
  /**
   * Current auth token value. Populated by DAEMON-T02 green. Optional
   * here so T01's StartupHandle consumers stay compatible during the
   * T02 red window where the field is unpopulated.
   */
  token?: string;
  /**
   * Direct event emit fn. Production callers don't use this — routes
   * receive `emit` via DI from the bus. Exposed on the handle as a
   * test seam so the fixture can let tests trigger emits without an
   * HTTP round-trip (T12 P3/P4). Added in DAEMON-T12.
   */
  emit: EmitFn;
  /**
   * Watcher manager handle. Production callers don't use this; the
   * close handler invokes closeAll() on shutdown. Exposed on the
   * handle so the fixture can issue triggerHandoffWrite() helper
   * calls and so close() can tear down watchers cleanly. Added in
   * DAEMON-T13.
   */
  watcherManager: WatcherManager;
  close: () => Promise<void>;
}

export async function startup(opts: StartupOpts = {}): Promise<StartupHandle> {
  const host = opts.host ?? '127.0.0.1';
  const requestedPort = opts.port ?? 7878;
  const tokenPath = opts.tokenPath ?? defaultTokenPath();
  const startedAt = Date.now();
  const eventRing = opts.eventRing ?? createEventRing();
  const bus = createEventBus(eventRing);
  const watcherManager = createWatcherManager({
    factory: opts.watcherFactory ?? defaultWatcherFactory,
    emit: bus.emit,
  });

  // T16: notifications availability — opt wins; otherwise
  // run the S03 production probe (skipped in tests via opt).
  const notificationsAvailable =
    opts.notificationsAvailable !== undefined
      ? opts.notificationsAvailable
      : await probeNotificationsAvailable();
  const notify = opts.notify ?? defaultNotify;

  const app = await buildServer({ logger: opts.logger });

  // DAEMON-T12: register WS plugin BEFORE routes so /v2/events/stream
  // can use { websocket: true }. Plugin registration is independent
  // of auth (T02 hook below covers WS upgrade auth via path branching).
  await app.register(websocket);

  // DAEMON-T04: server-wide error + not-found handlers (JSON
  // {"error": "..."} shape per §4 + S05 ADR). Register before
  // routes so all subsequent handlers inherit the shape.
  // Z-3: pass staticRoot so unmatched non-/v2/* GETs fall through
  // to index.html (SPA client routes). /v2/* unmatched still
  // returns JSON 404 per S05.
  registerErrorHandler(app, { staticRoot: opts.staticRoot });

  // DAEMON-T02: load or create the auth token, register the
  // consolidated onRequest hook, register the rotate endpoint.
  const initialToken = await getOrCreateToken(tokenPath);
  const tokenRef: TokenRef = { value: initialToken };
  app.addHook('onRequest', createAuthHook(tokenRef));
  await registerAuthRoutes(app, { tokenRef, tokenPath });

  // DAEMON-T16: GET /v2/health per S03 contract-additive
  // change to §4.1. Auth-exempt via auth.ts:74-76 path
  // bypass; the route's own handler doesn't enforce auth.
  await registerHealthRoutes(app, {
    version: '0.0.0',
    startedAt,
    notificationsAvailable,
  });

  // T16: notifications consumer — subscribes to bus emit
  // fan-out (parallel to T12 WS consumer). Filters to
  // eligible event types and calls notify. No-op handle
  // when notificationsAvailable is false (S03 §Graceful
  // degradation).
  const notifications = startNotifications({
    bus,
    notify,
    available: notificationsAvailable,
    logger: app.log as unknown as { warn: (...args: unknown[]) => void },
  });

  // S03 followup #2: log notification state explicitly so
  // operators see it without querying /v2/health.
  app.log.info(
    { available: notificationsAvailable },
    notificationsAvailable
      ? 'notifications: enabled'
      : 'notifications: disabled (probe-failed or opted-out)',
  );

  // DAEMON-T06: GET /v2/sessions + GET /v2/sessions/:name, consuming
  // T05's readRegistryV2. Registered after auth so the hook gates
  // these routes (§3.1 token required).
  await registerSessionsReadRoutes(app, { registryPath: opts.registryPath });

  // DAEMON-T07: POST /v2/sessions with Blocker 1 (state='armed') +
  // Blocker 3 (409 on name collision, verbatim body on killed).
  // T13: watcherManager.attach is called after successful registry
  // write so newly-created sessions get an immediate handoff watcher.
  await registerSessionsWriteRoutes(app, {
    registryPath: opts.registryPath,
    watcherManager,
  });

  // DAEMON-T08: PATCH /v2/sessions/:name/state with §6.1 transition
  // rules and tmux side effects (Ctrl-C on armed→held, kill-session
  // on →killed). tmuxOps injectable for tests. T12 emit-wiring:
  // emits state_changed after successful registry write. T13:
  // watcherManager.detach on killed transition tears watcher down.
  await registerSessionsStateRoutes(app, {
    registryPath: opts.registryPath,
    tmuxOps: opts.tmuxOps,
    emit: bus.emit,
    watcherManager,
  });

  // DAEMON-T09: POST /v2/sessions/:name/prompts. Validates state
  // precondition (armed only), pre-flights tmux pane liveness,
  // assembles (idempotent footer), archives, delivers via
  // tmuxOps.sendKeys, persists last_prompt_sent_at. T12
  // emit-wiring: emits prompt_sent after successful registry write.
  await registerPromptRoutes(app, {
    registryPath: opts.registryPath,
    archiveRoot: opts.archiveRoot,
    tmuxOps: opts.tmuxOps,
    emit: bus.emit,
  });

  // DAEMON-T10: GET /v2/sessions/:name/handoff. Reads HANDOFF.md,
  // archives, best-effort clipboard copy via clipboardCopy
  // (default = dispatch-core's pbcopy), updates last_handoff_
  // pulled_at.
  await registerHandoffRoutes(app, {
    registryPath: opts.registryPath,
    archiveRoot: opts.archiveRoot,
    clipboardCopy: opts.clipboardCopy,
  });

  // DAEMON-T11: GET /v2/events paginated history. Reads from
  // the T17 ring buffer. D-4 will wire emit-sites (T08/T09/T10)
  // into this same ring.
  await registerEventsRoutes(app, { eventRing });

  // DAEMON-T17a: POST /v2/sessions/:name/violations. Out-of-band
  // cairn-violation + gate-trip reporting per X2 line 266 +
  // RA-01 Option 1 + contract §6.2. Source-state matrix:
  // armed→paused via transition + dual emit; paused/held emit-
  // only; killed → 422.
  await registerViolationsRoutes(app, {
    registryPath: opts.registryPath,
    emit: bus.emit,
    tmuxOps: opts.tmuxOps,
  });

  // DAEMON-T12: WS /v2/events/stream — real-time event broadcast.
  // Subscribes per-connection; emit fan-out goes through bus.
  // Auth handled by T02's onRequest hook (path branching for
  // ?token= query string).
  await registerWsRoutes(app, { bus });

  // Z-3: register @fastify/static after all /v2/* route registrations
  // so /v2/* take precedence by Fastify routing order. wildcard:false
  // keeps unmatched paths going to setNotFoundHandler where SPA
  // fall-through serves index.html for non-/v2/* GETs. Production
  // points staticRoot at packages/dispatch-web/dist; tests use
  // mkdtemp fixture dist with index.html + assets/. When staticRoot
  // is undefined, no static-serve registered (dev-mode where Vite
  // serves the SPA via its own dev server + proxy).
  //
  // Authority chain (operator-arbitrated §3.4 mechanical-translation
  // carve-out, this cycle):
  //   - Operator §3.4 arbitration (Path 1b ack)
  //   - T18 HealthResponse extension precedent (first §3.4 carve-out
  //     in Round 2; structurally additive + derivable from
  //     authoritative source)
  //   - DAEMON-S04 ADR (LaunchAgent + plist; daemon owns static-serve
  //     scope)
  //   - Existing startup.ts opts pattern (tokenPath, registryPath,
  //     archiveRoot precedent)
  if (opts.staticRoot) {
    await app.register(fastifyStatic, {
      root: opts.staticRoot,
      prefix: '/',
      wildcard: false,
    });
    // SPA fall-through is wired via registerErrorHandler's
    // setNotFoundHandler (Z-3 enrichment, staticRoot-aware). No
    // additional handler registration needed here — Fastify rejects
    // double setNotFoundHandler per-prefix.
  }

  // T04 test-only hook: register routes that need to exist before
  // listen (e.g., throwing routes for error-handler probes).
  if (opts.beforeListen) {
    await opts.beforeListen(app);
  }

  // DAEMON-T13: arm watchers for all non-killed sessions in the
  // initial registry. Subsequent attach/detach happens via the
  // POST/PATCH route deps. Reading registry here may surface
  // ENOENT on a fresh install — readRegistryV2 returns an empty
  // registry in that case, so attachAll is a no-op.
  try {
    const initialRegistry = await readRegistryV2(opts.registryPath);
    watcherManager.attachAll(initialRegistry);
  } catch (err) {
    app.log.warn(
      { err: (err as Error).message },
      'failed to read initial registry for watcher attachAll; daemon will continue with no pre-attached watchers',
    );
  }

  await app.listen({ host, port: requestedPort });

  const addr = app.server.address();
  if (!addr || typeof addr === 'string') {
    throw new Error('server did not bind a TCP address');
  }
  const boundPort = addr.port;

  const sigTermHandler = (): void => {
    void handleSignal('SIGTERM');
  };
  const sigIntHandler = (): void => {
    void handleSignal('SIGINT');
  };

  async function handleSignal(signal: string): Promise<void> {
    app.log.info({ signal }, 'shutdown signal received');
    await shutdown({ server: app, watcherManager, notifications });
    process.exit(0);
  }

  process.once('SIGTERM', sigTermHandler);
  process.once('SIGINT', sigIntHandler);

  return {
    server: app,
    port: boundPort,
    token: tokenRef.value,
    emit: bus.emit,
    watcherManager,
    close: async () => {
      process.off('SIGTERM', sigTermHandler);
      process.off('SIGINT', sigIntHandler);
      await shutdown({ server: app, watcherManager, notifications });
    },
  };
}
