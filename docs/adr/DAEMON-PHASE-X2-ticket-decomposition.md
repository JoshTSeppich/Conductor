# DAEMON-T + CLI-T Phase X.2 ticket decomposition (pre-reg gate 3 surface)

**Status:** Amended after operator arbitration on RA-01. Pre-reg gate 3 per Session A's original ticket §5.5.
**Amendment history:**
- Initial surface at `80372f1` — flagged RA-01 for operator arbitration
- This amendment — RA-01 resolved via Option 1 (new additive endpoint); DAEMON-T17a added to D-5 cluster
**Scope:** Session A side only. Session B's WEB-T already landed at `90e2dd0`/`fe1164f`. Session C (MB-T) spawns post-Phase-X.2 closure.
**Inputs consumed:**
- `CONDUCTOR_API_CONTRACT.md` v2.0.0 at `3ddca60` (frozen)
- `packages/dispatch-core/src/v2/schema.ts` at `551c469` (frozen shared Zod schema)
- 5 DAEMON spike ADRs (`DAEMON-S05/S01/S02/S03/S04` in `docs/adr/`)
- `DAEMON-PHASE-X1-consolidated-findings.md` at `bc7ebb3`
- Operator arbitration updates on CS-01 through CS-04 (this message)

---

## Cross-session coordination state (locked into this decomposition)

| CS | Status | Consumption anchor |
|---|---|---|
| CS-01 CORS | **RESOLVED — no daemon work.** Session B Vite dev-proxy same-origin; prod serves Vite build from daemon static route (see D-1 / T01 followup). No `@fastify/cors` dep. | D-1 / T01 (static-file serving as optional followup for prod build) |
| CS-02 `notifications_available` on `/v2/health` | Daemon populates; Session B web UI + future Session C menu bar consume; contract-additive per §2 | D-1 / T03 (populates) + D-5 / T16 (probe that feeds it) |
| CS-03 launchd-parent notification permission scope | Daemon-side docs own the post-install instruction | D-6 / T18 (launchd installer) |
| CS-04 browser WS 401 opacity | Session B owns; no daemon action | N/A |

---

## Cluster overview

Six DAEMON-T clusters + one CLI-T cluster. Total 26 tickets (20 DAEMON-T, 6 CLI-T).

| Cluster | Scope | Count |
|---|---|---|
| D-1 HTTP Foundation | Fastify scaffold, auth, health, error shape, v2 schema migration | 5 |
| D-2 Sessions CRUD + State Machine | Session read/create, PATCH state with §6.1 transitions + side effects | 3 |
| D-3 Operations | Prompt send, handoff pull, events history | 3 |
| D-4 Real-time | WS stream, handoff watcher, git log watcher, STATUS.json watcher | 4 |
| D-5 Notifications + Ring Buffer + Violations | Notification engine, in-memory event history, ring buffer, `POST /violations` endpoint (T17a per RA-01 Option 1) | 3 |
| D-6 Deployment | launchd installer + uninstaller scripts | 2 |
| **CLI-T** | fd v1 refactor, fd status dashboard, new state commands, daemon-dead fallback, regression + new tests | 6 |

---

## DAEMON-T cluster D-1 — HTTP Foundation

### DAEMON-T01 — Fastify scaffold + server lifecycle
- **Scope:** `packages/dispatch-daemon/src/server.ts` + `src/lifecycle/{startup,shutdown}.ts`. Bootstrap Fastify app, bind `127.0.0.1:7878`, wire up startup orchestration (load registry, migrate v1→v2 if needed, spin up watchers for every session in `state: 'armed'`), wire up SIGTERM/SIGINT for graceful shutdown (close watchers, close WS connections, close HTTP, exit 0). Logger: Fastify's Pino at `info` default, output to stdout (captured by launchd `StandardOutPath` in prod).
- **Acceptance criteria:**
  - Daemon starts and binds port 7878 on localhost
  - `GET http://127.0.0.1:7878/v2/health` returns 200 within 500ms of startup
  - SIGTERM produces clean shutdown in <2s; no hung sockets, no wedged watchers
  - Startup log line includes version, bound port, uptime=0, notifications probe result
- **Dependencies on other DAEMON-T:** none (foundational)
- **External dependencies:** contract §4.1 (health endpoint existence); `dispatch-core`'s `readRegistry`, `writeRegistry`, `sessionsPath`; `node:fs/promises` for state directory ensure
- **Followups anticipated:**
  - Static-file serving for Vite prod build (deferred — Session B ships prod build first, then daemon hosts it). Not v2.0 scope; file as v2.1 additive.
  - Pino log rotation (followup from S04 ADR)

### DAEMON-T02 — Token auth onRequest hook
- **Scope:** `packages/dispatch-daemon/src/lifecycle/auth.ts`. One consolidated `onRequest` hook per S01 + S05 spike findings. Load token from `~/.foxworks-dispatch/token` (create on first run per §3.2). Hook logic: `/v2/health` bypass (no auth); `/v2/events/stream` reads `?token=` query string; all other paths read `X-Conductor-Token` header. 401 + `{"error": "Invalid or missing token"}` on mismatch. Implement `POST /v2/auth/rotate` per §3.3 (returns new token in response after atomic file rewrite).
- **Acceptance criteria:**
  - Token file at `~/.foxworks-dispatch/token` created with mode 0600 on first daemon run
  - 401 response on no token, wrong token (both HTTP header and WS query string)
  - 200 response on correct token
  - `POST /v2/auth/rotate` returns new token, atomically updates file, old token rejected on next request
  - Unit test coverage for each branch (bypass, header match/miss, query match/miss, rotation)
- **Dependencies on other DAEMON-T:** T01 (scaffold must exist)
- **External deps:** contract §3 (all subsections)
- **Followups:** constant-time token compare (S05 ADR followup) — deferred, localhost-only threat model allows `!==` for v2

