# Workstation Build-Doc Schema Specification — v1.0

**Status:** DRAFT under operator-explicit Path B scope-narrowing per P-0.5 multi-choice arbitration walkthrough (2026-04-28). Pending operator ratification ("P-0.5 ratified") to freeze as authority for v3.0 orchestrator build-doc consumption.

**Purpose:** Defines the structural contract for Workstation-consumable build documents. Build docs conforming to this schema can be loaded by Workstation and consumed by the Sonnet 4.6 orchestrator per ratified vision §7.

**Authority:** Strict v1.0 schema per ratified P-0.5 Q2. Schema changes require P-0.5 amendment + version bump in build docs. Frozen at first authoring (operator-arbitrated under §3.4).

**Date:** 2026-04-28

---

## §1 — Build-doc identification

### §1.1 File extension

Build docs use the `.build.md` extension per ratified P-0.5-cross-Q1.

Examples: `v3-tickets.build.md`, `sherpa-mvp-completion.build.md`, `lantern-integration.build.md`.

The double-extension preserves Markdown tooling support (syntax highlighting, preview, lint) while distinguishing build docs from regular Markdown files. Workstation's build-doc loader filters paths by `.build.md` suffix when scanning operator-configured directories.

### §1.2 File location

Per ratified P-0.5-Q8.1.b: build docs live in any git-tracked location, operator-configured per Workstation session. Operator configures the location through the Workstation settings UI per ratified P-0.5-cross-followup Q1 (path picker with git-repo detection).

Workstation stores the build-doc reference as a `(repo_root_abs_path, relative_path)` tuple. The repo root is auto-detected from the picker selection. The relative path is resolved against the repo root at read time.

### §1.3 Versioning

Per ratified P-0.5-Q8.1.a: build docs are git-tracked. Edits are git commits. Workstation reads HEAD. Escape-blocks reference the commit SHA at the time of orchestrator output generation. Operator can `git diff <sha>..HEAD <path>` to see exactly what changed since an escape fired.

The build doc's git history IS the version-tracking mechanism. No revision-log field is required in the build doc itself.

---

## §2 — YAML frontmatter

Every `.build.md` file begins with YAML frontmatter delimited by `---` lines. Per ratified P-0.5-cross-Q4 (STANDARD), the frontmatter contains the following required fields:

```yaml
---
schema_version: "1.0"
doc_id: "v3-tickets-2026-04-28"
title: "Conductor Workstation v3 Build Plan"
target_repo: "/Users/josh/Desktop/Automata/foxworks-dispatch"
author: "Joshua Seppich"
created_at: "2026-04-28T17:42:00-06:00"
allowed_action_types: ["spawn-new-session", "send", "pull", "kill", "pause", "hold", "arm", "read-file"]
description: "v3.0 ticket build plan: Phase 0 prerequisites + Phase 1 spikes + Phase 2 production tickets + Phase 3 dogfood + ship"
---
```

### §2.1 Required field definitions

**`schema_version`** (string, required) — Schema version this build doc conforms to. Must equal `"1.0"` for documents validated by this spec. Future schema versions bump this field.

