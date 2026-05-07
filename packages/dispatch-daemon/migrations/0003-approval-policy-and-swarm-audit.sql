-- MB-T13 — Per-session approval policy + orchestrator swarm-audit table.
--
-- Authority chain:
--   - CONDUCTOR_V3_RESCOPE.md §3.2 (per-session approval policy semantics:
--     tight / medium / loose; default 'medium'; per-session override)
--   - CONDUCTOR_V3_RESCOPE.md §3.8 (audit + observability — full audit-row
--     field set: ts, session_name, action_type, intent_id, step,
--     total_steps, approval_required, approval_status, payload_hash,
--     result_status, operator_loop_state)
--   - CONDUCTOR_V3_RESCOPE.md §4 lines 223-231 (MB-T13 ticket body)
--   - WORKSTATION_CONTRACT.md §8.1 (additive-only model; CREATE TABLE
--     IF NOT EXISTS; coexists with sessions.json RegistryV2 frozen
--     v2 per §5; v3 SQLite layer is independent of v2 JSON-file
--     registry per coexistence-without-sync rule)
--   - dispatch-core/src/v3/schema.ts §13 (commit a225411 — Zod surface
--     for ApprovalPolicyEnum + ApprovalActionTypeEnum +
--     ApprovalPolicyRow + OrchestratorSwarmAuditRow + write/get/put
--     request/response schemas)
--   - Operator-arbitrated MB-T13 §6 decisions (2026-05-06):
--       Q-MBT13-1=a: new SQLite session_policies table (NOT ALTER on
--         non-existent SQLite session table; v2 RegistrySchemaV2 frozen)
--       Q-MBT13-2=a: TEXT enum + CHECK constraint
--       Q-MBT13-3=a: single migration file with both tables + indexes
--         (matches 0001-orchestrator-tables.sql multi-table precedent)
--       Q-MBT13-4=c: defense-in-depth default — SQL DEFAULT 'medium' +
--         workstation-side resolver fallback on no-row
--       Q-MBT13-5=b: two indexes — (ts DESC) for global last-N query +
--         (session_name, ts DESC) for per-session forensics
--
-- Driver: better-sqlite3 (synchronous Node SQLite). Daemon opens the
-- database with WAL journal mode at startup; closes on shutdown via
-- lifecycle/shutdown.ts hooks.
--
-- Additive-only migration model per §8.1: this file is `0003-` prefixed
-- for ordering after 0001-orchestrator-tables and 0002-cc-console-buffer;
-- CREATE TABLE IF NOT EXISTS makes re-runs no-ops.