### DAEMON-T03 — `GET /v2/health` with `notifications_available` (CS-02 anchor)
- **Scope:** `packages/dispatch-daemon/src/routes/health.ts`. Per contract §4.1 response shape plus additive `notifications_available: boolean` field per CS-02. Field is populated at startup via the D-5 notification-engine probe (see T16); `/v2/health` handler reads a module-level cached value set by startup.
- **Acceptance criteria:**
  - Response shape: `{"status": "ok", "version": "2.0.0", "uptime_seconds": <number>, "notifications_available": <boolean>}`
  - `uptime_seconds` = `Math.floor(process.uptime())`
  - `notifications_available` reflects the startup probe result; `false` if probe failed or timed out
  - No auth required (per §4.1)
- **Dependencies:** T01 (scaffold), T16 (notification probe populates the field)
- **External deps:** contract §4.1, CS-02 (Session B + Session C consume)
- **Followups:** none

### DAEMON-T04 — Error handler + 404 default
- **Scope:** `packages/dispatch-daemon/src/lifecycle/error-handler.ts`. Register Fastify error handler that converts any thrown `Error` into `{"error": "<msg>"}` JSON response with appropriate status code. Register `setNotFoundHandler` for 404s with same shape.
- **Acceptance criteria:**
  - Unknown route returns 404 with body `{"error": "Not found"}`
  - Handler-thrown errors with a `.statusCode` property use that code; else 500
  - Response body always JSON per S05 finding
  - Does NOT leak stack traces in response body (keep them in Pino logs)
- **Dependencies:** T01
- **External deps:** S05 ADR error-body convention; contract §4 implicit error expectations
- **Followups:** none

### DAEMON-T05 — v2 sessions.json schema migration
- **Scope:** `packages/dispatch-daemon/src/migration/schema-v2.ts`. Wrap `dispatch-core`'s `readRegistry` / `writeRegistry` with a migration layer that detects v1 registries on read and injects v2 defaults (`state: 'armed'` per Blocker 1, `last_commit_sha: null`, `last_status_json_at: null`) before returning; writes always emit v2. The wrapper is the daemon's sole read/write path for `sessions.json`.
- **Acceptance criteria:**
  - Reading an empty registry returns `{version: 2, sessions: {}}`
  - Reading a v1 registry (from fd v1 usage) yields v2-shaped result with defaults injected; next write persists as v2
  - Reading a v2 registry round-trips unchanged
  - Schema imports from `packages/dispatch-core/src/v2/schema.ts` (operator-published `551c469`); no inline type re-definition
  - Unit tests: empty, v1-only, v2-only, mixed (impossible in practice but defensible), malformed JSON, ENOENT
  - Auto-migration is idempotent on retry (second daemon run on already-migrated registry is a no-op)
- **Dependencies:** T01
- **External deps:** `dispatch-core/src/v2/schema.ts` (operator-frozen), `dispatch-core/src/registry/{read,write}.ts`, Blocker 1 + 2 arbitration
- **Followups:** none

---

## DAEMON-T cluster D-2 — Sessions CRUD + State Machine

### DAEMON-T06 — `GET /v2/sessions` + `GET /v2/sessions/:name`
- **Scope:** `packages/dispatch-daemon/src/routes/sessions.ts`. List: read registry, compute `computed_status` per session via `dispatch-core`'s `deriveState` (using `fs.stat` on each `handoff_path` for mtime). Single-session GET: same + include last N recent events from the ring buffer (T17) scoped to that session name (MODELED default N=50 per §5.1 surface) + `status_json` if present.
- **Acceptance criteria:**
  - List response matches contract §4.2 shape for every session
  - Single-session response includes `status_json` (null if not present or parse fails per T15) and `recent_events` (array, newest first, at most 50)
  - `computed_status` values are from the `SessionState` enum (`idle`/`running`/`awaiting_review`/`stale`)
  - 404 on unknown session name
  - Auth-gated (fails 401 without token)
- **Dependencies:** T02 (auth), T05 (migration layer), T15 (STATUS.json parsing for `status_json`), T17 (ring buffer for `recent_events`)
- **External deps:** contract §4.2, `dispatch-core/src/state/derive.ts`
- **Followups:** `recent_events` limit as query param (v2.1 additive)

### DAEMON-T07 — `POST /v2/sessions`
- **Scope:** New-session endpoint per contract §4.3. Validates request body against `SessionSchemaV2` (import from `dispatch-core/src/v2/schema.ts`). Initial `state: 'armed'` per Blocker 1. Name-collision check: if existing session has ANY state (including `killed`), return 409 with the Blocker-3-arbitrated error body verbatim: `{"error": "Session name in use (killed record exists). Pick a new name."}`. On success: write registry atomically, emit `state_changed` event with `triggered_by: "operator"`, `from: null`, `to: "armed"`, return 201 with the new session entry.
- **Acceptance criteria:**
  - Valid request returns 201 with full session entry
  - Missing required field (name, cwd, tmux_target) returns 422 with `{"error": "..."}` naming the missing field
  - Existing name (any state) returns 409 with the exact Blocker-3 error body
  - Invalid tmux_target format (fails the schema regex) returns 422
  - Session is persisted to registry before response returns (atomic write)
  - WS subscribers receive `state_changed` event with the expected shape
- **Dependencies:** T02, T05, T12 (WS for emit)
- **External deps:** contract §4.3, §6.1 (initial-state arbitration), §6.3 (killed semantics), Blocker 1 + 3 arbitrations
- **Followups:** none

