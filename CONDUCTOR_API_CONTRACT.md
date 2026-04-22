# Foxworks Dispatch v2 — Conductor HTTP API Contract

**Version:** v2.0.0
**Status:** FROZEN — operator-approved authority document
**Authority:** Operator-arbitrated. Neither Conductor session A nor B may modify this contract unilaterally. Contract changes require explicit operator approval and version bump.
**Cairn primitives baked in per §10.**

---

## §1 — Purpose

This contract specifies the HTTP API surface between Conductor's daemon (built in Session A) and Conductor's UI surfaces (built in Session B). It is the single source of truth for the daemon-UI interface. Both sessions consume this contract as frozen input.

The contract exists because parallel CC sessions on the same codebase produce drift unless contracts are specified upfront. fd v1's frozen `sessions.json` schema and frozen handoff footer set the precedent; this contract extends the pattern to the v2 daemon API.

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

---

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

This document is **v2.0.0**.

Future versions:
- v2.0.x: documentation clarifications, no behavior changes
- v2.x.0: additive changes (new endpoints, new optional fields, new event types)
- v3.0.0: breaking changes (requires migration path)

All version bumps require operator approval. Neither CC session may bump version unilaterally.

---

End of contract. Both Conductor sessions consume this as frozen input per §2 authority.
