# Foxworks Dispatch v3 — Ticket List

**Status:** Draft authoring artifact under operator best-judgment authorization. Ticket scope locks at Phase 1 spike outcomes per cairn discipline.
**Repo state at draft:** v2.0.1 shipped clean at HEAD `7a800a9`, working tree clean, synced with origin.
**Anchored against:** `docs/adr/UI-S02-menubar-framework.md` (Electron locked 2026-04-23), `docs/FOLLOWUPS.md` numbering convention, `docs/adr/UI-S03-notification-click.md`, `packages/dispatch-workstation/SPIKES.md`.
**Date:** 2026-04-28

---

## §1 — Nomenclature

Following the existing repo convention from `docs/FOLLOWUPS.md`:

- **`MB-T*`** — production tickets for `packages/dispatch-workstation/` (the v3 surface)
- **`MB-S*`** — spike tickets for menubar (extends existing `UI-S*` pattern; new domain prefix because v3 spikes are menubar-specific)
- **`MB-F*`** — followups filed during v3 build, land in `docs/FOLLOWUPS.md`
- **`DAEMON-T*`** — production tickets in `packages/dispatch-daemon/` (only used for daemon contract amendments needed by v3)
- **`COARCH-T*`** — production tickets for the orchestrator chat panel surface, lives within `packages/dispatch-workstation/` (separate ID prefix because conceptually a sub-product)

ADR location: `docs/adr/MB-S<N>-<topic>.md` for new spikes.
Cairn findings continue from #55.

---

## §2 — Phase 0: operator-only prerequisites

These must land before any production ticket (`MB-T01`+) commits. All operator-authored under cairn §3.4. Path B scaffolding offered per item.

**P-0.1 — Vision §7 ratification.** Draft at `/mnt/user-data/outputs/VISION_SECTION_7_DRAFT_v2.md` (kanban-card model, Sonnet stateless router, build-doc upload). Operator reviews, ratifies or modifies. Output: vision §7 frozen.

**P-0.2 — Vision §8 (ship-gate criteria).** Path B scaffolding available. Working seed: "wrapper renders dispatch-web cleanly, spawn-from-UI produces sessions indistinguishable from CLI-spawned, orchestrator chat panel works against Anthropic API and can read daemon state, kanban-card proposal mechanism works for at least three action types end-to-end during dogfood." Output: vision §8 frozen.

**P-0.3 — `WORKSTATION_CONTRACT.md` initial authoring.** Per locked P-0.4 (separate document, not amendments to `CONDUCTOR_API_CONTRACT.md`). Enumerates: app shell scope, embedded-webview boundary, kanban-card output format, two-pill approve/decline + free-form text field semantics, multi-choice card variant, escape-block format, persistence model, IPC boundary, build-doc upload mechanism, audit log schema. Path B scaffolding available. Output: `WORKSTATION_CONTRACT.md` committed at repo root alongside `CONDUCTOR_API_CONTRACT.md` and `BUILD_CONTRACT.md`.

**P-0.4 — Orchestrator system prompt.** Operator-authored text artifact. Encodes: orchestrator role definition, build-doc-as-authority discipline, kanban-card output formats, approval semantics, action enumeration, stale-card handling, escape-hatch invocation rules, cairn methodology reference, cairn-Sonnet extensions reference. Path B scaffolding available. Output: versioned text artifact at `packages/dispatch-workstation/coarchitect/system-prompt.md` (or similar; final path is operator territory). Frozen as contract.

**P-0.5 — Build-doc schema specification.** Operator-authored. Defines what a Sonnet-consumable build doc looks like: required sections, ticket boundary markers, decision-point flags, multi-choice question templates, escape-hatch points pre-marked. Path B scaffolding available. Output: schema spec as versioned text artifact.

**P-0.6 — Cairn-Sonnet extensions document.** Operator-authored. Four candidate primitives: build-doc-scope-locked, no-arbitration, frozen-doc-respect, stateless-call. Plus any operator surfaces. Path B scaffolding available. Output: `docs/cairn-sonnet-extensions.md`, referenced by the orchestrator system prompt.

