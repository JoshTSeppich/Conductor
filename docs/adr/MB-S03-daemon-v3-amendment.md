# MB-S03 — Daemon v3 amendment ADR

**Status:** SPIKE (pending operator-arbitrated commit; not the freeze anchor for `dispatch-core/src/v3/schema.ts` and not the production daemon implementation).

**Date:** 2026-04-29

**Spike scope:** validate the `/v3/*` endpoint shape, the daemon SQLite migration, the v3 Zod schema set, and the Fastify-routing implications BEFORE COARCH-T01 begins production work.

**Authority chain (every claim below cites at least one of):**
- `WORKSTATION_CONTRACT.md` — frozen at Phase 0 commit `ade584b`, amended at `7fd48e4` §8.1
- `CONDUCTOR_API_CONTRACT.md` — frozen at `3ddca60`, amended at `a502c4c` and `c1bb7fe`
- `docs/vision.md` §7 + §8 — frozen at `9d751f8`
- `docs/build-doc-schema-spec.md` §2 + §3 + §3.6 + §3.7
- `docs/cairn-sonnet-extensions.md` §2 — seven primitives
- `docs/cairn-findings.md` Finding #55 — frozen-contracts-must-be-verified
- `packages/dispatch-daemon/src/lifecycle/auth.ts` — current Fastify auth hook
- `packages/dispatch-daemon/src/lifecycle/error-handler.ts` — current 404 + SPA fall-through
- `packages/dispatch-daemon/src/lifecycle/startup.ts` — current route-registration order
- Operator-acked decisions enumerated in MB-S03 spike prompt (2026-04-29)
- Validation harness at `packages/dispatch-daemon/spikes/MB-S03/harness.ts` (8/8 probes pass) and schema smoke at `packages/dispatch-core/spikes/MB-S03/schema-smoke.ts` (30/30 checks pass)

Confidence labels per claim follow the cairn ladder: **KNOWN** (verified by spike or contract text), **MODELED** (inferred from contract examples + acked decisions, untested in production), **SPECULATIVE** (best guess pending evidence).

---

## §1 — Summary of recommendations

1. The `/v3/*` endpoint surface as enumerated in `WORKSTATION_CONTRACT.md` §6 + the operator-acked decisions is feasible on the existing Fastify daemon. Probe P6 demonstrates that nine `/v3/*` paths plus two `/v2/*` paths route cleanly in a single Fastify instance. **Confidence: KNOWN**.
2. The three new SQLite tables (`orchestrator_messages`, `orchestrator_audit`, `orchestrator_ticket_state`) ship via `CREATE TABLE IF NOT EXISTS` per amended §8.1. The migration runs idempotently, the `UNIQUE (ticket_id, build_doc_id)` constraint is enforced via `PRIMARY KEY`, and `INSERT OR REPLACE` produces the upsert semantics specified in the operator-acked decision. **Confidence: KNOWN**.
3. Audit-row write/read latency on better-sqlite3 is well under the §8.3 dashboard-refresh hard ship gate (< 500ms p50 end-to-end). On `:memory:` the harness measured write p95 = 0.006ms and read p95 = 0.108ms across 100 rows. SQLite cannot dominate the dashboard-refresh path. **Confidence: KNOWN** for `:memory:`; **MODELED** for file-backed `data.db` with WAL (file-system writes are slower than memory but still orders of magnitude under the 500ms budget for 100-row workloads). **Pre-flight before ship**: COARCH-T01 should re-run the harness against a file-backed `data.db` to convert this to KNOWN.
4. Two production-daemon files require amendment by COARCH-T01 — flagged here so the production ticket starts with the conflicts named, not discovered at integration time:
   - `packages/dispatch-daemon/src/lifecycle/auth.ts` — current bypass for non-`/v2/*` paths would let `/v3/*` traffic skip the X-Conductor-Token header check (probe P7). **Must-fix.**
   - `packages/dispatch-daemon/src/lifecycle/error-handler.ts` — current SPA fall-through fires for any non-`/v2/*` GET, so unmatched `/v3/*` paths would serve `index.html` instead of JSON 404 (probe P8). **Must-fix.**
