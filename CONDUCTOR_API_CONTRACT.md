# Foxworks Dispatch v2 — Conductor HTTP API Contract

**Version:** v2.0.0
**Status:** FROZEN — operator-approved authority document
**Authority:** Operator-arbitrated. Neither Conductor session A nor B may modify this contract unilaterally. Contract changes require explicit operator approval and version bump.
**Cairn primitives baked in per §10.**

---

## §1 — Purpose

This contract specifies the HTTP API surface between Conductor's daemon (built in Session A) and Conductor's UI surfaces (built in Session B). It is the single source of truth for the daemon-UI interface. Both sessions consume this contract as frozen input.

The contract exists because parallel CC sessions on the same codebase produce drift unless contracts are specified upfront. fd v1's frozen `sessions.json` schema and frozen handoff footer set the precedent; this contract extends the pattern to the v2 daemon API.

**Coordinated `/v3/*` surface (additive, governed by `WORKSTATION_CONTRACT.md`):** The daemon also serves `/v3/*` endpoints introduced by Foxworks Workstation v3.0 per `WORKSTATION_CONTRACT.md` §6. The `/v3/*` shape definitions, persistence model, and authority chain live in that contract; this contract remains authoritative for `/v2/*` and for the daemon's HTTP/auth/error-handler infrastructure (§3, §10) which both surfaces share. Where the two contracts coordinate (auth header, error envelope, route-registration order), this contract's primitives govern.

---

## §2 — Authority and frozen status