Phase 0 exit gate: P-0.1 through P-0.6 frozen. Operator confirms ready for Phase 1.

---

## §3 — Phase 1: spikes

Three spikes total. Existing `UI-S02` (Electron) and `UI-S03` (osascript focus) are already shipped — Phase 1 inherits them, doesn't re-spike. New spikes prefixed `MB-S*` to distinguish from v2-era `UI-S*`.

**MB-S01 — Anthropic SDK + Sonnet 4.6 stateless-call shape.**

**Cannot proceed to MB-T05 (orchestrator chat panel scaffold) without this ADR.**

Validates: streaming chat against Anthropic API from Electron main process (API key isolation from renderer per security best practice), context-injection pattern for stateless calls (build-doc + daemon state injected per call vs tool-use API where Sonnet calls `read_file` / `read_session_state` itself), streaming-response progressive render in chat panel UI, rate-limit and error-surface behavior, cost projection at expected operator usage volume (one Sonnet call per CC event per active session), API key storage via Electron `safeStorage` or equivalent.

Surfaces decision for: tool-use vs eager-injection. ADR records evidence and operator decision.

ADR: `docs/adr/MB-S01-anthropic-sdk-sonnet.md`.
Commit grammar: `spike(MB-S01): ...`.

**MB-S02 — User-context tmux spawn fidelity from Electron app.**

Validates: tmux session spawned by Electron app under user context behaves identically to terminal-spawned tmux for `claude` runtime needs. Specifically: TERM, COLUMNS, SHELL, PATH, locale, PTY behavior, working directory, environment inheritance.

Failure mode if divergent: Workstation-spawned sessions behave subtly differently from CLI-spawned, surfacing as flaky CC behavior weeks into dogfood. Anti-fabrication discipline says verify in spike, not at production-bug-discovery.

Out of scope: code-signing, notarization, packaging — Phase 2 territory.

ADR: `docs/adr/MB-S02-electron-tmux-spawn.md`.

**MB-S03 — Daemon contract amendment for orchestrator endpoints.**

Validates: new daemon endpoint shapes for orchestrator chat persistence and audit log. Specifically:
- `POST /v3/orchestrator/messages` — append chat message to history
- `GET /v3/orchestrator/history` — retrieve chat history
- `DELETE /v3/orchestrator/history` — clear history
- `POST /v3/orchestrator/audit` — append audit row
- `GET /v3/orchestrator/audit` — query audit (filterable)
- `POST /v3/tickets/state` — upsert ticket state row
- `GET /v3/tickets/state` — list ticket state rows (filterable)
- `GET /v3/tickets/state/:ticket_id` — fetch single ticket state (build_doc_id REQUIRED query param)

SQLite schema migration in existing daemon DB: new tables `orchestrator_messages` and `orchestrator_audit`. Round-trip a chat message and an audit row, restart daemon, verify retrievable.

This spike surfaces a **`contract:` commit amending `CONDUCTOR_API_CONTRACT.md`** with the new endpoint specifications. Operator-arbitrated. CC drafts endpoint shapes per spike evidence; operator reviews and authors final contract amendment text.

ADR: `docs/adr/MB-S03-orchestrator-endpoints.md`.

Phase 1 exit gate: three ADRs landed and frozen. `CONDUCTOR_API_CONTRACT.md` amendment committed and operator-acked. `WORKSTATION_CONTRACT.md` updated to reference the new endpoints.

---

## §4 — Phase 2: production tickets

12 tickets across 4 tiers. Cairn commit grammar throughout (`red(MB-Txx):`, `green(MB-Txx):`, `refactor(MB-Txx):`). Self-check blocks per `CONDUCTOR_API_CONTRACT.md` §10.5. Per-commit-push, per-path git add discipline if running parallel sessions.

