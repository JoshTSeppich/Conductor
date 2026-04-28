/**
 * TUI state model + reducer for fd status (CLI-T02).
 *
 * TuiSessionState wraps a SessionResponseV2 record from
 * GET /v2/sessions and adds TUI-LOCAL observation markers
 * (NOT in SessionV2 schema; verified verbatim at pre-red
 * Check 5 against schema.ts:88-97).
 *
 * Per Round 2 finding #47 (bidirectional pre-red discipline):
 * SessionV2 fields are ONLY:
 *   cwd, tmux_target, handoff_path, last_prompt_sent_at,
 *   last_handoff_pulled_at, state, last_commit_sha,
 *   last_status_json_at
 *
 * Fields NOT in SessionV2:
 *   last_handoff_written_at, last_commit_at, test_status
 *   — TUI tracks these locally as observed_* markers.
 *
 * Reducer applies events from the WS stream (§5.2 4-field
 * shape). Three categories:
 *   - state-mutation:  state_changed → session.state
 *                      (only field directly in schema)
 *   - observation-marker: handoff_written, commit_landed,
 *                      prompt_sent, test_status_updated
 *                      → corresponding observed_* local
 *                      field; underlying SessionV2 unchanged
 *   - informational-feed: cairn_violation_detected,
 *                      gate_trip → appended to TUI feeds
 *                      (recent_violations / recent_gate_
 *                      trips); session unchanged. State
 *                      change for cairn-triggered transition
 *                      arrives via parallel state_changed
 *                      event per §6.2.
 *
 * Pure reducer — fully unit-tested at P2 via it.each over
 * the 3 categories.
 */

import type {
  ComputedStatus,
  SessionV2,
  State,
} from 'dispatch-core/src/v2/schema.js';
import type { WireEvent } from './ws-client.js';

/**
 * The list endpoint (GET /v2/sessions) returns SessionV2
 * fields + computed_status, but NOT status_json or
 * recent_events (those are on the single-session response
 * shape SessionResponseV2). Use a permissive type here so
 * TuiSessionState wraps whatever the list endpoint actually
 * returns. (verified at sessions.ts:80-85: `{name,
 * ...session, computed_status}` — no status_json /
 * recent_events on list entries).
 */
export type TuiSession = SessionV2 & {
  computed_status?: ComputedStatus;
};

export interface TuiSessionState {
  session: TuiSession;
  /** Set on handoff_written events (T13 watcher detected
   *  HANDOFF.md write). Distinct from session.last_handoff_
   *  pulled_at which is set by T10 operator-pull route. */
  observed_handoff_at?: string;
  /** Set on commit_landed events (T14 git watcher).
   *  T14 arb 5=B means daemon does NOT write last_commit_
   *  sha to registry; TUI tracks observation locally. */
  observed_commit?: {
    sha: string;
    subject: string;
    branch: string;
    at: string;
  };
  /** Set on prompt_sent events (T09 emit). session.last_
   *  prompt_sent_at catches up at next /v2/sessions poll. */
  observed_prompt_sent_at?: string;
  /** Set on test_status_updated events (T15 status watcher).
   *  status_json is on SessionResponseV2, NOT persisted
   *  SessionV2; TUI tracks observed values locally. */
  observed_status?: {
    tests_passing: number;
    tests_failing: number;
    phase: string;
    at: string;
  };
  /** Informational feed of cairn violations on this session.
   *  Session.state changes arrive via parallel state_changed
   *  event per §6.2. */
  recent_violations?: Array<{
    violation_type: string;
    details: string;
    at: string;
  }>;
  /** Informational feed of gate trips. */
  recent_gate_trips?: Array<{ gate_name: string; at: string }>;
}

export function applyEventToState(
  state: Map<string, TuiSessionState>,
  event: WireEvent,
): Map<string, TuiSessionState> {
  const existing = state.get(event.session);
  if (!existing) return state;

  const next = new Map(state);
  const updated: TuiSessionState = { ...existing };

  switch (event.type) {
    case 'state_changed': {
      const data = event.data as { from: State; to: State; triggered_by: string };
      // session.state IS in SessionSchemaV2 (schema.ts:95).
      updated.session = { ...updated.session, state: data.to };
      break;
    }
    case 'handoff_written':
      updated.observed_handoff_at = event.timestamp;
      break;
    case 'commit_landed': {
      const data = event.data as {
        sha: string;
        subject: string;
        branch: string;
      };
      updated.observed_commit = { ...data, at: event.timestamp };
      break;
    }
    case 'prompt_sent':
      updated.observed_prompt_sent_at = event.timestamp;
      break;
    case 'test_status_updated': {
      const data = event.data as {
        tests_passing: number;
        tests_failing: number;
        phase: string;
      };
      updated.observed_status = { ...data, at: event.timestamp };
      break;
    }
    case 'cairn_violation_detected': {
      const data = event.data as {
        violation_type: string;
        details: string;
      };
      updated.recent_violations = [
        ...(existing.recent_violations ?? []),
        { ...data, at: event.timestamp },
      ];
      break;
    }
    case 'gate_trip': {
      const data = event.data as {
        gate_name: string;
        context: string;
        expected_action: string;
      };
      updated.recent_gate_trips = [
        ...(existing.recent_gate_trips ?? []),
        { gate_name: data.gate_name, at: event.timestamp },
      ];
      break;
    }
    default:
      // Unknown event type — return original state unchanged.
      return state;
  }

  next.set(event.session, updated);
  return next;
}