5. The proposed v3 Zod schema (drafted at `packages/dispatch-core/spikes/MB-S03/proposed-schema.ts`) covers every entry in `WORKSTATION_CONTRACT.md` §2.1. Schema smoke validates 30 cases including round-trips, strict-mode rejection of unknown frontmatter fields, multi-choice 2-4 option bound, decline-reason-required, and `/v3/tickets/state/:ticket_id` `build_doc_id` REQUIRED. **Confidence: KNOWN** for shape; **MODELED** for IPC variants beyond the §7.1 enumeration (no end-to-end Electron→webview probe exists yet — that surfaces in MB-T11).

---

## §2 — Endpoint shape specification

For each endpoint, the **shape** column cites the schema in `proposed-schema.ts`. Status codes follow the v2 convention (404 missing, 422 validation, 401 auth) per CONDUCTOR_API_CONTRACT.md §10.4 outcome-classification model.

### §2.1 `/v3/orchestrator/messages` — chat history

#### `POST /v3/orchestrator/messages`
- **Shape:** body `OrchestratorMessageSchema`; response `OrchestratorMessageRowSchema` (the persisted row including server-assigned `id` + `created_at`).
- **Auth:** required (X-Conductor-Token header per §3.1, applied via the same hook that gates `/v2/*` after the must-fix in §3).
- **Persistence:** insert into `orchestrator_messages`; `id` = UUIDv7 (matches `events/history.ts` precedent).
- **Confidence:** KNOWN (shape derives directly from contract §2.1 + §6.1; persistence is the §8.1 model).

#### `GET /v3/orchestrator/history`
- **Shape:** query `OrchestratorHistoryQuerySchema` (`limit` default 100 max 500, `before_id?`, `since_id?`, `build_doc_id?`); response `OrchestratorHistoryResponseSchema` (`messages: OrchestratorMessageRowSchema[]`, `next_before_id: string | null`).
- **Acked decision:** GLOBAL DEFAULT (no implicit build-doc filter) **+** add `build_doc_id` as an optional filter to support the orchestrator P-0.4 Q4 TIERED chat-history fetch use case.
- **Pagination semantics:** mirror `/v2/events`'s `next_since` envelope per `routes/events.ts:36-93` — `next_before_id` is the oldest returned message's id; client paginates by passing it back as `before_id`. Empty page → `next_before_id: null`.
- **Confidence:** KNOWN for shape; MODELED for pagination semantics (mirrors a verified v2 pattern but no end-to-end probe at this point).

#### `DELETE /v3/orchestrator/history`
- **Shape:** no body; response `OrchestratorHistoryDeleteResponseSchema` (`deleted: number`).
- **Acked decision:** FULL CLEAR. No scoping by `build_doc_id` or date range. Surfaces in Workstation settings UI per contract §6.1.
- **Confidence:** KNOWN.

### §2.2 `/v3/orchestrator/audit` — audit log

#### `POST /v3/orchestrator/audit`
- **Shape:** body is a write-side variant of `OrchestratorAuditRowSchema` minus `id` (server assigns UUIDv7). All §7.8 fields required.
- **Caller:** Workstation-internal action handler. Per §6.2, NOT operator-callable in v3.0.
- **Auth:** required.
- **Confidence:** KNOWN (field set is the verbatim §7.8 list).

#### `GET /v3/orchestrator/audit`
- **Shape:** query is a filter struct (date-range `since`/`until`, `build_doc_id?`, `output_type?`, `operator_response?`); response is `{ rows: OrchestratorAuditRow[], next_since: string | null }` mirroring `/v2/events` pagination.
- **Confidence:** KNOWN for filter axes (per §6.2 enumeration); MODELED for pagination shape (mirrors v2 pattern).

### §2.3 `/v3/tickets/state` — ticket state

