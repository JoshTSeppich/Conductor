-- Production v3 SQLite migration — orchestrator persistence layer.
--
-- Authority chain:
--   - WORKSTATION_CONTRACT.md §8.1 (amended at 7fd48e4) — three new tables,
--     additive-only, CREATE TABLE IF NOT EXISTS, applied on first daemon
--     start where data.db is absent. Coexists with sessions.json (the v2
--     registry) without synchronization.
--   - WORKSTATION_CONTRACT.md §6.1 / §6.2 / §6.3 — endpoint surface
--   - vision.md §7.8 — orchestrator_audit field set
--   - build-doc-schema-spec.md §3.8 — orchestrator_ticket_state field set
--   - Operator-ratified MB-S03 §6 decisions (2026-04-29):
--       §6.1 audit pagination: { rows, next_since: string | null }
--       §6.2 POST /v3/orchestrator/audit body: row minus id (UUIDv7 server-assigned)
--       §6.3 orchestrator_messages.id: UUIDv7 (NOT integer autoincrement)
--       §6.4 orchestrator_audit.output_payload: JSON-encoded TEXT
--   - MB-S03 spike harness (probes P2/P3/P4) — additive model verified
--
-- Driver: better-sqlite3 (synchronous Node SQLite). Daemon opens the
-- database with WAL journal mode at startup; closes on shutdown via
-- lifecycle/shutdown.ts hooks.

-- ─────────────────────────────────────────────────────────────────────
-- orchestrator_messages — chat history (§8.1, §6.1)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orchestrator_messages (
    -- UUIDv7 primary key per ratified §6.3 (matches event-bus pattern in
    -- events/history.ts; cursor-pagination stable across replicas).
    id              TEXT    PRIMARY KEY NOT NULL,
    -- ISO-8601 UTC timestamp; chronological ordering combines UUIDv7 with this column.
    created_at      TEXT    NOT NULL,
    -- One of: 'user', 'assistant', 'system'.
    -- Validation enforced at HTTP boundary (Zod), not at DDL.
    role            TEXT    NOT NULL,
    -- Verbatim message body (operator chat OR orchestrator output).
    -- For orchestrator output, this is the discriminated-union JSON
    -- per OrchestratorOutputSchema in dispatch-core/src/v3/schema.ts.
    content         TEXT    NOT NULL,
    -- Build-doc the message was authored under, NULL when no build doc loaded.
    build_doc_id    TEXT,
    -- HEAD SHA at message-author time (per ratified P-0.5 Q8.1.a SHA-awareness).
    build_doc_commit_sha TEXT
);

-- Pagination + filter index (per §6.1: limit, before_id, since_id, build_doc_id).
CREATE INDEX IF NOT EXISTS idx_messages_created_at
    ON orchestrator_messages (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_build_doc
    ON orchestrator_messages (build_doc_id, created_at);

-- ─────────────────────────────────────────────────────────────────────
-- orchestrator_audit — audit log (§8.1, §6.2, vision §7.8)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orchestrator_audit (
    id                      TEXT    PRIMARY KEY NOT NULL,
    -- vision §7.8 fields, verbatim
    timestamp               TEXT    NOT NULL,
    trigger_event           TEXT    NOT NULL,
    build_doc_id            TEXT    NOT NULL,
    build_doc_commit_sha    TEXT    NOT NULL,
    -- One of: 'action', 'card', 'multi-choice-card', 'escape-block', 'noop'
    output_type             TEXT    NOT NULL,
    -- JSON-encoded full orchestrator output per ratified §6.4.
    output_payload          TEXT    NOT NULL,
    -- One of: 'approve', 'decline', 'multi-choice-A/B/C/D',
    -- 'copied-escape-block', 'pending'
    operator_response       TEXT    NOT NULL,
    -- JSON-encoded final-fired payload (with free-form merge per §7.4 Item A);
    -- NULL if not fired.
    final_fired_payload     TEXT,
    -- One of: 'success', 'failure', 'n/a'
    execution_outcome       TEXT    NOT NULL,
    -- Operator's free-form text (REQUIRED for declines per §7.4 + P-0 leftover Q3).
    free_form_text          TEXT,
    -- One of: 'current', 'stale', 'superseded'
    staleness_status        TEXT    NOT NULL,
    -- Comma-separated list of audit-row IDs that this row supersedes (vision §7.8).
    superseded_card_ids     TEXT
);

-- Filter indexes per §6.2 (date range, build-doc, output type, response).
CREATE INDEX IF NOT EXISTS idx_audit_timestamp
    ON orchestrator_audit (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_build_doc
    ON orchestrator_audit (build_doc_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_output_type
    ON orchestrator_audit (output_type, timestamp);

-- ─────────────────────────────────────────────────────────────────────
-- orchestrator_ticket_state — ticket state per (ticket_id, build_doc_id)
-- (§8.1, §6.3, P-0.5 Q8.2)
-- ─────────────────────────────────────────────────────────────────────
-- Ratified MB-S03 §6: upsert one row per (ticket_id, build_doc_id) via
-- INSERT OR REPLACE. Composite PRIMARY KEY enforces the constraint.
-- Audit log captures transition history; this table is current state only.
CREATE TABLE IF NOT EXISTS orchestrator_ticket_state (
    ticket_id               TEXT    NOT NULL,
    build_doc_id            TEXT    NOT NULL,
    -- One of: 'pending', 'in-progress', 'awaiting-approval', 'complete',
    -- 'stale', 'superseded' (per build-doc-schema-spec §3.3 Status enum).
    state                   TEXT    NOT NULL,
    state_updated_at        TEXT    NOT NULL,
    -- Populated only when state='superseded' (per build-doc-schema-spec §3.8).
    superseded_by_ticket_id TEXT,
    PRIMARY KEY (ticket_id, build_doc_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_state_build_doc
    ON orchestrator_ticket_state (build_doc_id);
