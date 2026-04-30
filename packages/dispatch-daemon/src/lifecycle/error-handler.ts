/**
 * Server-wide error + not-found handlers per DAEMON-S05 ADR:
 * every error response is JSON `{"error": "<human message>"}` with
 * status from `err.statusCode` when present (else 500). Unknown
 * routes land on the not-found handler and return 404 with the
 * same body shape.
 *
 * Stack traces and internal error fields are NEVER exposed in the
 * response body; they go to Pino via `request.log.error` so they
 * remain visible to operators reading launchd StandardOutPath logs
 * without leaking to HTTP clients.
 *
 * T02's auth hook short-circuits with `reply.code(401).send({...})`
 * directly rather than throwing, so auth 401s don't flow through
 * this error handler — they're shaped inline in auth.ts. This
 * handler covers everything else: thrown Errors from route handlers
 * and the implicit not-found fallback.
 */

import type { FastifyInstance } from 'fastify';

function hasStatusCode(err: unknown): err is { statusCode: number } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as { statusCode: unknown }).statusCode === 'number'
  );
}

export interface RegisterErrorHandlerOpts {
  /**
   * Z-3: when set, enables SPA fall-through for non-/v2/* GETs.
   * Unmatched non-/v2/* GET routes serve index.html from this
   * directory (so URL-fragment focus paths like /#session=sherpa
   * load the SPA on first hit). /v2/* unmatched still returns
   * JSON 404 per S05 ADR.
   *
   * When undefined, original behavior preserved: all unmatched
   * paths return JSON 404 (existing daemon-only test scenarios).
   */
  staticRoot?: string;
}

export function registerErrorHandler(
  app: FastifyInstance,
  opts: RegisterErrorHandlerOpts = {},
): void {
  app.setErrorHandler((err, request, reply) => {
    request.log.error({ err }, 'unhandled error in route handler');
    const statusCode = hasStatusCode(err) ? err.statusCode : 500;
    const message =
      err instanceof Error && typeof err.message === 'string' && err.message.length > 0
        ? err.message
        : 'Internal Server Error';
    reply.code(statusCode).send({ error: message });
  });

  const staticRoot = opts.staticRoot;
  app.setNotFoundHandler((request, reply) => {
    const pathOnly = request.url.split('?')[0];
    if (
      staticRoot &&
      request.method === 'GET' &&
      !pathOnly.startsWith('/v2/') &&
      !pathOnly.startsWith('/v3/')
    ) {
      // Z-3 SPA fall-through. @fastify/static (registered in
      // startup.ts when staticRoot is set) declares sendFile via
      // FastifyReply augmentation; cast keeps this file independent
      // of the @fastify/static type import.
      //
      // Both /v2/* and /v3/* API surfaces stay JSON-404 per
      // CONDUCTOR_API_CONTRACT.md §10.4 (and the amended §4.6 once
      // the contract amendment lands; coordinated /v3/* surface per
      // WORKSTATION_CONTRACT.md §6).
      return (reply as unknown as {
        sendFile: (filename: string, root: string) => unknown;
      }).sendFile('index.html', staticRoot);
    }
    void reply.code(404).send({ error: 'Not found' });
  });
}