#### `POST /v3/tickets/state`
- **Shape:** body `TicketStateUpsertRequestSchema`. Response is the persisted `TicketStateRowSchema` row.
- **Acked decision:** UPSERT (one row per `(ticket_id, build_doc_id)`) via `INSERT OR REPLACE`. The composite `PRIMARY KEY (ticket_id, build_doc_id)` enforces the constraint per `migration.sql:62-79`. Audit log captures transition history; this table is current-state only.
- **Confidence:** KNOWN — probe P4 verified upsert collapses repeated `(ticket_id, build_doc_id)` writes to a single row while preserving rows with different `build_doc_id`.

#### `GET /v3/tickets/state`
- **Shape:** query `{ build_doc_id?: string }` (omitting yields all rows; supplying filters to one build doc); response `{ rows: TicketStateRowSchema[] }`.
- **Confidence:** MODELED (kanban operator-facing query per §6.3; no probe at this step).

#### `GET /v3/tickets/state/:ticket_id`
- **Shape:** path `:ticket_id`; query `TicketStateGetQuerySchema` (`build_doc_id` REQUIRED per acked decision). Response `TicketStateRowSchema` or 404.
- **Acked decision:** `build_doc_id` REQUIRED query param. Rationale: a single `ticket_id` can exist in multiple build docs (different revisions, different operator-configured docs), so omitting `build_doc_id` would be ambiguous.
- **Confidence:** KNOWN — schema smoke verified rejection on missing `build_doc_id`.

### §2.4 IPC: `daemon-state-update`

- **Acked decision:** the `daemon-state-update` shell→webview message carries the FULL `SessionsListResponse` shape from `dispatch-core/src/v2/schema.ts:275-278`, NOT a delta. Orchestrator computes its own deltas if needed.
- **Where this lives:** the v3 freeze-anchor schema at `packages/dispatch-core/src/v3/schema.ts` should `import { SessionsListResponse } from '../v2/schema.js'` so the v2-frozen type IS the v3 IPC payload. The spike's `proposed-schema.ts` uses a structurally-equivalent placeholder to keep the spike file self-contained.
- **Trade-off:** payload is larger than a delta would be, but encoding remains trivial (JSON.stringify of an object the daemon already builds for `GET /v2/sessions`). Webview repaints idempotently from a full snapshot, eliminating a class of stale-state bugs that would arise if delta application drifted from server truth.
- **Confidence:** KNOWN (shape is v2-frozen).

---

## §3 — Daemon code conflicts surfaced (must-fix in COARCH-T01)

### §3.1 Auth hook bypass for `/v3/*`

`packages/dispatch-daemon/src/lifecycle/auth.ts:84-90` bypasses auth for any path NOT starting with `/v2/`. The bypass exists for the Z-3 static-serve carveout. Today, `/v3/*` paths fall into this bypass — meaning the auth gate would silently drop for the entire `/v3/*` surface.

**Probe P7 evidence:** identical hook logic on a Fastify mock instance returned 401 for `/v2/sessions` (no header) and 200 for `/v3/orchestrator/history` (no header).

**Fix shape (proposed for COARCH-T01):**

```ts
// auth.ts:88
if (!pathOnly.startsWith('/v2/') && !pathOnly.startsWith('/v3/')) {
  return; // static-serve bypass (Z-3) — only non-API paths
}
```

`/v3/*` then falls through to the existing X-Conductor-Token header check (the WS branch only triggers for `/v2/events/stream`). **Confidence: KNOWN** (mirrors the existing `/v2/*` discipline; pattern verified by probe).

### §3.2 SPA fall-through swallowing unmatched `/v3/*` GETs

`packages/dispatch-daemon/src/lifecycle/error-handler.ts:60-72` serves `index.html` for any non-`/v2/*` GET when `staticRoot` is set. Today that means an unmatched `/v3/*` GET (e.g., a typo in the URL) would return the SPA bundle with HTTP 200 instead of `{"error": "Not found"}` JSON 404.

**Probe P8 evidence:** mirroring the production handler's path-check, an unmatched `/v3/unmapped/path` GET returns 200 + `<html>SPA</html>` instead of JSON 404.

**Fix shape (proposed for COARCH-T01):**

```ts
// error-handler.ts:62
if (
  staticRoot &&
  request.method === 'GET' &&
  !pathOnly.startsWith('/v2/') &&
  !pathOnly.startsWith('/v3/')
) {
  return reply.sendFile(...);
}
```

