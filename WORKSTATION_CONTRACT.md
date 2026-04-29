# Foxworks Workstation Contract

**Status:** DRAFT under operator-explicit Path B scope-narrowing per P-0.3 multi-choice arbitration walkthrough (2026-04-28). Pending operator authorship and commit ("P-0.3 authored at <SHA>") to freeze as authority for v3.0 ticket execution.

**Authority:** Operator-arbitrated frozen artifact per ratified P-0.3 Q4. Frozen at first authoring (commit SHA becomes the freeze anchor like `CONDUCTOR_API_CONTRACT.md` at `3ddca60`). Future changes are `contract:` commits requiring operator arbitration.

**Relationship to other contracts:**

- `CONDUCTOR_API_CONTRACT.md` (frozen at `3ddca60`, amended at `a502c4c` and `c1bb7fe`) — governs the daemon's `/v2/*` endpoint surface and remains authoritative for those endpoints. This contract does NOT duplicate `/v2/*` definitions; references by URL where needed.
- `BUILD_CONTRACT.md` — governs build/release process at the monorepo level; remains authoritative.
- `cairn.md` and `docs/cairn-sonnet-extensions.md` — govern methodology discipline; this contract references them in §9 (Process).

**Date:** 2026-04-28

---

## §1 — Overview

### §1.1 What Workstation is

Foxworks Workstation is a desktop Electron application that wraps Conductor v2's existing dispatch-web kanban UI and adds an embedded Claude Sonnet 4.6 orchestrator chat panel for managing multiple Claude Code sessions through a build cycle. It ships as `packages/dispatch-menubar/` (renamed to `dispatch-workstation` at MB-T01) within the foxworks-dispatch monorepo at version 3.0.0.

Workstation does not replace the daemon, the dispatch-web UI, or the fd CLI. It embeds dispatch-web in a BrowserWindow, talks to the daemon over the existing `/v2/*` API surface plus new `/v3/*` orchestrator-specific endpoints, and provides operators a single integrated surface for spawn, monitor, approve, and dogfood.

### §1.2 What this contract governs

This contract governs the Workstation-specific surface only:

- The `/v3/*` orchestrator endpoints (§6)
- The orchestrator's authority and approval model (§3)
- Build-doc resolution semantics (§4)
- The kanban-card UI surface for orchestrator proposals (§5)
- IPC between the Electron shell and the embedded dispatch-web webview (§7)
- Persistence model for chat history, audit log, and ticket state (§8)
- Process discipline for the v3.0 build itself (§9)

It does NOT govern:

