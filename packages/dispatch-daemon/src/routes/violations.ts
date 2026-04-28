/**
 * POST /v2/sessions/:name/violations per X2 line 266 + RA-01
 * Option 1 + contract §6.2.
 *
 * Out-of-band cairn-violation + gate-trip reporting from
 * operator UI / external tools. Validates session existence
 * and source-state precondition, conditionally transitions
 * via shared transitionSessionState helper, emits the
 * required §5.3 events through the bus, returns 202 +
 * {event_id} per X2.
 *
 * Round 2 Finding #32 attribution (corrected at pre-red):
 * §6.2 verbatim says cairn-triggered transitions force →
 * paused (NOT held — pre-reg authoring + ack both said
 * held; §6.2 verbatim re-read caught the divergence).
 *
 * Source-state matrix:
 *   armed  → transition armed→paused via shared helper
 *            (no Ctrl-C side effect per §6.1 verbatim:
 *            "armed → paused (operator-initiated; no side
 *            effect on CC)"); emit state_changed +
 *            violation/gate event in that order (arb 3A)
 *   paused → already at target; skip transition; emit only
 *            violation/gate event
 *   held   → §6.1 disallows held→paused; emit-only fills
 *            §6.2 contract gap with audit-trail rationale.
 *            Documented asymmetry vs T08 PATCH state route
 *            (which is §6.1-strict — held→paused returns
 *            422 there). T17a is cairn-triggered per §6.2
 *            and tolerates non-armed sources via emit-only-
 *            no-transition.
 *   killed → 422 verbatim "cannot report violation on
 *            terminal session" per X2 line 266
 *
 * Response event_id: violation/gate event's id (arb 4A —
 * caller acknowledges THAT specific report; state_changed
 * is derived consequence).
 *
 * Concurrent-write race: shared with T07/T08/T14/T15 per
 * arb 6 — known limitation, covered by composite followup
 * DAEMON-F-watcher-registry-mutex.
 */

import type { FastifyInstance } from 'fastify';
import { ReportViolationRequest } from 'dispatch-core/src/v2/schema.js';
import { readRegistryV2 } from '../migration/schema-v2.js';
import {
  transitionSessionState,
  type TmuxOps,
} from '../state/transitions.js';
import type { EmitFn } from '../events/bus.js';

export interface ViolationsRoutesDeps {
  registryPath?: string;
  emit: EmitFn;
  tmuxOps?: TmuxOps;
}

export async function registerViolationsRoutes(
  app: FastifyInstance,
  deps: ViolationsRoutesDeps,
): Promise<void> {
  app.post<{ Params: { name: string } }>(
    '/v2/sessions/:name/violations',
    async (request, reply) => {
      const { name } = request.params;

      const parsed = ReportViolationRequest.safeParse(request.body);
      if (!parsed.success) {
        reply.code(422).send({ error: parsed.error.message });
        return;
      }
      const validated = parsed.data;

      const registry = await readRegistryV2(deps.registryPath);
      const session = registry.sessions[name];
      if (!session) {
        reply
          .code(404)
          .send({ error: `no session registered as "${name}"` });
        return;
      }

      if (session.state === 'killed') {
        reply.code(422).send({
          error: 'cannot report violation on terminal session',
        });
        return;
      }

      const triggeredBy = validated.type; // 'cairn_violation' | 'gate_trip'

      // Source-state branching: only `armed` triggers the
      // shared state-transition helper (which writes
      // registry); paused/held skip transition + emit-only.
      if (session.state === 'armed') {
        await transitionSessionState({
          name,
          targetState: 'paused',
          triggeredBy,
          registryPath: deps.registryPath,
          tmuxOps: deps.tmuxOps,
          logger: request.log as unknown as {
            warn: (...args: unknown[]) => void;
          },
        });

        // Emit state_changed FIRST (arb 3A — consistency
        // with T08 emission point: transition completes,
        // state_changed emits, then other side effects)
        deps.emit({
          session: name,
          type: 'state_changed',
          data: {
            from: 'armed',
            to: 'paused',
            triggered_by: triggeredBy,
          },
        });
      }
      // For paused / held source: skip transition, no
      // state_changed emission.

      // Emit the violation/gate event SECOND (or only, when
      // non-armed source). Capture the record so we can
      // return its event_id in the 202 response (arb 4A).
      const eventType =
        validated.type === 'cairn_violation'
          ? 'cairn_violation_detected'
          : 'gate_trip';
      const violationRec = deps.emit({
        session: name,
        type: eventType,
        data: validated.data,
      });

      reply.code(202).send({ event_id: violationRec.event_id });
    },
  );
}
