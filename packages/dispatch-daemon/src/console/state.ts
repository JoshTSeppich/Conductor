/**
 * CONSOLE-T01 — per-session in-memory console state coordinator.
 *
 * Holds the data that does NOT belong in cc_console_buffer (which is
 * the STDOUT line ring). Per CONDUCTOR_API_CONTRACT.md §4.7.1
 * (frozen at a7e8d4f):
 *   - stdin_seq: monotonic 64-bit unsigned counter incremented per
 *     successful POST /stdin. Per §4.7.1 "Counters are session-scoped
 *     and persist across daemon restarts via the cc_console_buffer
 *     table" — but cc_console_buffer only stores stdout rows. v3.0
 *     interpretation: stdin_seq lives in this in-memory coordinator
 *     and resets at daemon restart. Cross-restart durability for
 *     stdin_seq is deferred (followup MB-F-CONSOLE-T01-STDIN-SEQ-PERSIST
 *     Tier 2; not in v3.0 ship-gate per §4.7.7 deferral surface).
 *   - last_stdin_activity_at, last_stdout_activity_at: ISO 8601
 *     timestamps surfaced via GET /status. last_stdout_activity_at
 *     is also derivable from cc_console_buffer.MAX(ts), but tracking
 *     in memory is cheaper for hot-path /status reads.
 *   - buffer_enabled: per-session toggle for daemon-side buffering
 *     (vision §10.5 operator-disable knob). v3.0 default = true; the
 *     toggle UI ships in MB-T11/W-T19 per §4.7.7 deferral surface.
 *   - subscriber_count: WS connection count from cluster 3's stream
 *     handler. Updated on connect/disconnect; surfaced via GET /status.
 *
 * Lifecycle: lazy-initialized per session on first access. Sessions
 * never get their state explicitly cleared — when a session's tmux
 * pane dies or the registry kills it, the state struct just sits
 * unused until daemon restart. v3.0 is single-machine, single-operator
 * (per project instructions §2.1) so the leak is bounded by total
 * sessions ever created in a daemon lifetime, which is small.
 */

export interface ConsoleSessionState {
  stdin_seq: number;
  last_stdin_activity_at: string | null;
  last_stdout_activity_at: string | null;
  buffer_enabled: boolean;
  subscriber_count: number;
}

export interface ConsoleStateCoordinator {
  /** Get-or-create the state for `sessionName`. */
  state(sessionName: string): ConsoleSessionState;
  /** Increment stdin_seq for a session and stamp last_stdin_activity_at. */
  recordStdinWrite(sessionName: string, atIso: string): number;
  /** Stamp last_stdout_activity_at for a session. */
  recordStdoutActivity(sessionName: string, atIso: string): void;
  /** Bump subscriber count up/down and return the new value. */
  adjustSubscribers(sessionName: string, delta: number): number;
}

export function createConsoleStateCoordinator(): ConsoleStateCoordinator {
  const states = new Map<string, ConsoleSessionState>();

  function getOrCreate(name: string): ConsoleSessionState {
    let s = states.get(name);
    if (!s) {
      s = {
        stdin_seq: 0,
        last_stdin_activity_at: null,
        last_stdout_activity_at: null,
        buffer_enabled: true,
        subscriber_count: 0,
      };
      states.set(name, s);
    }
    return s;
  }

  return {
    state: getOrCreate,
    recordStdinWrite(sessionName, atIso) {
      const s = getOrCreate(sessionName);
      s.stdin_seq += 1;
      s.last_stdin_activity_at = atIso;
      return s.stdin_seq;
    },
    recordStdoutActivity(sessionName, atIso) {
      const s = getOrCreate(sessionName);
      s.last_stdout_activity_at = atIso;
    },
    adjustSubscribers(sessionName, delta) {
      const s = getOrCreate(sessionName);
      s.subscriber_count = Math.max(0, s.subscriber_count + delta);
      return s.subscriber_count;
    },
  };
}