**`doc_id`** (string, required, unique within operator's build-doc collection) — Stable identifier for this document. Convention: `<scope>-<date>` or `<scope>-<sequence>`. Used in audit logs to reference which build doc produced an action.

**`title`** (string, required) — Human-readable title. Surfaces in Workstation UI when the build doc is loaded.

**`target_repo`** (string, absolute path, required) — Absolute path to the git repository where the orchestrator-fired actions land. CC sessions spawned per this build doc spawn with this `cwd`.

**`author`** (string, required) — Operator who authored the build doc. For audit trail.

**`created_at`** (ISO 8601 timestamp, required) — When the build doc was first authored. Updates on substantial revisions are made via new git commits, not by mutating this field.

**`allowed_action_types`** (array of strings, required) — Top-level default for which orchestrator action types are valid in this build doc. Per-ticket `allowed_actions` (§3.4 below) override the top-level default. Strict allowlist per ratified P-0.5 Q6 + Q6.1: actions outside this list trigger escape-hatch.

**`description`** (string, required) — Brief summary of build-doc scope. Surfaces in Workstation UI and in orchestrator context.

### §2.2 Frontmatter validation

Workstation validates frontmatter at load time per ratified P-0.5 Q2 (strict-schema). Missing required fields, type mismatches, or `schema_version` mismatch produces a schema-validation error per ratified P-0.5-cross-followup Q2 (ERROR + ESCAPE-BLOCK):

- Workstation surfaces a UI error toast/banner: "Build doc at `<path>` failed schema validation: `<error>`"
- Orchestrator generates an escape-block describing what's broken
- Both surface concurrently; operator chooses resolution path

Optional fields beyond the required eight are NOT permitted. The schema is strict per ratified Q2.

---

## §3 — Body structure

The body of a build doc follows structured Markdown conventions. Sections, tickets, escape-hatch markers, and multi-choice templates are recognized by their heading patterns and structural attributes.

### §3.1 Top-level sections

Build doc body uses `##` (level 2) headings for top-level sections. Common sections:

- `## Overview` — narrative scope description
- `## Phase 0: <name>` — phase grouping (optional but recommended for multi-phase builds)
- `## Tickets` — ticket enumeration (required for any build doc that produces tickets)
- `## Open Questions` — pre-marked escape-hatch sections per §3.6
- `## Multi-choice Templates` — pre-authored multi-choice questions per §3.7

Each section header carries an explicit ID for stable reference: `## Tickets {#tickets}`. Per ratified P-0.5-Q1 implication, Sonnet references sections by their explicit IDs in escape-blocks (e.g., `build_doc_sections_consulted: ["#tickets", "#tickets-mb-t05"]`).

### §3.2 Ticket structure

Tickets are level-3 (`###`) headings within a `## Tickets` section. Every ticket has the following structured fields, all required per ratified P-0.5-Q3 (full structure for every ticket type).

```markdown
### MB-T05: Spawn execution {#tickets-mb-t05}

**Type:** green
**Domain:** menubar
**Phase:** Phase 2 / Tier B
**Depends on:** [MB-T04, MB-S02]
**Allowed actions:** [spawn-new-session]
**Status:** pending

**Description:**
Wire the `workstation:spawn-requested` IPC event to actual spawn behavior per MB-S02 ADR. Spawn tmux session in user context, run `claude` inside, register session via existing POST /v2/sessions, surface success/failure to UI.

**Red:**
- Test: `test_spawn_creates_registered_session.spec.ts`
- Acceptance: emit spawn intent, assert tmux session exists, assert daemon has new session record, assert kanban shows new session card

**Green:**
- Implement spawn handler in main process per MB-S02 ADR
- Error handling for spawn failures (tmux missing, claude not in PATH, daemon unreachable)
- Acceptance: end-to-end spawn-from-UI produces a session indistinguishable from CLI-spawned

**Refactor:**
- None expected

**Open questions:**
- See escape-hatch §4.2 for tmux-pty environment edge cases
```

### §3.3 Required ticket fields

Every ticket in `## Tickets` must contain these fields:

**`Type`** — One of `red`, `green`, `refactor`, `contract`, `spike`. Maps to commit grammar.

**`Domain`** — Domain prefix matching repository convention (e.g., `menubar`, `coarchitect`, `daemon`). Maps to ticket ID prefix per ratified P-0.5-cross-Q2 (DOMAIN-PREFIX-NUMERIC).

**`Phase`** — Free-form phase identifier (e.g., "Phase 2 / Tier B"). Used for grouping in Workstation UI but not parsed for execution order. Execution order derives from `Depends on` per §3.5.

**`Depends on`** — Array of ticket IDs this ticket depends on. Empty array `[]` for tickets with no dependencies. Per ratified P-0.5-Q4 (DAG with explicit dependency edges).

**`Allowed actions`** — Array of action types orchestrator can propose for this ticket. Strict allowlist per ratified P-0.5 Q6 + Q6.1; out-of-list actions trigger escape-hatch. May be empty `[]` for purely operator-only tickets (e.g., contract authoring) where orchestrator only watches state transitions.

**`Status`** — One of `pending`, `in-progress`, `awaiting-approval`, `complete`, `stale`, `superseded`. Per ratified P-0.5-Q8.2, this lives in the daemon ticket-state table, NOT mutated in the build doc by orchestrator. The Status field in the build doc is operator-authored (initial value, typically `pending`); subsequent state derives from audit log per §3.8.

**`Description`** — Free-form prose describing the ticket scope.

**`Red`** — Required for ticket types `red`, `green`, `refactor`. Contains test name and acceptance criteria. Required for `spike` (with "spike test" semantics — what does the spike validate?). Optional for `contract`.

**`Green`** — Required for ticket types `green`, `refactor`. Contains implementation summary and acceptance criteria. Required for `spike` (the ADR output). Required for `contract` (the contract amendment text or commit reference). Optional for `red`.

**`Refactor`** — Required for ticket types `refactor`. Optional for others.

**`Open questions`** — Optional. References any `## Open Questions` section escape-hatch markers (§3.6) relevant to this ticket.

### §3.4 Per-ticket allowed_actions vs top-level

Frontmatter declares `allowed_action_types` as the top-level default. Per-ticket `Allowed actions` field overrides for that specific ticket. The orchestrator, when evaluating an action proposal:

1. Looks up the current ticket's `Allowed actions` list
2. If the proposed action is in the list, proceeds
3. If not, generates escape-block per primitive §2.1 (build-doc-scope-locked)

The frontmatter `allowed_action_types` is the *envelope* — actions in this list are *possibly* available somewhere in the build doc. Per-ticket `Allowed actions` is the *specific* — what's actually allowed for this ticket.

If a per-ticket `Allowed actions` includes an action not in the frontmatter `allowed_action_types`, that's a schema validation error.

### §3.5 Dependency DAG

Per ratified P-0.5-Q4 (DAG with explicit dependency edges) + ratified P-0.5-cross-Q3 (BOTH upload-time AND runtime cycle detection):

**Upload time:** Workstation parses all ticket IDs and `Depends on` arrays. Computes the dependency graph. Detects cycles. If a cycle exists, surfaces validation error with the cycle path (e.g., "Cycle detected: MB-T01 → MB-T03 → MB-T01").

**Runtime:** Orchestrator computes execution order via topological sort. If runtime detection surfaces a cycle (e.g., dependency added through cross-ticket reference that bypassed upload validation), generates escape-block.

The schema does not allow circular dependencies. A ticket cannot depend on itself directly or transitively.

### §3.6 Escape-hatch markers

Per ratified P-0.5-Q5 (BOTH explicit pre-marked AND runtime-detected): the schema includes `## Open Questions` section for pre-marked escape-hatch points.

```markdown
## Open Questions {#open-questions}

### Q-tmux-pty-env-edge-cases {#open-questions-tmux-pty-env-edge-cases}

**Trigger condition:** When MB-T05 spawn handler encounters tmux PTY environment that differs from MB-S02 ADR-validated baseline.

**Why this is operator-only:** Environmental drift between Electron-spawned and terminal-spawned tmux is a real failure mode flagged in MB-S02 risks. The exact remediation depends on what diverges; can't be pre-resolved in the build doc.

**Escape-block content:** When this fires, escape-block carries: detected env diff, MB-S02 baseline, suggested mitigation paths (none, env-var injection, daemon-side workaround).
```

Each open-question section has:
- Explicit ID per `{#section-id}` convention
- `Trigger condition` field stating when the orchestrator should escape via this open question
- `Why this is operator-only` field explaining the escape rationale
- `Escape-block content` field describing what the resulting escape-block should include

When orchestrator detects a trigger condition matches, it generates an escape-block with the prescribed content. When orchestrator detects ambiguity NOT covered by any open-question section, it generates a runtime-detected escape-block per primitive §2.2 (no-arbitration).

### §3.7 Multi-choice templates

Per ratified P-0.5-Q7 (YES — pre-authored multi-choice questions): the schema includes `## Multi-choice Templates` section for pre-authored multi-choice cards.

```markdown
## Multi-choice Templates {#multi-choice-templates}

### MC-spawn-target-repo {#mc-spawn-target-repo}

**Trigger condition:** When orchestrator proposes spawn-new-session and the target repo is not unambiguously specified by the ticket.

**Question:** Which repo should the new session work against?

**Options:**
- A: foxworks-dispatch (this build doc's target_repo)
- B: sherpa
- C: lantern  
- D: Other (escape via free-form)

**Routing:** Operator's choice routes back to orchestrator on next call as the spawn target.
```

Each multi-choice template has:
- Explicit ID
- `Trigger condition` field stating when orchestrator should generate this multi-choice card
- `Question` field — the question text shown to operator
- `Options` field — 2-4 options per ratified P-0.5-Q7 (DYNAMIC count, ratified P-0.4 Q3 implication)
- `Routing` field describing how operator's choice flows back

When orchestrator detects a trigger condition matches, generates a multi-choice card using the template. Per ratified primitive §2.2 (no-arbitration), multi-choice templates only fire when the question is one operator pre-anticipated. For unanticipated nuance, escape-block fires instead.

### §3.8 Ticket state lifecycle

Per ratified P-0.5-Q8.2 (DAEMON SESSION/STATE TABLE) + Q8.3 (YES — explicit superseded state): ticket state lives in a daemon table, not in the build doc.

The build doc's `Status` field per §3.3 is operator-authored at authoring time (typically `pending`). Workstation does NOT mutate the build doc's Status field.

Daemon ticket-state table records:
- `ticket_id` (e.g., "MB-T05")
- `build_doc_id` (e.g., "v3-tickets-2026-04-28")
- `state` (one of: `pending`, `in-progress`, `awaiting-approval`, `complete`, `stale`, `superseded`)
- `state_updated_at`
- `superseded_by_ticket_id` (nullable, populated when state is `superseded`)

Workstation kanban surfaces this table joined with the build doc's ticket structure. Operator sees current state without querying audit log directly.

When a build doc is replaced (new git commit), pending tickets that no longer exist in the new revision transition to `superseded` per ratified P-0.5-Q8.3.

---

## §4 — Schema validation

Workstation validates `.build.md` files at load time and on git HEAD changes. Validation runs in three stages per ratified P-0.5-cross-followup Q2 (ERROR + ESCAPE-BLOCK behavior on failure).

### §4.1 Stage 1: YAML frontmatter

YAML parses cleanly. All required fields present (§2.1). Field types match. `schema_version` equals `"1.0"`. `target_repo` resolves to an existing git-tracked path. `allowed_action_types` contains only valid action type strings.

### §4.2 Stage 2: Body structure

Required sections present (`## Tickets` is required if any tickets exist; `## Open Questions` and `## Multi-choice Templates` are optional). Section IDs unique within the document. Ticket structure conformant per §3.3. Per-ticket `Allowed actions` is a subset of frontmatter `allowed_action_types`.

### §4.3 Stage 3: Dependency graph

Build dependency DAG from all ticket `Depends on` arrays. Validate acyclic. Validate all referenced ticket IDs exist in the document.

### §4.4 Failure handling

Any stage failure produces both:

1. Workstation UI surface: validation error banner with stage + specific failure
2. Orchestrator escape-block: structured `needs-operator-prose` block referencing the validation failure

Both surface concurrently. Operator can fix via git commit (drives reload) OR via paste-to-Opus resolution.

---

## §5 — v3 Zod schema reference

Per ratified P-0.3-Q2 (orchestrator types in dispatch-core under §2-equivalent freeze): the runtime Zod schema for build-doc validation lives at `packages/dispatch-core/src/v3/schema.ts`. The build-doc schema TypeScript code is the source of truth for runtime validation; this Markdown spec is the human-readable contract.

Key Zod schemas (full TypeScript definitions in `dispatch-core/src/v3/schema.ts`):

- `BuildDocFrontmatterSchema` — validates §2 YAML frontmatter
- `BuildDocTicketSchema` — validates §3.3 ticket structure
- `OpenQuestionSchema` — validates §3.6 escape-hatch markers
- `MultiChoiceTemplateSchema` — validates §3.7 multi-choice templates
- `BuildDocSchema` — composes all above for full document validation

The TypeScript schemas freeze at first authoring per ratified P-0.3-Q4. Changes to the runtime schema require `contract:` commits amending both `dispatch-core/src/v3/schema.ts` AND this specification.

---

## §6 — Authoring conventions

Build docs are authored by operator in Opus surfaces (Claude.ai project chat, Claude desktop, or this session). The following conventions apply at authoring time:

**One ticket per heading.** Don't combine multiple tickets under a single heading even if they share scope — the schema requires unique ticket IDs per heading.

**Explicit `Allowed actions` per ticket.** Every ticket carries its own list. Don't rely on the top-level `allowed_action_types` to govern individual tickets. The top-level is the envelope; per-ticket is the specific.

**Pre-mark known ambiguity points.** Per primitive §2.2 (no-arbitration), orchestrator escapes on any ambiguity. Authoring-time pre-marks via `## Open Questions` reduce escape-rate by giving Sonnet structured guidance for known-ambiguous cases. This raises authoring rigor — but it's the right complement to the strict orchestrator.

**Author multi-choice templates for known operator-decision points.** Same principle as pre-marked escape-hatches but for cases where operator can choose between concrete options rather than authoring prose.

**Use `target_repo` consistently.** All tickets in a build doc target the same repo. Cross-repo work requires multiple build docs.

**Reference `MB-S<N>` and `MB-T<N>` ADR/ticket IDs in `Depends on`** when dependencies cross build-doc boundaries (e.g., a Sherpa build doc depending on a Workstation MB-S03 spike outcome). Workstation cannot validate cross-repo references; operator's responsibility.

---

## §7 — Schema versioning

The schema version is `"1.0"` for v3.0 release. Future schema changes follow semver semantics:

- **Major** (e.g., `"2.0"`): Breaking changes that require existing build docs to migrate (e.g., changing frontmatter required fields, changing ticket structure)
- **Minor** (e.g., `"1.1"`): Backward-compatible additions (e.g., adding optional ticket fields, adding new section types)
- **Patch** (e.g., `"1.0.1"`): Clarifications or specification corrections that don't change validation behavior

Build docs declare their `schema_version` in frontmatter. Workstation supports the declared version for validation. Cross-version compatibility (Workstation v3.x supporting build-doc schema v1.x where x ≥ 0) is operator-arbitrated per future amendment.

For v3.0 ship: only schema_version `"1.0"` supported.

---

## §8 — Open items deferred to runtime / spike

These are ticket-level implementation details that the schema spec deliberately does NOT specify:

**Build-doc reload behavior on git HEAD change.** Whether the orchestrator's mid-task call sees the new HEAD or completes against the loaded SHA — this is COARCH-T04 implementation detail per ratified P-0.5-Q8.1.c (Workstation-local reader).

**Schema validation error message format.** UI-level concern; surfaces in MB-T11 or COARCH-T04 ticket review.

**Multi-build-doc scenarios.** v3.0 supports one build doc per Workstation session per ratified vision §7.2. Multi-doc support deferred to v3.x.

---

## §9 — Ratification summary

This document was authored under P-0.5 multi-choice arbitration (2026-04-28):

- **Q1 (file format):** YAML frontmatter + structured Markdown body
- **Q2 (strictness):** Strict v1.0 schema; changes require P-0.5 amendment
- **Q3 (ticket granularity):** Full structure for every ticket type
- **Q4 (dependency representation):** DAG with explicit edges
- **Q5 (escape-hatch markers):** Explicit pre-marked at known ambiguity points
- **Q6 (action allowlist):** Build doc declares allowed actions per ticket
- **Q6.1 (allowlist recovery semantics):** Strict allowlist; no recovery exemption
- **Q7 (multi-choice templates):** Pre-authored at known decision points
- **Q8 (ticket lifecycle):** Stateless in build doc; state in daemon table
- **Q8.1 (build-doc mutability):** Operator-mutable via git commits
- **Q8.1.a (edit-tracking):** Build docs live in git; commits are version control
- **Q8.1.b (location):** Operator-configured; either monorepo or any git-tracked location
- **Q8.1.c (reader):** Workstation-local reader; daemon never sees build doc
- **Q8.2 (state location):** Daemon ticket-state table separate from audit log
- **Q8.3 (stale handling):** Explicit superseded state in daemon + audit log
- **cross-Q1 (extension):** `.build.md`
- **cross-Q2 (ticket ID):** Domain-prefix-numeric matching FOLLOWUPS.md
- **cross-Q3 (cycle detection):** Both upload-time AND runtime
- **cross-Q4 (frontmatter):** Standard 8 required fields
- **cross-followup Q1 (path config):** Path picker with git-repo detection
- **cross-followup Q2 (validation failure):** Error + escape-block

Pending operator confirmation: "P-0.5 ratified" to freeze this specification as authority for the v3 Zod schema in `dispatch-core/src/v3/schema.ts`.
