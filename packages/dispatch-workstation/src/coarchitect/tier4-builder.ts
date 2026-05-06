/**
 * MB-T10 — Tier 4 (spawnedSessions) payload assembly.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §3.5 + §4 (lines 195-201). The workstation
 * context-builder's new Tier 4 surfaces a per-session observability slice
 * for every registered non-killed session. This module is the pure
 * assembly function — caller resolves the session-name list and supplies
 * a fetchSnapshot callable; this module's only job is to fan out the
 * fetches and assemble the Tier4Payload.
 *
 * Q-MBT10-7=a (graceful degradation): per-session try/catch with stub
 * injection. A failed fetchSnapshot for one session does NOT block the
 * other sessions' assembly. The failing session is keyed in the result
 * with stub fields (recent_handoff: null, recent_console_tail: null,
 * pending_intents: [], timestamps null) so context-builder consumers
 * see the full set of attempted session names.
 */

import type {
  SessionContextSnapshot,
  Tier4Payload,
} from 'dispatch-core/dist/v3/schema.js';

export interface AssembleTier4Input {
  /** Session names to fetch snapshots for. Caller filters out killed sessions. */
  sessionNames: string[];
  /**
   * Per-session snapshot fetcher. May reject; assembly stubs the entry
   * for any session whose fetch rejects. Concurrent fetches via
   * Promise.all + per-promise catch.
   */
  fetchSnapshot: (sessionName: string) => Promise<SessionContextSnapshot>;
}

/** Q-MBT10-7=a stub fields for a session whose snapshot fetch failed. */
function stubSnapshot(): SessionContextSnapshot {
  return {
    recent_handoff: null,
    recent_console_tail: null,
    pending_intents: [],
    last_action_fired_at: null,
    last_operator_typed_at: null,
  };
}

export async function assembleTier4Payload(
  input: AssembleTier4Input,
): Promise<Tier4Payload> {
  const { sessionNames, fetchSnapshot } = input;

  // Fan out concurrently. Per-promise catch keeps one bad fetch from
  // poisoning the whole assemble (Q-MBT10-7=a).
  const entries = await Promise.all(
    sessionNames.map(async (name): Promise<[string, SessionContextSnapshot]> => {
      try {
        const snap = await fetchSnapshot(name);
        return [name, snap];
      } catch {
        return [name, stubSnapshot()];
      }
    }),
  );

  const sessions_context: Record<string, SessionContextSnapshot> = {};
  for (const [name, snap] of entries) {
    sessions_context[name] = snap;
  }
  return { sessions_context };
}