### DAEMON-T08 — `PATCH /v2/sessions/:name/state` with transitions + side effects
- **Scope:** `packages/dispatch-daemon/src/state/transitions.ts` + route. Validate requested state against `SessionState` enum. Validate transition against §6.1 rules (422 if invalid). Execute side effects: `armed → held` sends Ctrl-C via `dispatch-core`'s tmux transport; `armed → killed` / `paused → killed` / `held → killed` runs `tmux kill-session`; other transitions have no tmux side effect. On success: write registry, emit `state_changed` event with `triggered_by: "operator"`. The transition helper exported from this ticket is reused by T17a for cairn/gate-triggered transitions (auto-to-held with `triggered_by: "cairn_violation"` or `"gate_trip"` per contract §6.2) — no code duplication between operator-initiated and violation-initiated state changes.
- **Acceptance criteria:**
  - Valid transitions execute side effect + persist + emit
  - Invalid transitions (e.g., `killed` → anything, or any rule violation) return 422
  - Ctrl-C send uses `dispatch-core`'s transport (no inline tmux spawning)
  - `tmux kill-session` failure (session already gone) is tolerated — registry still updates, event still emits, response 200
  - Table-driven unit tests for every transition in §6.1 valid + invalid matrix
- **Dependencies:** T02, T05, T12
- **External deps:** contract §4.3 + §6.1, `dispatch-core`'s `sendKeys` + tmux helpers
- **Followups:** none from this ticket. Cairn/gate-triggered transitions are handled by T17a (RA-01 resolution); this ticket's transition helper is the shared primitive both routes use.

---

## DAEMON-T cluster D-3 — Operations

### DAEMON-T09 — `POST /v2/sessions/:name/prompts`
- **Scope:** Per contract §4.4. Read request body, call `dispatch-core/prompt/assemble.js` to append `HANDOFF_FOOTER` idempotently, archive to `~/.foxworks-dispatch/archive/<name>/<ts>.prompt.md`, invoke `dispatch-core/transport/tmux.js#sendKeys` on the registered `tmux_target`. Preconditions: session exists (else 404), session state is `armed` (else 422 with `{"error": "Session not in armed state"}`), tmux target is live (else 503 with `{"error": "tmux pane <target> not running"}` per MODELED default from §5.1). On success: update `last_prompt_sent_at`, emit `prompt_sent` event (contract §5.3), return 200 with `{"sent_at", "archived_to"}`.
- **Acceptance criteria:**
  - Footer is appended idempotently (re-pasting a pre-footed prompt does not duplicate)
  - Archive file is created before tmux send (so a later tmux failure still has a record)
  - tmux dead → 503, tmux live → 200
  - `last_prompt_sent_at` persisted with ISO timestamp
  - `prompt_sent` event on the WS stream
- **Dependencies:** T02, T05, T08 (state read for precondition), T12
- **External deps:** contract §4.4, `dispatch-core`'s `assemble`, `sendKeys`, `hasSession`, `archiveRoot`
- **Followups:** none

### DAEMON-T10 — `GET /v2/sessions/:name/handoff`
- **Scope:** Per contract §4.4. Read `HANDOFF.md` at the session's `handoff_path`; if missing, 404 with `{"error": "HANDOFF.md not found at <path>"}`. Archive the content to `~/.foxworks-dispatch/archive/<name>/<ts>.handoff.md`. Copy to clipboard via `dispatch-core/lib/clipboard.js#copyToClipboard`. Update `last_handoff_pulled_at`. Return 200 with `{"content", "written_at", "archived_to"}`.
- **Acceptance criteria:**
  - 404 on missing handoff file
  - 200 on present handoff; content matches file exactly
  - Clipboard call succeeds (pbcopy); if fails, 200 still returns (clipboard is best-effort) with a warning log
  - Archive file written before response returns
  - `last_handoff_pulled_at` persisted
- **Dependencies:** T02, T05
- **External deps:** contract §4.4, `dispatch-core`'s `copyToClipboard`, `archiveRoot`
- **Followups:** clipboard-failure surfacing (log vs response) — ticket-time choice

### DAEMON-T11 — `GET /v2/events` (paginated history)
- **Scope:** Per contract §4.5. Query params: `since` (ISO-8601 timestamp per MODELED default), `limit` (default 100, max 500). Serve from in-memory ring buffer (see T17). Response: `{events: [...], next_since: <ts>}` where `next_since` is the timestamp of the latest event returned (client uses for next page). Filter events where `timestamp > since` (exclusive).
- **Acceptance criteria:**
  - No `since` → returns last `limit` events (sorted newest first? oldest first? Ticket-time decision — MODELED default oldest first for easier pagination)
  - `since` provided → returns events newer than that timestamp, ordered oldest-first
  - `limit` > 500 → clamped to 500 with a warning in response headers
  - Ring buffer eviction (once it exceeds max size) is documented behavior — events older than the buffer cap are NOT retrievable
- **Dependencies:** T02, T17
- **External deps:** contract §4.5
- **Followups:** ring-buffer size config (default: last 10000 events across all sessions) — document in daemon config

---

## DAEMON-T cluster D-4 — Real-time