### Tier A — Electron shell + dispatch-web embedding (3 tickets, serial)

**MB-T01 — Electron app shell scaffold.**

Per UI-S02 ADR: scaffold Electron 33+ in `packages/dispatch-workstation/`. Main process entry, BrowserWindow factory, preload script (empty), dev/prod build pipeline, `package` script producing macOS `.app` bundle (no signing yet, deferred to v3.x maintenance per UI-S02 ADR). Workspace dep on `dispatch-core` via `"dispatch-core": "workspace:*"` (sidesteps the `tsc rootDir` spillage flagged in UI-S02 evidence).

Updates `packages/dispatch-workstation/package.json` description from "Framework TBD — UI-S02 spike" to reflect Electron scaffolding complete.

Red: `test_app_launches_clean.spec.ts` — spawn built app, assert process starts, window appears, exits cleanly on quit.
Green: implement `main.ts`, `preload.ts`, package scripts.
Acceptance: `pnpm --filter dispatch-workstation dev` opens empty window. `pnpm --filter dispatch-workstation package` produces runnable `.app`. Existing v2 tests still pass.

Closes UI-F06.

**MB-T02 — Embedded dispatch-web in BrowserWindow.**

BrowserWindow loads dispatch-web SPA. Daemon connection works via existing HTTP/SSE/WS over the surface frozen in `CONDUCTOR_API_CONTRACT.md`. No new dispatch-web code expected — UI-S02 evidence indicates dispatch-web is substrate-agnostic. If anything in dispatch-web needs to change to render in Electron, surface as `MB-F*` followup, scope into Tier A only if strictly required.

Red: `test_dispatch_web_renders_in_shell.spec.ts` — launch app with daemon running, assert kanban columns render (AWAITING REVIEW / STALE / RUNNING / IDLE), assert session card appears when daemon has registered sessions.
Green: implement BrowserWindow URL loading, dispatch-web build pipeline integration if needed.
Acceptance: launching the app shows the kanban screenshot the operator already has in dispatch-web. Identical UX. Control buttons fire correctly. Event ticker updates live.

**MB-T03 — Native menu + window lifecycle + macOS polish.**

Standard macOS menu bar (App / File / Edit / View / Window / Help), keyboard shortcuts (Cmd+W close, Cmd+Q quit), window-state persistence across launches (electron-window-state or equivalent), app icon, dock badge if relevant.

Red: `test_window_state_persists.spec.ts` — launch, resize, quit, relaunch, assert size/position restored.
Green: implement menu template, window-state persistence.
Acceptance: app feels native, not a web page in a chrome-less window.

### Tier B — Spawn-from-UI (3 tickets, parallelizable with Tier C onset after MB-T03)

**MB-T04 — Spawn button + repo picker in shell.**

Native UI element in Electron shell (not in embedded dispatch-web — keeps webview as pure dashboard). Spawn button opens modal: repo picker with configured project list (settings UI in MB-T11) + native file dialog fallback, session name input, [Spawn] / [Cancel].

Red: `test_spawn_modal_opens.spec.ts`, `test_spawn_modal_emits_intent.spec.ts`.
Green: implement modal in Electron shell UI, emit IPC event `workstation:spawn-requested` with payload.
Acceptance: button → modal → spawn intent fires. No actual session spawned yet.

**MB-T05 — Spawn execution: tmux + claude + daemon registration.**

Wire `workstation:spawn-requested` to actual spawn behavior per MB-S02 ADR. Spawn tmux session in user context, run `claude` inside, register session via existing `POST /v2/sessions`, surface success/failure to UI.

Red: `test_spawn_creates_registered_session.spec.ts` — emit spawn intent, assert tmux session exists, assert daemon has new session record, assert kanban shows new card.
Green: implement spawn handler in main process per MB-S02 ADR, error handling for spawn failures (tmux missing, claude not in PATH, daemon unreachable).
Acceptance: end-to-end spawn-from-UI produces a session indistinguishable from CLI-spawned. Verify by spawning one of each side-by-side.

