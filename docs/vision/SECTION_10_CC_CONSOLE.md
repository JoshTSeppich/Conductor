# Conductor Workstation — Vision §10 Draft: CC-Console Surface

**Status:** DRAFT for operator review. Authored by Claude (Opus) under best-judgment authorization for Decision 1 = (b) CC-direct-chat in v3.0 scope.
**Authority:** Operator-arbitrated under §3.4. This draft awaits operator ratification ("§10 ratified") before becoming v3.0 build authority.
**Date:** 2026-05-02
**Anchored against:** `VISION_SECTION_7_FINAL.md` (ratified), `WORKSTATION_CONTRACT.md` (frozen), `CONDUCTOR_API_CONTRACT.md` §9 (visibility-and-control-only constraint).

---

## §10.0 — Why this section exists

§7 frozen the orchestrator chat as a Sonnet 4.6 stateless co-architect surface. That surface routes orchestrator output to actions, kanban cards, multi-choice cards, and escape-blocks — all of which are mediated by the per-card approval flow. Operator approval is the single chokepoint between Sonnet's proposal and any state change, including any prompt going to a CC session.

This section adds a **second, distinct chat surface**: a direct CC-console panel where operator selects a registered CC session, types a prompt, and the prompt routes through the daemon directly to that CC session's tmux STDIN. CC's STDOUT streams back into the same panel.

The two surfaces are intentionally separate. The orchestrator chat is *operator ↔ Sonnet, with kanban-card-mediated effects on CC sessions*. The CC-console chat is *operator ↔ CC session, direct, with no LLM intermediary*. Operator can use either or both during a session.

This is additive to §7. §7 stays frozen as written.

## §10.1 — Concrete capability

The CC-console surface allows operator to:

- Pick any registered CC session from a dropdown sourced from `GET /v2/sessions` (sessions in RUNNING, IDLE, AWAITING REVIEW, or HELD state — per `CONDUCTOR_API_CONTRACT.md` §6 state machine).
- Type a prompt in a text area, click Send, and have the prompt delivered to the selected CC session's tmux STDIN via a new daemon endpoint (`POST /v3/sessions/:name/console/stdin`).
- See CC's STDOUT stream back into the panel in near-real-time via a new daemon WebSocket channel (`WS /v3/sessions/:name/console/stream`).
- Scroll back through the session's STDOUT history (bounded buffer, see §10.5).
- Switch between sessions in the same panel; the panel re-binds to the new session's stream.
- Have multiple CC-console panels open simultaneously, each bound to a different session, if the operator's window layout allows.

What this surface does **not** do:

- It does not record, persist, or replay CC sessions beyond the bounded scrollback buffer.
- It does not let Sonnet send to CC (Sonnet still routes through the kanban-card approval surface per §7).
- It does not interpret, parse, summarize, or analyze CC's output. The daemon streams raw bytes to the panel, the panel renders raw bytes. No LLM in the loop.
- It does not modify CC's state outside of writing to STDIN. Pause/kill/hold/arm transitions still go through the existing daemon state-machine endpoints.

## §10.2 — Why this is not a §9 violation

`CONDUCTOR_API_CONTRACT.md` §9 names "no LLM, no automation, no recording" as Conductor's deferred-feature scope fence. The CC-console surface threads this needle:

- **No LLM in the CC-console loop.** Operator types prompts directly. CC interprets them. Sonnet has no role in this surface. The contract's "no LLM" constraint applies to *Conductor automating decisions via LLM* — it does not preclude *operator-driven LLM interaction through a console surface that the operator drives*.
- **No automation.** Every prompt to CC requires operator typing and clicking Send. No batching, no scheduled prompts, no triggered-by-event prompts. The CC-console is operator-as-typist.
- **No persistent recording.** Bounded scrollback buffer (§10.5) is not "recording" any more than tmux's own scrollback is recording. Buffer is process-memory only by default. Optional disk persistence is a separate v3.x decision and out of v3.0 scope.

The §9 spirit is preserved: Conductor doesn't *think* on the operator's behalf via this surface, it just provides a richer typing surface for what the operator already does at the tmux command line.

If the operator reads this and concludes the §9 spirit IS violated, fall back to Decision 1 = (a) and ship CC-console in v3.1+. This section's draft text proceeds on the assumption that operator agrees with the §9 reading above.

## §10.3 — Authority chain

The CC-console surface preserves the existing authority chain:

- **Operator authors all prompts.** Each prompt is operator-typed text.
- **Operator authors all commits.** CC may produce commits in response to prompts; those commits are CC-authored per the existing CC-author-line convention (or operator-authored if operator overrides). Workstation does not modify the authorship.
- **Operator can interrupt at any time.** Send Ctrl-C / interrupt signal via the existing daemon state-machine PATCH endpoint, or via a new `POST /v3/sessions/:name/console/signal` endpoint (specified in §10.6).

The CC-console does NOT introduce a new authorship layer. It is a typing surface, not an agent.

## §10.4 — Relationship to orchestrator chat (§7)

