# Foxworks Workstation — Vision Document

**Status:** v3.0 vision sections §7 and §8 ratified 2026-04-28. §1–§6 deferred to future drafts.

**Authority:** §7 and §8 are operator-arbitrated frozen authority for v3.0 Phase 1+ ticket execution per ratified P-0.1 and P-0.2.

---

# Vision §7 — Orchestrator Authority Model (FINAL)

**Status:** FINAL. Updated 2026-04-28 to reflect P-0.6 Q2 KEEP ratification (no-arbitration ratchet beyond original §7.7) and P-0 leftover Q3 ratification (Decline reason required). Supersedes all prior drafts. Pending operator final ack ("§7 final ratified") to freeze as authority for v3.0 Phase 1+ ticket execution.

**Architecture (locked):**
- Sonnet 4.6 as orchestrator model
- Stateless router pattern — Sonnet called fresh per task
- Build doc is source of truth (git-tracked); daemon session/event log is operational state
- Kanban-card approval model — two pills (Approve, Decline) plus free-form text field; Decline requires reason
- Multi-choice card variant for nuanced operator input (2-4 dynamic options)
- `needs-operator-prose` copy-block escape-hatch — fires on ANY ambiguity per ratchet
- Single build-doc upload at a time scopes orchestrator session
- Existing Opus conversations are context; build docs are authority

**Ratification record:**
- §7.11 v2-draft items A, B, C, D arbitrated 2026-04-28
- P-0 leftover Q3 (Decline required) ratified 2026-04-28
- P-0.6 Q2 KEEP (no-arbitration ratchet) ratified 2026-04-28; §7.7 updated to match

---

## §7.1 Orchestrator role definition

The orchestrator is a Sonnet 4.6 model called via Anthropic API from the Workstation's main process. It operates as a **stateless router and translator** between three surfaces:

- **Build doc** (uploaded by operator; treated as authority)
- **Daemon session/event log** (queried for current operational state)
- **CC sessions** (running tmux + claude processes, hard-coded as the only target)

The orchestrator does not hold state across calls. Each invocation is fresh, with input drawn from the build doc + relevant daemon state + the specific event triggering the call. Output is one of:

- **Action** — fires through the daemon's existing endpoints (Send, Pull, Spawn, Kill, etc.) when operator-approved
- **Card** — renders to the operator's kanban as a ticket awaiting approve/decline
- **Multi-choice card** — renders with structured options when operator pre-anticipated this decision point
- **Escape-block** — `needs-operator-prose` copyable block surfaced to chat panel when build doc coverage is incomplete OR when ANY ambiguity exists

The orchestrator is **explicitly bounded** to CC-session orchestration. It does not generalize to other tools, other LLM providers, or other automation surfaces. CC-session orchestration is its only role.

---

## §7.2 Build doc as source of truth

The orchestrator operates against exactly one git-tracked build doc per Workstation session. The build doc is operator-authored (typically in Opus surfaces — Claude.ai project chat, Claude desktop app, or Claude Code) and operator-committed to git. Workstation reads HEAD of the operator-configured build-doc path.

While a build doc is loaded, all orchestrator decisions route through it as authority:

- Tickets the orchestrator generates derive from build-doc-specified work units
- Prompts the orchestrator sends to CC sessions derive from build-doc-specified ticket descriptions
- Multi-choice cards the orchestrator generates derive from build-doc-flagged decision points
- Escape-block triggers fire per ratcheted high-sensitivity discipline (§7.7 below)

The orchestrator **never modifies the build doc**. Operator modifications happen via git commits in Opus surfaces or in operator's editor; orchestrator never writes to the build-doc file. Workstation reads the file's content + commit SHA fresh per call.

The build doc must conform to the build-doc schema specification (P-0.5 deliverable, Phase 0). Schema-noncompliant build docs produce both a UI validation error AND an orchestrator escape-block describing what's broken.

The orchestrator can hold one build doc at a time. Operator switches build docs via Workstation settings. Switching produces stale-card transitions per §7.6.

---

## §7.3 Kanban-card approval surface

