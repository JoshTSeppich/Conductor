/**
 * CONSOLE-T01 — `/v3/sessions/:name/console/*` routes.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7 (frozen at a7e8d4f, v2.2.0).
 * Five endpoints:
 *   - POST /v3/sessions/:name/console/stdin (cluster 2 — this commit)
 *   - WS   /v3/sessions/:name/console/stream (cluster 3 — pending)
 *   - POST /v3/sessions/:name/console/signal (cluster 4 — pending)
 *   - GET  /v3/sessions/:name/console/buffer (cluster 5 — pending)
 *   - GET  /v3/sessions/:name/console/status (cluster 5 — pending)
 *
 * All endpoints share:
 *   - Auth via X-Conductor-Token (handled by the consolidated onRequest
 *     hook in lifecycle/auth.ts; /v3/* path branch).
 *   - Path :name resolved against sessions.json via readRegistryV2; 404
 *     SessionNotFound if absent.
 *   - State precondition: state !== 'killed' OR 422 SessionNotRunning.
 *   - JSON error envelope with optional `type` field for §4.7-specific
 *     error types (SessionNotFound, SessionNotRunning, EncodingInvalid,
 *     SignalNotSupported, ConsoleBufferUnavailable, BackpressureRejected).
 */

import type { FastifyInstance } from 'fastify';
import { readRegistryV2 } from '../../migration/schema-v2.js';
import type { ConsoleOps } from '../../console/console-ops.js';
import type { ConsoleStateCoordinator } from '../../console/state.js';

export interface ConsoleRoutesDeps {
  registryPath?: string;
  consoleOps: ConsoleOps;
  state: ConsoleStateCoordinator;
}

interface StdinBody {
  bytes: string;
  encoding?: 'utf8' | 'base64';
}

function isStdinBody(b: unknown): b is StdinBody {
  if (typeof b !== 'object' || b === null) return false;
  const o = b as Record<string, unknown>;
  if (typeof o.bytes !== 'string') return false;
  if (o.encoding !== undefined && o.encoding !== 'utf8' && o.encoding !== 'base64') {
    return false;
  }
  return true;
}

export async function registerConsoleRoutes(
  app: FastifyInstance,
  deps: ConsoleRoutesDeps,
): Promise<void> {
  // ── POST /v3/sessions/:name/console/stdin ─────────────────────────
  app.post<{ Params: { name: string } }>(
    '/v3/sessions/:name/console/stdin',
    async (request, reply) => {
      const { name } = request.params;
      const raw = request.body;

      // Validate the encoding enum first (before bytes-shape check)
      // so EncodingInvalid takes precedence over generic body errors —
      // matches §4.7.2 error-envelope priority.
      if (
        typeof raw === 'object' &&
        raw !== null &&
        'encoding' in raw &&
        (raw as { encoding: unknown }).encoding !== undefined &&
        (raw as { encoding: unknown }).encoding !== 'utf8' &&
        (raw as { encoding: unknown }).encoding !== 'base64'
      ) {
        reply.code(422).send({
          error: `encoding must be "utf8" or "base64"`,
          type: 'EncodingInvalid',
        });
        return;
      }

      if (!isStdinBody(raw)) {
        reply.code(422).send({
          error: 'body must be {bytes: string, encoding?: "utf8" | "base64"}',
        });
        return;
      }

      const registry = await readRegistryV2(deps.registryPath);
      const session = registry.sessions[name];
      if (!session) {
        reply.code(404).send({
          error: `no session registered as "${name}"`,
          type: 'SessionNotFound',
        });
        return;
      }
      // §4.7.2: "sessions in KILLED state return SessionNotRunning".
      if (session.state === 'killed') {
        reply.code(422).send({
          error: `session "${name}" is in killed state`,
          type: 'SessionNotRunning',
        });
        return;
      }

      // Decode bytes per encoding (default utf8).
      const encoding = raw.encoding ?? 'utf8';
      let bytes: Buffer;
      if (encoding === 'utf8') {
        bytes = Buffer.from(raw.bytes, 'utf8');
      } else {
        bytes = Buffer.from(raw.bytes, 'base64');
      }

      // Write to the pane via the byte-faithful helper (paste-buffer -r).
      try {
        await deps.consoleOps.pasteRawBytes(session.tmux_target, bytes);
      } catch (err) {
        // Per §4.7.2, BackpressureRejected covers PTY-side write
        // saturation. Other failures (ENOENT etc.) also surface here
        // because the route does not have finer information; client
        // should treat as transient.
        request.log.warn(
          { target: session.tmux_target, err: (err as Error).message },
          'pasteRawBytes failed',
        );
        reply.code(503).send({
          error: `failed to write to pane: ${(err as Error).message}`,
          type: 'BackpressureRejected',
        });
        return;
      }

      const atIso = new Date().toISOString();
      const stdin_seq = deps.state.recordStdinWrite(name, atIso);

      reply.code(200).send({ accepted: true, stdin_seq });
    },
  );
}
