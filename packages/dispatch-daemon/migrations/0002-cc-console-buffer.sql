-- CONSOLE-T01 — cc_console_buffer table for the §4.7 CC-console surface.
--
-- Authority chain:
--   - CONDUCTOR_API_CONTRACT.md §4.7.1 (frozen at a7e8d4f, v2.2.0) —
--     ring buffer storage spec; FIFO eviction; per-session isolation;
--     stdout_seq is monotonic per session and persists across daemon
--     restarts via this table.
--   - CONDUCTOR_API_CONTRACT.md §4.7.7 — DDL deferred to CONSOLE-T01.
--   - vision §10.5 — default 50,000 lines per session, FIFO eviction;
--     operator-disable handled in code (cc_console_state in a future
--     ticket; v3.0 default = enabled).
--   - MB-S06 ADR §6 (frozen at b641e58) — ring buffer pattern verified
--     KNOWN at small scale (100-line cap with 500 produced lines);
--     production cap of 50,000 is MODELED-equivalent per the same FIFO
--     pattern.
--
-- Additive-only migration model per WORKSTATION_CONTRACT.md §8.1: this
-- file is `0002-` prefixed for ordering after `0001-orchestrator-tables`;
-- CREATE TABLE IF NOT EXISTS makes re-runs no-ops.

-- ─────────────────────────────────────────────────────────────────────
-- cc_console_buffer — STDOUT line ring buffer per §4.7.1
-- ─────────────────────────────────────────────────────────────────────
-- Composite PK (session_name, stdout_seq) enforces both the per-session
-- monotonic sequencing invariant AND provides the single index needed
-- for the WS backfill protocol (§4.7.3) which queries
-- `WHERE session_name=? AND stdout_seq >= ?` for replay.
CREATE TABLE IF NOT EXISTS cc_console_buffer (
    -- Session name (matches sessions.json registry name; not FK because
    -- the v3 SQLite layer is independent of the v2 JSON-file registry
    -- per WORKSTATION_CONTRACT.md §8.1 coexistence-without-sync rule).
    session_name TEXT    NOT NULL,
    -- Per-session monotonic 64-bit unsigned line sequence number.
    -- Never resets; eviction removes rows but does NOT recycle seqs
    -- (so disconnected subscribers can compute the eviction-window-gap
    -- via backfill_meta.backfill_complete per §4.7.3).
    stdout_seq   INTEGER NOT NULL,
    -- Raw line bytes. Stored as BLOB so non-UTF-8 sequences (rare CC
    -- output cases per MB-S06 §1 mostly-utf8 finding) survive without
    -- mojibake. The encoding column tells the WS serializer whether to
    -- send as `utf8` or `base64`.
    bytes        BLOB    NOT NULL,
    -- One of: 'utf8' (the default; clean UTF-8 decode) or 'base64'
    -- (when the bytes contain invalid UTF-8 sequences). HTTP boundary
    -- enforces the enum; DB does not constrain (consistent with the
    -- existing orchestrator tables' string-column style).
    encoding     TEXT    NOT NULL,
    -- Wall-clock epoch milliseconds at line-receive time. Used by GET
    -- /v3/sessions/:name/console/status to compute
    -- last_stdout_activity_at via MAX(ts) WHERE session_name=?.
    ts           INTEGER NOT NULL,
    PRIMARY KEY (session_name, stdout_seq)
);
