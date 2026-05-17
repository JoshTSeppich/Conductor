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
import {
  CreateSessionRequest,
  PatchStateRequest,
  type CostInfo,
  type SessionV2,
} from 'dispatch-core/src/v2/schema.js';
import type Database from 'better-sqlite3';
import { readRegistryV2, writeRegistryV2 } from '../migration/schema-v2.js';
import {
  transitionSessionState,
  type TmuxOps,
} from '../state/transitions.js';
import type { EmitFn } from '../events/bus.js';
import type { WatcherManager } from '../watchers/manager.js';
import { deleteSessionPolicy } from '../db/session-policies.js';

/** fd v1 default. Tracked under DAEMON-F04 threshold-tuning followup. */
const STALE_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * Per-session mock CostInfo emitted on every read (MB-F-DAEMON-PLAN-COST-ENDPOINTS,
 * sess-i parallel-batch-6, operator-arbitrated I-Q5=a).
 *
 * Values:
 *   - usd_today:      0.42  matches packages/dispatch-web/src/components/Layout.tsx:25
 *                           MOCK_USD_TODAY for visual transition symmetry
 *   - usd_this_month: 8.17  Phase 1 §3.2 recommendation accepted via Q-I5=a "etc."
 *   - token_count:    124500
 *
 * Deferred to a future batch (Tier-2 followup MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION):
 * real Anthropic API integration + per-session cost aggregation. Until then, the
 * daemon returns this constant on every read so the schema/UI surface ships now
 * without blocking on the real-integration work.
 *
 * Drift between this constant and probe-08/probe-09 EXPECTED_MOCK_COST_INFO will
 * fail those tests — they are the regression shield for the contract.
 */
const MOCK_COST_INFO: CostInfo = {
  usd_today: 0.42,
  usd_this_month: 8.17,
  token_count: 124_500,
};

export interface SessionsRoutesDeps {
  registryPath?: string;
  /** T13: write route attaches a watcher after successful create.
   *  Read route ignores this. Optional so legacy tests pass. */
  watcherManager?: WatcherManager;
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
        // session.plan_info propagates via the spread when present
        // (optional per Q-I3=a); cost_info attached unconditionally
        // per Q-I5=a (request-time computed mock until real Anthropic
        // API integration lands in a future batch).
        return {
          name,
          ...session,
          computed_status,
          cost_info: MOCK_COST_INFO,
        };
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
      // session.plan_info propagates via the spread when present
      // (optional per Q-I3=a); cost_info attached unconditionally
      // per Q-I5=a (mock values; real integration deferred to
      // Tier-2 followup MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION).
      return {
        name,
        ...session,
        computed_status,
        status_json: null,
        recent_events: [],
        cost_info: MOCK_COST_INFO,
      };
    },
  );
}

/**
 * POST /v2/sessions — create a new session per contract §4.3.
 *
 * Validates request body via CreateSessionRequest (operator-published
 * schema). On collision with an existing name:
 *   - state:'killed' existing → 409 with operator-arbitrated Blocker 3
 *     verbatim body: "Session name in use (killed record exists).
 *     Pick a new name."
 *   - any other state (armed/paused/held) → 409 with accurate non-
 *     misleading body: "Session \"<name>\" already registered."
 *     (operator-acked Option 1 at T07 pre-reg; style matches T06's
 *     404 "no session registered as \"<name>\"" for consistency)
 *
 * On success: creates session with state='armed' per Blocker 1, all
 * other v2 fields initialized to null, atomic-writes via T05's
 * writeRegistryV2, returns 201 with the 10-field shape (matches T06
 * list-array item shape per operator-acked decision (b) on "full
 * session entry").
 */
export async function registerSessionsWriteRoutes(
  app: FastifyInstance,
  deps: SessionsRoutesDeps,
): Promise<void> {
  app.post('/v2/sessions', async (request, reply) => {
    const parsed = CreateSessionRequest.safeParse(request.body);
    if (!parsed.success) {
      reply.code(422).send({ error: parsed.error.message });
      return;
    }
    const { name, cwd, tmux_target, handoff_path } = parsed.data;

    const registry = await readRegistryV2(deps.registryPath);
    const existing = registry.sessions[name];
    if (existing) {
      if (existing.state === 'killed') {
        reply.code(409).send({
          error: 'Session name in use (killed record exists). Pick a new name.',
        });
      } else {
        reply.code(409).send({
          error: `Session "${name}" already registered.`,
        });
      }
      return;
    }

    const newSession: SessionV2 = {
      cwd,
      tmux_target,
      handoff_path,
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
    };

    registry.sessions[name] = newSession;
    await writeRegistryV2(deps.registryPath, registry);

    // T13: arm watcher AFTER successful registry write so a
    // watcher leak can't outlive a failed create.
    deps.watcherManager?.attach(name, newSession);

    const now = new Date();
    const computed_status = await deriveComputedStatus(newSession, now);

    reply.code(201).send({
      name,
      ...newSession,
      computed_status,
    });
  });
}

