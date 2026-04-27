/**
 * WS /v2/events/stream per contract §5.1 + §5.2.
 *
 * Auth handled upstream by T02's consolidated onRequest hook
 * (auth.ts:78-89): for /v2/events/stream the hook reads
 * ?token=<token> from the query string. Mismatch → 401 BEFORE
 * the upgrade completes (S01 spike P2/P3 verified pattern).
 *
 * Wire shape (per arbitration 4 Option A on T12 pre-reg):
 * 4-field §5.2 verbatim {type, timestamp, session, data}.
 * event_id stays server-side (ring + HTTP /v2/events). Wire
 * projection happens in toWireEvent.
 *
 * Per-connection lifecycle:
 *   open  → subscribe() to bus (gets a fresh EventQueue)
 *   pump  → for-await drain queue → socket.send(JSON)
 *           checks bufferedAmount each iteration; closes 1009
 *           if backpressure threshold exceeded
 *   close → unsubscribe (closes queue, drops from fan-out set)
 */

import type { FastifyInstance } from 'fastify';
import type { EventBus } from '../events/bus.js';
import type { EventRecord } from '../events/history.js';

export interface WsRoutesDeps {
  bus: EventBus;
}

interface WireEvent {
  type: string;
  timestamp: string;
  session: string;
  data: unknown;
}

function toWireEvent(rec: EventRecord): WireEvent {
  return {
    type: rec.type,
    timestamp: rec.timestamp,
    session: rec.session,
    data: rec.data,
  };
}

export async function registerWsRoutes(
  app: FastifyInstance,
  deps: WsRoutesDeps,
): Promise<void> {
  app.get('/v2/events/stream', { websocket: true }, (socket, req) => {
    const { queue, unsubscribe } = deps.bus.subscribe();

    let teardownDone = false;
    const teardown = (): void => {
      if (teardownDone) return;
      teardownDone = true;
      unsubscribe();
    };

    socket.on('close', teardown);
    socket.on('error', teardown);

    void (async () => {
      try {
        for await (const rec of queue) {
          if (queue.shouldDisconnect(socket.bufferedAmount)) {
            req.log.warn(
              { bufferedAmount: socket.bufferedAmount },
              'WS client backpressure exceeded; closing 1009 (client should reconnect + GET /v2/events?since=<last>)',
            );
            socket.close(1009, 'backpressure');
            teardown();
            return;
          }
          socket.send(JSON.stringify(toWireEvent(rec)));
        }
      } catch (err) {
        req.log.error(
          { err: (err as Error).message },
          'WS pump loop error',
        );
        teardown();
      }
    })();
  });
}