The orchestrator's primary output to the operator is kanban cards. Cards render in the existing dispatch-web kanban with a distinct visual treatment (subtle blue tint per ratified P-0 leftover Q2) versus standard CC-session cards. Cards represent action proposals, multi-choice questions, or other operator-facing decisions.

**Standard card** has two pills and a text field:

- `[Decline]` (left pill, red/dismiss styling)
- `[Approve]` (right pill, green/affirm styling)
- Free-form text field labeled "Add notes or modifications"

The free-form field allows the operator to attach context, modify the action's parameters, or redirect the orchestrator. **Per §7.4 ratified Item A: text submitted with Approve merges into the action payload before firing.**

**Per ratified P-0 leftover Q3: Decline requires a reason in the free-form field. UI blocks the Decline click until text is entered.** This ensures every decline produces operator-prose context for audit log and for the orchestrator's next call.

**Multi-choice card** replaces the two pills with structured options when the orchestrator detects a pre-marked decision point in the build doc. **Per §7.11 ratified Item C: orchestrator picks 2-4 options dynamically based on question shape.** Format:

- Card body states the question
- 2-4 option buttons labeled A, B, C, D (orchestrator picks count based on question shape)
- Each option button shows the option's text inline
- Free-form text field still available below for "none of the above" or modifications

Operator click on an option captures the choice and routes back to orchestrator. Multi-choice cards do not have explicit Approve/Decline because the act of clicking an option *is* the approval; choosing "none of the above" via free-form is the decline path.

The chat panel is a horizontal bottom drawer below the kanban (per ratified P-0 leftover Q1). The drawer expands upward when active and collapses to a thin bar.

---

## §7.4 Approval semantics

**Approve** — orchestrator fires the proposed action immediately. **Per ratified Item A: free-form text modification, if attached, merges into the action payload before firing.** Audit log captures: original orchestrator proposal, free-form modification text if any, final fired payload, execution outcome.

Free-form merging behavior:
- For freeform-payload actions (`send`, `capture-finding-to-ledger`, `draft-commit-message`), free-form text appends or modifies the proposed payload per orchestrator-defined merge rules in P-0.4 system prompt.
- For structured-payload actions (`kill`, `pause`, `hold`, `arm`, `spawn-new-session`), free-form text appends as comment context where the action handler accepts it, or surfaces an error to operator if conflict with structured fields. Either failure mode is recoverable per audit log preserving original payload.

**Decline** — card dismisses. No action fires. **Reason in free-form is REQUIRED per ratified P-0 leftover Q3.** UI blocks the Decline click until non-empty text is entered. Audit log captures: orchestrator proposal, decline timestamp, the operator-required reason. Orchestrator's next call (triggered by next event) will see the declined card with reason in audit context and adjust accordingly. The orchestrator does not attempt to re-propose a declined action without operator-prose-level redirection.

**Multi-choice click** — orchestrator receives the chosen option as input on its next call. The chosen option becomes part of the action context, not a card-level execution. The orchestrator may then generate a follow-up Approve/Decline card based on the choice, or may proceed to action if the choice is sufficient.