**Confidence: KNOWN** (mirrors existing `/v2/*` gating; pattern verified by probe).

### §3.3 Route-registration ordering in `startup.ts`

The current `lifecycle/startup.ts:218-322` registers routes in this order:
1. error handler + 404
2. auth hook
3. auth routes
4. health route
5. sessions read/write/state
6. prompts
7. handoff
8. events
9. violations
10. WS
11. static-serve (when `staticRoot` set)

Adding `/v3/*` registrations after step 9 (events) and before step 10 (WS) is consistent with the existing pattern. The auth hook is global, so `/v3/*` gets gating once §3.1 is fixed; the static-serve registration runs after all API routes per Fastify's routing-priority pattern documented at `lifecycle/startup.ts:324-335`. **Confidence: KNOWN** (no architectural conflict; sequencing matches v2 precedent).

---

## §4 — SQLite migration model (per amended §8.1)

`packages/dispatch-daemon/spikes/MB-S03/migration.sql` ships three `CREATE TABLE IF NOT EXISTS` statements + supporting indexes. Highlights:

- **`orchestrator_messages`**: TEXT primary key (UUIDv7), TEXT `created_at`, TEXT `role`, `content` payload, optional `build_doc_id` + `build_doc_commit_sha`. Index on `(created_at)` and `(build_doc_id, created_at)` for the §6.1 pagination + acked filter.
- **`orchestrator_audit`**: full §7.8 field set as TEXT. JSON-encoded `output_payload` and `final_fired_payload`. Indexes on `timestamp`, `(build_doc_id, timestamp)`, `(output_type, timestamp)` covering the §6.2 filter axes.
- **`orchestrator_ticket_state`**: composite `PRIMARY KEY (ticket_id, build_doc_id)` enforces the acked-decision UNIQUE constraint without a separate index. Secondary index on `build_doc_id` for the kanban query.

**Smoke evidence:** harness probes P2 (initial migration creates 3 tables) and P3 (re-run is a no-op) confirm the additive model holds. Probe P4 confirms the upsert semantics for `orchestrator_ticket_state`.

**Init responsibility per §8.1:** COARCH-T01 owns wiring better-sqlite3 into `lifecycle/startup.ts`, opening `~/.foxworks-dispatch/data.db` with WAL pragma, running this migration on first daemon start where the file is absent, and exposing the Database instance via DI to the new route handlers. The dependency is already in `package.json` (commit `656c93b`); the spike confirms it loads (probe P1).

**Coexistence:** `sessions.json` continues to be the source of truth for v2 session state per amended §8.1. The two persistence layers do not synchronize.

---

## §5 — Performance evidence

### §5.1 Latency benchmark

Probe P5 wrote 100 audit rows then issued 100 LIMIT-100 reads against the `orchestrator_audit` table on `:memory:`. Measured per-call wall time (`process.hrtime.bigint()`):

| Operation | p50 | p95 | §8.3 budget |
|---|---|---|---|
| Single-row insert | 0.004ms | 0.006ms | < 500ms p50 (entire dashboard-refresh path) |
| 100-row read | 0.090ms | 0.108ms | < 500ms p50 (entire dashboard-refresh path) |

The §8.3 budget is for end-to-end dashboard-refresh (event emit → UI repaint). SQLite contributes a tiny fraction of that path; remaining headroom is for HTTP round-trip + WS broadcast + webview render.

**MODELED claim** to verify in COARCH-T01: file-backed `data.db` with WAL pragma will be slower than `:memory:` (real fsync, OS page cache, journal-write overhead) but still orders of magnitude under the 500ms budget for 100-row workloads. The harness should be re-run against a file-backed instance during COARCH-T01 implementation to convert this to KNOWN. **Confidence: MODELED** until then.

### §5.2 Scaling notes (forward-looking, NOT in v3.0 scope)

