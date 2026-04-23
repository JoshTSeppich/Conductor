/**
 * Fastify server factory for the Conductor daemon.
 *
 * DAEMON-T01 scope: instantiate Fastify with Pino logging. No routes,
 * hooks, or plugins register here — those are added by downstream
 * tickets (T02 auth hook, T03 /v2/health, T04 error/404 customization,
 * etc.). Tests can pass `logger: false` to silence request logs.
 */

import Fastify, { type FastifyInstance } from 'fastify';

export interface BuildServerOpts {
  /**
   * Fastify logger configuration.
   * - `true` / omitted: Pino at `info` level
   * - `false`: disabled (test ergonomics)
   * - object: passed through to Fastify's logger option
   */
  logger?: boolean | { level: string };
}

export async function buildServer(
  opts: BuildServerOpts = {},
): Promise<FastifyInstance> {
  const logger = opts.logger ?? { level: 'info' };
  const app = Fastify({ logger });
  return app;
}
