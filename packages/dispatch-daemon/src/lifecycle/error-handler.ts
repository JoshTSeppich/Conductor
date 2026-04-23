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

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, request, reply) => {
    request.log.error({ err }, 'unhandled error in route handler');
    const statusCode = hasStatusCode(err) ? err.statusCode : 500;
    const message =
      err instanceof Error && typeof err.message === 'string' && err.message.length > 0
        ? err.message
        : 'Internal Server Error';
    reply.code(statusCode).send({ error: message });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: 'Not found' });
  });
}