**No action without operator click.** The orchestrator never fires actions autonomously. Every state-mutating operation routes through a card the operator clicked. The chat panel itself (orchestrator's conversational output) is not an action surface — it's where escape-blocks render and where multi-choice cards are shown alongside the kanban view.

---

## §7.5 Action enumeration

The orchestrator can propose any action type the daemon HTTP API supports. The starting set, drawn from the existing dispatch-web control surface and Conductor v2 endpoints:

- `spawn-new-session` — create new tmux + CC session, register with daemon
- `send` — send a prompt to a registered session (payload: prompt text)
- `pull` — retrieve output from a registered session
- `kill` / `pause` / `hold` / `arm` — state transitions on registered sessions
- `read-file` — read a file within operator-configured project directories or the uploaded build doc

Additional action types (e.g., `capture-finding-to-ledger`, `draft-commit-message`) may be added in v3.x via daemon contract amendments. v3.0 ships with the above set.

The orchestrator chooses which actions to propose based on build-doc content and current daemon state. **Strict allowlist applies per ratified P-0.5 Q6 + Q6.1: only actions in the current ticket's `Allowed actions` field are valid; out-of-list actions trigger escape-hatch.** The orchestrator does not invent new action types — additions require Phase 0 contract amendment.

---

## §7.6 Stale card handling

Cards generated against a prior build-doc revision, prior CC session state, or prior operator decision may become stale before approval. Stale-handling rules:

**Card becomes stale when:**

- The build doc it was generated from is replaced via new git commit
- The CC session it targets no longer exists (killed, archived)
- A subsequent orchestrator call produces a card that supersedes it
- Operator manually marks it stale via an action on the card itself

**Stale cards move to a STALE-PROPOSALS column** (mirror of existing dispatch-web STALE column behavior, but for orchestrator proposals rather than CC sessions). They remain visible for audit but do not gate future orchestrator behavior.

**Stale cards roll into new cards with visible lineage.** **Per §7.11 ratified Item B: when the orchestrator generates a new card that subsumes one or more stale cards, the new card visually surfaces the rolled-up stale card IDs on the card itself** — rendered as a "supersedes: <card-id>, <card-id>" annotation alongside the action proposal. Audit log additionally captures the same lineage in the audit row's `superseded_card_ids` field. Operator can see at the moment of approval which prior proposals informed the current one, without needing to query the audit log separately.

The orchestrator handles staleness reactively, not proactively. It does not scan for stale cards on its own — staleness is detected at the moment a triggering event occurs (build-doc replacement, session kill, supersedence). This keeps the orchestrator stateless.

---

## §7.7 Escape-hatch: `needs-operator-prose` block

**[RATCHETED PER P-0.6 Q2 KEEP RATIFICATION 2026-04-28]**

When the orchestrator encounters ANY ambiguity, it produces a copyable block that surfaces in the chat panel.

This is the strictest possible escape-hatch sensitivity. The original §7.7 v2 draft language was "escape on multiple plausible interpretations." Per P-0.6 Q2 KEEP, this is ratcheted UP: **the orchestrator escapes on any ambiguity at all, including ones where context inference would yield a confident answer.**

**The orchestrator escapes when:**

- The build doc does not explicitly cover the current situation
- More than one plausible interpretation of the build doc applies
- A single interpretation is plausible but not explicitly authorized in the build doc
- CC session output does not match any build-doc-anticipated pattern
- A methodology question arises that the build doc does not pre-answer
- ANY ambiguity exists where the orchestrator might otherwise rely on context inference

**The orchestrator does not arbitrate ambiguity.** Even when one interpretation is far more plausible than others, the orchestrator escapes rather than picks. **Inference itself is forbidden as a resolution path.** This is the load-bearing safety property of the stateless-router architecture.

This is operator-acknowledged high-friction calibration. The cost is operator copy-block burden. The benefit is airtight no-arbitration property: Sonnet cannot drift through inference because inference is structurally forbidden.

**Block format:**

```
=== needs-operator-prose ===
Build doc: <name and upload timestamp of current build doc>
Build doc commit SHA: <sha>
Build doc path: <abs path>
Orchestrator state at escape:
  Triggering event: <event description>
  Relevant CC session: <session ID, if applicable>
  Daemon state snapshot: <relevant fields>
What I tried: <prose summary of orchestrator reasoning>
Where I'm stuck: <specific gap in build-doc coverage OR named ambiguity>
Build doc sections consulted: <section IDs from schema>
=== end ===
```

The block has a `[Copy]` button. Operator clicks Copy, pastes into Opus surface (Claude.ai project, Claude desktop, etc.), discusses with Opus to resolve. Resolution comes back as either:

- **Inline answer** — operator types directly back to orchestrator chat panel; orchestrator's next call sees the operator's prose as authoritative input for that one decision
- **New build doc revision** — operator commits a Sonnet-consumable build-doc-extension or replacement; Workstation picks up new HEAD; orchestrator continues with expanded scope

The escape-hatch is the orchestrator's primary safety mechanism. It is structurally required, not optional — when ambiguity exists, the orchestrator always escapes.

The orchestrator detects escape conditions through the explicit `decision-point` and `escape-hatch` markers in the build-doc schema (P-0.5), plus runtime detection of: any-ambiguity cases, CC session output that doesn't match build-doc-anticipated patterns, methodology questions the build doc doesn't pre-answer.

---

## §7.8 Audit trail

Every orchestrator call produces an audit row. New SQLite table in the daemon database (per §0.7): `orchestrator_audit`.

**Captured fields per row:**

- `timestamp` — orchestrator-call time
- `trigger_event` — what caused this call (CC session output, operator chat message, card click, build-doc upload, etc.)
- `build_doc_id` — which build doc was loaded
- `build_doc_commit_sha` — SHA at time of call (per ratified P-0.5 Q8.1.a)
- `output_type` — `action`, `card`, `multi-choice-card`, `escape-block`, or `noop`
- `output_payload` — full orchestrator output, verbatim
- `operator_response` — `approve`, `decline`, `multi-choice-A/B/C/D`, `copied-escape-block`, or `pending`
- `final_fired_payload` — if action fired (with or without free-form modification)
- `execution_outcome` — `success`, `failure`, `n/a` (for non-action outputs)
- `free_form_text` — operator's free-form field content (REQUIRED for declines per §7.4)
- `staleness_status` — `current`, `stale`, `superseded`
- `superseded_card_ids` — comma-separated list of stale card IDs that this card rolled up

Audit log is queryable via daemon endpoint `GET /v3/orchestrator/audit` (filterable by date range, build-doc, output type, response). UI surfacing of the audit log deferred to v3.x; v3.0 supports direct query.

Retention indefinite for v3.0. Pruning policy deferred to v3.x.

---

## §7.9 Sonnet system prompt and cairn-Sonnet extensions

The orchestrator's behavior is specified by a system prompt that is operator-authored (P-0.4 deliverable, Phase 0). The system prompt encodes:

- Orchestrator role definition (§7.1)
- Build-doc-as-authority discipline (§7.2)
- Kanban-card output formats (§7.3)
- Approval semantics including free-form merge rules and required-decline-reason (§7.4)
- Action type enumeration with strict allowlist (§7.5)
- Stale-card handling including visual lineage (§7.6)
- ANY-ambiguity-triggers-escape sensitivity (§7.7)
- Cairn methodology (referenced from `cairn.md`)
- Cairn-Sonnet extensions (P-0.6 deliverable, Phase 0; specifies seven primitives)

The system prompt is itself frozen contract once authored. Modifications are operator-arbitrated under §3.4 because they redefine orchestrator behavior. The prompt is versioned alongside Workstation releases.

The cairn-Sonnet extensions (P-0.6) cover seven primitives:

- **build-doc-scope-locked** — orchestrator acts only on what current build doc explicitly authorizes
- **no-arbitration** — orchestrator does not resolve ambiguity, including inference-resolvable cases
- **frozen-doc-respect** — orchestrator reads build docs as authority, never modifies; SHA-aware in outputs
- **stateless-call** — orchestrator does not assume state from prior calls; reads fresh per invocation
- **structured-output-discipline** — every response validates against v3 output schema
- **audit-row-completeness** — every audit row schema-validates
- **no-side-effect-without-card** — state-mutating actions require operator-clicked card

---

## §7.10 What this section binds

**Frozen on operator final ratification:**

- Sonnet 4.6 as orchestrator model (§7.1)
- Stateless router architecture (§7.1)
- Build-doc-as-source-of-truth, git-tracked, single load at a time (§7.2)
- Two-pill kanban card with free-form field; Decline requires reason (§7.3, §7.4 ratified Q3)
- Multi-choice card variant with 2-4 dynamic option count (§7.3, ratified Item C)
- Approval semantics including free-form merge into payload (§7.4, ratified Item A)
- Action enumeration starting set with strict allowlist (§7.5)
- Stale-card handling with visual-on-card lineage (§7.6, ratified Item B)
- ANY-ambiguity-triggers-escape `needs-operator-prose` block (§7.7, ratified P-0.6 Q2 KEEP ratchet)
- Audit log schema (§7.8)
- System prompt as operator-authored frozen contract (§7.9)
- Seven cairn-Sonnet primitives (§7.9, P-0.6)

**Open until dogfood evidence or operator preference:**

- Whether stale-card-rolling visibility format ("supersedes: <id>, <id>") needs UX refinement
- Operator-facing audit log UI (currently query-only)
- Pruning policy for audit log

**Deferred to v3.x explicitly:**

- Tiered model architecture (Haiku for routine + Sonnet for judgment)
- Additional action types beyond §7.5 starting set
- Build-doc validation tooling (schema linter, etc.)
- Multi-build-doc orchestrator sessions (currently one at a time)
- Direct Sonnet ↔ Opus integration (currently operator-mediated via copy-block)

---

## §7.11 Ratification summary

The four §7.11 v2-draft items resolved 2026-04-28 in operator multi-choice walkthrough:

- **Item D (escape-block trigger sensitivity):** RATIFIED HIGH SENSITIVITY initially; **subsequently RATCHETED to ANY-AMBIGUITY** per P-0.6 Q2 KEEP. Strongest possible escape-discipline.
- **Item B (stale-card rolling visibility):** RATIFIED VISUAL-ON-CARD. Override of conservative default.
- **Item A (free-form text field merging):** RATIFIED MERGE-INTO-PAYLOAD. Default held.
- **Item C (multi-choice option count):** RATIFIED 2-4 DYNAMIC. Default held.

Additional ratifications captured in this final §7:

- **Decline reason requirement (P-0 leftover Q3):** RATIFIED REQUIRED. Override of conservative default. UI blocks Decline click until reason text entered. Strengthens audit-trail completeness.

Coherent shape: §7 final reflects three overrides toward higher safety + transparency (Items D-with-ratchet, B, Decline-required) and two defaults held where the conservative choice was structurally correct (A, C). The §7 you are ratifying is materially more conservative on safety surfaces than the original draft.

Pending operator confirmation: "§7 final ratified" to freeze §7 as final authority for v3.0 Phase 1+ ticket execution.

---

# Vision §8 — Ship-Gate Criteria (RATIFIED)

**Status:** RATIFIED by operator 2026-04-28 via P-0.2 multi-choice arbitration walkthrough. Pending final operator ack ("P-0.2 ratified") to freeze as authority for v3.0 ship-gate evaluation.

**Architecture context (locked):** Workstation v3.0 is an Electron desktop wrapper around Conductor v2's dispatch-web UI, with a Sonnet 4.6 orchestrator chat panel that consumes operator-uploaded build docs and produces kanban cards for operator approval. Per locked vision §1–§7.

**Date drafted:** 2026-04-28

---

## §8.1 Capability checklist for v3.0 ship

The following capabilities must all work end-to-end before v3.0 ships:

**Desktop shell:**
- Electron app launches as a native macOS application (Cmd+Q quits, Cmd+W closes window, native menu bar present)
- Window state persists across launches
- App packages as runnable `.app` bundle

**Embedded dispatch-web:**
- Kanban renders in BrowserWindow with all four columns (AWAITING REVIEW / STALE / RUNNING / IDLE) populated correctly from daemon state
- Session detail panel renders with all fields (State, Status, Last commit, Tests, Phase, Last action)
- All control buttons fire daemon endpoints correctly (Arm / Pause / Hold / Kill / Send / Pull)
- Event ticker updates live via SSE/WS connection
- Filter dropdowns work
- Archived-session toggle works

**Spawn-from-UI:**
- Spawn button + repo picker modal works in shell
- Tmux session spawned by Workstation under user context produces a registered session **bit-identical** to CLI-spawned (every env var, every PTY behavior matches; spike-validated per MB-S02 ADR)
- Session count cap enforcement works with override flow per locked §0.6
- Failure modes (tmux missing, claude not in PATH, daemon unreachable) surface clearly

**Orchestrator chat panel (must work end-to-end for v3.0 ship; not deferrable to v3.1):**
- Anthropic API streaming chat works against Sonnet 4.6 with secure API key storage
- Build-doc upload affordance works with schema validation per P-0.5 spec
- Stateless context-injection pipeline works per MB-S01 ADR
- All five action types from §7.5 (spawn-new-session, send, pull, state-transitions, read-file) propose-able by orchestrator
- Each action type exercised end-to-end during dogfood (orchestrator proposes → kanban card renders → operator approves → action fires through daemon → audit row written)
- Build-doc upload exercised: operator uploads schema-conformant doc, orchestrator operates against it, replacement upload behavior works
- Escape-block flow exercised: orchestrator hits coverage gap, generates `needs-operator-prose` block, operator copies, resolves in Opus, brings back inline answer or new build doc
- Multi-choice cards exercised: orchestrator generates 2-4 dynamic options, operator clicks one, choice routes back

**Persistence and audit:**
- Chat history persists across app restart via daemon SQLite endpoints (per MB-S03 ADR)
- Audit log captures every orchestrator call per §7.8 schema
- Audit log queryable via daemon endpoint

**Onboarding:**
- First-launch flow walks operator through API key entry and project list config
- Clean install → walked-through onboarding → usable workstation, no CLI required at any step

---

## §8.2 Quality bar

**Methodology compliance for the build itself.** v3.0 build follows cairn methodology — five-verb commit grammar (red, green, spike, contract, refactor), confidence labels, self-check blocks per CONDUCTOR_API_CONTRACT.md §10.5, per-commit-push, per-path git add for any parallel sessions. Findings emerge concurrent with fixes, captured in `docs/cairn-findings.md` continuing from #55.

**Smoke-test surface.** Per MB-T08, smoke harness exists for v3.0 capability checklist. Each §8.1 capability has a corresponding smoke test that can be run against a built `.app`. This is a polish/maintainability requirement more than a ship-blocker — but the smoke surface itself must exist for operator to verify capabilities post-build.

**Test coverage at red/green discipline.** Every Phase 2 ticket lands a red test (failing, defines acceptance) and a green commit (passing). No production code without preceding red. Existing v2 test suite (~395 tests) remains green throughout v3.0 build.

**Spike evidence cited.** Phase 1 spike ADRs (MB-S01, MB-S02, MB-S03) carry KNOWN claims with citation. v3.0 production code references the spike ADRs where decisions derive from them.

---

## §8.3 Performance bars (HARD ship gates)

These are non-negotiable measured criteria. v3.0 does not ship if any of these fail at the ship-gate evaluation:

**App launch latency.** Time from `.app` double-click to interactive Workstation window (kanban visible, daemon connection established): **< 3 seconds** at p50 on operator's primary development machine. Measured via timestamped startup log. Outliers (cold boot, post-reboot first launch) excluded from p50; included in p95 which must be < 6 seconds.

**Chat first-token latency.** Time from operator hitting Enter in chat input to first visible token streaming into chat panel: **< 2 seconds** at p50. Measured against Anthropic API real responses (not mocked). Includes context-injection time + API round-trip + first chunk render. Validated in MB-S01 spike with explicit measurement protocol.

**Dashboard refresh latency.** Time from daemon emitting an event (state_changed, etc.) to that event reflecting in the embedded dispatch-web UI: **< 500ms** at p50. Same as v2.0.1 baseline; v3.0 wrapper must not degrade this. Validated in MB-T02 acceptance test.

If any of these fail at ship-gate, v3.0 does not ship until remediated. Remediation may include: spike for root-cause analysis, optimization ticket, or operator-arbitrated revision of the bar with justification.

---

## §8.4 Dogfood window

v3.0 does not ship until operator has dogfooded Workstation as primary CC-orchestration surface across **multiple build cycles in different repositories**. Specifically:

- At least one full ticket cycle (red → green → review → commit → push) executed through Workstation in the **Sherpa** repo
- At least one full ticket cycle executed through Workstation in the **Conductor / foxworks-dispatch** repo (i.e., Workstation orchestrating its own follow-up work)
- At least one full ticket cycle executed through Workstation in the **Lantern** repo

Across these dogfood cycles:
- All five §7.5 action types must have been exercised at least once
- At least one escape-block flow must have triggered and resolved successfully
- At least one multi-choice card must have been answered
- Build-doc upload + replacement workflow must have been exercised
- Stale-card rollover with visual lineage (per ratified §7.6 Item B) must have been exercised at least once

Findings during dogfood file as `MB-F*` followups in `docs/FOLLOWUPS.md` and `[workstation]`-tagged findings in `docs/cairn-findings.md` continuing from #55.

The dogfood window is calendar-bounded by the work itself, not by elapsed time. If the three repo cycles execute cleanly with all surfaces exercised, dogfood closes. If issues surface that block any of the §8.1 capabilities, dogfood extends until they resolve.

---

## §8.5 Known-issues policy

v3.0 ships with **zero blocking findings**. All findings emerging during the v3 build cycle must be either (a) resolved before ship, or (b) filed as v3.x followups in `docs/FOLLOWUPS.md` with explicit "non-blocking" classification and operator rationale.

Specifically:
- Bug-class findings (production code defects observed in dogfood) block ship until resolved
- Methodology findings (process or discipline gaps) file to ledger but do not block ship
- UX-polish findings file to followups; do not block ship
- Performance findings that cause §8.3 hard bars to miss block ship per §8.3
- Performance findings that don't cause §8.3 misses can file to followups

CORE-EXPORTS-MIGRATION (bug #2 closure from v2.0.1 known-issues) is **not a v3.0 ship-gate**. It can close before v3.0 ships if parallel-track work completes in time, but if it doesn't, the workaround in `RELEASING.md` continues to apply and CORE-EXPORTS-MIGRATION ships as v3.x followup.

---

## §8.6 Release mechanics

When §8.1 through §8.5 all pass, v3.0 ships via:

- Version bump to 3.0.0 across all 5 packages + root `package.json` (mirrors v2.0.0 / v2.0.1 pattern)
- Annotated git tag `v3.0.0` with release notes
- Tag pushed to origin
- `RELEASING.md` updated with v3.0.0 section: closed bugs, known-issues (CORE-EXPORTS-MIGRATION reference if still open), upgrade notes from v2.x

Operator-territory work for the actual ship cycle (per v2.0.1 precedent at `7a800a9`).

---

## §8.7 What this section binds

**Frozen on operator ratification:**

- Capability checklist for ship including orchestrator end-to-end requirement (§8.1)
- Bit-identical spawn parity bar with MB-S02 spike validation requirement (§8.1)
- Three-repo dogfood window (Sherpa + Conductor + Lantern) with all five action types exercised (§8.4)
- Hard performance bars: launch < 3s, chat first-token < 2s, dashboard refresh < 500ms (§8.3)
- Zero blocking findings ship-policy with v3.x-followup classification for non-blocking (§8.5)
- CORE-EXPORTS-MIGRATION as non-blocking for v3.0 ship (§8.5)

**Open until ship-gate review or dogfood evidence:**

- Exact remediation paths for §8.3 perf-bar misses (case-by-case operator arbitration)
- Whether dogfood cycles must be in any particular order (Sherpa first vs Conductor first; currently unordered)
- Whether multi-choice card must be operator-actually-clicked or just rendered to satisfy §8.1 exercise requirement (currently: clicked)

**Deferred to v3.x explicitly:**

- Cross-platform performance bars (current §8.3 is macOS only; Linux/Windows when those enter scope)
- Performance bars under high-load conditions (many simultaneous sessions; current bars are nominal-load)
- Pruning policy for audit log (per §7.8 also deferred)

---

## §8.8 Ratification summary (2026-04-28)

Six P-0.2 questions arbitrated via multi-choice walkthrough:

- **Q1 (orchestrator requirement):** RATIFIED orchestrator must work end-to-end for v3.0; not deferrable to v3.1.
- **Q2 (spawn parity bar):** RATIFIED bit-identical, spike-validated.
- **Q3 (dogfood window):** RATIFIED multiple build cycles across Sherpa + Conductor + Lantern.
- **Q4 (orchestrator capability bar):** RATIFIED all five action types + build-doc upload + escape-block + multi-choice cards exercised.
- **Q5 (known-issues policy):** RATIFIED zero blocking findings; non-blocking file as v3.x followups.
- **Q6 (performance bar):** RATIFIED hard perf bars at 3s / 2s / 500ms thresholds.

Coherent shape: high ship bar across capability completeness, validation rigor, dogfood breadth, and measured performance. v3.0 is a real product release, not a wrapper-and-ship. CORE-EXPORTS-MIGRATION explicitly relaxed from blocking via Q5; everything else ratchets up.

All §8 deliverable items resolved. No remaining open arbitration.

Pending operator confirmation: "P-0.2 ratified" to freeze §8 as authority for v3.0 ship-gate evaluation.
