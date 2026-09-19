# MB-S06 — proposed `CONDUCTOR_API_CONTRACT.md` amendment for CC-console endpoints

**Status:** DRAFT proposal pending operator arbitration of placement.
This file is companion to `docs/adr/MB-S06-tmux-pty-bidirectional-streaming.md`
§9 (the halt-and-surface). The amendment text is ready; the section
number is **deliberately left as a placeholder** (`<<<§N>>>`) until
operator picks (a)/(b)/(c) below.

**Authority:** Operator-arbitrated per `CONDUCTOR_API_CONTRACT.md` §2
("Non-additive change requires operator approval ... version bump ...
migration path"). This file is a `spike:` proposal, NOT a `contract:`
amendment. Operator authors the actual `contract:` amendment after
arbitrating placement and reviewing the proposed text.

**Date:** 2026-05-02

**Anchored against:**
- `docs/vision/SECTION_10_CC_CONSOLE.md` §10.6 (frozen at `eac381e`)
- `CONDUCTOR_API_CONTRACT.md` (frozen at v2.1.0, `952f857`)
- `WORKSTATION_CONTRACT.md` §6 (frozen at `acc2307`)
- `packages/dispatch-core/src/v3/schema.ts` (frozen at `232fbaa`)
- Spike harness evidence at `02cfc4d`

---

## §1 — Placement decision pending — three options

Per the spike's §9 halt: 952f857 placed the existing /v3/* coordination
at **§4.6** of `CONDUCTOR_API_CONTRACT.md`, NOT at §11 as the
pre-amendment coord plan had imagined. §11 ("Operator review
checklist") and §12 ("Versioning") are unchanged. The new console
endpoints could land at one of:

### Option (a) — new §4.7 subsection of "REST endpoints"

Most consistent with how 952f857 placed its amendment (a new
subsection of §4). Cross-cutting expectations for the
`/v3/sessions/:name/console/*` surface would form a §4.7 paragraph
parallel to §4.6's coordinated /v3/* paragraph. The actual endpoint
shape definitions remain in `WORKSTATION_CONTRACT.md` §6 (per the
existing rule that §6 of the workstation contract is authoritative for
/v3/* shape definitions). §4.7 enumerates only daemon-side
infrastructure expectations: auth, error envelope, route-registration
order, 404 shape, WebSocket placement, sequence-number space, ring
buffer storage, signal dispatch table.

### Option (b) — new §13 top-level "CC-console amendment surface"

Cleanest if operator wants the CC-console amendment to be
self-contained and visually distinct from the orchestrator/tickets
coordination at §4.6. §13 would be a single new top-level section
covering everything the daemon needs to host the console surface:
auth, error envelope, WebSocket protocol shape, ring buffer SQLite
table, signal dispatch table, sequence-number space, route ordering,
404 shape. Larger surface area but easier to amend in isolation later.

### Option (c) — extend §4.6 in-place

Smallest diff. Existing §4.6 is amended to add the console endpoints'
cross-cutting expectations as additional bullet points within the
existing /v3/* paragraph. Consequence: §4.6 grows to encompass three
distinct /v3/* surfaces (/v3/orchestrator/*, /v3/tickets/*,
/v3/sessions/:name/console/*) at one anchor. Pro: keeps all /v3/*
coordination in one place. Con: §4.6 becomes a wall of text mixing
three amendments.

**Operator selects one and replaces all `<<<§N>>>` placeholders below
with the chosen section number** (e.g., `§4.7` for option (a), `§13`
for option (b)) before authoring the actual `contract:` commit.
Option (c) requires further restructuring not covered in the
single-section template below.

---

## §2 — Proposed amendment text (for option (a) or (b))

The text below is the same for options (a) and (b) — only the section
number marker changes. Option (c) requires the operator to splice the
relevant bullets into existing §4.6 manually.

> ### `<<<§N>>>` Coordinated `/v3/sessions/:name/console/*` surface
>
> Per `WORKSTATION_CONTRACT.md` §6 + `docs/vision/SECTION_10_CC_CONSOLE.md`
> §10.6, the daemon hosts a coordinated `/v3/sessions/:name/console/*`
> endpoint surface for the Conductor Workstation CC-console panel.
> Endpoint shape definitions live in `WORKSTATION_CONTRACT.md` §6 and
> in `packages/dispatch-core/src/v3/schema.ts` (the freeze-anchor
> schema, frozen at `232fbaa`). This contract enumerates the
> cross-cutting daemon-side infrastructure expectations:
>
> - **Auth (§3.1).** All five `/v3/sessions/:name/console/*` endpoints
>   (POST/WS/GET/POST/GET as enumerated in `SECTION_10_CC_CONSOLE.md`
>   §10.6) require the same `X-Conductor-Token` header as `/v2/*` and
>   the rest of `/v3/*`. The WebSocket endpoint
>   `WS /v3/sessions/:name/console/stream` carries the token via query
>   string (matching the `WS /v2/events/stream` pattern at §5.1) — no
>   Authorization header in browser-originated WebSocket per HTML5
>   spec.
> - **Error envelope (§4 + §10.4).** Same coexistence as §4.6:
>   HTTP-level errors return `{"error": "..."}`; application-level
>   errors carry the `WorkstationError` discriminated-union shape
>   from `WORKSTATION_CONTRACT.md` §6.5 with appropriate status codes.
> - **Route-registration order.** Daemon registers
>   `/v3/sessions/:name/console/*` routes BEFORE the catch-all
>   `@fastify/static` SPA fall-through, alongside the existing
>   /v2/* and /v3/orchestrator/* + /v3/tickets/* routes. SPA fall-
>   through must not match these paths (404 handler treats them like
>   /v2/* and /v3/orchestrator/*).
> - **404 shape.** Unmatched `/v3/sessions/:name/console/*` paths
>   return JSON 404 (`{"error": "Not found"}`), not the SPA bundle.
> - **WebSocket.** v3.0 introduces a per-session WebSocket endpoint
>   `WS /v3/sessions/:name/console/stream` in addition to the existing
>   `WS /v2/events/stream`. Session-scoped channels do not multiplex
>   over the v2 events stream. Per-connection lifecycle owned by the
>   daemon's `@fastify/websocket` registration; subscribers receive
>   the daemon's broadcast from a single per-session shared
>   pipe-pane reader (see "PTY reader sharing" below).
> - **Backfill protocol (per spike MB-S06 §7.2).** On client
>   connection, the client sends a `subscribe` message with shape
>   `{"type": "subscribe", "last_seq": <int>}` (last_seq=0 for full
>   backfill). Daemon responds with a `backfill_meta` message:
>
>   ```json
>   {
>     "type": "backfill_meta",
>     "ring_oldest": <int>,
>     "ring_newest": <int>,
>     "missed_count": <int>,
>     "requested_last_seq": <int>,
>     "backfill_complete": <bool>
>   }
>   ```
>
>   `backfill_complete: false` indicates the ring evicted past the
>   client's last_seq during disconnect — bytes lost permanently;
>   client SHOULD surface this to the operator. After `backfill_meta`,
>   the daemon replays missed lines (oldest-first) as `{"type":
>   "line", "seq": <int>, "line": <string>}` messages, then continues
>   live in the same shape.
> - **Sequence-number space.** Per session, the STDOUT stream
>   (broadcast to WS subscribers) and STDIN write-acknowledgements
>   (`POST .../console/stdin` response) use **disjoint monotonic
>   counters** (`stdout_seq` and `stdin_seq`). Counters do NOT reset
>   on eviction; they climb monotonically across the session lifetime.
>   Disjointness avoids conflating write-ack semantics (correlate POST
>   responses to client-issued writes) with stream-replay semantics
>   (correlate WS messages to ring buffer position). Per spike MB-S06
>   §10 Q-§10.6-A, this is a MODELED-recommend default; operator may
>   amend to a shared counter if preferred.
> - **PTY reader sharing.** The daemon maintains **at most one
>   `tmux pipe-pane`** per session. All WS subscribers receive the
>   daemon-side broadcast of bytes read from that single pipe. Closing
>   one subscriber's WS does not affect others. Per spike MB-S06 §8,
>   verified KNOWN at 2 subscribers.
> - **Ring buffer storage.** Per `WORKSTATION_CONTRACT.md` §8.1, the
>   daemon-side ring buffer (default 50,000 lines per session) lives
>   in the `data.db` SQLite database introduced by COARCH-T01. New
>   table `cc_console_buffer` (DDL specified in CONSOLE-T01;
>   columns include `session_name`, `seq`, `direction` ENUM
>   ('stdin','stdout'), `bytes` BLOB, `received_at`). Append-only;
>   daemon-managed truncation at the configured per-session line cap.
>   Operator-disable per `SECTION_10_CC_CONSOLE.md` §10.5 means the
>   daemon retains an in-memory ring only and does not persist to
>   SQLite for that session.
> - **Signal dispatch table** (per spike MB-S06 §5.2):
>
>   | signal  | mechanism                                             |
>   |---------|-------------------------------------------------------|
>   | SIGINT  | `tmux send-keys -t <target> C-c` (PTY byte 0x03 via tmux's key-name lookup) |
>   | SIGTERM | `process.kill(panePid, 'SIGTERM')` (panePid via `tmux display-message -p '#{pane_pid}'`) |
>   | SIGHUP  | `process.kill(panePid, 'SIGHUP')` |
>
>   The endpoint body's `signal` field is constrained to the three
>   values per `SECTION_10_CC_CONSOLE.md` §10.6 + §10.11 Q2
>   (operator-arbitrated). Other signal values produce HTTP 400 with
>   `{"error_type": "InvalidSignalError", ...}` per `WorkstationError`
>   union shape.
> - **Versioning.** Per §12, this contract bumps to **v2.2.0** to
>   reflect the additive `/v3/sessions/:name/console/*` cross-reference.
>   No `/v2/*` shape changes; no behavior changes for v2-only or
>   /v3/orchestrator/-only clients. Per §2 authority section's
>   additive-only post-ship rule, this qualifies as a minor bump.
>
> This contract does not duplicate `/v3/sessions/:name/console/*`
> shape definitions. Readers wanting the request/response shapes
> consult `WORKSTATION_CONTRACT.md` §6, `SECTION_10_CC_CONSOLE.md`
> §10.6, and `packages/dispatch-core/src/v3/schema.ts`.

## §3 — Coordinated edits to existing sections

**§1 (Purpose).** Add a sentence to the existing /v3/* coordination
paragraph (added by 952f857) to reference the new
/v3/sessions/:name/console/* surface. Suggested text appended to the
existing paragraph:

> The daemon also hosts /v3/sessions/:name/console/* endpoints
> introduced by Conductor Workstation v3.0 per `SECTION_10_CC_CONSOLE.md`
> §10.6 + `WORKSTATION_CONTRACT.md` §6; cross-cutting daemon
> expectations for that surface live in `<<<§N>>>` of this contract.

**§10.3 (Anti-fabrication on referenced surfaces).** Add a bullet to
the spike-evidence list:

> - **`/v3/sessions/:name/console/*` PTY streaming layer (per
>   `SECTION_10_CC_CONSOLE.md` §10.6, amended `<<<DATE>>>`):** spike
>   against `tmux pipe-pane` for streaming + LF→CR translation
>   handling + signal forwarding (already validated by `MB-S06` spike
>   harness; production code citations should reference that harness
>   at commit `02cfc4d` or re-run via
>   `packages/dispatch-daemon/spikes/MB-S06/pty-harness/run-all.sh`).

**§12 (Versioning).** Bump the version-line bullet:

> - **v2.2.0 (this version):** additive cross-reference to the
>   coordinated `/v3/sessions/:name/console/*` surface introduced by
>   `SECTION_10_CC_CONSOLE.md` §10.6 + `WORKSTATION_CONTRACT.md` §6.
>   No `/v2/*` shape changes; no behavior changes for v2-only or
>   /v3/orchestrator-only clients. Per §2 authority section's
>   additive-only post-ship rule, this qualifies as a minor bump.

The file's top-line `**Version:** v2.1.0` becomes `v2.2.0`.

## §4 — Companion amendment to `WORKSTATION_CONTRACT.md` §6

The `/v3/sessions/:name/console/*` shape definitions live in
`WORKSTATION_CONTRACT.md` §6 per the existing division of labor. A
new subsection §6.6 enumerating the five endpoints' shapes is needed.
This proposal does NOT draft the §6.6 text in detail — that belongs in
a separate operator-authored `contract:` commit on
`WORKSTATION_CONTRACT.md`, since it touches a different frozen
contract. The MB-S06 ADR §10 Q-§10.6-A/B/C ambiguity-surface items
should resolve before §6.6 ships final.

For convenience, the request/response shapes derived from
`SECTION_10_CC_CONSOLE.md` §10.6 + spike evidence:

```ts
// POST /v3/sessions/:name/console/stdin
RequestBody:  { bytes: string }                  // base64 or utf-8 (TBD)
Response 200: { accepted: true, sequence: number /* stdin_seq */ }
Response 4xx: WorkstationError discriminant

// WS /v3/sessions/:name/console/stream
Subscribe:    { type: "subscribe", last_seq: number /* stdout_seq */ }
ServerOpen:   { type: "backfill_meta", ring_oldest, ring_newest,
                missed_count, requested_last_seq, backfill_complete }
ServerLine:   { type: "line", seq: number, line: string }

// GET /v3/sessions/:name/console/buffer?before_sequence=N&max_lines=M
Response 200: { lines: Array<{ seq: number, line: string }>,
                ring_oldest: number, ring_newest: number }

// POST /v3/sessions/:name/console/signal
RequestBody:  { signal: "SIGINT" | "SIGTERM" | "SIGHUP" }
Response 200: { delivered: true, mechanism: "tmux_send_keys_C-c" |
                "process_kill_SIGTERM" | "process_kill_SIGHUP" }

// GET /v3/sessions/:name/console/status
Response 200: {
  buffer_line_count: number,
  daemon_buffering_enabled: boolean,
  last_stdout_activity_at: string | null  /* ISO 8601 */
}
```

The `bytes` field encoding (base64 vs raw UTF-8 string) is an OPEN
QUESTION per §5 below.

## §5 — Open questions surfaced by this proposal

These should resolve before operator authors the actual `contract:`
amendment.

**Q1 — Placement (a)/(b)/(c).** §1 of this proposal. Operator picks.

**Q2 — `bytes` field encoding for POST /v3/.../console/stdin.** Three
options:
- (i) raw UTF-8 string in JSON body (limits to UTF-8-valid sequences;
  prohibits arbitrary byte injection like single-byte 0x03 for SIGINT
  — that's actually OK because SIGINT goes via the dedicated
  `/console/signal` endpoint per the dispatch table)
- (ii) base64-encoded byte string (lossless for any byte sequence;
  ~33% encoding overhead; client must encode and daemon must decode)
- (iii) accept both, distinguished by a `encoding: "utf8" | "base64"`
  field

Recommendation: (i) raw UTF-8. Rationale: the operator-typed prompt
input is text; binary bytes are not a natural input for a console
panel; SIGINT etc. go via the dedicated signal endpoint anyway. Spike
MB-S06 confirmed UTF-8 round-trips byte-identically through paste-buffer
-r (CJK, emoji, ANSI escapes — see ADR §3.1). Operator confirms.

**Q3 — `WS .../console/stream` over /v2/events/stream multiplex?** §10.6
implies a dedicated WS endpoint per session. Spike validated this
shape (one WS per session-subscription). The alternative — multiplex
all CC-console streams over the existing /v2/events/stream with new
event types — was not exercised. Recommendation: dedicated endpoint
per session; matches §10.6 wording. Operator confirms.

**Q4 — `cc_console_buffer` SQLite table DDL.** Per §10.5 + this
proposal's PTY reader sharing bullet, the table is append-only with
daemon-managed truncation. The exact column types, indexes, and
truncation policy live in CONSOLE-T01 (a ticket, not a contract). The
contract amendment cites the table by name only; CONSOLE-T01 produces
the migration alongside the code. Operator confirms scope split.

**Q5 — Backfill_complete=false UX.** Spike §7.2 surfaces the
eviction-window-gap signal. UI handling is CONSOLE-T03 territory; the
contract amendment only specifies the protocol shape. Operator
confirms scope split.

## §6 — Self-check (per CONDUCTOR_API_CONTRACT.md §10.5)

1. **Is the API I called verified by a spike in this repo?** yes —
   every endpoint behavior cited in §2 is grounded in a harness
   experiment recorded at commit `02cfc4d` and analyzed in
   `MB-S06-tmux-pty-bidirectional-streaming.md` (the main ADR).
2. **Does my test exercise behavior, or my mocks?** behavior — see
   the main ADR's §2 Method (real tmux, real ws, real PTY).
3. **If implementation deleted, would test still pass?** no — the
   harness measures real behavior; deleting the harness or tmux
   would break re-runnability.
4. **Did I add anything outside this contract's specification?** no
   — this is a proposal file in `docs/adr/`, not a modification to
   `CONDUCTOR_API_CONTRACT.md` itself. The actual contract amendment
   is operator-authored after arbitrating §1's (a)/(b)/(c) choice
   and §5's open questions.
5. **Did I modify this contract without operator approval?** no — the
   contract files (`CONDUCTOR_API_CONTRACT.md`, `WORKSTATION_CONTRACT.md`,
   `SECTION_10_CC_CONSOLE.md`, v3 schema) are NOT touched by this
   commit. `git status` before commit shows no modifications to those
   paths.
6. **Is any claim in my commit body unlabeled?** no — every claim
   either cites the main ADR section, the spike harness commit, or is
   labeled SPECULATIVE/MODELED/KNOWN inline.
7. **Did this commit touch any file the other parallel session might
   also modify?** no — `docs/adr/MB-S06-conductor-amendment-proposal.md`
   is a new file under MB-S06 territory (Sessions B/C territories are
   `packages/dispatch-workstation/*` and disjoint per coord file
   lines 31-34).
8. **Does this commit change session state via direct registry write,
   bypassing PATCH /v2/sessions/:name/state?** n/a — no daemon code
   in this commit.
9. **Did I do work during a halt state that wasn't explicitly
   authorized?** no — this proposal file ships in stub form
   (`<<<§N>>>` placeholders for the section number) precisely
   because the section-numbering halt is unresolved. The deliverable
   is the proposal text + halt-surface; the actual `contract:` commit
   waits for operator arbitration. This compromise satisfies both
   the deliverable list ("amendment proposal must ship") and the halt
   discipline ("don't infer the section number").

---

**End of proposal.** Operator picks placement (a)/(b)/(c) per §1,
resolves §5's open questions, then authors the actual `contract:`
amendment to `CONDUCTOR_API_CONTRACT.md` (and the companion §6.6
amendment to `WORKSTATION_CONTRACT.md`).
