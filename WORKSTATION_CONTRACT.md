# Foxworks Workstation Contract

**Status:** DRAFT under operator-explicit Path B scope-narrowing per P-0.3 multi-choice arbitration walkthrough (2026-04-28). Pending operator authorship and commit ("P-0.3 authored at <SHA>") to freeze as authority for v3.0 ticket execution.

**Authority:** Operator-arbitrated frozen artifact per ratified P-0.3 Q4. Frozen at first authoring (commit SHA becomes the freeze anchor like `CONDUCTOR_API_CONTRACT.md` at `3ddca60`). Future changes are `contract:` commits requiring operator arbitration.

**Relationship to other contracts:**

- `CONDUCTOR_API_CONTRACT.md` (frozen at `3ddca60`, amended at `a502c4c`, `c1bb7fe`, and `952f857`) — governs the daemon's `/v2/*` endpoint surface and remains authoritative for those endpoints. This contract does NOT duplicate `/v2/*` definitions; references by URL where needed.
- `BUILD_CONTRACT.md` — governs build/release process at the monorepo level; remains authoritative.
- `cairn.md` and `docs/cairn-sonnet-extensions.md` — govern methodology discipline; this contract references them in §9 (Process).

**Date:** 2026-04-28

---

## §1 — Overview

### §1.1 What Workstation is

Foxworks Workstation is a desktop Electron application that wraps Conductor v2's existing dispatch-web kanban UI and adds an embedded Claude Sonnet 4.6 orchestrator chat panel for managing multiple Claude Code sessions through a build cycle. It ships as `packages/dispatch-workstation/` (originally scaffolded as `dispatch-menubar`; renamed at MB-T01 chore commit `a32ece8`) within the foxworks-dispatch monorepo at version 3.0.0.

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

The orchestrator's complete behavioral specification is the system prompt at `packages/dispatch-workstation/coarchitect/system-prompt.md` (operator-arbitrated; frozen as contract artifact per ratified P-0.4 Q6).

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

### §6.6 Renderer ↔ main workstation IPC channels

Per operator-arbitrated amendment 2026-05-11 (under §3.4 operator-supervised mechanical translation framing per CLAUDE.md §3.4 + §2.4). This subsection enumerates the additive renderer-↔-main IPC channels exposed by the Electron main process (`ipcMain.handle`) to the renderer via `contextBridge.exposeInMainWorld` in `preload.mts`. Distinct from §7 (which governs `Shell ↔ Webview` v3-schema-bound messages); this subsection captures the renderer-↔-main control-plane IPC that the workstation Electron shell uses for file-read, dialog, policy, and per-session-action operations.

Existing channels in this category predate this contract subsection (`workstation:open-repo-dialog`, `:audit-modal-fetch`, `:approval-policy-get/put`, `:autopilot-get/put`, `:session-send-prompt`, `:session-kill`, `:spawn-requested`, `:spawn-result`, `:spawn-confirm-required/response`, `:tile-token-update`; plus `dispatch-mode:*`, `commits:*`, `frame-mode:*`, `shell:*`, `console:*`). Documenting these retroactively is OUT OF SCOPE for this amendment; queued as Tier 2 followup `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` per T3's coord note `docs/coordination/wave-c-3-channel-signatures-2026-05-11.md` §5.4 — operator-arbitrated filing target (FOLLOWUPS.md is T2-successor territory per parallel-cairn dispatch).