**MB-T06 — Concurrent-session-cap enforcement.**

Per locked §0.6 (RUNNING + IDLE count toward cap; AWAITING REVIEW, STALE, KILLED, archived do not). Header surfaces current session count, spawn button disables at cap with hover text, override flow with confirmation per vision §3.6.

Red: `test_spawn_button_disabled_at_cap.spec.ts`, `test_override_flow_warns.spec.ts`.
Green: implement cap-counting against daemon session list, disable button, override modal.
Acceptance: at-cap state behaves per spec; override path behaves per spec; cap value configurable in MB-T11 settings UI.

### Tier C — Orchestrator chat panel (4 tickets, serial within tier, parallelizable with Tier B after MB-T03)

**COARCH-T01 — Daemon contract amendment + orchestrator endpoints.**

Lands the contract change surfaced in MB-S03. New daemon endpoints: `POST /v3/orchestrator/messages`, `GET /v3/orchestrator/history`, `DELETE /v3/orchestrator/history`, `POST /v3/orchestrator/audit`, `GET /v3/orchestrator/audit`, `POST /v3/tickets/state`, `GET /v3/tickets/state`, `GET /v3/tickets/state/:ticket_id`. SQLite schema migration: new tables `orchestrator_messages`, `orchestrator_audit`, and `orchestrator_ticket_state` per MB-S03 ADR (frozen at 946e06d) and v3 schema (frozen at 232fbaa).

This ticket includes the `contract:` commit amending `CONDUCTOR_API_CONTRACT.md` (operator-arbitrated under §3.4; CC drafts text per spike evidence, operator reviews and commits final).

Red: `test_orchestrator_endpoints_round_trip.spec.ts` in `packages/dispatch-daemon/`.
Green: implement endpoints in dispatch-daemon, schema migration, daemon test coverage.
Acceptance: contract amendment committed, endpoints work, no regressions in existing daemon tests.

**COARCH-T02 — Chat panel UI scaffold.**

Native Electron UI surface (not embedded webview). Side panel or bottom drawer — spatial placement is operator UX preference, surfaces as ticket-review question. Renders conversation history, accepts input, displays "thinking" state. No Anthropic wiring yet — placeholder responses.

Red: `test_chat_panel_renders.spec.ts`, `test_chat_input_emits_event.spec.ts`.
Green: implement chat panel React component, wire to daemon endpoints from COARCH-T01, render history on mount.
Acceptance: panel renders, accepts input, persists to daemon, survives app restart with history intact.

**COARCH-T03 — Anthropic SDK integration: chat works.**

Per MB-S01 ADR. Streaming chat against Anthropic API from Electron main process, API key stored via `safeStorage`, streaming response renders progressively in panel. No daemon-state context yet — orchestrator is generic Claude chat at this point.

Red: `test_anthropic_streaming_renders.spec.ts` (mocked SDK), `test_api_key_secure_storage.spec.ts`.
Green: implement Anthropic client in main process, IPC bridge to renderer for streaming chunks, error handling for API failures (per MB-S01 ADR error-surface behavior).
Acceptance: operator can have generic conversation with Claude through chat panel. API key handled securely. Errors surface cleanly.

**COARCH-T04 — Stateless-router context wiring + build-doc upload.**

Two pieces fold into one ticket because they're tightly coupled:

(a) Build-doc upload affordance in chat panel. Operator drags-and-drops a build doc file (per locked C-3, schema-conformant build docs only — schema validation against P-0.5 spec at upload time). One build doc loaded per Workstation session; replacing doc replaces prior.

(b) Stateless context-injection pipeline per MB-S01 ADR. Each Sonnet call receives: system prompt (P-0.4) + uploaded build doc + relevant daemon state (queried at call time, not held in shell memory) + triggering event + chat-history-tail. Sonnet output routed to one of: action (fires through daemon endpoint), kanban card (renders to dashboard), multi-choice card (renders to chat panel), escape-block (renders to chat panel as copyable).