Two surfaces, distinct purposes:

| Surface | Operator role | Effect path |
|---|---|---|
| Orchestrator chat (§7) | Operator ↔ Sonnet co-architect | Sonnet proposes → kanban card → operator approves → daemon fires action |
| CC-console (§10) | Operator ↔ CC session direct | Operator types → daemon writes to tmux STDIN → CC processes |

Both surfaces can be open simultaneously. They do not cross-communicate in v3.0:

- Orchestrator chat does NOT see CC-console transcripts.
- CC-console does NOT see orchestrator chat history.
- A `send-prompt-to-session` action proposed by Sonnet via §7's kanban-card flow uses the existing daemon prompt-injection path, NOT the new `/v3/sessions/:name/console/stdin` endpoint. The two paths are kept separate so the audit trail clearly distinguishes operator-typed prompts (CC-console) from Sonnet-proposed-and-operator-approved prompts (orchestrator card).

This separation can be revisited in v3.x if operator wants Sonnet to read CC-console transcripts as additional context. v3.0 keeps them isolated.

## §10.5 — Bounded scrollback buffer

The CC-console panel maintains a per-session in-memory scrollback buffer:

- Default: 10,000 lines per session, FIFO eviction.
- Buffer is process-memory only (Workstation Electron renderer process).
- Buffer is lost on Workstation restart. No disk persistence in v3.0.
- The daemon also maintains a bounded ring buffer per session (default: 50,000 lines) so a Workstation that opens a CC-console panel mid-session can backfill from daemon state.
- Both buffer sizes are operator-configurable in settings (MB-T11 lands the settings UI; CC-console buffer config piggybacks).

The daemon-side ring buffer IS persistent across daemon restarts only via SQLite (new `cc_console_buffer` table, append-only with daemon-managed truncation). Operator can disable daemon-side buffering entirely if they consider it recording-adjacent and prefer purely ephemeral. Default: enabled.

## §10.6 — New daemon endpoints (CONDUCTOR_API_CONTRACT.md amendment surface)

The CC-console surface adds the following endpoints to `CONDUCTOR_API_CONTRACT.md`. Operator authors the actual amendment per §3.4. This draft proposes the surface only.

- `POST /v3/sessions/:name/console/stdin` — write bytes to the named session's tmux STDIN. Body: `{bytes: string}`. Response: `{accepted: boolean, sequence: number}`. Sequence number lets the panel correlate writes with stream output.
- `WS /v3/sessions/:name/console/stream` — WebSocket channel streaming raw STDOUT bytes from the named session's tmux as they arrive. Backfill: on connection, daemon sends up to N most recent buffer lines (N negotiated in connection handshake).
- `GET /v3/sessions/:name/console/buffer` — fetch a bounded slice of the session's STDOUT buffer for backfill / scrollback. Query params: `before_sequence`, `max_lines`.
- `POST /v3/sessions/:name/console/signal` — send a signal to the CC process (SIGINT, SIGTERM, etc.) via tmux. Body: `{signal: "SIGINT" | "SIGTERM" | "SIGHUP"}`.
- `GET /v3/sessions/:name/console/status` — fetch session console state (buffer line count, daemon-side buffering enabled/disabled, last STDOUT activity timestamp).

The new endpoints land alongside the existing `/v3/orchestrator/*` and `/v3/tickets/*` endpoints from the MB-S03 amendment. They are additive only; no v2 endpoint is modified or removed.

## §10.7 — IPC additions (WORKSTATION_CONTRACT.md amendment surface)

The Electron shell ↔ webview IPC surface from `WORKSTATION_CONTRACT.md` §7 gains new message types:

- `console:open` (shell → webview) — instruct webview to open a CC-console panel bound to a specified session.
- `console:close` (shell → webview) — instruct webview to close a CC-console panel.
- `console:send-stdin` (webview → shell) — webview forwards operator-typed prompt to shell, shell calls daemon `POST /v3/sessions/:name/console/stdin`.
- `console:stdout-chunk` (shell → webview) — shell forwards a chunk of STDOUT bytes from the daemon WS stream to the webview for rendering.
- `console:signal` (webview → shell) — webview requests shell to send a signal to a session's CC process.

The shell process owns the WebSocket connection to the daemon stream endpoint. The webview receives forwarded chunks. This keeps the WebSocket lifecycle managed in the shell process and avoids webview-renders-WebSocket complications.

## §10.8 — Spike requirement

This surface introduces a new external dependency Workstation has not previously interacted with: bidirectional bytes-streaming over tmux PTY, with backpressure handling, signal forwarding, and binary-safe encoding for the WebSocket transport. None of MB-S01, MB-S02, or MB-S03 cover this surface.

A new spike is required: **MB-S04 — tmux PTY stdin/stdout bidirectional streaming**. Spike scope is detailed in the updated `V3_BUILD_SEQUENCING_AND_SPIKE_PROMPTS.md` draft. Spike validates: bytes integrity round-trip (no UTF-8 corruption on CJK or emoji), backpressure when CC produces faster than panel renders, signal forwarding fidelity (Ctrl-C in panel = SIGINT to CC), buffer overflow behavior, and WebSocket reconnection during active CC output.

