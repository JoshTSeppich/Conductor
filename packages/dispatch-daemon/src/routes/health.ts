/**
 * GET /v2/health per contract §4.1 + S03 ADR §"/v2/health
 * response shape (contract-additive)".
 *
 * Auth: exempt. T02's onRequest hook (auth.ts:74-76) returns
 * early when path === '/v2/health'; no token header required.
 *
 * Response shape (per S03 contract-additive change to §4.1):
 *   {
 *     status: 'ok',
 *     version: string,
 *     uptime_seconds: number,
 *     notifications_available: boolean
 *   }
 *
 * notifications_available is captured at startup time (probe
 * result OR test-supplied opt) and passed to this route's
 * deps. Static for the lifetime of the process — operator can
 * grant/revoke notification permission via OS settings while
 * daemon runs, but the daemon does not re-probe; restart to
 * surface a permission change. S03 §Followups #1 documents
 * the operator-facing restart-after-grant flow.
 */

import type { FastifyInstance } from 'fastify';

export interface HealthRoutesDeps {
  /** Daemon version string. Sourced from package.json
   *  by startup; passed in here for testability. */
  version: string;
  /** Date.now() at startup time. uptime_seconds derived
   *  per request via Math.floor((now - startedAt) / 1000). */
  startedAt: number;
  /** Result of the S03 startup probe (or test-supplied
   *  override). Static once startup completes. */
  notificationsAvailable: boolean;
}

export async function registerHealthRoutes(
  app: FastifyInstance,
  deps: HealthRoutesDeps,
): Promise<void> {
  app.get('/v2/health', async () => {
    return {
      status: 'ok' as const,
      version: deps.version,
      uptime_seconds: Math.floor((Date.now() - deps.startedAt) / 1000),
      notifications_available: deps.notificationsAvailable,
    };
  });
}