- `/v2/*` endpoints (those remain governed by `CONDUCTOR_API_CONTRACT.md`)
- The dispatch-web internal UI implementation (that remains within dispatch-web's existing scope)
- The fd CLI surface (that remains within `dispatch-cli`'s existing scope)
- General cairn methodology (governed by `cairn.md`)

### §1.3 Frozen status

Per ratified P-0.3 Q4, this contract freezes at first authoring. Operator commits the contract; commit SHA becomes the freeze anchor. Subsequent changes require `contract:` commits with operator arbitration.

---

## §2 — Schema (v3 types)

All Workstation-side TypeScript types that consume daemon data, define orchestrator output, or specify IPC messages live in `packages/dispatch-core/src/v3/schema.ts` per ratified P-0.3 Q2. The file is operator-authored and frozen at first commit.

### §2.1 Schema scope

The v3 schema includes:

**Build-doc schemas** (per `docs/build-doc-schema-spec.md` and ratified P-0.5):
- `BuildDocFrontmatterSchema`
- `BuildDocTicketSchema`
- `OpenQuestionSchema`
- `MultiChoiceTemplateSchema`
- `BuildDocSchema`

**Orchestrator output schemas** (per ratified P-0.4 Q2 — output schema embedded in system prompt):
- `ActionOutputSchema`
- `CardOutputSchema`
- `MultiChoiceCardOutputSchema`
- `EscapeBlockOutputSchema`
- `OrchestratorOutputSchema` (discriminated union of the four)

**Ticket state schemas** (per ratified P-0.5 Q8.2 — daemon ticket-state table):
- `TicketStateSchema`
- `TicketStateRowSchema`

**Audit log schemas** (per ratified vision §7.8):
- `OrchestratorAuditRowSchema`

**Chat history schemas** (per ratified §0.7 — daemon SQLite):
- `OrchestratorMessageSchema`
- `OrchestratorMessageRowSchema`

**IPC message schemas** (per ratified P-0.3 Q3 — IPC embedded in §2 schema):
- `ShellToWebviewMessageSchema` (discriminated union of all shell→webview message types)
- `WebviewToShellMessageSchema` (discriminated union of all webview→shell message types)

**Error schemas** (per ratified P-0.3 Q4 — typed error union):
- `WorkstationErrorSchema` (discriminated union including `SchemaValidationError`, `SessionNotFoundError`, `AnthropicAPIError`, `BuildDocReadError`, etc.)

### §2.2 Schema authority

The TypeScript schemas in `dispatch-core/src/v3/schema.ts` are the source of truth for runtime validation. The Markdown specifications (`build-doc-schema-spec.md`, this contract) are the human-readable documentation. When the runtime schema and the Markdown spec diverge, the runtime wins; the Markdown spec must be amended to match (`contract:` commit).

### §2.3 Schema versioning

The v3 schema versions independently from the v2 schema (`packages/dispatch-core/src/v2/schema.ts` frozen at `551c469`). Both schemas coexist; v3 does not modify v2 types.

Within v3, schema changes follow semver semantics:
- **Major** (v3 → v4): breaking changes to existing types
- **Minor** (v3.0 → v3.1): backward-compatible additions
- **Patch** (v3.0.0 → v3.0.1): clarifications without behavior change

For v3.0 ship: the v3 schema is `1.0`. The build-doc schema (separate version namespace per `build-doc-schema-spec.md`) is also `1.0`.

---

## §3 — Orchestrator authority

### §3.1 Role boundary

The orchestrator is a Claude Sonnet 4.6 model called via Anthropic API from the Workstation Electron main process. Its role is stateless routing and translation per ratified vision §7.1. It does not hold state across calls. It does not arbitrate ambiguity. It does not modify the build doc. It produces structured output of four types: action, card, multi-choice-card, escape-block.

The orchestrator's complete behavioral specification is the system prompt at `packages/dispatch-menubar/coarchitect/system-prompt.md` (operator-arbitrated; frozen as contract artifact per ratified P-0.4 Q6).

### §3.2 Approval model

Per ratified vision §7.3 + §7.4 + ratified P-0 leftover Q3:

- **Cards** have two pills (Approve, Decline) plus a free-form text field
- **Approve** fires the action with operator's free-form text merged into payload (per ratified §7.4 Item A)
- **Decline** dismisses the card; reason in free-form is REQUIRED (per ratified P-0 leftover Q3 — UI blocks click until text entered)
- **Multi-choice cards** have 2-4 dynamic option buttons; clicking an option routes back to orchestrator on next call
- **Escape-blocks** render in chat panel with `[Copy]` button

### §3.3 Action enumeration

The orchestrator can propose actions of these types in v3.0 (per ratified vision §7.5):

| Action | Target type | Payload | Side effect |
|---|---|---|---|
| `spawn-new-session` | repo path + session name | optional initial prompt | tmux session spawned, `claude` runs, daemon registers |
| `send` | session ID | prompt text | prompt delivered to session via existing `/v2/sessions/<id>/send` |
| `pull` | session ID | none | output retrieved from session |
| `kill` | session ID | none | session terminated |
| `pause` | session ID | none | session suspended |
| `hold` | session ID | none | session held pending operator action |
| `arm` | session ID | none | session armed for next state transition |
| `read-file` | absolute file path | none | file content read into orchestrator context |

Additional action types require `contract:` commit amending this section.

### §3.4 Authority chain

When an operator-approved orchestrator action produces a side effect that creates a git commit (specifically `draft-commit-message` in v3.x; not in v3.0 action set), the resulting commit's authority chain is per ratified P-0.3 Q6:

- **Author:** operator (from operator's git config)
- **Trailer:** `Co-drafted-by: Foxworks-Workstation-Orchestrator <orchestrator@workstation.local>`

The trailer is added by the action handler. Operator can manually remove it before committing if desired. The trailer has no authority weight in cairn primitive enforcement — commits with the trailer follow the same hooks, gates, and review as commits without.

### §3.5 Self-check discipline

Per ratified P-0.3 Q5: orchestrator-fired actions that produce git commits include the same 9-question self-check block per `CONDUCTOR_API_CONTRACT.md` §10.5. The orchestrator system prompt instructs Sonnet to generate a compliant self-check block when proposing commit messages. MB-S01 spike validates that Sonnet 4.6 reliably produces compliant self-check blocks.

---

## §4 — Build doc resolution

### §4.1 Source

Per ratified P-0.5 Q8.1.a: build docs live in git. Workstation reads HEAD of an operator-configured path. Operator commits new revisions; Workstation picks up the new content on next read.

### §4.2 Path configuration

Per ratified P-0.5 Q8.1.b + cross-followup Q1: operator configures a `(repo_root_abs_path, relative_path)` tuple via Workstation's settings UI. The settings UI uses a native file picker with git-repo auto-detection: operator picks a `.build.md` file, Workstation detects the enclosing git repo, surfaces the repo + relative path as the configured tuple.

Build docs can live in any git-tracked location (foxworks-dispatch monorepo, separate operator-configured repo, project-specific repos). Per Workstation session, exactly one build doc is loaded.

### §4.3 Read mechanism

Per ratified P-0.5 Q8.1.c: Workstation's Electron main process performs git reads directly. The daemon never sees the build doc. The orchestrator API call from Workstation injects build-doc content into the Sonnet context per ratified P-0.4 Q4 (TIERED context).

Workstation reads:
- File content at `<repo_root>/<relative_path>`
- Current commit SHA via `git -C <repo_root> rev-parse HEAD`

Both are included in every Sonnet API call's context.

### §4.4 Read-scope and project directories

Per ratified §0.6 override + cross-followup Q1: in addition to the loaded build doc, the orchestrator can `read-file` against operator-configured project directories. Configuration uses the EXPLICIT-ALLOW pattern: operator adds individual paths AND can mark sub-paths as excluded.

Workstation enforces the read-scope. Read attempts outside configured directories produce a `WorkstationError` of type `ReadScopeViolation`; orchestrator generates an escape-block.

### §4.5 Schema validation

Per ratified P-0.5 Q2 + cross-followup Q2: build docs validate against the v3 schema at load time and on git HEAD changes. Validation failures produce both:

1. UI error toast/banner: "Build doc at `<path>` failed schema validation: `<error>`"
2. Orchestrator escape-block describing what's broken

Both surface concurrently. Operator can fix via git commit (drives reload) OR via paste-to-Opus resolution.

### §4.6 Build-doc replacement

When operator commits a new revision, Workstation detects the HEAD change. Pending kanban cards from the prior build-doc revision become stale per ratified vision §7.6. Stale tickets transition to `superseded` state in the daemon ticket-state table per ratified P-0.5 Q8.3.

The orchestrator's behavior on mid-task build-doc replacement is implementation detail deferred to COARCH-T04 ticket review (per ratified P-0.5 §8 deferred items).

---

## §5 — Card UI surface

### §5.1 Spatial placement

Per ratified P-0 leftover Q1: the orchestrator chat panel lives in a horizontal bottom drawer below the kanban. Drawer expands upward when active; collapses to a thin bar.

### §5.2 Visual distinction

Per ratified P-0 leftover Q2: orchestrator cards have a distinct background color (subtle blue tint) versus standard CC-session cards (white). All other styling is identical to existing dispatch-web card patterns.

### §5.3 Card structure

Per ratified vision §7.3 + §7.4:

**Standard card:**
- Action proposal text
- Target identifier (session ID, file path, etc.)
- Two pills: `[Decline]` (red, left) and `[Approve]` (green, right)
- Free-form text field labeled "Add notes or modifications"
- For state-mutating actions: pill clicks gate on free-form non-empty for Decline (per ratified P-0 leftover Q3)

**Multi-choice card:**
- Question text
- 2-4 option buttons (dynamic count per ratified §7.11 Item C)
- Free-form text field for "none of the above" path

**Escape-block:**
- Surfaces in chat panel (NOT in kanban — escape-blocks are conversational outputs)
- `[Copy]` button copies the structured block
- Operator pastes to Opus surface for arbitration

### §5.4 Stale-card lineage

Per ratified vision §7.6 Item B (visual-on-card): when a card supersedes prior pending cards, the new card visually surfaces the rolled-up stale card IDs (e.g., "supersedes: <id>, <id>") rendered alongside the action proposal. Audit log additionally captures the lineage in the audit row's `superseded_card_ids` field.

### §5.5 Card column

Orchestrator-proposed cards live in the existing dispatch-web kanban columns (AWAITING REVIEW for new proposals; STALE for superseded; etc.) with the visual distinction per §5.2. No dedicated "PROPOSALS" column in v3.0. Operator can filter via existing filter dropdowns to "orchestrator proposals only" if needed.

---

## §6 — `/v3/*` endpoints

Per ratified P-0.3 Q3: v3 introduces new endpoint surfaces under `/v3/*` prefix. `/v2/*` endpoints remain frozen and untouched per `CONDUCTOR_API_CONTRACT.md`.

### §6.1 Orchestrator chat persistence

`POST /v3/orchestrator/messages` — append a chat message to history.

`GET /v3/orchestrator/history` — retrieve chat history (paginated; query params `limit`, `before_id`, `since_id`).

`DELETE /v3/orchestrator/history` — clear history (operator-initiated; surfaces in Workstation settings).

Bodies and responses validate against `OrchestratorMessageSchema` and `OrchestratorMessageRowSchema` in `dispatch-core/src/v3/schema.ts`.

### §6.2 Orchestrator audit log

`POST /v3/orchestrator/audit` — append an audit row (Workstation-internal; not operator-callable).

`GET /v3/orchestrator/audit` — query audit log (filterable by date range, build-doc, output type, response).

Per ratified vision §7.8: indefinite retention in v3.0; pruning policy deferred to v3.x.

### §6.3 Ticket state

`POST /v3/tickets/state` — Workstation writes ticket state transitions (Workstation-internal, called by action handlers).

`GET /v3/tickets/state` — query current ticket state for a build doc (operator-facing via kanban).

`GET /v3/tickets/state/:ticket_id` — query single ticket state.

Per ratified P-0.5 Q8.2: state lives in a daemon SQLite table `orchestrator_ticket_state` separate from audit log.

### §6.4 Endpoint cross-references

The orchestrator-fired actions (`send`, `kill`, `pause`, `hold`, `arm`, `pull`) route to existing `/v2/*` endpoints in `CONDUCTOR_API_CONTRACT.md`. v3 does not duplicate those endpoint definitions. See `CONDUCTOR_API_CONTRACT.md` §4 for `/v2/sessions/*` semantics.

### §6.5 Error response shape

Per ratified P-0.3 Q4: errors return a typed discriminated union. The `WorkstationErrorSchema` in `dispatch-core/src/v3/schema.ts` enumerates error variants. Each error type has its own shape; HTTP status codes align with REST conventions.

Example error response (schema validation failure):

```json
{
  "error_type": "SchemaValidationError",
  "schema": "BuildDocSchema",
  "field_path": "frontmatter.allowed_action_types",
  "issue": "Required field missing",
  "build_doc_commit_sha": "abc123..."
}
```

Action-handler errors propagate through the same shape with appropriate `error_type` discriminators.

---

## §7 — IPC contract

Per ratified P-0.3 Q3: IPC message types are part of the v3 Zod schema in `dispatch-core/src/v3/schema.ts` (§2.1). This section describes the contract surface; the schema is authoritative for shapes.

### §7.1 Direction

**Shell → Webview (`ShellToWebviewMessageSchema`):**
- `orchestrator-card-rendered` — new card to display
- `orchestrator-card-superseded` — mark prior cards stale with lineage
- `orchestrator-card-update` — card content changed (rare)
- `escape-block-surfaced` — escape-block to render in chat panel
- `daemon-state-update` — daemon state changes for kanban refresh
- `settings-changed` — operator changed settings affecting webview behavior

**Webview → Shell (`WebviewToShellMessageSchema`):**
- `card-approved` — operator clicked Approve with optional free-form modification
- `card-declined` — operator clicked Decline with required reason
- `multi-choice-selected` — operator clicked an option
- `escape-block-copied` — operator clicked Copy on an escape-block
- `kanban-filter-changed` — UI state change

### §7.2 Ordering and reliability

IPC messages are delivered in-order on the main process side. Webview-to-shell messages may arrive out-of-order if the operator clicks rapidly; shell handles based on event timestamp, not arrival order. Lost messages produce a Workstation-side `IPCDropError` surfaced as escape-block.

### §7.3 Schema enforcement

Both directions validate against the v3 schema at message-bus boundaries. Invalid messages are rejected with logged errors; the offending side does not retry.

---

## §8 — Persistence

### §8.1 Storage layer

Per ratified §0.7: chat history, audit log, and ticket state persist in the existing daemon SQLite database at `~/.foxworks-dispatch/data.db` (or the path configured per `CONDUCTOR_API_CONTRACT.md`). Three new tables added in v3.0:

- `orchestrator_messages` — chat history
- `orchestrator_audit` — audit log
- `orchestrator_ticket_state` — ticket state per ratified P-0.5 Q8.2

Schema migration is additive (new tables; no changes to existing v2 tables) and matches the precedent set by §7.3 v1-reads-v2 amendment at `a502c4c`.

### §8.2 Build-doc storage

Per §4.3: build docs are NOT persisted by the daemon. They live in operator-configured git repos. Workstation reads from disk; daemon never sees the content.

### §8.3 Configuration storage

Workstation app settings (configured project directories, build-doc path, Anthropic API key, chat panel layout state, concurrent-session-cap value) persist locally to the Electron app via `electron-store` or equivalent. NOT stored in daemon SQLite.

API key stored via Electron `safeStorage` for OS-keychain-backed encryption.

### §8.4 Cross-session consistency

Multiple Workstation instances against the same daemon are NOT supported in v3.0 (per project instructions §2.1 — single-operator MVP). The chat history and audit log endpoints assume single-writer; concurrent writes are last-write-wins.

---

## §9 — Process

Per ratified P-0.3 Q6 (REFERENCES ONLY): this section cites the methodology authorities without restating them.

### §9.1 Cairn methodology

`cairn.md` governs commit grammar, confidence labels, self-check blocks, anti-fabrication, frozen contracts, scope fences, halt discipline, and all other primitives that apply to humans authoring artifacts and Claude Code sessions executing tickets.

### §9.2 Cairn-Sonnet extensions

`docs/cairn-sonnet-extensions.md` governs the seven Sonnet-specific primitives that apply when the orchestrator is in the loop:

- `build-doc-scope-locked`
- `no-arbitration`
- `frozen-doc-respect`
- `stateless-call`
- `structured-output-discipline`
- `audit-row-completeness`
- `no-side-effect-without-card`

### §9.3 Build-doc schema

`build-doc-schema-spec.md` governs the structural contract for Workstation-consumable build documents. Schema version `1.0` for v3.0.

### §9.4 Self-check blocks

Per ratified P-0.3 Q5: orchestrator-fired actions producing git commits include 9-question self-check blocks per `CONDUCTOR_API_CONTRACT.md` §10.5.

### §9.5 Authority chain on orchestrator-drafted artifacts

Per ratified P-0.3 Q6: operator-as-author with `Co-drafted-by: Foxworks-Workstation-Orchestrator <orchestrator@workstation.local>` trailer.

### §9.6 Direct Sonnet ↔ Opus integration

Per ratified P-0.3 Q5 (MENTIONED AS V3.X DEFERRED): direct integration between the Sonnet orchestrator and Opus surfaces (Claude.ai project chat, Claude desktop) is NOT in v3.0 scope. Operator-mediated copy-block per ratified vision §7.7 is the v3.0 cross-surface mechanism. v3.x amendment to this contract may specify a direct integration protocol once dogfood evidence accumulates.

---

## §10 — Ratification summary

This contract was authored under P-0.3 multi-choice arbitration (2026-04-28):

- **Q1 (document shape):** Same as `CONDUCTOR_API_CONTRACT.md` — numbered sections, frozen status, formal contract feel
- **Q2 (schema authority):** Orchestrator types in `dispatch-core/src/v3/schema.ts` under §2-equivalent freeze
- **Q3 (API versioning):** New `/v3/*` endpoint prefix; `/v2/*` untouched
- **Q4 (freeze timing):** Commit at first authoring; future changes are operator-arbitrated amendments
- **Q5 (self-check discipline):** Same 9-question self-check pattern for orchestrator-fired commits
- **Q6 (authority chain):** Operator-as-author with `Co-drafted-by` trailer
- **cross-Q1 (section ordering):** Workstation-native — overview, schema, orchestrator authority, build-doc resolution, card UI, endpoints, IPC, persistence, process
- **cross-Q2 (endpoint enumeration):** Only new `/v3/*`; `/v2/*` remains in `CONDUCTOR_API_CONTRACT.md`
- **cross-Q3 (IPC location):** Embedded in §2 schema
- **cross-Q4 (error response):** Typed discriminated union
- **cross-Q5 (Sonnet ↔ Opus):** Mentioned as v3.x deferred
- **cross-Q6 (process section):** References only — cites `cairn.md` + `cairn-sonnet-extensions.md`

Pending operator authorship and commit. Once committed, the SHA becomes the freeze anchor for this contract per ratified P-0.3 Q4.
