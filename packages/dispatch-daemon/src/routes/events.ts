/**
 * GET /v2/events per contract §4.5 — paginated event history.
 *
 * D-3 cluster-closing ticket. Read-side of the event bus.
 * Source: T17 in-memory ring buffer (injected via deps).
 * Emit-side (wiring T08/T09/T10 etc. to call eventRing.emit)
 * is deferred to D-4 per operator arbitration 3 on T11 pre-reg.
 *
 * Request: query params `since` (ISO-8601, exclusive filter)
 * and `limit` (default 100, clamped to 500).
 *
 * Response envelope (operator-arbitrated MODELED defaults):
 *   { events: EventRecord[], next_since: string | null }
 *
 * next_since semantics:
 *   - Non-empty response → timestamp of the last (newest)
 *     event in the returned batch. Client paginates by passing
 *     this back as ?since= on the next poll.
 *   - Empty response → null. Signals "no more events right now";
 *     client reuses its original since cutoff for the next poll.
 *
 * Limit clamp:
 *   - Values > 500 are clamped to 500 and the response carries
 *     `X-Dispatch-Limit-Clamped: true` as operator-debuggable
 *     signal that the requested paging size was adjusted.
 */

import type { FastifyInstance } from 'fastify';
import type { EventRing } from '../events/history.js';

export interface EventsRoutesDeps {
  eventRing: EventRing;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function registerEventsRoutes(
  app: FastifyInstance,
  deps: EventsRoutesDeps,
): Promise<void> {
  app.get<{
    Querystring: { since?: string; limit?: string };
  }>('/v2/events', async (request, reply) => {
    const { since, limit } = request.query;

    // Validate + canonicalize `since` (ISO-8601 → UTC Z form so
    // the T17 string compare stays chronologically correct even
    // if the client sent a non-Z form like `+00:00`).
    let canonicalSince: string | undefined;
    if (since !== undefined) {
      const parsed = new Date(since);
      if (!Number.isFinite(parsed.getTime())) {
        reply.code(422).send({
          error: `invalid since parameter "${since}"; expected ISO-8601 timestamp`,
        });
        return;
      }
      canonicalSince = parsed.toISOString();
    }

    let effectiveLimit = DEFAULT_LIMIT;
    let clamped = false;
    if (limit !== undefined) {
      const parsed = Number(limit);
      if (!Number.isInteger(parsed) || parsed < 1) {
        reply.code(422).send({
          error: `invalid limit parameter "${limit}"; expected positive integer`,
        });
        return;
      }
      if (parsed > MAX_LIMIT) {
        effectiveLimit = MAX_LIMIT;
        clamped = true;
      } else {
        effectiveLimit = parsed;
      }
    }

    const events = deps.eventRing.query({
      since: canonicalSince,
      limit: effectiveLimit,
    });
    const next_since =
      events.length > 0 ? events[events.length - 1].timestamp : null;

    if (clamped) {
      reply.header('X-Dispatch-Limit-Clamped', 'true');
    }

    return { events, next_since };
  });
}
