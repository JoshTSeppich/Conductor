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

import type { FastifyInstance } from 'fastify';
import { buildServer, type BuildServerOpts } from '../server.js';
import { shutdown } from './shutdown.js';

export interface StartupOpts {
  /** Bind host. Default `127.0.0.1` (localhost-only per contract §3.4). */
  host?: string;
  /** Bind port. Default `7878`. Pass `0` for ephemeral (tests). */
  port?: number;
  /** Logger configuration, passed through to buildServer. */
  logger?: BuildServerOpts['logger'];
}

export interface StartupHandle {
  server: FastifyInstance;
  port: number;
  close: () => Promise<void>;
}

export async function startup(opts: StartupOpts = {}): Promise<StartupHandle> {
  const host = opts.host ?? '127.0.0.1';
  const requestedPort = opts.port ?? 7878;

  const app = await buildServer({ logger: opts.logger });
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
    close: async () => {
      process.off('SIGTERM', sigTermHandler);
      process.off('SIGINT', sigIntHandler);
      await shutdown({ server: app });
    },
  };
}