**Frozen at v2 ship:**
- All endpoint paths in §4 (URL strings, HTTP methods)
- All request/response shapes in §4 (JSON structures)
- All event types in §5 (WebSocket message shapes)
- Authentication mechanism in §3 (token-header pattern)
- State transition rules in §6
- STATUS.json schema in §8 (extension of fd v1's handoff footer convention)
- fd v1 backward-compat mapping in §7

**Additive only post-ship:**
- New endpoints under `/v2/...` paths
- New optional fields in existing request/response shapes
- New event types (existing types' shapes frozen)
- New permission categories (if scope expands beyond v2)

**Non-additive change requires:**
- Operator approval (no CC-modified contract changes)
- Version bump (v2.0 → v2.1 minor for additive, v2 → v3 major for breaking)
- Migration path for existing clients

---

## §3 — Authentication

### §3.1 Token-header pattern

All HTTP requests to the daemon require header:

```
X-Conductor-Token: <token>
```

### §3.2 Token storage

Token stored at `~/.foxworks-dispatch/token` (operator-readable, mode 0600). Created on daemon first-run if missing. Random 256-bit value, base64-encoded.

### §3.3 Token rotation

`POST /v2/auth/rotate` (requires current token) generates new token, atomically updates file, returns new token in response. UI surfaces re-read token after rotation.

### §3.4 Why this matters

Without auth, any browser tab can issue requests to `localhost:7878` and trigger destructive actions (kill sessions, send prompts, modify state). Token-header pattern blocks this. Per Automata-chat security analysis, this is non-negotiable for v2.

**Confidence:** KNOWN — pattern verified by web standard practice, no spike needed.

---

## §4 — REST endpoints

### §4.1 Health

**`GET /v2/health`** — daemon liveness check. No auth required (allows UI to detect daemon presence before token submission).

Response: `{"status": "ok", "version": "2.0.0", "uptime_seconds": <number>}`

### §4.2 Sessions — list and read

**`GET /v2/sessions`** — list all registered sessions

Response:
```json
{
  "sessions": [
    {
      "name": "sherpa",
      "cwd": "/Users/josh/code/foxworks-sherpa",
      "tmux_target": "sherpa:0.0",
      "handoff_path": "/Users/josh/code/foxworks-sherpa/HANDOFF.md",
      "state": "armed",
      "computed_status": "awaiting_review",
      "last_prompt_sent_at": "2026-04-22T18:30:00Z",
      "last_handoff_pulled_at": "2026-04-22T19:15:00Z",
      "last_commit_sha": "1b47812",
      "last_status_json_at": "2026-04-22T19:14:00Z"
    }
  ]
}
```

**`GET /v2/sessions/:name`** — single session detail

Response: same shape as single entry in list above, plus:
```json
{
  "status_json": { },
  "recent_events": [ ]
}
```

### §4.3 Sessions — create and modify

**`POST /v2/sessions`** — register new session (equivalent to `fd init`)

Request: `{"name": "sherpa", "cwd": "/path/to/repo", "tmux_target": "sherpa:0.0"}`

Response: 201 Created with full session entry. 409 Conflict if name exists.

**`PATCH /v2/sessions/:name/state`** — transition session state

Request: `{"state": "armed" | "paused" | "held" | "killed"}`

Response: 200 OK with updated session entry. 422 Unprocessable Entity if transition invalid (per §6 rules).

State transitions trigger side effects per §6. Notably:
- `armed → held`: daemon sends Ctrl-C into tmux pane
- `armed → killed`: daemon runs `tmux kill-session`
- `held → armed`: no side effect (operator sends new prompt manually to resume)
- `paused → armed`: no side effect (handoff watcher resumes)

### §4.4 Prompts and handoffs

**`POST /v2/sessions/:name/prompts`** — send prompt to session (equivalent to `fd send`)

Request: `{"prompt": "<full prompt body>"}`

Response: 200 OK with `{"sent_at": "<timestamp>", "archived_to": "<path>"}`. 422 if session not in armed state.

Daemon: appends frozen v1 handoff footer if not present, writes to archive, sends via tmux transport.

**`GET /v2/sessions/:name/handoff`** — pull current handoff (equivalent to `fd pull`)

Response: 200 OK with `{"content": "<handoff body>", "written_at": "<mtime>", "archived_to": "<path>"}`. 404 if no handoff present.

Daemon: reads handoff file, archives, copies to clipboard via `pbcopy` execFile.

### §4.5 Events history

**`GET /v2/events?since=<timestamp>&limit=<n>`** — paginated event log

Response:
```json
{
  "events": [
    {
      "timestamp": "2026-04-22T19:15:00Z",
      "session": "sherpa",
      "type": "handoff_written",
      "data": { }
    }
  ],
  "next_since": "<timestamp>"
}
```

Default limit: 100. Maximum: 500.

### §4.6 Coordinated `/v3/*` surface

Per `WORKSTATION_CONTRACT.md` §1.2 + §6, the daemon hosts a coordinated `/v3/*` endpoint surface for Foxworks Workstation. `/v3/*` shape definitions live in `WORKSTATION_CONTRACT.md`; this contract enumerates the cross-cutting expectations:

- **Auth (§3.1).** All `/v3/*` requests require the same `X-Conductor-Token` header as `/v2/*`. There is no `/v3/*` equivalent of the `/v2/health` exemption.
- **Error envelope (§4 + §10.4).** `/v3/*` error responses share the JSON `{"error": "..."}` shape used by `/v2/*` for HTTP-level errors. `WORKSTATION_CONTRACT.md` §6.5 specifies a richer typed `WorkstationError` discriminated-union body for application-level errors; the two coexist (HTTP-level errors stay as `{"error": "..."}`, application errors carry the typed shape with appropriate status codes).
- **Route-registration order.** The daemon registers `/v2/*` routes BEFORE `/v3/*` routes, and both BEFORE `@fastify/static`. SPA fall-through must not match `/v3/*` paths (current 404-handler must be amended to gate the same way it gates `/v2/*`).
- **404 shape.** Unmatched `/v3/*` paths return JSON 404 (`{"error": "Not found"}`), not the SPA fall-through bundle.
- **WebSocket.** v3.0 ships with no `/v3/*` WS endpoints. The existing `/v2/events/stream` endpoint remains the sole real-time channel; orchestrator IPC for the embedded webview rides the existing v2 WS stream where applicable.
- **Versioning.** Per §12, this contract bumps to v2.1.0 to reflect the additive `/v3/*` cross-reference. The `/v3/*` surface itself versions independently per `WORKSTATION_CONTRACT.md` §2.3.

This contract does not duplicate `/v3/*` shape definitions. Readers wanting the request/response shapes for `/v3/orchestrator/messages`, `/v3/orchestrator/history`, `/v3/orchestrator/audit`, `/v3/tickets/state`, etc., consult `WORKSTATION_CONTRACT.md` §6 and `packages/dispatch-core/src/v3/schema.ts` (the freeze-anchor schema, operator-arbitrated at commit `232fbaa` under `WORKSTATION_CONTRACT.md` §2).

---

### §4.7 — `/v3/sessions/:name/console/*` (CC-console surface)

**Authority:** vision §10 (frozen at eac381e), MB-S06 spike evidence (frozen at b641e58).
**Version:** Introduced in v2.2.0.
**Surface scope:** CC-console direct-chat panel per vision §10. Operator-driven typing surface. No LLM in this loop. Distinct from §4.6 (`/v3/orchestrator/*`) which routes through the Sonnet 4.6 co-architect.

#### §4.7.1 Coordination invariants

These invariants apply across all five §4.7 endpoints.

**Authentication.** All HTTP endpoints require `X-Conductor-Token` header per §3 token auth. WebSocket endpoint accepts `?token=` query parameter (browser WebSocket API does not support custom headers; query parameter is the standard workaround for browser-side WS auth). Token validation logic identical to §4.6 token check.

**Error envelope.** HTTP error responses use the existing error envelope shape from §4.4. The `error.type` for §4.7-specific failures is one of: `SessionNotFound`, `SessionNotRunning`, `ConsoleBufferUnavailable`, `SignalNotSupported`, `EncodingInvalid`, `BackpressureRejected`. Vision §10's `WorkstationError` discriminated union covers the workstation-side surface; the daemon-side error envelope wraps it.

**Route registration order.** All §4.7 routes register before SPA fall-through per the precedent established by `6ae23ff` (COARCH-T01's /v3/* exclusion). Specifically: §4.7 routes register after §4.6 routes and before the catch-all 404 handler. Unmatched paths under `/v3/sessions/:name/console/*` return 404 with the JSON error envelope (NOT the SPA HTML fall-through).

**404 JSON shape for unmatched /v3/sessions/:name/console/* paths.** Mirrors `d38c8b5` regression precedent: error envelope with `type` `NotFound` and message `Unknown route: <method> <path>` returned with HTTP 404.

**Sequence-number space.** STDIN writes and STDOUT reads use disjoint monotonic counters per session: `stdin_seq` (incremented on each successful POST /stdin) and `stdout_seq` (incremented on each line emitted on the WS stream). Counters are session-scoped and persist across daemon restarts via the `cc_console_buffer` table (DDL deferred to CONSOLE-T01). Counters are 64-bit unsigned integers.

**PTY reader sharing.** A single daemon-side `pipe-pane` reader per tmux session fans out STDOUT bytes to N WebSocket subscribers. Subscribers do NOT each spawn a `pipe-pane` — that would duplicate the byte stream and risk tmux-side state corruption. Disconnection of one subscriber does not affect others. Validated KNOWN at N=2 in MB-S06 §6; MODELED at N=4 (vision §10.11 Q3 panel cap).

**Ring buffer storage.** Per-session daemon-side ring buffer for STDOUT lines, default 50,000 lines (vision §10.5). Backed by `cc_console_buffer` SQLite table; DDL ships in CONSOLE-T01. Eviction is FIFO; eviction-window gaps surface to subscribers via the WS backfill protocol (see §4.7.3).

**Signal dispatch table.** §4.7.4 (POST /console/signal) maps each supported signal to one of three dispatch mechanisms based on MB-S06 §3 evidence:

- `SIGINT` — PTY byte 0x03 (preferred) OR `tmux send-keys C-c` (fallback). Both KNOWN-working per MB-S06 §3; PTY byte preferred for fidelity.
- `SIGTERM` — `kill(2)` on pane PID. No PTY-byte mapping per MB-S06 §3; tmux pane PID required.
- `SIGHUP` — `kill(2)` on pane PID OR `tmux kill-session`. Both work; `kill(2)` preferred for granularity.

Other signals (SIGUSR1, SIGUSR2, SIGKILL, etc.) are NOT supported in v3.0 per ratified vision §10.11 Q2.

#### §4.7.2 POST /v3/sessions/:name/console/stdin

Write bytes to the named session's tmux PTY STDIN.

**Path parameters:** `:name` — session name registered in daemon (must match an existing session in RUNNING, IDLE, AWAITING REVIEW, or HELD state per §6 state machine; sessions in KILLED state return `SessionNotRunning`).

**Headers:** `X-Conductor-Token` required.

**Request body fields:** `bytes` (string, required), `encoding` (string enum `utf8` or `base64`, defaults to `utf8` if omitted). Use `base64` when `bytes` contains non-UTF-8-safe binary sequences (e.g., raw signal bytes other than 0x03; arbitrary control bytes that don't form valid UTF-8). The daemon decodes per the declared encoding before writing to the PTY.

**Response (success, HTTP 200) fields:** `accepted` (boolean true), `stdin_seq` (integer; the session's per-write monotonic counter after this write).

**Response (failure):** error envelope with `type` of `SessionNotFound`, `SessionNotRunning`, `EncodingInvalid`, or `BackpressureRejected`. `BackpressureRejected` returns when the daemon-side write buffer to the PTY is saturated (MB-S06 §2 KNOWN backpressure behavior); client should retry with exponential backoff.

**Implementation note for CONSOLE-T01:** This endpoint MUST use a new `pasteRawBytes(target, bytes)` helper distinct from the existing `sendKeys` helper. Per MB-S06 §1 KNOWN finding, `sendKeys` (no `-r` flag on tmux paste-buffer) intentionally translates LF (0x0A) to CR (0x0D) to support prompt-submit semantics. `pasteRawBytes` MUST use `tmux paste-buffer -r` to preserve byte-identical round-trip. Conflating the two would silently corrupt operator-typed multi-line input.

#### §4.7.3 WS /v3/sessions/:name/console/stream

WebSocket channel streaming raw STDOUT bytes from the named session's tmux PTY as they arrive.

**Path parameters:** `:name` — session name as above.
**Query parameters:** `?token=<token>` — required (browser WS auth limitation per §4.7.1).

**Connection handshake.** On connect, client sends a `subscribe` message with type `subscribe` and field `last_seq` (integer; highest `stdout_seq` the client has previously received, 0 for first connection or full reset).

Daemon responds with a `backfill_meta` message with type `backfill_meta` and fields: `current_seq` (integer; latest `stdout_seq` in the session), `available_from_seq` (integer; oldest `stdout_seq` still in the ring buffer), `backfill_complete` (boolean; `true` if `available_from_seq <= last_seq + 1` (no eviction-window gap), `false` if `last_seq + 1 < available_from_seq` (some lines were evicted before client could receive them — operator-visible gap)).

Daemon then sends backfill messages (one per buffered line from `max(available_from_seq, last_seq + 1)` to `current_seq`), each with type `line` and fields: `stdout_seq` (integer), `bytes` (string), `encoding` (`utf8` for lines that decode cleanly as UTF-8; `base64` for lines containing invalid UTF-8 sequences). Default expectation is `utf8` per MB-S06 §1 KNOWN-clean round-trip across all six tested payload classes including CJK and emoji.

Daemon then transitions to live streaming, sending `line` messages as new STDOUT bytes arrive from the PTY.

**Subscriber-side reconnection.** Client reconnects with new `subscribe` message including the `last_seq` it had received before disconnect. Daemon handles per the same handshake protocol (validated KNOWN in MB-S06 §5). If `backfill_complete: false`, the client SHOULD surface the gap to the operator. Specific UI rendering of the gap-warning is CONSOLE-T03 territory; this contract specifies only the signal.

**Disconnection semantics.** Either side may close the WS at any time. Daemon-side cleanup: subscriber removed from the per-session fan-out list. PTY reader continues if other subscribers remain (per §4.7.1 PTY reader sharing); PTY reader pauses if no subscribers remain AND ring buffer hits its high-water mark.

#### §4.7.4 POST /v3/sessions/:name/console/signal

Send a signal to the CC process running in the named session's tmux pane.

**Path parameters:** `:name` — session name as above.
**Headers:** `X-Conductor-Token` required.
**Request body fields:** `signal` (string enum `SIGINT`, `SIGTERM`, or `SIGHUP`). Other signal names return `SignalNotSupported`.

**Response (success, HTTP 200) fields:** `accepted` (boolean true), `dispatch_method` (string enum `pty_byte`, `send_keys`, `kill_2`, or `tmux_kill_session`; reports which mechanism the daemon used per the §4.7.1 signal dispatch table).

**Response (failure):** error envelope with `type` of `SessionNotFound`, `SessionNotRunning`, or `SignalNotSupported`.

#### §4.7.5 GET /v3/sessions/:name/console/buffer

Fetch a bounded slice of the session's STDOUT ring buffer for backfill or scrollback (HTTP-side complement to the WS stream; useful for non-WS clients or for one-shot scrollback queries).

**Path parameters:** `:name` — session name as above.
**Headers:** `X-Conductor-Token` required.
**Query parameters:** `before_seq` (optional integer; return lines with `stdout_seq < before_seq`; omit for "from the latest"), `max_lines` (optional integer, default 100, max 5000).

**Response (success, HTTP 200) fields:** `lines` (array of objects each with `stdout_seq` integer, `bytes` string, `encoding` enum), `earliest_in_buffer_seq` (integer), `latest_in_buffer_seq` (integer). The latter two let the client detect eviction-window gaps without needing the WS handshake.

**Response (failure):** error envelope with `type` of `SessionNotFound` or `ConsoleBufferUnavailable` (the latter when daemon-side buffering is operator-disabled per vision §10.5 setting).

#### §4.7.6 GET /v3/sessions/:name/console/status

Fetch CC-console state for the named session.

**Path parameters:** `:name` — session name as above.
**Headers:** `X-Conductor-Token` required.

**Response (success, HTTP 200) fields:** `session_name` (string), `buffer_enabled` (boolean; whether daemon-side ring buffer is active for this session, operator-configurable per vision §10.5), `buffer_line_count` (integer; current count of lines in the ring buffer), `earliest_in_buffer_seq` (integer), `latest_in_buffer_seq` (integer), `current_subscribers` (integer; number of WS subscribers currently connected), `last_stdout_activity_at` (ISO 8601 timestamp or null), `last_stdin_activity_at` (ISO 8601 timestamp or null).

**Response (failure):** error envelope with `type` of `SessionNotFound`.

#### §4.7.7 Implementation deferral list

The following are explicitly deferred to CONSOLE-T01 (daemon implementation), CONSOLE-T02 (IPC layer), or CONSOLE-T03 (UI panel) and are NOT part of the §4.7 contract surface:

- SQLite DDL for `cc_console_buffer` table (CONSOLE-T01).
- Daemon-side broadcast / fan-out implementation specifics (CONSOLE-T01).
- 60-second sustained backpressure soak test that ratchets MB-S06 §2 from MODELED to KNOWN at production scale (CONSOLE-T01).
- IPC message types `console:open`, `console:close`, `console:send-stdin`, `console:stdout-chunk`, `console:signal` per vision §10.7 (CONSOLE-T02; specified in vision §10.7, not duplicated here).
- Operator-facing rendering of `backfill_complete: false` gap warning (CONSOLE-T03).
- xterm.js integration for ANSI color and cursor-control rendering per vision §10.11 Q4 (CONSOLE-T03).
- Settings UI for buffer size + buffer-enabled toggle per vision §10.5 (MB-T11/W-T19).
- Audit log integration per vision §10.11 Q5 (separate `console_prompts` table, may amend §4.7 in v3.x; not in v3.0 scope).


## §5 — WebSocket events

### §5.1 Endpoint

**`WS /v2/events/stream`** — push events as they happen

Auth: token in query string `?token=<token>` (WebSocket can't send custom headers in browser).

### §5.2 Event message shape

All messages follow:

```json
{
  "type": "<event_type>",
  "timestamp": "<iso8601>",
  "session": "<session_name>",
  "data": { }
}
```

### §5.3 Event types (frozen at v2 ship)

**`handoff_written`** — daemon detected HANDOFF.md update for session
- `data`: `{"path": "<absolute_path>", "size_bytes": <number>}`

**`commit_landed`** — git log watch detected new commit on session's repo
- `data`: `{"sha": "<short_sha>", "subject": "<commit subject>", "branch": "<branch_name>"}`

**`state_changed`** — session transitioned between armed/paused/held/killed
- `data`: `{"from": "armed", "to": "held", "triggered_by": "operator" | "cairn_violation" | "gate_trip"}`

**`prompt_sent`** — operator sent new prompt to session
- `data`: `{"archived_to": "<path>", "size_chars": <number>}`

**`test_status_updated`** — STATUS.json updated by CC (if hybrid model has CC enhancement)
- `data`: `{"tests_passing": <number>, "tests_failing": <number>, "phase": "<phase_name>"}`

**`cairn_violation_detected`** — daemon or operator flagged cairn violation in session
- `data`: `{"violation_type": "drift" | "fabrication" | "scope_creep" | "missing_redgreen", "details": "<description>"}`

**`gate_trip`** — pre-registration gate triggered (session pauses, awaits operator)
- `data`: `{"gate_name": "<gate>", "context": "<description>", "expected_action": "<what operator needs to do>"}`

### §5.4 Why WebSocket and not SSE

WebSocket allows bidirectional communication if needed (e.g., UI can ping daemon to test connection). SSE would also work but is one-way only. Operator may pick SSE if it simplifies anything significantly during build; surface as design decision.

**Confidence:** MODELED — WebSocket vs SSE tradeoff has reasoning; either works for v2 scope.

---

## §6 — State machine rules

### §6.1 Valid transitions

```
armed   → paused (operator-initiated; no side effect on CC)
armed   → held   (operator-initiated; daemon sends Ctrl-C to tmux pane)
armed   → killed (operator-initiated; daemon runs tmux kill-session)
paused  → armed  (operator-initiated; handoff watcher resumes)
paused  → killed (operator-initiated; daemon runs tmux kill-session)
held    → armed  (operator-initiated; no side effect — operator sends new prompt manually)
held    → killed (operator-initiated; daemon runs tmux kill-session)
killed  → (terminal — must re-init session via POST /v2/sessions)
```

### §6.2 Cairn-triggered transitions

When daemon or operator flags cairn violation, daemon auto-transitions session to `paused` state and emits `state_changed` event with `triggered_by: "cairn_violation"` AND emits `cairn_violation_detected` event.

When pre-registration gate trips, daemon auto-transitions session to `paused` state and emits `state_changed` with `triggered_by: "gate_trip"` AND emits `gate_trip` event.

Operator must explicitly transition back to `armed` after reviewing violation/gate. Daemon never auto-resumes from `paused` after cairn-triggered transition.

### §6.3 Invariants

- Sessions are never in two states simultaneously
- State persists to `sessions.json` after every transition (durable across daemon restarts)
- `killed` is terminal — re-init creates new session entry, does not resurrect
- Daemon enforces transition validity; UI cannot bypass §6.1 by sending invalid PATCH

**Test coverage required (Session A):** every valid transition has test, every invalid transition has test asserting 422 response.

---

## §7 — fd v1 backward compatibility

### §7.1 Existing CLI commands

All five fd v1 commands (`init`, `list`, `send`, `pull`, `status`) MUST continue to work after v2 ships. They become thin wrappers that hit the daemon's HTTP API.

| fd v1 command | v2 implementation |
|---|---|
| `fd init <n> --cwd <path> --target <target>` | `POST /v2/sessions` |
| `fd list` | `GET /v2/sessions`, format as machine-parseable text |
| `fd send <n> <prompt-file>` | Read file, `POST /v2/sessions/:name/prompts` |
| `fd pull <n>` | `GET /v2/sessions/:name/handoff`, copy to clipboard, print |
| `fd status` | `GET /v2/sessions` + `WS /v2/events/stream`, render TUI |

### §7.2 Daemon-dead fallback

If daemon is not running (`GET /v2/health` fails), fd v1 commands fall back to direct fd v1 behavior — read/write `sessions.json` directly, use tmux transport directly, no HTTP. Operator gets warning "Conductor daemon not running, using fd v1 fallback".

This means fd v1 commands keep working even when Conductor is offline. Critical for the "if Conductor is broken, how does operator fall back" requirement.

### §7.3 sessions.json schema compatibility

v2 daemon reads/writes the same `sessions.json` file as fd v1. Schema changes are additive only:
- New optional fields allowed (`last_commit_sha`, `last_status_json_at`)
- Existing fields unchanged (`cwd`, `tmux_target`, `handoff_path`, `last_prompt_sent_at`, `last_handoff_pulled_at`)
- Schema version bumps from 1 to 2 with auto-migration on first daemon write
- fd v1 commands must read v2-schema sessions.json transparently (version
  field accepts both 1 and 2; unknown fields preserved through round-trip
  via Zod `.passthrough()`), to support the §7.2 daemon-dead fallback after
  the daemon has ever run. Without this, v1 would either reject v2
  registries (parse failure) or silently strip v2-only fields on writeback
  (state-data loss across all sessions). [Amended 2026-04-28 per Z-4
  evidence, commit c8c9ec2]

### §7.4 43 fd v1 tests

All 43 fd v1 tests MUST continue to pass after v2 work. Session A's first checkpoint (after monorepo restructure) verifies test count is unchanged. Session B's exit gate verifies same.

---

## §8 — STATUS.json schema (hybrid model)

### §8.1 Sources

Per Automata-chat decision, dashboard data comes from hybrid sources:

1. **Daemon-inferred (always present):** Git log watch produces `last_commit_sha`, `last_commit_subject`, `last_commit_at`. Handoff content provides `phase` (parsed from prose with fallback to "unknown").

2. **CC-written STATUS.json (optional enhancement):** If CC writes `<cwd>/STATUS.json` alongside `<cwd>/HANDOFF.md`, daemon parses and surfaces.

### §8.2 STATUS.json shape (when CC writes)

```json
{
  "schema_version": "1.0",
  "phase": "<current_phase_name>",
  "ticket_id": "<current_ticket>",
  "ticket_index": <number>,
  "ticket_total": <number>,
  "tests_passing": <number>,
  "tests_failing": <number>,
  "last_commit_sha": "<short_sha>",
  "flagged_unknowns": ["<UNKNOWN item 1>", "<UNKNOWN item 2>"],
  "needs_review": false,
  "updated_at": "<iso8601>"
}
```

### §8.3 Footer extension (opt-in)

fd v1's frozen handoff footer remains unchanged. NEW prompts MAY include extended footer:

```
---
At phase end, write your hand-off note to ./HANDOFF.md.
Overwrite any prior contents. One paragraph. Nothing else in that file.

Optional: write ./STATUS.json with schema per CONDUCTOR_API_CONTRACT.md §8.2.
Update STATUS.json after every commit, after every test run, and at phase-end.
```

Existing prompts using v1 footer continue to work — daemon falls back to git+prose inference.

### §8.4 Why hybrid

Per Automata-chat decision (Option Z): daemon-inference is the floor (works for all projects today), CC-written STATUS.json is enhancement (works for new projects opting in). Two code paths but covers all cases.

---

## §9 — Out of scope (v2)

These are NOT v2 work. File followups if they surface:

- Multi-machine support (Conductor only runs on operator's machine)
- Cloud sync of registry/archive
- LLM calls of any kind from Conductor
- Conductor automating the Claude.ai side of the loop (operator pastes both directions)
- iOS/Android UI surfaces
- Plugin architecture for custom event types
- Recording/replay of sessions
- Conductor coordinating non-Claude-Code tools

If any of these feel load-bearing during v2 build, STOP and surface to operator.

---

## §10 — Cairn enforcement structure

### §10.1 Confidence labels per section

Throughout this contract, claims should be labeled:
- **KNOWN:** verified by spike or fd v1 existing behavior
- **MODELED:** inferred from design intent or web standards, untested
- **SPECULATIVE:** best guess pending evidence

Both Sessions A and B use the same labeling in commits referencing this contract.

### §10.2 Frozen contract enforcement

When Session A or B encounters evidence the contract is wrong (e.g., menu bar widget can't actually consume WebSocket events as specified, OR daemon can't atomically update sessions.json under load):

1. STOP work in current session
2. Surface to operator with: contract section affected, evidence of the problem, proposed change
3. Operator decides: contract change (with version bump) or session adapts to current contract
4. Resume only after operator decision

Neither session may modify this contract unilaterally. Modifying without operator approval = cairn violation = paused state per §6.2.

### §10.3 Anti-fabrication on referenced surfaces

When implementing endpoints that reference external surfaces:
- WebSocket behavior: spike against `ws` library if behavior assumed differs from observation
- fs.watch / fsevents: spike against macOS fsevents if coalescing behavior matters
- node-notifier or AppleScript notifications: spike for delivery semantics
- launchd integration: spike for crash-recovery behavior
- **`/v3/*` SQLite layer (per `WORKSTATION_CONTRACT.md` §8.1, amended 2026-04-29):** spike against `better-sqlite3` for migration idempotence + WAL pragma + UNIQUE constraints (already validated by `MB-S03` spike harness; production code citations should reference that harness, the `migration-orchestrator.test.ts` unit suite, or re-run the harness against `~/.foxworks-dispatch/data.db`).

NO endpoint implementation merged without spike evidence for its load-bearing external dependencies. KNOWN dependencies (HTTP routing via Express/Fastify, JSON serialization, `pbcopy` execFile) need no spike.

### §10.4 Outcome classification per endpoint

Each endpoint's tests should produce one of:
- **Improved (full coverage):** endpoint specified, tested, integration-validated
- **Capability enabled with known limitations:** endpoint works for spec, edge cases documented as followups
- **No regression; mechanism wiring verified:** endpoint exists per contract, integration test deferred to zipper session

Honest classification per endpoint at session-end. Don't force "Improved" framing if integration evidence is deferred.

### §10.5 Self-check questions (per commit, both sessions)

1. Is the API I called verified by a spike in this repo? [yes/n/a]
2. Does my test exercise behavior, or my mocks? [behavior/MIXED/MOCKS]
3. If implementation deleted, would test still pass? [yes/no]
4. Did I add anything outside this contract's specification? [yes/no]
5. Did I modify this contract without operator approval? [yes/no — if yes, REVERT]
6. Is any claim in my commit body unlabeled? [yes/no]
7. Did this commit touch any file the other parallel session might also modify? [yes/no — if yes, surface to operator]
8. Does this commit change session state via direct registry write, bypassing PATCH /v2/sessions/:name/state? [yes/no — if yes, this is wrong path, fix]
9. Did I do work during a halt state that wasn't explicitly authorized? [yes/no — if yes, surface]

### §10.6 Scope fence: "while we're here" defense

If during implementation, an attractive adjacent improvement surfaces (better error messages, additional fields, new endpoints), file as followup. Do NOT absorb into current scope.

Examples of "while we're here" temptations to file as followups:
- "While I'm in the registry code, let me also add X"
- "This endpoint would be better if it also did Y"
- "Z field would be nice for the UI to have"

All become followups. Contract changes are operator-arbitrated.

### §10.7 Halt discipline (per project instructions §3.7)

When a session is in a halt state — waiting for operator ack at a pre-registration gate, blocked on upstream session deliverable, paused for arbitration — "halt" means literally nothing happens. No reads. No file inventories. No "preparatory absorption." No "useful prep while waiting." No proactive context-building for the next phase.

The temptation to do useful prep during a halt IS the signal to surface to operator and ask whether the halt scope should be relaxed — not to act on the temptation and call it within spirit.

Each pre-registration gate is its own surface-and-ack cycle. Don't combine gates. Don't internalize findings without surfacing them.

---

## §11 — Operator review checklist

This contract was operator-approved in chat conversation prior to Session A start. Approval covers:

- §3 token-header pattern matches operator's security expectations
- §4 endpoint set covers all functionality both sessions need
- §5 WebSocket event types cover all real-time UI needs
- §6 state machine matches Automata-chat 4-state model
- §7 fd v1 backward-compat preserves existing 43 tests
- §8 STATUS.json hybrid model matches operator decision
- §9 out-of-scope list captures actual exclusions
- §10 cairn enforcement structure satisfies strict-mode requirements

Contract is FROZEN. Both sessions consume as input.

---

## §12 — Versioning

This document is **v2.1.0**.

Future versions:
- v2.0.x: documentation clarifications, no behavior changes
- v2.x.0: additive changes (new endpoints, new optional fields, new event types)
- v3.0.0: breaking changes (requires migration path)
- **v2.1.0 (this version):** additive cross-reference to the coordinated `/v3/*` surface introduced by `WORKSTATION_CONTRACT.md`. No `/v2/*` shape changes; no behavior changes for v2-only clients. Per §2 authority section's additive-only post-ship rule, this qualifies as a minor bump.

All version bumps require operator approval. Neither CC session may bump version unilaterally.

---

End of contract. Both Conductor sessions consume this as frozen input per §2 authority.