## §10.9 — New tickets

Following the existing nomenclature from `V3_TICKETS.md` §1, the new tickets land under a new prefix `CONSOLE-T*` since they form a coherent sub-product analogous to `COARCH-T*`:

- **CONSOLE-T01** — Daemon CC-console endpoints (the five endpoints in §10.6) + SQLite `cc_console_buffer` table + WebSocket stream handler + tmux PTY bridge in daemon. Single ticket; substantial.
- **CONSOLE-T02** — Workstation IPC additions (the five message types in §10.7) + shell-side WebSocket lifecycle management + main-process buffer forwarding.
- **CONSOLE-T03** — Webview CC-console panel UI: session-picker dropdown, scrollback rendering, prompt input + Send, signal buttons (Ctrl-C, etc.), buffer scrollback controls, multi-panel support.

CONSOLE-T01 is the largest. CONSOLE-T02 and CONSOLE-T03 can parallelize after CONSOLE-T01 lands the daemon surface (frozen contract coordination per §3.4).

## §10.10 — Ship-gate criteria addition

Vision §8 ratified ship-gate criteria add the following CC-console-specific criteria:

- Operator opens CC-console panel for a registered session, types a prompt, sees CC respond in the panel within 500ms p50 first-byte latency.
- STDOUT streaming holds for at least 60 seconds of continuous CC output without buffer drop or render lag.
- Ctrl-C in panel produces SIGINT to CC, validated by CC interrupt behavior.
- Switching sessions in the panel cleanly unbinds from session A's stream and binds to session B's stream within 200ms.
- Two simultaneous CC-console panels bound to different sessions both render correctly with no cross-talk.
- Daemon restart mid-stream cleanly reconnects WebSocket and backfills missed STDOUT from daemon ring buffer with no operator-visible gap beyond reconnection latency.

## §10.11 — Open questions for operator (must resolve before §10 freeze)

**Q1 — Daemon-side buffering default.** Enable by default (operator can disable in settings) OR disable by default (operator can enable in settings)? Trade-off: enabled = better backfill on Workstation restart, mild persistence concern. Disabled = purely ephemeral, no persistence concern, no backfill across Workstation restart. Recommendation: enabled, surfaced in onboarding so operator decides early.

**Q2 — Signal forwarding scope.** Just SIGINT/SIGTERM/SIGHUP? Or full signal set including SIGUSR1/2? Recommendation: SIGINT/SIGTERM/SIGHUP only in v3.0; broader set deferrable.

**Q3 — Multi-panel concurrency limit.** Cap on simultaneous CC-console panels open? Trade-off: high cap = more panels = more daemon WS connections = more memory. Low cap = forces operator to close before opening. Recommendation: 4 panels in v3.0 (matches the 4-5 sustained-active session ceiling from Decision 2), configurable in settings.

**Q4 — Render of escape sequences and ANSI color.** CC outputs ANSI color codes and cursor-control escape sequences. Render them faithfully (xterm.js or similar) OR strip them and render plain text? Recommendation: render via xterm.js for fidelity; complicates CONSOLE-T03 implementation but preserves CC's visual output.

**Q5 — Audit log integration.** Each operator-typed prompt sent via CC-console: audit-logged like orchestrator-card actions are, OR not audited because CC-console is "just typing"? Trade-off: audit = full trail, alignment with §7 audit discipline. No-audit = simpler, treats CC-console like a terminal. Recommendation: audit, with a separate `console_prompts` table.

**Q6 — Authentication / authorization.** The new endpoints follow existing daemon token auth per `CONDUCTOR_API_CONTRACT.md` §3, no new auth surface. Confirm.

**Q7 — Cross-host scope.** v3.0 is single-machine per existing scope fences. CC-console endpoints follow same fence. Confirm.

## §10.12 — What this section does NOT cover

- Sonnet-reads-CC-transcript integration (deferred to v3.x or never; explicitly out of v3.0 scope).
- Disk-persistent CC-console history (deferred; daemon ring buffer is the only persistence in v3.0).
- CC-session search/grep across scrollback (deferred; v3.0 ships scroll-only).
- Multi-line prompt composer with syntax highlighting (deferred; v3.0 ships plain text input).
- Prompt templates / saved prompts (deferred).
- Co-pilot suggestions in the prompt input (deferred; this would re-introduce LLM into the loop).

## §10.13 — Pending operator confirmation

Operator confirms: "§10 ratified" to freeze this section as v3.0 authority for CC-console surface.

Operator authors and commits:
- Final §10 text into the vision document at the appropriate path.
- `WORKSTATION_CONTRACT.md` amendment per §10.7 (IPC additions).
- `CONDUCTOR_API_CONTRACT.md` amendment per §10.6 (new endpoints).

CC drafts the contract amendment text per spike evidence; operator reviews and commits final per §3.4.

---

**End of §10 draft. Awaiting operator ratification.**