-- ─────────────────────────────────────────────────────────────────────
-- session_policies — per-session approval policy (Q-MBT13-1=a + §3.2)
-- ─────────────────────────────────────────────────────────────────────
-- Keyed by session_name, matching the v2 sessions.json registry name.
-- NOT FK because the v3 SQLite layer is independent of the v2 JSON-file
-- registry per WORKSTATION_CONTRACT.md §8.1 coexistence-without-sync rule.
-- Sessions may exist in sessions.json without a row here; the workstation
-- approval-policy-resolver defaults to 'medium' on no-row per Q-MBT13-4=c.
CREATE TABLE IF NOT EXISTS session_policies (
    session_name    TEXT    PRIMARY KEY NOT NULL,
    approval_policy TEXT    NOT NULL
                            DEFAULT 'medium'
                            CHECK (approval_policy IN ('tight', 'medium', 'loose')),
    updated_at      TEXT    NOT NULL
                            DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────
-- orchestrator_swarm_audit — orchestrator action firings (§3.8)
-- ─────────────────────────────────────────────────────────────────────
-- Distinct from `orchestrator_audit` (migration 0001) which audits
-- operator-facing approve/decline of orchestrator chat output.
-- THIS table audits orchestrator swarm-action firings (autopilot or
-- manual) per CONDUCTOR_V3_RESCOPE.md §3.8 — different surface,
-- separate forensics, independent retention (retention deferred per
-- MB-T13 out-of-scope clause).
--
-- Field set per §3.8 verbatim. JSON-encoded payloads are NOT stored
-- on this table — the canonical SHA-256 payload_hash (per Q-MBT13-8=c)
-- enables collision detection for duplicate action-fires while
-- minimizing row size; full payload is observable via the route-layer
-- log stream + the (separate) operator-facing card surface.
CREATE TABLE IF NOT EXISTS orchestrator_swarm_audit (
    -- UUIDv7 primary key (server-assigned via uuidv7() helper at POST
    -- time, matching orchestrator_audit + orchestrator_messages
    -- precedent in migration 0001).
    id                  TEXT    PRIMARY KEY NOT NULL,
    -- ISO-8601 UTC timestamp of action-fire attempt.
    ts                  TEXT    NOT NULL,
    -- Target session_name (matches sessions.json registry name).
    session_name        TEXT    NOT NULL,
    -- One of: 'send' | 'spawn-new-session' | 'kill' | 'pull' | 'assign-task'
    -- per ApprovalActionTypeEnum (schema.ts §13). Validation enforced at
    -- HTTP route boundary via Zod (NOT a CHECK here — enum membership
    -- may extend in v3.1 as new orchestrator actions are added; route-
    -- layer Zod is the canonical enforcement point per existing v3
    -- precedent — orchestrator_audit.output_type does NOT have a CHECK).
    action_type         TEXT    NOT NULL,
    -- UUIDv4 multi-step intent identifier; nullable for non-multi-step
    -- actions (single send, spawn, kill, pull-handoff). Populated only
    -- when the orchestrator wraps the action in a multi-step envelope
    -- per CONDUCTOR_V3_RESCOPE.md §3.4.
    intent_id           TEXT,
    -- 1-based step index within a multi-step plan; nullable when
    -- intent_id is null.
    step                INTEGER,
    -- Total steps in the multi-step plan; nullable when intent_id is null.
    total_steps         INTEGER,
    -- Boolean as INTEGER (SQLite has no BOOLEAN type). 0 or 1.
    -- True when the per-session policy + action-type + predicates
    -- triggered an approval card; false when the action fired without
    -- approval (auto-fire path).
    approval_required   INTEGER NOT NULL
                                CHECK (approval_required IN (0, 1)),
    -- Approval-card lifecycle state at audit-write time. Async-after-fire
    -- model (Q-MBT13-7=b) means audit-write may capture either:
    --   - 'not-required' when approval_required=0 (most common case)
    --   - 'approved' when card resolved before fire
    --   - 'declined' when card resolved with decline (action did not fire)
    --   - 'pending' when audit-row was written before card resolution
    --     (single-shot retry path on transient failures)
    approval_status     TEXT    NOT NULL
                                CHECK (approval_status IN
                                       ('not-required', 'pending',
                                        'approved', 'declined')),
    -- SHA-256 hex (lowercase, 64 chars) per Q-MBT13-8=c — canonical
    -- JSON.stringify({action_type, session_name, prompt}) with sorted
    -- keys (deterministic; collision-detection-friendly). Per-action-type
    -- hash-input shape is defined at the audit-writer call site (sess-
    -- mbt11 territory). Validated at route boundary by Zod regex
    -- /^[a-f0-9]{64}$/ on OrchestratorSwarmAuditRowSchema.
    payload_hash        TEXT    NOT NULL,
    -- Action-execution outcome. 'fired' = tmux send / spawn / kill /
    -- pull succeeded; 'failed' = transport-layer error; 'pending' =
    -- audit-write happened before fire-result observed (single-shot
    -- retry path).
    result_status       TEXT    NOT NULL
                                CHECK (result_status IN
                                       ('fired', 'failed', 'pending')),
    -- Operator's autopilot-loop state at action-fire time per
    -- CONDUCTOR_V3_RESCOPE.md §3.7 — 'autopilot' (orchestrator running
    -- the loop), 'manual' (operator-driven send), 'paused' (autopilot
    -- halted, action surfaces to manual control).
    operator_loop_state TEXT    NOT NULL
                                CHECK (operator_loop_state IN
                                       ('autopilot', 'manual', 'paused'))
);

-- ─────────────────────────────────────────────────────────────────────
-- Indexes per Q-MBT13-5=b
-- ─────────────────────────────────────────────────────────────────────
-- Last-N-rows global query for the "Show recent orchestrator actions"
-- modal per Q-MBT13-9=a (LIMIT 100 ORDER BY ts DESC at WB4 route).
CREATE INDEX IF NOT EXISTS idx_swarm_audit_ts
    ON orchestrator_swarm_audit (ts DESC);

-- Per-session forensics query — operator wants to inspect action
-- history for a specific session that misbehaved.
CREATE INDEX IF NOT EXISTS idx_swarm_audit_session_ts
    ON orchestrator_swarm_audit (session_name, ts DESC);