Per `vision.md` §7.8: indefinite retention in v3.0; pruning policy deferred to v3.x. As `orchestrator_audit` grows past ~10k rows, the indexed reads (§6.2 filter axes) keep p95 well under budget — but a future v3.x ticket should re-measure once dogfood data accumulates. Not a blocker for v3.0 ship.

---

## §6 — Outstanding spike questions (NOT covered by acked decisions)

Per cairn anti-fabrication and halt discipline: the operator-acked decisions in the MB-S03 prompt covered five specific items. Questions outside that envelope that the spike encountered and resolved are listed here so COARCH-T01 inherits the resolutions explicitly:

1. **Pagination shape for `/v3/orchestrator/audit`**: spike used `{ rows: [...], next_since: string | null }` mirroring `/v2/events`. Surface to operator if a different envelope is preferred. **Confidence: MODELED.**
2. **`POST /v3/orchestrator/audit` request body** (`OrchestratorAuditRowSchema` minus `id`): spike chose the verbatim §7.8 field set with server-assigned `id`. Acked decision did not name a body shape; this is a derivative. **Confidence: MODELED.**
3. **`orchestrator_messages.id` as UUIDv7 vs. an INTEGER autoincrement**: spike chose UUIDv7 to match `events/history.ts` precedent and to make `before_id`/`since_id` cursor pagination stable across replicas (single-writer in v3.0 per §8.4 — but the cursor stays valid through any future multi-writer migration). **Confidence: MODELED.**
4. **`orchestrator_audit.output_payload` storage**: spike chose JSON-encoded TEXT with the parsed shape validated at the route boundary, NOT a normalized row-per-field model. Trade-off: row-per-field would enable `WHERE output_payload->>'action' = 'send'` queries. Spike chose JSON for simplicity and because the acked filter axes (date, build-doc, output type, operator response) are all already first-class columns. **Confidence: MODELED.**

Operator should clarify items 1-4 before COARCH-T01 commits. Spike did NOT infer-around these — they are surface-and-ack items, not silently-resolved.

---

## §7 — What this ADR explicitly does NOT include

Per cairn scope-fence and the spike-prompt OUT OF SCOPE list:

- Production `/v3/*` route implementations in `packages/dispatch-daemon/src/routes/` — owned by COARCH-T01.
- Wiring better-sqlite3 into `lifecycle/startup.ts` — owned by COARCH-T01.
- Wiring orchestrator into Workstation main process — owned by COARCH-T03.
- The actual amendment to `CONDUCTOR_API_CONTRACT.md` — operator-only per §3.4. Proposal text lives in `docs/adr/MB-S03-conductor-amendment-proposal.md`.
- Modifying `packages/dispatch-core/src/v2/schema.ts` — frozen at `551c469`.
- Committing the v3 Zod schema at the freeze anchor `packages/dispatch-core/src/v3/schema.ts` — operator-only per ratified P-0.3 Q2 + Q4.

---

## §8 — Run instructions (reproducibility)

```bash
# Daemon harness — Fastify routing + SQLite migration + benchmark + auth/404 conflicts
cd packages/dispatch-daemon
pnpm exec tsx spikes/MB-S03/harness.ts

# Schema smoke — 30 round-trip checks on proposed-schema.ts
cd packages/dispatch-core
pnpm exec tsx spikes/MB-S03/schema-smoke.ts
```

Both should exit 0. Probe output is human-readable per the existing spike convention (`✓` / `✗` lines + tally).

---

## §9 — Forward references for COARCH-T01

When COARCH-T01 begins:

1. Read this ADR + `MB-S03-conductor-amendment-proposal.md` first.
2. Apply the §3.1 + §3.2 must-fix patches to `auth.ts` and `error-handler.ts` BEFORE registering any `/v3/*` routes — otherwise existing tests pass while the integration is unsafe.
3. Re-run `harness.ts` against the production-modified files to confirm no regression in P6/P7/P8.
4. Re-run latency benchmark against file-backed `data.db` to convert the §5.1 MODELED claim to KNOWN.
5. Resolve the §6 outstanding questions with operator before committing route implementations.

---

End of ADR. Pending operator arbitration on §6 items + commit of the proposed CONDUCTOR_API_CONTRACT.md amendment.
