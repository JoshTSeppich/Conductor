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
import type { BroadcastRegistry } from '../../console/broadcaster.js';
import { earliestStdoutSeq, getLinesAfter, getLinesBefore, getStats, maxStdoutSeq } from '../../console/buffer.js';
import type Database from 'better-sqlite3';

export interface ConsoleRoutesDeps {
  registryPath?: string;
  consoleOps: ConsoleOps;
  state: ConsoleStateCoordinator;
  broadcasters: BroadcastRegistry;
  db: Database.Database;
}

interface SubscribeMsg {
  type: 'subscribe';
  last_seq: number;
}

function isSubscribeMsg(v: unknown): v is SubscribeMsg {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return o.type === 'subscribe' && typeof o.last_seq === 'number';
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

  // ── GET /v3/sessions/:name/console/buffer ─────────────────────────
  // Per §4.7.5: paginated scrollback. before_seq + max_lines query
  // params; default 100, max 5000.
  app.get<{ Params: { name: string }; Querystring: { before_seq?: string; max_lines?: string } }>(
    '/v3/sessions/:name/console/buffer',
    async (request, reply) => {
      const { name } = request.params;
      const { before_seq, max_lines } = request.query;
      const beforeSeq = before_seq != null ? parseInt(before_seq, 10) : null;
      let maxLines = max_lines != null ? parseInt(max_lines, 10) : 100;
      if (!Number.isFinite(maxLines) || maxLines <= 0) maxLines = 100;
      if (maxLines > 5000) maxLines = 5000;

      const registry = await readRegistryV2(deps.registryPath);
      const session = registry.sessions[name];
      if (!session) {
        reply.code(404).send({
          error: `no session registered as "${name}"`,
          type: 'SessionNotFound',
        });
        return;
      }
      const s = deps.state.state(name);
      if (!s.buffer_enabled) {
        reply.code(422).send({
          error: `daemon-side buffering disabled for session "${name}"`,
          type: 'ConsoleBufferUnavailable',
        });
        return;
      }

      const rows = getLinesBefore(deps.db, name, beforeSeq, maxLines);
      const stats = getStats(deps.db, name);
      reply.code(200).send({
        lines: rows.map((r) => ({
          stdout_seq: r.stdout_seq,
          bytes: r.encoding === 'utf8'
            ? Buffer.from(r.bytes).toString('utf8')
            : Buffer.from(r.bytes).toString('base64'),
          encoding: r.encoding,
        })),
        earliest_in_buffer_seq: stats.earliest_in_buffer_seq,
        latest_in_buffer_seq: stats.latest_in_buffer_seq,
      });
    },
  );

  // ── GET /v3/sessions/:name/console/status ─────────────────────────
  // Per §4.7.6: 8-field status response.
  app.get<{ Params: { name: string } }>(
    '/v3/sessions/:name/console/status',
    async (request, reply) => {
      const { name } = request.params;
      const registry = await readRegistryV2(deps.registryPath);
      const session = registry.sessions[name];
      if (!session) {
        reply.code(404).send({
          error: `no session registered as "${name}"`,
          type: 'SessionNotFound',
        });
        return;
      }
      const s = deps.state.state(name);
      const stats = getStats(deps.db, name);
      reply.code(200).send({
        session_name: name,
        buffer_enabled: s.buffer_enabled,
        buffer_line_count: stats.count,
        earliest_in_buffer_seq: stats.earliest_in_buffer_seq,
        latest_in_buffer_seq: stats.latest_in_buffer_seq,
        current_subscribers: s.subscriber_count,
        last_stdout_activity_at: s.last_stdout_activity_at,
        last_stdin_activity_at: s.last_stdin_activity_at,
      });
    },
  );

  // ── POST /v3/sessions/:name/console/signal ────────────────────────
  // Per §4.7.4 + §4.7.1 signal dispatch table.
  app.post<{ Params: { name: string } }>(
    '/v3/sessions/:name/console/signal',
    async (request, reply) => {
      const { name } = request.params;
      const raw = request.body as { signal?: unknown } | null;
      const sig = raw && typeof raw.signal === 'string' ? raw.signal : null;
      if (sig !== 'SIGINT' && sig !== 'SIGTERM' && sig !== 'SIGHUP') {
        reply.code(422).send({
          error: `signal must be one of: SIGINT, SIGTERM, SIGHUP (got: ${sig})`,
          type: 'SignalNotSupported',
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
      if (session.state === 'killed') {
        reply.code(422).send({
          error: `session "${name}" is in killed state`,
          type: 'SessionNotRunning',
        });
        return;
      }
      try {
        const dispatch_method = await deps.consoleOps.sendSignal(
          session.tmux_target,
          sig,
        );
        reply.code(200).send({ accepted: true, dispatch_method });
      } catch (err) {
        request.log.warn(
          { target: session.tmux_target, err: (err as Error).message, signal: sig },
          'sendSignal failed',
        );
        reply.code(503).send({
          error: `failed to deliver ${sig}: ${(err as Error).message}`,
        });
      }
    },
  );

  // ── WS /v3/sessions/:name/console/stream ──────────────────────────
  // Per §4.7.3: subscribe → backfill_meta → replay → live.
  // Auth handled upstream by the auth hook (?token= query branch added
  // for this path in lifecycle/auth.ts). PTY reader sharing per
  // §4.7.1 enforced by BroadcastRegistry (single attachStream per
  // session regardless of subscriber count).
  app.get<{ Params: { name: string } }>(
    '/v3/sessions/:name/console/stream',
    { websocket: true },
    (socket, request) => {
      const { name } = request.params;
      let unsubscribe: (() => void) | null = null;
      let subscribed = false;

      const sendJSON = (obj: unknown): void => {
        try { socket.send(JSON.stringify(obj)); } catch { /* socket closed */ }
      };

      const teardown = (): void => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };
      socket.on('close', teardown);
      socket.on('error', teardown);

      // Register the message handler SYNCHRONOUSLY before any await.
      // The ws library does NOT buffer messages received before the
      // 'message' listener is attached; if the client sends subscribe
      // immediately on open and the server is still awaiting registry
      // I/O, the message would be dropped. Per-message handler reads
      // the registry on demand.
      socket.on('message', (raw) => {
        if (subscribed) return; // Subsequent subscribes ignored.
        let msg: unknown;
        try { msg = JSON.parse(raw.toString('utf8')); }
        catch { return; }
        if (!isSubscribeMsg(msg)) {
          sendJSON({ type: 'error', error: 'expected {type:"subscribe", last_seq:number}' });
          return;
        }
        subscribed = true;

        // Async pipeline: lookup session, attach broadcaster, replay,
        // go live. The handler doesn't await — we kick it off and let
        // the WS lifecycle run.
        void (async () => {
          try {
            const registry = await readRegistryV2(deps.registryPath);
            const session = registry.sessions[name];
            if (!session) {
              sendJSON({
                type: 'error',
                error: `no session registered as "${name}"`,
                error_type: 'SessionNotFound',
              });
              socket.close(4404, 'SessionNotFound');
              return;
            }
            if (session.state === 'killed') {
              sendJSON({
                type: 'error',
                error: `session "${name}" is in killed state`,
                error_type: 'SessionNotRunning',
              });
              socket.close(4422, 'SessionNotRunning');
              return;
            }

            const lastSeq = (msg as SubscribeMsg).last_seq;
            const currentSeq = maxStdoutSeq(deps.db, name);
            const earliest = earliestStdoutSeq(deps.db, name);
            // backfill_complete = true iff there's NO eviction-window
            // gap between the client's last_seq and what's still in
            // the ring. If the buffer is empty, no gap by definition.
            const backfillComplete =
              earliest == null ? true : earliest <= lastSeq + 1;
            sendJSON({
              type: 'backfill_meta',
              current_seq: currentSeq,
              available_from_seq: earliest ?? 0,
              backfill_complete: backfillComplete,
            });

            // Replay backfill (lines with stdout_seq > lastSeq).
            const backfill = getLinesAfter(deps.db, name, lastSeq, 50_000);
            for (const row of backfill) {
              sendJSON({
                type: 'line',
                stdout_seq: row.stdout_seq,
                bytes: row.encoding === 'utf8'
                  ? Buffer.from(row.bytes).toString('utf8')
                  : Buffer.from(row.bytes).toString('base64'),
                encoding: row.encoding,
              });
            }

            // Subscribe to live broadcast.
            const broadcaster = deps.broadcasters.forSession(name, session.tmux_target);
            unsubscribe = broadcaster.subscribe((live) => {
              sendJSON({
                type: 'line',
                stdout_seq: live.stdout_seq,
                bytes: live.encoding === 'utf8'
                  ? live.bytes.toString('utf8')
                  : live.bytes.toString('base64'),
                encoding: live.encoding,
              });
            });
          } catch (err) {
            request.log.error(
              { err: (err as Error).message },
              'console stream subscribe pipeline error',
            );
            try { socket.close(1011, 'internal error'); } catch {}
          }
        })();
      });
    },
  );
}