### DAEMON-T12 — WS `/v2/events/stream`
- **Scope:** `packages/dispatch-daemon/src/routes/ws.ts` + `src/events/emit-queue.ts`. Register `@fastify/websocket` plugin. Route `/v2/events/stream` with `websocket: true`. Auth handled by T02's consolidated `onRequest` hook (already covers the query-string case). Per-connection serialized emit queue per DAEMON-F03 (one queue per live socket, async iteration guarantees order even under concurrent emit). On client disconnect: close the queue, release any watcher subscriptions scoped to this connection.
- **Acceptance criteria:**
  - Authorized client connects; invalid/missing token rejected at 401 pre-upgrade (already covered by T02)
  - Events emitted via daemon's internal `emit(event)` helper appear on all connected WS clients in the order they were emitted
  - Per-connection queue: under concurrent emitters (10 parallel `emit()` calls), clients receive all 10 events with NO duplication and NO reordering
  - Client hangup: server closes the queue within 1s (per S01 spike observation)
  - Backpressure: if client is slow (doesn't read), daemon logs a warn and drops events after `bufferedAmount > threshold`; threshold default 1MB (configurable)
- **Dependencies:** T02, T17 (ring buffer is the canonical event source; WS broadcasts in real time)
- **External deps:** contract §5.1, §5.2, S01 ADR patterns, DAEMON-F03
- **Followups:** backpressure policy final values (monitor in prod); replay-on-reconnect (deferred — clients use `/v2/events?since=` instead per §5.1 surface MODELED default)

### DAEMON-T13 — Handoff watcher
- **Scope:** `packages/dispatch-daemon/src/watchers/handoff.ts`. For each session with `state ∈ {armed, paused, held}`, watch the parent directory of its `handoff_path` with `fs.watch({persistent: true, recursive: false})`. Filter events by filename (must equal `basename(handoff_path)`, typically `HANDOFF.md`). Debounce 50ms per DAEMON-F04. On debounced fire: stat the file for size, emit `handoff_written` event per contract §5.3 shape + push to ring buffer. Handle session state changes: `armed/paused/held → killed` closes the watcher; `killed → (any)` is forbidden by §6.1 (won't happen).
- **Acceptance criteria:**
  - Direct write to `HANDOFF.md` produces exactly one `handoff_written` event (after debounce)
  - Atomic write (tmp + rename) produces one event (for the final filename, tmp filtered out per S02 finding)
  - Rapid burst (5 writes in 40ms) produces ONE event (debounce absorbs)
  - When session state → `killed`, the watcher closes within 1s
  - Graceful handling of missing parent dir (skip watch for that session; log warning; retry when session is re-inited)
- **Dependencies:** T01 (startup spins watchers), T12 (WS for emit), T17 (ring buffer)
- **External deps:** contract §5.3 (`handoff_written`), S02 ADR patterns, DAEMON-F04
- **Followups:** watcher-per-session lifecycle when `paused`: should events coalesce and fire on resume, or drop? — MODELED default: keep emitting while paused, UI decides whether to display. Flag as ticket-time decision.

### DAEMON-T14 — Git log watcher
- **Scope:** `packages/dispatch-daemon/src/watchers/git.ts`. Per session (skip if no `.git/` dir, logging a debug note), watch `<cwd>/.git/refs/heads/` non-recursively. Filter events: filename must NOT end with `.lock`. On debounced (50ms) fire: shell `git -C <cwd> log -1 --format='%H%x00%s' <branch>` to enrich (where `<branch>` is the event's filename). Emit `commit_landed` event with `{sha, subject, branch}`. Update session's `last_commit_sha` field in registry (atomic write).
- **Acceptance criteria:**
  - `git commit` in the session's cwd produces exactly one `commit_landed` event per commit (despite launchd-ref-lock-file noise)
  - `commit_landed.data.sha` is the short SHA (7 chars by default)
  - `commit_landed.data.branch` is the branch name (e.g., `main`)
  - Sessions without `.git/` skip watcher setup; daemon does NOT crash
  - Branch names with `/` in them are handled OR documented as limitation (DAEMON-F10 followup — defer to recursive: true on `refs/heads/` if operator flags it)
- **Dependencies:** T01, T12, T17
- **External deps:** contract §5.3 (`commit_landed`), S02 ADR patterns
- **Followups:** worktree / submodule support (S02 ADR followup, deferred); slash-separated branch names; missing .git graceful handling (this ticket covers it; no follow-up)

### DAEMON-T15 — STATUS.json watcher + parser + `test_status_updated`
- **Scope:** `packages/dispatch-daemon/src/watchers/status-json.ts` + `src/events/status-json-parser.ts`. Per session, watch `<cwd>/` for `STATUS.json` filename. On debounced fire: read + parse via `dispatch-core/src/v2/schema.ts`'s `StatusJsonSchema` (operator-published; if schema validation fails, log warn + skip emission). Emit `test_status_updated` with `{tests_passing, tests_failing, phase}`. Store the parsed object on the session's runtime state (accessible to `GET /v2/sessions/:name`'s `status_json` field). Separate concern: phase prose fallback — when `STATUS.json` is absent, daemon infers `phase` from `HANDOFF.md` prose via regex on `**Phase:**` / `# Phase N` headings (MODELED per §8.1).
- **Acceptance criteria:**
  - Writing a valid STATUS.json produces a `test_status_updated` event and updates session runtime state
  - Writing malformed STATUS.json produces a warn log, no event emitted, runtime state unchanged
  - When STATUS.json is absent, daemon-inferred phase falls back to handoff prose; if no matchable heading, `phase: 'unknown'`
  - `test_status_updated` event shape matches contract §5.3 exactly
- **Dependencies:** T01, T12, T17
- **External deps:** contract §5.3 (`test_status_updated`) + §8 (STATUS.json schema + phase inference), `dispatch-core/src/v2/schema.ts`'s `StatusJsonSchema`
- **Followups:** phase inference heuristics refinement (labeled "Capability enabled with known limitations" per §10.4; improves over time via operator feedback)

---

## DAEMON-T cluster D-5 — Notifications + Ring Buffer

### DAEMON-T16 — Notification engine
- **Scope:** `packages/dispatch-daemon/src/events/notifications.ts`. At startup, fire a silent `node-notifier` probe (wait:false, 2s timeout per S03 ADR pattern). Result populates the module-level `notifications_available` flag (used by T03's health endpoint). Subscribe to the daemon's internal event bus; for `handoff_written` events, fire a brief silent notification (`sound: false, wait: false`); for `cairn_violation_detected` events (emitted by T17a per RA-01 resolution), fire a sticky wait:true notification. All other event types are NOT native-notification-worthy (WS-only). When `notifications_available === false`, the engine is a NOP — no calls to `notifier.notify()`.
- **Acceptance criteria:**
  - Startup probe runs within 3s of daemon start; `notifications_available` is set before HTTP listens
  - When `true`: `handoff_written` events produce a `notifier.notify()` call with expected arg shape
  - When `false`: no `notifier.notify()` calls ever
  - Engine does not throw even when node-notifier fails unpredictably (graceful wrap)
  - Log line at startup: `notifications: enabled` or `notifications: disabled (probe failed)`
- **Dependencies:** T01 (startup orchestration), T03 (health reads flag)
- **External deps:** S03 ADR patterns, CS-02 (Session B + C consume the flag)
- **Followups:** DAEMON-F01 resolution (monitor post-install — if systemic, pivot to osascript per S03 Option C). `cairn_violation_detected` + `gate_trip` emission wiring comes from T17a; notification engine consumes both event types when they appear on the bus.

### DAEMON-T17 — In-memory event ring buffer
- **Scope:** `packages/dispatch-daemon/src/events/history.ts`. Fixed-size ring buffer (default 10000 events total across sessions). Every event emitted via the daemon's internal `emit()` goes into the buffer AND onto WS subscribers (T12). `GET /v2/events` (T11) queries this buffer. Events older than buffer capacity are evicted silently. Per-session query (`recent_events` on T06) filters by session name.
- **Acceptance criteria:**
  - `emit(event)` pushes to buffer in O(1)
  - `query({since, limit, session})` returns matching events newest-first (or oldest-first per T11 ticket-time decision)
  - Buffer is bounded — after 10001 emits, oldest is evicted
  - `GET /v2/events` (T11) uses this as its sole source
  - `GET /v2/sessions/:name` (T06) `recent_events` uses this filtered by session
- **Dependencies:** T01
- **External deps:** contract §4.5 (history endpoint), §4.2 (recent_events field)
- **Followups:** persistent event log (deferred, contract §9 out of scope for v2)

### DAEMON-T17a — `POST /v2/sessions/:name/violations` (RA-01 Option 1)
- **Scope:** `packages/dispatch-daemon/src/routes/violations.ts`. New additive endpoint per operator's RA-01 arbitration. Request body: `{type: 'cairn_violation' | 'gate_trip', details: <shape per contract §5.3 event data>, timestamp?: string (ISO 8601, defaults to server now)}`. Response: `202 Accepted` with `{event_id: string}`. Side effects in strict order: (1) validate session exists (404) and state ≠ `killed` (422 with `{"error": "cannot report violation on terminal session"}`); (2) transition session state → `held` per contract §6.2 using the same transition helper as T08; (3) emit `state_changed` event (from the held transition) on the WS stream with `triggered_by: "cairn_violation"` or `"gate_trip"` matching the request type; (4) emit `cairn_violation_detected` or `gate_trip` event per request `type` on the WS stream; (5) push both events to the T17 ring buffer for `/v2/events` gap-fill replay; (6) atomic registry write via T05 migration layer. Token auth required via consolidated onRequest hook (T02).
- **Acceptance criteria:**
  - Valid `{type: 'cairn_violation', details: {violation_type, details}}` → 202, session state transitions to `held`, both `state_changed` and `cairn_violation_detected` events visible on WS stream in that order
  - Valid `{type: 'gate_trip', details: {gate_name, context, expected_action}}` → 202, `gate_trip` event emitted, state `held`
  - Unknown session name → 404 with `{"error": "no session registered as <name>"}`
  - Session in `killed` state → 422 with the terminal-session error body above
  - Malformed body (missing `type`, invalid `type`, missing `details`) → 422
  - Missing/wrong token → 401 (via T02)
  - `event_id` in response body matches the id attached to emitted WS events + ring buffer entries for both events
  - Unit tests: each branch (cairn vs gate, each state precondition, each error path); integration test: real Fastify + WS subscriber observes both events in order
- **Dependencies:** T02 (auth), T05 (migration layer), T08 (state transition helper reuse), T12 (WS emit), T17 (ring buffer push)
- **External deps:** contract §5.3 event types (frozen), §6.2 cairn-triggered transitions, §2 additive extension rule, operator RA-01 Option 1 arbitration (this amendment). Additive per §2; no contract version bump; operator authors contract §4.X endpoint documentation post-Phase-Y.
- **Followups:** `fd violation <name> <type> <details>` CLI command (defer — not in v2.0 CLI-T scope; file as v2.1 CLI extension). Session B "report violation" UI button (their WEB-T territory; consumption is same-origin POST with token header). Session C menu bar action (future, their territory).

---

## DAEMON-T cluster D-6 — Deployment

### DAEMON-T18 — launchd installer script (CS-03 anchor)
- **Scope:** `packages/dispatch-daemon/scripts/install.sh` (or `.ts` via tsx). Resolves absolute node binary path (`command -v node`), resolves repo root (walk up from known marker `CONDUCTOR_API_CONTRACT.md`), writes plist to `~/Library/LaunchAgents/com.foxworks.dispatch-daemon.plist` with template from S04 ADR, runs `launchctl bootstrap gui/$(id -u) <plist>`, prints post-install instructions per CS-03 (grant notification permission to daemon-as-launchd process in System Settings). Idempotent: if plist already exists + service loaded, re-bootstrap errors cleanly with operator-visible message.
- **Acceptance criteria:**
  - Installer runs on a fresh machine and produces a running daemon within 5s
  - `launchctl list | grep foxworks` shows the loaded label
  - plist path resolution works from any pwd (doesn't assume repo root is cwd)
  - Post-install output tells operator exactly what to click in System Settings → Notifications
  - Re-running the installer does NOT break a running daemon (idempotent)
- **Dependencies:** T01 (daemon must be buildable first), T16 (notification engine story drives the post-install instructions)
- **External deps:** S04 ADR plist template, CS-03 (post-install grant instructions reference S03 ADR)
- **Followups:** GUI installer (deferred); auto-unattended install (deferred); code-signing + notarization (required if distributing — deferred for v2.0)

### DAEMON-T19 — launchd uninstaller script
- **Scope:** `packages/dispatch-daemon/scripts/uninstall.sh`. Runs `launchctl bootout gui/$(id -u)/com.foxworks.dispatch-daemon` (tolerant of "not loaded" errors per S04 finding), removes `~/Library/LaunchAgents/com.foxworks.dispatch-daemon.plist`. Asks operator whether to also remove `~/.foxworks-dispatch/` state (preserve by default).
- **Acceptance criteria:**
  - Uninstaller from any state (loaded, unloaded, partial install) exits 0 with operator-visible summary
  - State dir preserved by default; operator can opt out via `--clean` flag
  - Running uninstaller twice is safe
- **Dependencies:** T18 (install must land first to have something to uninstall)
- **External deps:** S04 ADR bootout pattern
- **Followups:** none

---

## CLI-T cluster (Session A CLI territory)

Folded into this surface per operator instruction. `packages/dispatch-cli/` owns all code here.

### CLI-T01 — fd v1 commands refactored as thin HTTP clients
- **Scope:** `packages/dispatch-cli/src/commands/{init,list,send,pull}.ts` rewritten to issue HTTP calls to the daemon. Each command: load token from `~/.foxworks-dispatch/token`, hit the corresponding endpoint, format response for the operator. `fd init` → `POST /v2/sessions`; `fd list` → `GET /v2/sessions` → tab-separated stdout; `fd send` → read prompt file + `POST /v2/sessions/:name/prompts`; `fd pull` → `GET /v2/sessions/:name/handoff` → stdout + clipboard (daemon already copies, CLI prints; duplicate clipboard calls are benign).
- **Acceptance criteria:**
  - All 43 fd v1 regression tests still pass (covered by CLI-T05)
  - Per-command happy path: CLI output identical to v1 for the cases v1 tests assert
  - Per-command error messages include the daemon's error body when present (e.g., 404 surfaces "no session named X" cleanly)
- **Dependencies:** DAEMON-T02 (auth), T06 (list), T07 (init), T09 (send), T10 (pull). MUST wait for those to land before CLI-T01 implementation.
- **External deps:** contract §7.1 mapping table
- **Followups:** streaming body for large prompts (deferred); retry-on-transient-error (deferred; CLI surfaces error to operator directly)

### CLI-T02 — fd status dashboard with WS subscription
- **Scope:** `packages/dispatch-cli/src/commands/status.tsx` extended: on startup connect to `WS /v2/events/stream` with the stored token; maintain in-memory session state; re-render on every event; graceful degrade if WS disconnects (fall back to HTTP polling of `GET /v2/sessions` every 2s, per current v1 behavior). Read `notifications_available` from `/v2/health` at startup; render an in-status-line hint when `false` (e.g., "[native notifs disabled — in-UI events only]").
- **Acceptance criteria:**
  - `fd status` connects to WS on launch; live events update the table without a manual refresh
  - WS disconnect is handled — CLI reverts to polling, displays a subtle indicator
  - Notifications-available hint visible when flag is false
  - Ctrl+C exits cleanly (closes WS, doesn't leave dangling connections)
- **Dependencies:** DAEMON-T12 (WS stream), DAEMON-T03 (health with flag), CLI-T04 (daemon-dead fallback is the polling mode)
- **External deps:** contract §7.1 (status → `GET /v2/sessions` + WS), contract §5
- **Followups:** keybindings for kill/pause/arm from the dashboard (follow-on to CLI-T03)

### CLI-T03 — New fd commands: kill, pause, hold, arm
- **Scope:** Four new `packages/dispatch-cli/src/commands/` files, each wrapping `PATCH /v2/sessions/:name/state`. Commands: `fd kill <name>`, `fd pause <name>`, `fd hold <name>`, `fd arm <name>`. Each surfaces the returned session state to the operator; exits non-zero on 422 (invalid transition) or 404 (unknown session). `fd kill` prompts operator for confirmation (Y/N) unless `--yes` flag given, since `killed` is terminal per §6.3.
- **Acceptance criteria:**
  - `fd kill <existing-armed-session>` without `--yes` prompts and aborts on N
  - `fd kill --yes <name>` skips the prompt
  - Invalid transition (e.g., `fd arm <killed-session>`) surfaces the daemon's 422 error body verbatim
  - Unknown session → 404 → CLI exits non-zero with helpful message
  - Unit tests per command + table-driven transition-validity tests
- **Dependencies:** DAEMON-T08 (state PATCH); CLI-T01 (CLI HTTP client pattern)
- **External deps:** contract §4.3 + §6.1
- **Followups:** TUI keybindings in `fd status` dashboard for same operations (CLI-T02 follow-on)

### CLI-T04 — Daemon-dead fallback in CLI
- **Scope:** `packages/dispatch-cli/src/lib/daemon-client.ts`. Before every fd-v1-refactored command (CLI-T01), probe `GET /v2/health` with a short timeout (500ms). If probe fails (connection refused, timeout, non-200), log a warn to stderr ("Conductor daemon not running; using fd v1 fallback"), and the command falls through to the prior direct-fd-v1 behavior (read/write `sessions.json` directly via `dispatch-core`, use tmux transport directly). Per contract §7.2.
- **Acceptance criteria:**
  - With daemon running: every fd-v1 command goes through HTTP
  - With daemon NOT running: every fd-v1 command falls back silently (warning to stderr, not stdout)
  - Fallback mode passes the same 43 fd-v1 regression tests (tests run without daemon)
  - New fd commands (CLI-T03 kill/pause/etc) are NOT faded back — they require daemon (because they depend on v2 state machine, which v1 doesn't have); fall back error message: "This command requires the Conductor daemon. Start it with `launchctl ...`."
- **Dependencies:** CLI-T01, DAEMON-T03 (health endpoint to probe)
- **External deps:** contract §7.2
- **Followups:** configurable fallback threshold (health-probe timeout) via env

### CLI-T05 — 43 fd v1 regression tests still pass
- **Scope:** No new code; this ticket is a verification checkpoint. After CLI-T01 through CLI-T04 land, the existing `packages/dispatch-cli/test/{unit,integration,e2e}/` suite (43 tests) MUST pass both WITH daemon running (exercises HTTP path) and WITHOUT daemon (exercises fallback path).
- **Acceptance criteria:**
  - `pnpm --filter dispatch-cli test` returns 43/43 passing with daemon live
  - Same suite returns 43/43 with daemon stopped (fallback mode)
  - CI runs both configurations
- **Dependencies:** CLI-T01, CLI-T02, CLI-T04
- **External deps:** contract §7.4 (invariant)
- **Followups:** none

### CLI-T06 — New fd command tests
- **Scope:** Unit + integration tests for CLI-T03's new commands (kill/pause/hold/arm) + `fd status` WS subscription behavior (CLI-T02). Uses mock daemon (HTTP + WS fixtures) for speed; one integration test against real daemon for sanity.
- **Acceptance criteria:**
  - Per-command happy path + 2-3 error paths (invalid transition, unknown session, daemon dead) tested
  - `fd status` WS subscription: mock emits 3 events, TUI reflects state
  - Test count lands at a reasonable number (estimated 15-25 new tests)
- **Dependencies:** CLI-T02, CLI-T03
- **External deps:** contract §4.3, §5
- **Followups:** Playwright-like terminal-replay tests for TUI (deferred)

---

## Cross-cutting decisions

### Test strategy
- **Unit tests:** pure logic (state transition rules, auth hook branches, schema migration, debounce utility). Mock dispatch-core; fake timers for debounce.
- **Integration tests:** real Fastify server + `mkdtemp` fs + real tmux (where transport-dependent). Per-test server on `port: 0` for isolation; `afterEach` closes server. Shared fixtures for registry + fake git repo.
- **E2E:** one test per cluster that exercises the full happy path. Example: "daemon starts → POST /v2/sessions → PATCH state=armed → handoff appears → WS emits handoff_written → fd pull succeeds".
- **43 fd v1 regression tests:** must pass in both daemon-up and daemon-down modes (per CLI-T05).

### File layout
```
packages/dispatch-daemon/src/
├── index.ts                   # bin entry
├── server.ts                  # Fastify bootstrap
├── lifecycle/
│   ├── startup.ts
│   ├── shutdown.ts
│   ├── auth.ts                # T02
│   └── error-handler.ts       # T04
├── migration/
│   └── schema-v2.ts           # T05
├── routes/
│   ├── health.ts              # T03
│   ├── sessions.ts            # T06+T07
│   ├── state.ts               # T08
│   ├── prompts.ts             # T09
│   ├── handoff.ts             # T10
│   ├── events.ts              # T11
│   └── ws.ts                  # T12
├── state/
│   └── transitions.ts         # T08 rules
├── watchers/
│   ├── handoff.ts             # T13
│   ├── git.ts                 # T14
│   └── status-json.ts         # T15
└── events/
    ├── emit-queue.ts          # T12 per-connection queue
    ├── history.ts             # T17 ring buffer
    ├── notifications.ts       # T16
    └── status-json-parser.ts  # T15 parser
```

### Shared test fixtures
`packages/dispatch-daemon/test/fixtures/`:
- `server.ts` — spawn a test daemon on a random port; return client handle + cleanup
- `session.ts` — factory for v2-shaped session registry entries
- `git-repo.ts` — mkdtemp + `git init` + configured user (reused from DAEMON-S04 spike)
- `token.ts` — fixed test token + helper to inject into fetch headers / ws url

### Logging / observability
- Fastify Pino at `info` default. Per-request log includes method, path, status, duration, session name (when derivable from path param).
- Startup log includes version, port, token file path (NOT the token itself), notifications_available, watcher count.
- `warn` level for auth failures, tmux target missing, ring-buffer eviction, fallback-to-polling in CLI.
- `error` level only for crashes / unrecoverable states.
- In production under launchd, output lands in `StandardOutPath` per S04 finding. Log rotation is a Followup per S04 ADR.

### v2 schema migration path (isolated to T05)
Migration happens on first daemon read of `sessions.json` that returns a v1 shape. Steps:
1. Read raw JSON; if `version === 1`, enter migration path.
2. For each session: inject `state: 'armed'` (Blocker 1), `last_commit_sha: null`, `last_status_json_at: null`.
3. Set `version: 2`.
4. Write atomically (reuses dispatch-core `writeRegistry`'s tmp+rename).
5. Subsequent reads validate cleanly against `RegistrySchemaV2`.

Idempotent: already-migrated v2 registries round-trip unchanged. No "double-migration" risk.

---

## RA-01 resolution (operator-arbitrated)

### Arbitration outcome: Option 1 (new additive endpoint)

Operator arbitrated: `POST /v2/sessions/:name/violations` as a new additive endpoint per contract §2 additive-extension rule. Contract v2.0.0 at `3ddca60` remains **frozen**; the endpoint is an additive extension that operator will author into contract §4.X as a post-Phase-Y authoring action. No contract version bump required.

### Why Option 1 over Options 2 and 3

- **Rejected Option 2 (PATCH state extension):** couples operator-initiated state changes with automated violation detection into one endpoint. Bad abstraction for future Cairn-tooling integration. Violation-as-reason-overloaded-on-PATCH is a semantic collision waiting to be cleaned up later.
- **Rejected Option 3 (defer to v2.1):** leaves contract §5.3 `cairn_violation_detected` / `gate_trip` as dead text in v2.0. Session B's WEB-T21 in-banner and Session C's menu bar notifications would build UI for events that never fire. Contract should describe what CAN happen, not what MAY someday happen.
- **Accepted Option 1:** new endpoint cleanly separates concerns (operator state changes on `PATCH /state`; automated violation reports on `POST /violations`). Session B + Session C UI becomes end-to-end testable in v2.0. Additive extension doesn't cost a version bump. Cairn-tooling integration story is forward-compatible.

### Endpoint specification (mirror of DAEMON-T17a scope)

```
POST /v2/sessions/:name/violations

Request body:
{
  "type": "cairn_violation" | "gate_trip",
  "details": { /* shape per contract §5.3 event data for the matching type */ },
  "timestamp": "<ISO 8601>"   // optional; defaults to server now
}

Response: 202 Accepted
{
  "event_id": "<string>"
}

Auth: X-Conductor-Token header required (consolidated onRequest hook per T02)

Side effects (strict order):
1. Validate session exists (404 if not) and state ≠ 'killed' (422 if terminal)
2. Transition session state → 'held' per contract §6.2 (reuses T08 transition helper)
3. Emit state_changed event on WS stream (triggered_by: "cairn_violation" | "gate_trip")
4. Emit cairn_violation_detected OR gate_trip event per request type
5. Push both events into T17 ring buffer for /v2/events gap-fill replay
6. Atomic registry write via T05 migration layer
```

### Ticket addition

**DAEMON-T17a** added to D-5 cluster (placement: after T17 ring buffer, before D-6 deployment). Decimal-suffix numbering avoids renumbering downstream tickets. D-5 cluster count goes from 2 to 3; total from 25 to 26.

### Contract impact

Additive per §2. No version bump. v2.0.0 at `3ddca60` remains frozen. Operator authors the §4.X endpoint documentation post-Phase-Y against the frozen file. Until then, this decomposition doc + the T17a ticket body are the authoritative spec for the endpoint.

### Session B + Session C impact

- **Session B WEB-T21** (in-banner for `cairn_violation_detected`) becomes end-to-end testable in v2.0 via curl or synthetic test client hitting `POST /v2/sessions/:name/violations`. **No WEB-T ticket changes needed** — consumption shape is unchanged from pre-arbitration; only production changes (events now actually fire in v2.0 instead of being dead).
- **Session C menu bar notifications** (future) for `cairn_violation_detected` become end-to-end testable in v2.0 the same way. **No decomposition amendment from Session C** (doesn't exist yet; MB-T decomposition happens post-X.2 closure).
- **CLI-T cluster** does NOT gain an `fd violation` command in v2.0 (operator-reported automation is out of v2.0 CLI scope; Cairn tooling integration comes later). Followup filed on T17a.

---

## Ticket sequencing and dependency graph

Build order recommendation (each ticket unblocks downstream tickets):

```
T01 → T02 → T04 → T05 → [T03 after T16]
                     ↓
       ┌─────────────┼─────────────┐
       T06           T07           T08
                                     ↓
                                   T09, T10, T11
                                     ↓
                                   T12 (WS, unblocks watchers)
                                     ↓
                              ┌──────┼──────┐
                              T13   T14   T15
                                     ↓
                                   T17 (ring buffer used by T06, T11, T12, T17a)
                                     ↓
                                   T16 (notification engine subscribes to event bus)
                                     ↓
                                   T17a (violations endpoint — needs T02, T05, T08, T12, T17)

D-6 (T18, T19) runs in parallel to D-1..D-5 — installer doesn't block daemon code

CLI-T sequencing:
- CLI-T01 depends on DAEMON-T02, T06, T07, T09, T10 (all HTTP endpoints it consumes)
- CLI-T02 depends on DAEMON-T12 + T03 (WS + health flag)
- CLI-T03 depends on DAEMON-T08 (state PATCH)
- CLI-T04 depends on DAEMON-T03 (health probe)
- CLI-T05 depends on CLI-T01, T02, T04
- CLI-T06 depends on CLI-T02, T03
```

Estimated total effort: ~26 tickets, each averaging 0.5-2 days. Calendar estimate 2-3 weeks single-session (not parallelized).

---

## Self-check

- Q1 API spike: n/a — decomposition, not a spike
- Q2 behavior/mocks: n/a — docs only
- Q3 impl delete: n/a — docs only
- Q4 outside contract: no — every ticket maps to a contract section or operator arbitration; RA-01 resolved via Option 1 (additive endpoint per §2) not unilateral improvisation
- Q5 contract modification: no — both CS-02's `notifications_available` and T17a's `POST /violations` endpoint are contract-additive per §2. Contract v2.0.0 at `3ddca60` stays frozen; operator authors §4.X post-Phase-Y
- Q6 unlabeled claims: no — MODELED/KNOWN labels held; RA-01 is now RESOLVED (no longer labeled ambiguous)
- Q7 Session B territory: no — this doc is in `docs/adr/` (shared docs); no edits to `packages/dispatch-web/`, `packages/dispatch-menubar/`. The CLI-T cluster is Session A territory per operator arbitration folding CLI-T into Session A's surface.
- Q8 registry bypass: no — every state change in the decomposition routes through `PATCH /v2/sessions/:name/state` (DAEMON-T08), never direct registry writes (except the explicit v2 migration path in T05 which is bootstrap-only)
- Q9 halt discipline: held — no implementation code drafted; this is the decomposition surface, which is exactly what pre-reg gate 3 asks for. Scope fence: no DAEMON-T implementation, no CLI-T implementation, no test writing, no dep installs beyond what's already in the spike phase.

---

## Halt

Surface ends here. This is the amended decomposition — the initial surface at `80372f1` was acked on everything except RA-01; the operator arbitrated RA-01 as Option 1 and requested the amendment. Halting for operator ack on the amendment specifically:

1. **DAEMON-T17a ticket body** (scope, acceptance criteria, dependencies, external deps, followups) — approve or revise
2. **RA-01 resolution section** (Option 1 rationale + endpoint spec + contract-impact framing) — approve or revise
3. **Cluster count + table update** (D-5 now 3 tickets; total 26) — approve
4. **Dependency graph update** (T17 → T16 → T17a ordering, T17a dependencies explicit) — approve

Post-amendment ack triggers DAEMON-T01 implementation start as the first work cycle. Per §3.7: no implementation code until ack.

Per operator instruction on cluster-batched review: halt after the last D-1 ticket ships (T05 schema migration, the cluster-closing ticket per dependency order). Operator reviews D-1 as a unit. No per-ticket halts within the cluster unless something surprises.
