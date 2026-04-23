export type SessionState = 'idle' | 'running' | 'awaiting_review' | 'stale';

export interface DeriveStateInput {
  last_prompt_sent_at: string | null;
  last_handoff_pulled_at: string | null;
  handoff_mtime: Date | null;
  now: Date;
  stale_threshold_ms: number;
}

/**
 * Pure function — no I/O. `now` and `handoff_mtime` are passed in so the
 * caller (fd status) owns the single fs.stat + clock read per refresh, and
 * the derivation is testable without a filesystem or time mocks.
 *
 * Transition rules:
 *   - Never prompted        -> idle
 *   - Handoff mtime is newer than the last prompt AND the operator has
 *     not pulled since that prompt -> awaiting_review
 *   - Operator pulled after the last prompt -> idle
 *   - Prompt sent longer than stale_threshold_ms ago, still waiting -> stale
 *   - Otherwise -> running
 */
export function deriveState(input: DeriveStateInput): SessionState {
  const {
    last_prompt_sent_at,
    last_handoff_pulled_at,
    handoff_mtime,
    now,
    stale_threshold_ms,
  } = input;

  if (last_prompt_sent_at === null) {
    return 'idle';
  }

  const promptSentMs = Date.parse(last_prompt_sent_at);
  const pulledAtMs =
    last_handoff_pulled_at !== null ? Date.parse(last_handoff_pulled_at) : null;

  const hasUnconsumedHandoff =
    handoff_mtime !== null && handoff_mtime.getTime() > promptSentMs;
  const pulledSinceSend = pulledAtMs !== null && pulledAtMs >= promptSentMs;

  if (hasUnconsumedHandoff && !pulledSinceSend) {
    return 'awaiting_review';
  }

  if (pulledSinceSend) {
    return 'idle';
  }

  const ageMs = now.getTime() - promptSentMs;
  if (ageMs > stale_threshold_ms) {
    return 'stale';
  }

  return 'running';
}