Red: `test_build_doc_upload_validates_schema.spec.ts`, `test_stateless_call_injects_context.spec.ts`, `test_orchestrator_output_routing.spec.ts`.
Green: implement upload UI + schema validator, context-injection pipeline, output-type router.
Acceptance: operator uploads valid build doc, sends chat message, orchestrator receives correct context, output routes to correct surface (action, card, multi-choice, or escape).

### Tier D — Kanban-card surface + ship readiness (2 tickets)

**MB-T07 — Kanban-card rendering + approval semantics.**

The orchestrator-card surface in dispatch-web. New column in kanban or new card type with visual distinction from CC-session cards (color, badge, or icon — UX detail surfaces during ticket review). Each card renders with two pills (Approve/Decline) + free-form text field, or multi-choice variant with A/B/C/D buttons.

When operator clicks Approve: action fires (free-form text merges into payload per locked vision §7.4; if operator wants free-form-as-informational-only, override at vision §7 ratification). When operator clicks Decline: card moves to dismissed state, audit captures decline + free-form reason if any. When operator clicks multi-choice option: choice routes back to orchestrator on next call. When card becomes stale: rolls into STALE-PROPOSALS column with rolled-up card IDs preserved per vision §7.6.

This ticket also lands the dispatch-web changes for the new card type. May surface a `WEB-T*` sub-ticket if dispatch-web changes are large enough to warrant split.

Red: `test_card_renders.spec.ts`, `test_approve_fires_action.spec.ts`, `test_decline_dismisses.spec.ts`, `test_multi_choice_routes.spec.ts`, `test_stale_card_rolls_over.spec.ts`.
Green: implement card React components in dispatch-web, IPC protocol shell ↔ webview for card events, audit-log writes per locked vision §7.8.
Acceptance: end-to-end test — operator uploads build doc, orchestrator generates action proposal as kanban card, operator approves, action fires, daemon-side state changes, audit row written. Same flow for decline, multi-choice, stale rollover.

**MB-T08 — Onboarding + error states + smoke test surface.**

First-launch onboarding: Anthropic API key entry, project list initial config, optional walkthrough. Error states surfaced for daemon offline, Anthropic outage, IPC drop, webview crash, build-doc schema validation failures. Smoke test surface for vision §8 ship-gate validation.

Red: `test_first_launch_no_config.spec.ts`, `test_daemon_offline_state.spec.ts`, `test_anthropic_outage_state.spec.ts`, `test_invalid_build_doc_surfaces_error.spec.ts`.
Green: implement onboarding modal flow, error-state UI components, smoke test harness.
Acceptance: clean install → walked-through onboarding → usable workstation, no CLI required. Each named failure mode produces clear operator-facing surface.

---

## §5 — Phase 3: dogfood + ship

Operator runs Workstation as primary surface for operator-defined dogfood window. Findings file as `MB-F*`-prefixed entries in `docs/FOLLOWUPS.md` and `[workstation]`-tagged findings in `docs/cairn-findings.md` continuing from #55. Blocking findings loop back to Phase 2; non-blocking findings file as v3.1+ followups.

Ship gate: vision §8 success criteria met. Operator arbitrates ship readiness against the success-criteria checklist.

Version bump to v3.0.0 across all 5 packages + root `package.json` (mirrors v2.0.0 / v2.0.1 release pattern). Annotated git tag `v3.0.0`. Push tag.

---

## §6 — Tickets NOT in v3 scope