/**
 * PATCH /v2/sessions/:name/state — operator-initiated state transition
 * per contract §4.3 + §6.1.
 *
 * Delegates state-machine logic + side effects + persistence to the
 * shared `transitionSessionState` helper. `triggeredBy: 'operator'`
 * reflects that this endpoint is the operator-initiated path; the
 * same helper is reused by T17a with a different triggeredBy value
 * for cairn/gate-triggered transitions.
 *
 * Typed errors (SessionNotFoundError 404, InvalidTransitionError 422)
 * flow through T04's setErrorHandler automatically — they carry
 * `statusCode` so the error handler maps them to the correct HTTP
 * status with `{"error": "..."}` JSON body. Zod parse failures on
 * the request body are handled inline → 422.
 */
export interface SessionsStateRoutesDeps {
  registryPath?: string;
  tmuxOps?: TmuxOps;
  /** T12 emit-wiring: bus.emit fires state_changed after
   *  successful registry write. Optional so tests that don't
   *  observe events can omit it. */
  emit?: EmitFn;
  /** T13: detach watcher when transitioning to killed (terminal
   *  state per §6.1; no further events expected). Optional. */
  watcherManager?: WatcherManager;
  /** MB-F-T13-SESSION-POLICY-CLEANUP-ON-KILL (FOLLOWUPS.md:170):
   *  delete the session_policies row on transition to killed so a
   *  re-spawn under the same name cannot pick up a stale policy.
   *  Best-effort housekeeping; failure is tolerated and does not
   *  500 a successful state transition (mirrors tmux-failure
   *  tolerance at the killSession site per DAEMON-T08 P8 +
   *  DAEMON-F10). Optional so tests that don't exercise the v3
   *  SQLite layer can omit it. */
  db?: Database.Database;
}

export async function registerSessionsStateRoutes(
  app: FastifyInstance,
  deps: SessionsStateRoutesDeps,
): Promise<void> {
  app.patch<{ Params: { name: string } }>(
    '/v2/sessions/:name/state',
    async (request, reply) => {
      const { name } = request.params;
      const parsed = PatchStateRequest.safeParse(request.body);
      if (!parsed.success) {
        reply.code(422).send({ error: parsed.error.message });
        return;
      }
      const { state: targetState } = parsed.data;

      const result = await transitionSessionState({
        name,
        targetState,
        triggeredBy: 'operator',
        registryPath: deps.registryPath,
        tmuxOps: deps.tmuxOps,
        logger: request.log as unknown as { warn: (...args: unknown[]) => void },
      });

      // T12 emit-wiring: state_changed fires AFTER successful
      // registry write. Per T08 MODELED + DAEMON-F10, tmux side
      // effect failures are tolerated and the transition still
      // succeeds — emit reflects state-change success regardless
      // of tmux outcome.
      deps.emit?.({
        session: name,
        type: 'state_changed',
        data: {
          from: result.previousState,
          to: targetState,
          triggered_by: 'operator',
        },
      });

      // T13: detach watcher on terminal-state transition. No
      // further handoff_written events are expected from a
      // killed session.
      //
      // MB-F-T13-SESSION-POLICY-CLEANUP-ON-KILL (FOLLOWUPS.md:170):
      // delete the corresponding session_policies row so a re-spawn
      // under the same name does not pick up a stale policy. Best-
      // effort: a sqlite DELETE failure is tolerated (logged at
      // warn) and the state-transition response remains 200,
      // matching the tmux-failure tolerance precedent at the
      // killSession site (sessions.ts:278-281 comment).
      if (targetState === 'killed') {
        deps.watcherManager?.detach(name);
        if (deps.db) {
          try {
            deleteSessionPolicy(deps.db, name);
          } catch (err) {
            request.log.warn(
              { err, session: name },
              'session_policies cleanup failed on killed transition; tolerated',
            );
          }
        }
      }

      const now = new Date();
      const computed_status = await deriveComputedStatus(result.session, now);

      return {
        name,
        ...result.session,
        computed_status,
      };
    },
  );
}
