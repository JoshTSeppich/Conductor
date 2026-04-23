/**
 * Sessions read endpoints per contract §4.2:
 *   GET /v2/sessions          — list all sessions
 *   GET /v2/sessions/:name    — single session detail
 *
 * First production consumer of T05's readRegistryV2 migration layer.
 * Uses dispatch-core's frozen deriveState to compute the
 * `computed_status` field (idle/running/awaiting_review/stale) per
 * session from its last_prompt_sent_at + last_handoff_pulled_at +
 * on-disk HANDOFF.md mtime.
 *
 * Both endpoints are auth-gated via the consolidated onRequest hook
 * registered in startup (T02). This module does not touch auth.
 *
 * MODELED fields in the single-session response (per contract §4.2
 * shape; forward compatibility contract for D-4/D-5 tickets):
 *   status_json: null   → populated by T15 (D-4 STATUS.json parser)
 *   recent_events: []   → populated by T17 (D-5 ring buffer)
 *
 * Sort order for the list endpoint: alphabetic by session name,
 * matching fd v1's runList convention. MODELED — revisable per
 * operator preference.
 */

import type { FastifyInstance } from 'fastify';
import { stat } from 'node:fs/promises';
import { deriveState, type SessionState } from 'dispatch-core/src/state/derive.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';
import { readRegistryV2 } from '../migration/schema-v2.js';

/** fd v1 default. Tracked under DAEMON-F04 threshold-tuning followup. */
const STALE_THRESHOLD_MS = 30 * 60 * 1000;

export interface SessionsRoutesDeps {
  registryPath?: string;
}

async function deriveComputedStatus(
  session: SessionV2,
  now: Date,
): Promise<SessionState> {
  let handoff_mtime: Date | null = null;
  try {
    const s = await stat(session.handoff_path);
    handoff_mtime = s.mtime;
  } catch {
    // handoff file absent — deriveState treats this as no-handoff
  }
  return deriveState({
    last_prompt_sent_at: session.last_prompt_sent_at,
    last_handoff_pulled_at: session.last_handoff_pulled_at,
    handoff_mtime,
    now,
    stale_threshold_ms: STALE_THRESHOLD_MS,
  });
}

export async function registerSessionsReadRoutes(
  app: FastifyInstance,
  deps: SessionsRoutesDeps,
): Promise<void> {
  app.get('/v2/sessions', async () => {
    const registry = await readRegistryV2(deps.registryPath);
    const now = new Date();
    const entries = await Promise.all(
      Object.entries(registry.sessions).map(async ([name, session]) => {
        const computed_status = await deriveComputedStatus(session, now);
        return { name, ...session, computed_status };
      }),
    );
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return { sessions: entries };
  });

  app.get<{ Params: { name: string } }>(
    '/v2/sessions/:name',
    async (request, reply) => {
      const { name } = request.params;
      const registry = await readRegistryV2(deps.registryPath);
      const session = registry.sessions[name];
      if (!session) {
        reply.code(404).send({ error: `no session registered as "${name}"` });
        return;
      }
      const now = new Date();
      const computed_status = await deriveComputedStatus(session, now);
      return {
        name,
        ...session,
        computed_status,
        status_json: null,
        recent_events: [],
      };
    },
  );
}