**CORE-EXPORTS-MIGRATION (bug #2 closure).** Latent at v2.0.1 with workaround documented in `RELEASING.md`. Per locked P-0.5 (parallel close with Workstation Phase 0), this lands in parallel with v3 Phase 0 in v2 territory, NOT as a v3 ticket. **Not yet filed as a ticket** — needs to be filed in `docs/FOLLOWUPS.md` (or as a new docs/adr entry per repo convention) as a separate cycle. Sequencing: file ticket first, then T01 (survey + pre-reg), T02 (atomic migration), T03 (verification). Three v2-territory tickets that don't block v3 Phase 1 entry but should close before v3 ships so v3.0 inherits clean dispatch-core surface.

**Existing v2.1 followups deferred to v3.1+:** `WEB-F-tmux-pane-snapshot` (pending §9 contract conversation), `CLI-F-cross-session-handoff`, `DOC-F-tutorial-screenshots`. Not v3.0 scope unless operator pulls one in explicitly.

**v2-era technical debt followups** (per `docs/FOLLOWUPS.md` Post-MVP / v2.1 and Deferred sections): `DAEMON-F-installer-cross-platform`, `DAEMON-F-runtime-deps-hygiene`, `DAEMON-F-version-source`, etc. None are v3.0 blockers; address opportunistically or in v3.x.

**Cairn v0.2 codification.** Project-instructions-§1.2-named overdue. Operator-only authoring. Competes with Workstation Phase 0 for review bandwidth. Sequencing decision is operator-only — Cairn v0.2 first, Workstation v3.0 first, parallel, or interleaved. Not pre-committed in this ticket list.

**Sherpa MVP completion.** Project-instructions-§1.1-named 5 Tier 1 followups remaining. Different repo, separate sequencing question. Not v3.0 scope.

---

## §7 — Risks

**R1 — MB-S01 cost projection may surface unsustainable Anthropic API spend.** Per-CC-event Sonnet calls across many parallel sessions could compound. If MB-S01 ADR shows costs are real, two mitigations available: tiered model architecture (Haiku for routine, Sonnet for judgment — currently deferred to v3.x), or call-coalescing (batch CC events within a window). Surface in MB-S01 ADR; operator decides at Phase 1 exit.

**R2 — Build-doc schema (P-0.5) may need iteration.** First Workstation-consumable build doc operator authors with you in Opus may reveal schema gaps. Mitigation: P-0.5 frozen, but schema amendments allowed via `contract:` commits in v3.x with same operator-arbitration discipline. v3.0 ships with v1.0 of the schema; iteration acceptable in v3.1.

**R3 — Per-card approval bandwidth (R6 from prior plan).** If orchestrator generates many cards per session, operator click-load may be unsustainable. Mitigation surface in dogfood: if real, v3.1 adds trusted-actions allowlist or card-batching. v3.0 ships strict per-card per locked vision §7.6.

**R4 — Electron tmux spawn fidelity (MB-S02).** If MB-S02 surfaces real divergence between Electron-spawned and terminal-spawned tmux, may require workaround in MB-T05 spawn handler. UNKNOWN until spike. Recoverable.

**R5 — `CONDUCTOR_API_CONTRACT.md` v1-reads-v2 amendment (already landed at `a502c4c`) is the precedent for COARCH-T01's contract amendment.** That precedent is healthy — additive amendments work, schema migrations work, no v2 → v3 daemon migration drama expected. KNOWN.

---

## §8 — What this ticket list does NOT decompose further

Specific Anthropic API call payloads. MB-S01 ADR defines.

Specific Electron version, packaging configuration, code signing setup. MB-S02 ADR + MB-T01 land specifics. v3.0 may ship without code signing per UI-S02 ADR's deferred-revisit note; operator decides.

Specific IPC message schemas between Electron shell and embedded webview. Surface during MB-T07 implementation; reviewed by operator at red-stage.

Specific kanban-card visual design. Surface during MB-T07 ticket review against the existing dispatch-web aesthetic.

Calendar estimates. Per project instructions §2.1, time is operator-review-bandwidth-bound. 12 production tickets + 3 spikes is the work.

Vision §4–§9 final text beyond what Phase 0 produces. §4 (deliberate scope fences), §5 (relationship to Conductor v2), §6 (architecture sketch), §9 (open questions) can land at operator pace; not strictly required for Phase 1 entry but should land before v3.0 ship.
