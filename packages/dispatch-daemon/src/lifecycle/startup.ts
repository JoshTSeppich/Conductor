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
import { buildServer, type BuildServerOpts } from '../server.js';
import { createAuthHook, getOrCreateToken, type TokenRef } from './auth.js';
import { registerErrorHandler } from './error-handler.js';
import { registerAuthRoutes } from '../routes/auth.js';
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
  close: () => Promise<void>;
}

export async function startup(opts: StartupOpts = {}): Promise<StartupHandle> {
  const host = opts.host ?? '127.0.0.1';
  const requestedPort = opts.port ?? 7878;
  const tokenPath = opts.tokenPath ?? defaultTokenPath();

  const app = await buildServer({ logger: opts.logger });

  // DAEMON-T04: server-wide error + not-found handlers (JSON
  // {"error": "..."} shape per §4 + S05 ADR). Register before
  // routes so all subsequent handlers inherit the shape.
  registerErrorHandler(app);

  // DAEMON-T02: load or create the auth token, register the
  // consolidated onRequest hook, register the rotate endpoint.
  const initialToken = await getOrCreateToken(tokenPath);
  const tokenRef: TokenRef = { value: initialToken };
  app.addHook('onRequest', createAuthHook(tokenRef));
  await registerAuthRoutes(app, { tokenRef, tokenPath });

  // DAEMON-T06: GET /v2/sessions + GET /v2/sessions/:name, consuming
  // T05's readRegistryV2. Registered after auth so the hook gates
  // these routes (§3.1 token required).
  await registerSessionsReadRoutes(app, { registryPath: opts.registryPath });

  // DAEMON-T07: POST /v2/sessions with Blocker 1 (state='armed') +
  // Blocker 3 (409 on name collision, verbatim body on killed).
  await registerSessionsWriteRoutes(app, { registryPath: opts.registryPath });

  // DAEMON-T08: PATCH /v2/sessions/:name/state with §6.1 transition
  // rules and tmux side effects (Ctrl-C on armed→held, kill-session
  // on →killed). tmuxOps injectable for tests.
  await registerSessionsStateRoutes(app, {
    registryPath: opts.registryPath,
    tmuxOps: opts.tmuxOps,
  });

  // T04 test-only hook: register routes that need to exist before
  // listen (e.g., throwing routes for error-handler probes).
  if (opts.beforeListen) {
    await opts.beforeListen(app);
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
    await shutdown({ server: app });
    process.exit(0);
  }

  process.once('SIGTERM', sigTermHandler);
  process.once('SIGINT', sigIntHandler);

  return {
    server: app,
    port: boundPort,
    token: tokenRef.value,
    close: async () => {
      process.off('SIGTERM', sigTermHandler);
      process.off('SIGINT', sigIntHandler);
      await shutdown({ server: app });
    },
  };
}