**This amendment adds FOUR channels** (additive only; no removal, no signature change to any other channel; co-authored across Wave B + Wave C #3 per Q-WB8-IPC + Q-WBT3-3-A=(β-consolidated) arbitrations 2026-05-11):

#### Channel #1 — `workstation:read-swarm-state` (Wave B, T4-successor)

| Field | Value |
|---|---|
| **Channel name** | `workstation:read-swarm-state` |
| **Direction** | renderer → main (invoke/handle) |
| **Payload** | none |
| **Response** | `Promise<string>` — raw UTF-8 file content of `docs/swarm-state.md` |
| **Bridge surface** | `window.workstationBridge.readSwarmState(): Promise<string>` |
| **Bridge style** | getter (no args) — extends EXISTING `workstationBridge` |
| **Path resolution** | `resolve(app.getAppPath(), '..', '..', 'docs/swarm-state.md')` — mirrors `SwarmStateWriter` init path (`main.ts:557`) |
| **ENOENT fallback** | empty string (HSO has not yet emitted any action → `SwarmStateWriter` has not yet created the file) — caller surfaces honest placeholder |
| **Other errors** | propagate as `ipcRenderer.invoke` rejection — renderer caller surfaces error text |
| **Consumer** | `src/frame-c/detail-pane.tsx` (Frame C DetailPane component) — parses returned text via `extractSwarmStateSection()` to surface the section for the currently-selected session |
| **Authoring ticket** | `MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE` WB8 GREEN |
| **Signature choice rationale** | `Promise<string>` rather than `Promise<SwarmState>` — no `SwarmState` Zod type exists in the type-graph (only `SwarmStateWriterConfig` at `swarm-state-writer.ts:70`, which is writer-config not parsed-content). Renderer-side parser (`extractSwarmStateSection`) operates on raw string. Narrower contract; defer typed shape to a future ticket if/when a parsed-content Zod schema lands. |

#### Channel #2 — `frame-c:diff` (Wave C #3, T3 via coord note `9fe6358`)

| Field | Value |
|---|---|
| **Channel name** | `frame-c:diff` |
| **Direction** | renderer → main (invoke/handle) |
| **Payload** | `{ sessionName: string }` |
| **Response** | `Promise<DiffResult>` (discriminated union — see Result Types appendix below) |
| **Bridge surface** | `window.frameCBridge.diff(sessionName: string): Promise<DiffResult>` |
| **Bridge style** | action (takes session name) — NEW `frameCBridge` `contextBridge.exposeInMainWorld` binding (per Sub-Q-MBTWBDPFA-D=(α) per-IPC-family convention) |
| **Argv** | `['diff', \`main...${branchName}\`]` (triple-dot symmetric difference against merge base) |
| **Cwd** | session's cwd (from `lookupSession(sessionName).cwd`) |
| **Exec** | `child_process.spawn('git', argv, { cwd })` — collect stdout (diff text) + stderr; await exit code |
| **Success** | exit code 0 → `{ ok: true, diffText: <stdout> }` |
| **Failure modes** | `SessionNotFound` (lookup returns null); `NotARepository` (stderr matches); `BranchNotFound` (stderr matches "unknown revision"); `GitInvocationFailed` (other non-zero OR spawn-system error) |
| **Output handling note** | Diff text may be large (thousands of lines). Renderer-side display (inline OR external `git difftool`) is renderer concern. Future Tier 3 followup `MB-F-FRAME-C-DIFF-MERGE-ENV-FALLBACK` per Wave C #3 body §5.2. |
| **Consumer** | `src/frame-c/action-bar.tsx` callback (ActionBar component, Wave C #3 territory) |
| **Authoring ticket** | `MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS` (body `32c7eee`) Sub-Q-B-diff=(i) |

#### Channel #3 — `frame-c:merge` (Wave C #3, T3 via coord note `9fe6358`)

| Field | Value |
|---|---|
| **Channel name** | `frame-c:merge` |
| **Direction** | renderer → main (invoke/handle) |
| **Payload** | `{ sessionName: string }` |
| **Response** | `Promise<MergeResult>` (discriminated union — see Result Types appendix below) |
| **Bridge surface** | `window.frameCBridge.merge(sessionName: string): Promise<MergeResult>` |
| **Bridge style** | action (takes session name) — NEW `frameCBridge` |
| **Argv** | `['merge', '--no-commit', '--no-ff', branchName]` |
| **Cwd** | session's cwd |
| **Exec** | `child_process.spawn('git', argv, { cwd })` — collect stdout + stderr; await exit code |
| **Success (staged-not-committed)** | exit code 0 → `{ ok: true, state: 'staged', message: 'Merge staged successfully; no commit made. Operator must commit or abort manually.' }`. Staged-not-committed posture is the safety stop (Sub-Q-B-merge=(i)). This ticket does NOT provide a confirm-commit UI; operator commits or aborts via terminal. |
| **Failure modes** | `SessionNotFound`; `MergeConflict` (with `conflictFiles: readonly string[]` parsed from stderr/stdout `CONFLICT (content): Merge conflict in <path>` lines — working tree left in conflict state for manual resolution OR `git merge --abort`); `NotARepository`; `NothingToMerge` (stderr "Already up to date" or "merge requires a single non-option"); `DirtyWorkingTree` (stderr "Your local changes"); `GitInvocationFailed` (other) |
| **Conflict file parsing** | parse `stderr`/`stdout` for `CONFLICT (content): Merge conflict in <path>` lines; return matched paths in `conflictFiles: readonly string[]`. ActionBar inline-banner UX renders the list. |
| **Consumer** | `src/frame-c/action-bar.tsx` callback |
| **Authoring ticket** | `MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS` Sub-Q-B-merge=(i) |

#### Channel #4 — `frame-c:focus` (Wave C #3, T3 via coord note `9fe6358`)

| Field | Value |
|---|---|
| **Channel name** | `frame-c:focus` |
| **Direction** | renderer → main (invoke/handle) |
| **Payload** | `{ sessionName: string }` |
| **Response** | `Promise<FocusResult>` (discriminated union — see Result Types appendix below) |
| **Bridge surface** | `window.frameCBridge.focus(sessionName: string): Promise<FocusResult>` |
| **Bridge style** | action (takes session name) — NEW `frameCBridge` |
| **Action** | Two-step: (1) `writeFrameMode('A')` — persist FrameMode to `frame-mode-state.json` (`44764fd` Frame Router contract); (2) emit `frame-c:scroll-to-session` event to renderer via `mainWindow.webContents.send(...)` for tile-grid to scroll/highlight the named session's tile in Frame A. |
| **Success** | both steps complete → `{ ok: true, message: 'Focused to compact-tile mode; tile scrolled/highlighted.' }` |
| **Failure modes** | `SessionNotFound` (lookup null — FrameMode NOT toggled to avoid operator-visible mode-flip with no effect); `FrameModeWriteFailed` (writeFrameMode throws — defer surfacing per `writeFrameMode` swallowing errors silently at `frame-mode-state.ts:26-33`; Tier 3 followup `MB-F-FRAME-C-FOCUS-FRAMEMODE-WRITE-FAILURE-DETECTION` for post-dogfood ratcheting). `emitScroll` failure: out-of-scope (no-op if `mainWindow.webContents` null/destroyed). |
| **Production-wiring dependency** | End-to-end Frame A render-coherence requires `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` (Tier 2, FOLLOWUPS.md `6217ea0`) closure. Pre-closure: `writeFrameMode('A')` persists but `tile-grid-app.tsx` does not subscribe → `tile.tsx`'s `frameMode` prop stays undefined → full chrome renders. Focus action ships its component contract regardless; full operator effect arrives post-closure. Renderer-side scroll/highlight consumption of `frame-c:scroll-to-session`: future ticket territory. |
| **Consumer** | `src/frame-c/action-bar.tsx` callback |
| **Authoring ticket** | `MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS` Sub-Q-B-focus=(i) |

#### Channel #5 — `workstation:read-build-md` (T5, MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH)

| Field | Value |
|---|---|
| **Channel name** | `workstation:read-build-md` |
| **Direction** | renderer → main (invoke/handle) |
| **Payload** | `{ path?: string }` (optional; absent → main resolves default per Sub-Q-MBTWFT5-A=(i)) |
| **Response** | `Promise<BuildMdLoadResult>` (discriminated union — see Result Types appendix below) |
| **Bridge surface** | `window.workstationBridge.readBuildMd(opts?): Promise<BuildMdLoadResult>` |
| **Bridge style** | getter-with-optional-payload — extends EXISTING `workstationBridge` (matches Channel #1 `readSwarmState` precedent; same `workstation:*` prefix) |
| **Path resolution** | `resolve(app.getAppPath(), '..', '..', 'BUILD.md')` per Sub-Q-MBTWFT5-A=(i) operator arbitration 2026-05-12 — mirrors SwarmStateWriter init path pattern at `main.ts:557` |
| **Read mechanism** | `fs.promises.stat` → `isFile()` → `fs.promises.readFile(path, 'utf8')` → `parseBuildDoc(text)` (MB-T28 library; frozen at `7ce34b4`) → `{path, dag, status: {taskCount, blockedCount, readyCount, errorCount}}` |
| **Failure modes** | `NotFound` (ENOENT on stat); `NotAFile` (stat succeeds but path is not a regular file); `IoError` (other stat/read err OR payload validation err); `ParseError` (parser returns ok=false; carries `parseErrors: ParseError[]` from MB-T28) |
| **Success shape** | `{ ok: true, path, revSha?, dag, status }` — `revSha` optional best-effort git HEAD sha; omitted if not in git or git unavailable |
| **Consumer** | `src/build-md/dispatch-loop.ts` (main-process dispatch loop, WB8) + `src/frame-c/build-md-status-line.tsx` (renderer status-line component, WB6) |
| **Authoring ticket** | `MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH` WB4 GREEN |
| **Signature choice rationale** | `Promise<BuildMdLoadResult>` rather than `Promise<TaskDAG>` — discriminated-union surfaces NotFound + ParseError honestly to renderer; matches Wave C #3 Result-type pattern (`DiffResult`, `MergeResult`, `FocusResult`). Renderer can render empty-state placeholder ("No BUILD.md at <path>") or parse-error breakdown without crashing. |

#### Channel #6 — `workstation:build-md-dispatch-trigger` (T5, MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH)

| Field | Value |
|---|---|
| **Channel name** | `workstation:build-md-dispatch-trigger` |
| **Direction** | renderer → main (invoke/handle) |
| **Payload** | none |
| **Response** | `Promise<BuildMdDispatchTriggerResult>` (discriminated union — see Result Types appendix below) |
| **Bridge surface** | `window.workstationBridge.triggerBuildMdDispatch(): Promise<BuildMdDispatchTriggerResult>` |
| **Bridge style** | action (no payload) — extends EXISTING `workstationBridge` (co-tenant with Channel #1 `readSwarmState` + Channel #5 `readBuildMd`) |
| **Action** | (1) `loadBuildMd(defaultBuildMdPath())` — fresh re-parse each invocation per Sub-Q-MBTWFT5-A=(i) repo-root default. (2) If load failed: return error result; no dispatch. (3) Construct `DispatchLoop` with `{getDag, getCompletedTaskIds, maxParallel, fireSpawn}` deps. (4) `tick()` once → fires up to `maxParallel` ready tasks via `fireSpawn` per Sub-Q-MBTWFT5-C=(i) orchestrator-fire-spawn DI. (5) Return tick result. |
| **Failure modes** | `NotFound` (BUILD.md not at default path); `NotAFile`; `IoError`; `ParseError` (parser ok=false; carries `parseErrors: ParseError[]` indirectly through prior `workstation:read-build-md` invocation — trigger handler returns `{error_type: 'ParseError', message}` without parseErrors[] for compactness) |
| **Success shape** | `{ ok: true, spawned: number, declined: number, queued: number, done: boolean, idle: boolean }` — mirrors `DispatchLoopTickResult` shape with `ok: true` discriminator. `done=true` when all DAG tasks completed; `idle=true` when `maxParallel===0` |
| **Consumer** | `src/frame-c/build-md-status-line.tsx` (button onClick → bridge call → tick result for UI feedback) |
| **Authoring ticket** | `MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH` WB10 GREEN |
| **Signature choice rationale** | No payload — trigger is intentionally parameter-free per Sub-Q-MBTWFT5-B=(ii) operator-click semantics (button click → trigger → result). Future variants (auto-on-load per Sub-Q-B=(i); fs-watch per Sub-Q-B=(iii)) compose by main-process internally invoking the same controller method without renderer involvement. Stub deps posture per WB10 commit body: `getCompletedTaskIds` returns empty, `getMaxParallel` returns 4, `fireSpawn` returns `{declined: true}` — production wiring deferred to follow-on tickets (MB-F-T5-COMPLETED-TASK-IDS-PRODUCTION-WIRING + MB-F-T5-FIRESPAWN-ORCHESTRATOR-FIRE-SPAWN-WIRING + MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY). |


#### Channel #7 — `coarchitect:bypass-perms-update` (Wave R12-CLOSURE-Wave-2, MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-17)

| Field | Value |
|---|---|
| **Channel name** | `coarchitect:bypass-perms-update` |
| **Direction** | main → renderer (broadcast via webContents.send to all subscribed renderer windows) |
| **Payload (main→renderer)** | `{ sessionName: string, bypassPerms: boolean, prevBypassPerms: boolean }` |
| **Receiver shape** | Renderer subscribes via `coarchitectBridge.onBypassPermsUpdate(callback)` returning unsubscribe function |
| **Bridge surface** | `window.coarchitectBridge.onBypassPermsUpdate(callback: (payload: BypassPermsUpdatePayload) => void): () => void` |
| **Bridge style** | subscription (callback-based; returns unsubscribe) — flat-method convention per `preload.mts:14` |
| **Action** | (1) Main's `BypassPermsSource` aggregator detects state change via internal `onUpdate` callback chain. (2) Main fans out via `webContents.send('coarchitect:bypass-perms-update', { sessionName, bypassPerms, prevBypassPerms })` to all subscribed renderer windows. (3) Each renderer's registered callbacks fire. (4) Renderer consumers (e.g. `bypass-perms-indicator.tsx`) react to state change. |
| **Failure modes** | N/A for broadcast direction — main is producer, renderer is consumer. No round-trip rejection. If `webContents.send` fails (closed window), main logs warning and continues (non-fatal per Electron IPC semantics). |
| **Consumer** | `bypass-perms-indicator.tsx` (renderer; reads aggregated count via existing channel + subscribes via this new channel for state-change reactions). New consumer pattern: subscribe-and-react instead of read-on-demand. |
| **Authoring ticket** | Paired with implementation ticket spinning out FOLLOWUPS:369 (`MB-T-PHASE-4-BOTTOM-RAIL-PROD-WIRING-FOLLOWUP`); this contract amendment is WB1 RED contract-author step. |
| **Signature choice rationale** | Broadcast direction matches FOLLOWUPS:369 IPC fan-out prescription. Subscription pattern (`onX(callback)`) is renderer-side idiomatic for Electron IPC subscriptions; no precedent in §6.1-6.5 (all invoke-based) so this establishes new pattern for broadcast channels. Future broadcast channels should follow `onX(callback): unsubscribe` shape. |


#### Channel #8 — `orchestrator-state:get-snapshot` (MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING, Ticket B)

| Field | Value |
|---|---|
| **Channel name** | `orchestrator-state:get-snapshot` |
| **Direction** | renderer → main (invoke/handle) |
| **Payload** | none |
| **Response** | `Promise<OrchestratorStateSnapshot>` — see §6.6 OrchestratorStateSnapshot type below |
| **Bridge surface** | `window.orchestratorStateBridge.getSnapshot(): Promise<OrchestratorStateSnapshot>` |
| **Bridge style** | getter (no args) — NEW `orchestratorStateBridge` `contextBridge.exposeInMainWorld` binding (per per-IPC-family-prefix convention matching `frameCBridge` precedent at Channels #2-#4) |
| **Consumer** | All three EXPANSION-2 mount entries (Topbar / OrchestratorStrip / ConductorChat) call this at auto-mount time for initial render before subscribing to live updates via Channel #9. Mirrors `coarchitect:getRateLimitState` precedent (`coarchitect-ipc.ts:129-131`). |
| **Lifecycle** | Request-response; main reads aggregator's cached `latestSnapshot` field. Returns last-known snapshot OR a `polledAt: null` sentinel when no poll has fired yet (renderer surfaces honest "—" placeholders during boot). |
| **Failure modes** | N/A in v3.0 — main is producer; cached snapshot always exists post-construction (initial seed at aggregator init time with `polledAt: null` + empty `sessions`/`messages` + `attached: null` + `paused` read from pause-state-store + `daemonReachable: false`). |
| **Authoring ticket** | `MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING` WB1 RED (this amendment) |
| **Signature choice rationale** | `Promise<OrchestratorStateSnapshot>` getter-style mirrors Channel #1 `workstationBridge.readSwarmState` precedent (no-args getter returning typed shape). NEW top-level `orchestratorStateBridge` binding rather than extending `workstationBridge` because the snapshot is a cross-surface aggregate (Topbar + OrchestratorStrip + ConductorChat all consume), not a workstation-internal file-read; per-IPC-family-prefix convention (`frameCBridge` precedent) keeps the namespace cohesive. |

#### Channel #9 — `orchestrator-state:update` (MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING, Ticket B)

| Field | Value |
|---|---|
| **Channel name** | `orchestrator-state:update` |
| **Direction** | main → renderer (broadcast via `webContents.send` to all subscribed renderer windows) |
| **Payload (main→renderer)** | `OrchestratorStateSnapshot` — see type definition below |
| **Receiver shape** | Renderer subscribes via `orchestratorStateBridge.onUpdate(callback)` returning unsubscribe function |
| **Bridge surface** | `window.orchestratorStateBridge.onUpdate(callback: (snapshot: OrchestratorStateSnapshot) => void): () => void` |
| **Bridge style** | subscription (callback-based; returns unsubscribe) — flat-method convention per `preload.mts:14`; matches Channel #7 `coarchitect:bypass-perms-update` broadcast precedent (`onX(callback): unsubscribe`) |
| **Action (main side)** | (1) `OrchestratorStateAggregator` polls daemon `GET /v2/sessions` on a 3000ms cadence with backoff to 12000ms on failure — mirrors `session-status-source-poll.ts` BACKOFF_CAP_MS=12000 pattern. (2) On each poll-success, aggregator derives the snapshot from sessions array + injected build-md attach state + pause-state-store + narration-store + daemon-reachability outcome. (3) Aggregator increments `snapshot.seq` (monotonic counter); dedup via `seq` comparison against `latestSnapshot.seq` (only emits when changed). (4) Aggregator fans out via `webContents.send('orchestrator-state:update', snapshot)` to all subscribed renderer windows. (5) Each renderer's registered callbacks fire. |
| **Failure modes** | N/A for broadcast direction — main is producer. If `webContents.send` fails (closed window), main logs warning and continues (non-fatal per Electron IPC semantics; matches Channel #7 disposition). Daemon-poll failures are encoded INSIDE the snapshot as `daemonReachable: false` rather than as channel-level rejection. |
| **Consumer** | All three EXPANSION-2 mount entries (Topbar / OrchestratorStrip / ConductorChat) subscribe at auto-mount time after the initial `getSnapshot()` call. Each renderer's mount.ts maps `OrchestratorStateSnapshot` to its component-specific prop shape (Topbar.paneCount/runningCount/queue/done/etc.; OrchestratorStrip.sessions[]/counts; ConductorChat.messages/queue/total/running/paused). |
| **Authoring ticket** | `MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING` WB1 RED (this amendment) |
| **Signature choice rationale** | Broadcast direction matches Channel #7 `coarchitect:bypass-perms-update` precedent for renderer↔main subscription patterns. Single snapshot-shape broadcast (rather than per-field channels) eliminates triple-polling (three surfaces otherwise polling `GET /v2/sessions` independently) and keeps cross-surface counts in lock-step. The aggregator dedup via `snapshot.seq` prevents thread-flicker in ConductorChat's `messages` array regenerating on every tick (R-B3 risk register entry). |

##### OrchestratorStateSnapshot type (workstation-local TypeScript interface)

Per Q4 operator arbitration (`MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING` §0 pre-authorization 2026-05-18): `OrchestratorStateSnapshot` is authored as a workstation-local TypeScript interface in `packages/dispatch-workstation/src/main/orchestrator-state-types.ts` (WB2 RED) — NOT a Zod schema in `dispatch-core/src/v3/schema.ts §14`. Rationale: the snapshot is workstation-internal; daemon does not know about it; CLI does not consume it. Matches `BuildMdLoadResult` precedent at Channel #5 (also workstation-only, also IPC-payload, also lives in workstation src tree at `src/build-md/types.ts`).

```typescript
// packages/dispatch-workstation/src/main/orchestrator-state-types.ts (WB2 RED, MB-T-MVP-W4)

export interface OrchestratorSessionLite {
  readonly name: string;
  readonly state?: 'armed' | 'paused' | 'held' | 'killed';
  readonly computed_status?: 'idle' | 'running' | 'awaiting_review' | 'stale';
}

export interface OrchestratorMessage {
  readonly role: 'user' | 'assistant' | 'dispatch' | 'system' | 'typing';
  readonly text?: string;
  /** typing-variant only: number of agents currently producing tokens. */
  readonly running?: number;
  readonly id?: string;
}

export interface AttachedBuildMdState {
  readonly name: string;      // file basename for chip rendering
  readonly path: string;      // absolute path (resolved at attach time)
  readonly steps: number;     // task count from DAG
  readonly queue: number;     // ready-set size
  readonly done: number;      // completed-task-set size
  readonly running: number;   // in-flight dispatch count
  readonly errored: number;   // errorCount from BuildMdStatus
}

export interface OrchestratorStateSnapshot {
  /** Monotonic counter; renderer may ignore out-of-order broadcasts. */
  readonly seq: number;
  /** Wall-clock ISO of last successful poll; null until first poll completes. */
  readonly polledAt: string | null;
  /** Live daemon-sessions snapshot per latest GET /v2/sessions. */
  readonly sessions: ReadonlyArray<OrchestratorSessionLite>;
  /** Build-md attach state OR null when nothing attached. */
  readonly attached: AttachedBuildMdState | null;
  /** Orchestrator narration log (Q1=(c) persisted append-only JSON). */
  readonly messages: ReadonlyArray<OrchestratorMessage>;
  /** Pause/resume gate (Q2=(a) workstation-side OrchestratorPauseStateStore). */
  readonly paused: boolean;
  /** Daemon-reachability — false when last poll rejected (drives Topbar error banner). */
  readonly daemonReachable: boolean;
}
```

**Derived fields (computed inside each renderer surface, not on the wire):**

- `Topbar.paneCount = sessions.length`
- `Topbar.runningCount = sessions.filter(s => s.computed_status === 'running').length`
- `Topbar.queue = attached?.queue ?? 0`
- `Topbar.done = attached?.done ?? 0`
- `Topbar.buildMdAttached = attached !== null`
- `OrchestratorStrip.sessions = sessions` (mapped to `SlotSession` shape — caller-side mapping)
- `OrchestratorStrip.runningCount/queuedCount/done/erroredCount` — derived from sessions + attached
- `OrchestratorStrip.ratePerMin / etaSeconds` — derived in-renderer via `computeThroughputAndEta` against a rolling history accumulated from `snapshot.attached.done`
- `ConductorChat.queue = attached?.queue ?? 0`
- `ConductorChat.total = attached?.steps ?? 0`
- `ConductorChat.running = sessions.filter(s => s.computed_status === 'running').length`

**Why derivation is renderer-side rather than wire-side:** the snapshot is a minimal serializable payload; each renderer maps it to its component-specific prop shape. This matches the Tile-grid pattern at `tile-grid/mount.ts` (StatusListClient → tile-grid-app.tsx prop derivation) and avoids snapshot-shape churn when one surface adds a derived field.

**Action channels OUT OF SCOPE for this amendment:** ConductorChat exposes six bridge action callbacks (`send`, `attach`, `detach`, `dispatchNext`, `togglePause`, `cancel`). These write-side channels are DEFERRED to Ticket C (`MB-T-CONDUCTOR-CHAT-ACTION-WIRING-PENDING` — to be filed at this ticket's WB-final as Tier-1 forward-pointer). This amendment authors read-side state surface ONLY (Channels #8 + #9 above). Ticket B's mount-entry wiring keeps action callbacks as stub no-ops; Ticket C lands the action-channel family (`conductor-chat:send`, `:attach`, `:detach`, `:dispatch-next`, `:toggle-pause`, `:cancel`) via subsequent §6.6 amendment.

#### Result-type discriminated unions (Wave C #3 contract per coord note §4)

Inline-banner UX (Sub-Q-MBTWBDPFA-C=(α)): when host (Frame C detail-pane) catches a non-`ok` result from any `frameCBridge.*` call, it passes the result down to `ActionBar` via `failureState` prop. `ActionBar` renders a `<div role="alert" data-testid="action-bar-failure-banner">` element with `error_type` + `message` + Dismiss button. Auto-dismiss on next successful action (persistent-on-error semantics).

```typescript
// packages/dispatch-workstation/src/main/frame-c-ipc.ts (Wave C #3 WB exported types)

export interface FrameCActionSuccess {
  readonly ok: true;
}

export interface FrameCActionError {
  readonly ok: false;
  readonly error_type: string;
  readonly message: string;
}

// ── diff ──────────────────────────────────────────────────────────────
export type DiffResult =
  | (FrameCActionSuccess & { readonly diffText: string })
  | (FrameCActionError & {
      readonly error_type:
        | 'SessionNotFound'
        | 'NotARepository'
        | 'BranchNotFound'
        | 'GitInvocationFailed';
    });

// ── merge ─────────────────────────────────────────────────────────────
export type MergeResult =
  | (FrameCActionSuccess & {
      readonly state: 'staged';
      readonly message: string;
    })
  | (FrameCActionError & {
      readonly error_type:
        | 'SessionNotFound'
        | 'MergeConflict'
        | 'NotARepository'
        | 'NothingToMerge'
        | 'DirtyWorkingTree'
        | 'GitInvocationFailed';
      /** Present only when `error_type === 'MergeConflict'`. */
      readonly conflictFiles?: readonly string[];
    });

// ── focus ─────────────────────────────────────────────────────────────
export type FocusResult =
  | (FrameCActionSuccess & { readonly message: string })
  | (FrameCActionError & {
      readonly error_type: 'SessionNotFound' | 'FrameModeWriteFailed';
    });
```

```typescript
// packages/dispatch-workstation/src/build-md/types.ts (T5 WB4 exported types)
// MB-T28 ParseError + TaskDAG types re-exported via dispatch-core (frozen at `7ce34b4`).

export interface BuildMdStatus {
  readonly taskCount: number;
  readonly blockedCount: number;
  readonly readyCount: number;
  readonly errorCount: number;
}

export interface BuildMdLoadSuccess {
  readonly ok: true;
  readonly path: string;
  readonly revSha?: string;
  readonly dag: TaskDAG;  // MB-T28 parser output
  readonly status: BuildMdStatus;
}

export interface BuildMdLoadError {
  readonly ok: false;
  readonly error_type: 'NotFound' | 'NotAFile' | 'IoError' | 'ParseError';
  readonly message: string;
  readonly parseErrors?: readonly ParseError[];  // MB-T28 ParseError; present only when error_type === 'ParseError'
}

export type BuildMdLoadResult = BuildMdLoadSuccess | BuildMdLoadError;
```

```typescript
// packages/dispatch-workstation/src/main/build-md-dispatch-trigger-ipc.ts (T5 WB10 exported types)

export interface BuildMdDispatchTriggerSuccess {
  readonly ok: true;
  readonly spawned: number;
  readonly declined: number;
  readonly queued: number;
  readonly done: boolean;
  readonly idle: boolean;
}

export interface BuildMdDispatchTriggerError {
  readonly ok: false;
  readonly error_type: 'NotFound' | 'NotAFile' | 'IoError' | 'ParseError';
  readonly message: string;
}

export type BuildMdDispatchTriggerResult =
  | BuildMdDispatchTriggerSuccess
  | BuildMdDispatchTriggerError;
```

#### Bridge naming + style notes (consolidation observations)

- **Channel naming:** `workstation:read-swarm-state` uses the existing `workstation:*` prefix (matching `workstation:open-repo-dialog` et al). `frame-c:*` uses the per-IPC-family-prefix pattern (matching `dispatch-mode:*`, `commits:*`, `approval-policy:*`, `frame-mode:*`). Both are §6-compliant per existing precedent; this amendment preserves both prefixes verbatim per operator arbitration (Q-WB8-IPC-A=(i) for Wave B; Sub-Q-MBTWBDPFA-D=(α) for Wave C #3).
- **Bridge style coexistence:** `workstationBridge.readSwarmState` is getter-style (no args; returns content) extending the EXISTING `workstationBridge` `exposeInMainWorld` binding. `frameCBridge.{diff,merge,focus}` are action-style (take `sessionName`; return discriminated-union result) on a NEW `frameCBridge` binding. Both shapes are §6-compliant (consistent with MB-T22 commits `listCommits()` getter-style vs MB-T24 dispatch-mode `setDispatchMode(payload)` action-style).
- **Bridge-coexistence serialization** (per coord note §1 final paragraph): T4-successor's `workstationBridge.readSwarmState` and T3's `frameCBridge.{diff,merge,focus}` are ADDITIVE to separate top-level world bindings. No shared symbol; no `contextBridge.exposeInMainWorld` collision. T4-successor's `preload.mts` edit lands first (with consolidated §6 amendment commit + Wave B WB8 GREEN); T3's WB-equivalent GREEN edit adds the `frameCBridge` block as a separate `exposeInMainWorld` call.

#### Cross-references

This consolidated amendment integrates three source documents:
- **Wave B source:** `2bc5cda` WB7 RED commit body (IPC research finding) — established that no existing fs-read IPC channel exists in renderer↔main surface, motivating `workstation:read-swarm-state` introduction.
- **Wave C #3 source:** `docs/coordination/wave-c-3-channel-signatures-2026-05-11.md` (commit `9fe6358`) — T3-authored canonical signature inventory for `frame-c:{diff,merge,focus}` channels with action semantics + result-type discriminated unions.
- **Wave C #3 ticket body:** `MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS` body at commit `32c7eee`.

**Frozen-surface authority:** operator-arbitrated per CLAUDE.md §2.4. CC-authored implementation under §3.4 mechanical translation across two cross-coordinated sessions: T4-successor (`commit-plan-doc-1334`, Wave B) drafts Channel #1; T3 (`c5-ticket-wb1`, Wave C #3) contributes Channels #2-#4 verbatim via coord note `9fe6358`. Single consolidated `contract(GATE-W3-§6-consolidated): ...` commit per operator-arbitrated commit-grammar 2026-05-11 (Q-WB8-IPC + Q-WBT3-3-A=(β-consolidated) arbitrations).

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

**Amended 2026-04-29 per MB-S03 spike halt evidence.** The pre-amendment text claimed v3 persistence reused "the existing daemon SQLite database" and cited `a502c4c` as the migration precedent. Both claims were structurally false: the daemon has no SQLite database (persistence is the JSON file `~/.foxworks-dispatch/sessions.json` plus archive directories), and `a502c4c` is a Zod schema amendment to the JSON file, not a SQL DDL migration. MB-S03's halt surfaced this contradiction before any spike work proceeded. See cairn finding #55 for the methodology lesson.

**v3.0 persistence layer (corrected):**

Per ratified §0.7, chat history, audit log, and ticket state persist in a daemon-owned SQLite database at `~/.foxworks-dispatch/data.db`. The database does NOT exist as of v2.0.1; v3.0 introduces it as part of the daemon's persistence layer. Three new tables ship in v3.0:

- `orchestrator_messages` — chat history
- `orchestrator_audit` — audit log
- `orchestrator_ticket_state` — ticket state per ratified P-0.5 Q8.2

**Driver:** `better-sqlite3` (synchronous Node SQLite, the de facto standard). Operator-arbitrated 2026-04-29. Daemon opens the database on startup with WAL journal mode; closes on shutdown via existing lifecycle/shutdown.ts hooks.

**Init responsibility:** COARCH-T01 (production daemon work) implements:
1. Driver wired into `packages/dispatch-daemon` (operator commits the dependency separately as `chore:` infrastructure setup)
2. Database open + WAL pragma at startup
3. Migration runner that creates the three tables on first daemon start where `data.db` is absent
4. Single Database instance exposed via dependency-injection pattern matching existing daemon style
5. Database close on shutdown

**Migration model:** Additive only. Each new table is created via `CREATE TABLE IF NOT EXISTS`. v3.0's data.db is created from empty; no v2-to-v3 data migration exists because no v2 SQLite data exists. The daemon's existing JSON-file persistence (sessions.json) remains the source of truth for v2 session state and is unchanged.

**Coexistence with sessions.json:** The daemon retains JSON-file persistence for `sessions.json` (registry of active CC sessions). The new SQLite database is for v3.0 orchestrator-and-ticket state only. The two persistence layers are independent; no synchronization is required.


**Amended 2026-04-29 per MB-T05 sub-task 1 evidence + Path B operator arbitration.** The pre-amendment vision §8.1 wording for the spawn parity capability bar — "every env var, every PTY behavior matches" — was demonstrated unreachable by MB-S02 spike evidence at `docs/adr/MB-S02-tmux-spawn-fidelity.md`: env vars diverge in every measured spawn context, including the realistic shipped-`.app`-from-Finder context (B2 launchd-minimal mode, 20 divergences with PATH-resolution-breaking gaps for `claude` and `tmux`). PTY parity DOES hold (byte-identical in spike) and registration parity DOES hold (structurally identical in spike). Only env handling required a ratification decision.

Per Path B operator arbitration (2026-04-29, parallel cairn round 2), the spawn capability bar is amended to:

The Workstation spawn handler (MB-T05) MUST construct the env passed to `tmux new-session` from a documented closed allowlist at `docs/adr/MB-T05-env-allowlist-amendment.md`. The spawn handler MUST NOT inherit `process.env` indiscriminately. The allowlist comprises: PATH (constructed with /opt/homebrew/bin and /usr/local/bin prepended ahead of system paths), HOME, USER, LOGNAME, SHELL, LANG, LC_ALL (passthrough if set), TERM (= xterm-256color), TMPDIR, and ANTHROPIC_API_KEY (injected from Electron safeStorage per §8.3).

The capability bar for §8.1 "spawn-from-UI bit-identical" is hereby replaced with the three-clause bar:

(a) Tmux session spawned by Workstation registers a session structurally identical at the registration layer (KNOWN per MB-S02 ADR §5);
(b) Tmux session spawned by Workstation has PTY behavior identical to CLI-spawned (KNOWN per MB-S02 ADR §4);
(c) Tmux session spawned by Workstation has env compatible within the documented allowlist (MODELED-with-allowlist per MB-S02 ADR + this amendment; refines to KNOWN per-var as dogfood evidence accumulates per allowlist ADR §6).

Bit-identical env-var parity is NOT a v3.0 ship requirement. Allowlist scope IS. Vars outside the allowlist do not propagate to spawned sessions; behavioral differences relative to CLI-spawned sessions for operators relying on excluded vars are documented divergence per Path B, not bug.

Refinement of the allowlist follows the process at allowlist ADR §6; each addition is operator-arbitrated and lands via paired docs: + feat: commits.


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
