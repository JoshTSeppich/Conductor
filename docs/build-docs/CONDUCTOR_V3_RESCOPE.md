# Conductor v3.0 Re-scope — Source of Truth (DRAFT, awaiting operator ratification)

**Status:** DRAFT v0.1 — operator-arbitrated content, drafted by relay 2026-05-04 from operator dogfood-test-discovered vision.

**Supersedes:** none yet — this document, when ratified, REPLACES vision §10 (operator workstation surface) AND extends WORKSTATION_CONTRACT.md §5/§6/§7 with new surfaces. Existing v3.0 ticket scope (MB-T01–T08, COARCH-T01–T04, CONSOLE-T01–T03) is PRESERVED as foundational layer; this re-scope ADDS to it.

**Ratification gate:** operator must mark §10 RATIFIED, then this doc anchors V3_TICKETS.md additions (MB-T09–T13).

**Methodology origin:** Filed from cairn finding `MB-F-V3-RESCOPE-AUTONOMY-LOOP` (Tier-0 strategic, dogfood test 2026-05-03). The dogfood discovered that the v3.0 ticket scope as ratified ships a **visibility-and-supervision surface** that does not match the operator's vision of a **swarm-conductor surface**. This re-scope closes the gap.

---

## §1 — The product, in one paragraph

Conductor v3.0 is a swarm orchestration workstation. The operator spawns N claude-code (CC) sessions visible as live tiled terminal panes inside a single Electron window. An orchestrator chat panel sits below the panes, holding global context across all sessions. The orchestrator has tool-use access to spawn, kill, send-prompt-to, and pull-handoff-from any registered session. The operator can drive the orchestrator (steering by chat), join any individual session's pane (typing directly), or hand the orchestrator full autonomy ("go") and step out — returning to a swarm that has worked while they were away. Operator-approval checkpoints surface as cards in the chat panel for any action above the operator-configured approval threshold. Conductor v3.0 ships the full conductor loop: spawn → tile → orchestrate → checkpoint-when-needed → continue → complete → next-task.

This is fundamentally different from "fd v1 with a fancier UI." The autonomy loop is the product.

---

## §2 — What changed from prior v3.0 spec

The prior v3.0 spec (vision §10, ratified pre-dogfood) treated the operator workstation as **three independent surfaces:**
- Kanban (session status visibility)
- CC console panel (one-session-at-a-time terminal viewer, opened from menu)
- Orchestrator chat (Anthropic chat with read-only context-builder access to build docs)

These surfaces existed but did not connect. The orchestrator chat could not drive the spawned sessions. The console panel was menu-launched and single-session. Kanban was a status overlay with no action affordances.

The re-scoped v3.0 treats the workstation as **one integrated conductor surface:**
- CC panes are tiled inside the workstation, visible by default after spawn
- Orchestrator chat has tool-use access to drive every spawned session
- Kanban becomes a status pin/index for sessions, not the primary view
- Approval-checkpoint cards become the operator's primary supervision surface in autonomy mode

The shipped v3.0 code (MB-T01–T08, COARCH-T01–T04, CONSOLE-T01–T03 + 8 Tier-1 wiring followups) becomes the **foundational layer** for this re-scope. None of it is wasted. The new tickets (MB-T09–T13) build the autonomy loop on top of it.

---

## §3 — Architecture, end to end

### §3.1 Operator session lifecycle

1. **Spawn.** Operator clicks `+ Spawn Session` → modal collects repo path + session name → workstation runs `tmux new-session -d -s <name> -c <repoPath> claude` → daemon registers → **CC pane auto-mounts in the workstation as a new tile.** No menu navigation, no manual console-panel-open step.
2. **Multi-pane tiling.** Each spawn adds a new tile. Layout is operator-controlled tiling-window-manager style — drag-to-resize, drag-to-rearrange. Default layout for N panes is grid-fit (1 → fullscreen, 2 → side-by-side, 3-4 → 2x2, 5-6 → 2x3, 7-8 → 2x4, 9+ → operator must resize/scroll). Operator can detach a pane to a separate window.
3. **Orchestrator chat at bottom.** Sits below the pane grid in a fixed/resizable bottom region (existing chat-region splitter from MB-T03). Holds global context — what each session is doing, recent HANDOFFs, pending approval cards.
4. **Loop-in mode (default).** Operator types into orchestrator chat → orchestrator decides actions → cards surface for approval-required actions → operator approves/declines → orchestrator fires actions → operator sees results across the panes. Operator can also click into any pane and type directly into the claude session — orchestrator sees the typed content in its context.
5. **Autopilot mode.** Operator says "go" or sets autopilot per-session → orchestrator runs the loop without per-action approval → only approval-required actions (per the per-session approval policy) surface as cards → operator can rejoin the loop at any time by typing in chat or in any pane.
6. **Checkpoint cards.** When orchestrator wants to fire an approval-required action, it surfaces a card in chat. Card shows action type, target session, payload preview. Operator approves/declines. Card resolves; orchestrator continues.
7. **Completion.** Sessions can be killed by orchestrator (with approval) or by operator (always). Daemon record marks `state=killed`. Tile collapses out of the grid. HANDOFF + console output preserved in daemon DB.

### §3.2 Per-session approval policy

Every registered session carries an approval policy. Operator-configurable per-session. Default: **Medium.**

**Tight:** every send-prompt requires operator approval before the orchestrator can fire it. Useful for high-risk sessions or when operator is learning the orchestrator's behavior.

**Medium (default):** the following require operator approval:
- Commit-creating prompts (any prompt the orchestrator predicts will result in a `git commit`)
- Contract-touching prompts (any prompt that would modify files matched by the operator's frozen-contract pattern list)
- Spawn-session and kill-session actions
- Multi-step plans where the orchestrator wants to chain >1 send-prompt in a single approval cycle

Everything else (single-prompt sends, HANDOFF pulls, console reads) fires without per-action approval but is logged in the audit table.

**Loose:** only commits and contract changes require approval. Multi-step plans, spawn/kill, all other prompts fire without approval. Useful for trusted sessions on well-defined tasks.

**Configuration UX:** per-session approval picker on the session's pane header; default policy configured in workstation settings. Changes apply immediately.

### §3.3 Pane layout — tiling window manager

CC panes render as draggable, resizable tiles inside the workstation's main region (above the orchestrator chat splitter). Each pane has:
- Title bar with session name, status indicator (running/idle/awaiting-approval), approval-policy picker, kill button, detach-to-window button
- Body = xterm.js render of the session's tmux pane output (existing CONSOLE-T03 panel, repurposed from menu-mounted to tile-mounted)
- Footer optional: input field for direct-typing into the session (operator types here → fires `tmux send-keys` to the session)

Tiling rules:
- Initial layout: grid-fit per §3.1
- Operator can drag tile borders to resize neighbors
- Operator can drag tile headers to swap positions
- Operator can detach a tile to a separate window (BrowserWindow with the same xterm.js renderer)
- Operator can collapse a tile to icon-strip (preserves session, frees screen real estate)

When session count exceeds visible-grid capacity, overflow panes are accessible via a tab-strip at the top.

State persistence: tile sizes + positions persist to electron-store keyed by session-name. Re-spawning a previously-killed session restores its prior tile position.

### §3.4 Orchestrator-to-session protocol

The orchestrator sends content into a session via two channels:

**Raw text (default).** Orchestrator constructs a prompt string → fires `workstation:session-send-prompt` IPC with `{sessionName, prompt}` payload → workstation main-process runs `tmux send-keys -t <session> '<prompt>' Enter`. Operator sees the text land in the pane exactly as if the orchestrator had typed it. No envelope, no metadata, no protocol overhead. Default for single-prompt sends.

**Structured envelope (multi-step intent).** When the orchestrator wants to track multi-step intent across a session (e.g., "I'm sending this prompt as step 2 of a 4-step plan"), it wraps the prompt in an envelope:

```
{
  "envelope_version": 1,
  "intent_id": "<uuid>",
  "step": 2,
  "total_steps": 4,
  "intent_summary": "<one-line description>",
  "prompt": "<actual text sent to claude>"
}
```

Envelope is serialized to a comment line + the prompt:
```
# orchestrator: intent_id=<uuid> step=2/4 — <intent_summary>
<actual prompt text>
```

Claude receives both. The comment line gives the operator (watching the pane) immediate context for what the orchestrator is doing. The orchestrator tracks `intent_id` across the multi-step sequence in its own state. If a step fails or surfaces an approval card, the orchestrator can resume from the same `intent_id` after operator action.

Envelopes are operator-visible by design. No hidden orchestrator state.

### §3.5 Orchestrator context — what it sees

The orchestrator chat (existing COARCH-T04 context-builder) gets a new context tier:

**Tier 4: spawnedSessions.** Live state of every registered non-killed session:
```
{
  name: string,
  state: 'armed' | 'running' | 'idle' | 'awaiting_review' | 'stale',
  cwd: string,
  approvalPolicy: 'tight' | 'medium' | 'loose',
  recent_handoff: string | null,    // last 4KB of HANDOFF.md if newer than 60s
  recent_console_tail: string,       // last 2KB of console output
  pending_intents: Array<{intent_id, step, total_steps, intent_summary}>,
  last_action_fired_at: ISO timestamp | null,
  last_operator_typed_at: ISO timestamp | null,
}
```

This context refreshes every chat turn. The orchestrator sees what's happening across the swarm without operator narration. Token cost: ~5-7KB per session × N sessions at schema-permitted maxima (4KB recent_handoff per Q-MBT10-6=a + 2KB recent_console_tail + populated pending_intents); capped at 8 sessions = ~60KB max for this tier — measured 54.40 KB by MB-T10 WB6 cost-validation probe `packages/dispatch-workstation/test/integration/coarchitect-tier4-cost/probe-15-cost-validation.spec.ts`. Operator-arbitrated ceiling per `packages/dispatch-workstation/spikes/MB-T10-COST/README.md` Option A (2026-05-06). 60KB ≈ 7.5% of Sonnet 4.6's 200K-token context window — within orchestrator-call budget. (Earlier draft of this line quoted ~24KB based on a typical-content estimate that did not account for schema-permitted maxima; superseded by the 2026-05-06 measurement.)

### §3.6 Orchestrator action tools

The orchestrator gets new structured-output actions, extending the v3 schema's `OrchestratorOutputSchema` discriminated union:

- **`send-prompt-to-session`** — proposes sending a prompt to a named session. Card surfaces if approval policy requires.
- **`spawn-session`** — proposes spawning a new session with given repo + name. Always card-surfaces (Medium+ policy treats spawn as approval-required).
- **`kill-session`** — proposes killing a named session. Always card-surfaces.
- **`pull-handoff-from-session`** — read-only HANDOFF fetch. Fires without card. Logged.
- **`assign-task`** — high-level intent: "give task X to session Y, with these parameters." Orchestrator decomposes internally to send-prompt actions. Card surfaces if multi-step plan or if any constituent send-prompt would surface.

These extend the existing MB-T07 OrchestratorCard surface. Cards render in chat with the session-targeting context visible. Approve/decline pills behave as MB-T07 already implements.

### §3.7 Autopilot loop

When operator says "go" (or sets autopilot per-session), the orchestrator enters a loop:
1. Read current swarm state (Tier 4 context)
2. Decide next action
3. If approval required → surface card, halt loop until operator acts
4. If approval not required → fire action, log to audit
5. Wait for action to complete (HANDOFF update, console state change, or timeout)
6. Loop back to step 1

Operator interrupts:
- Type in chat → orchestrator integrates the message, may revise plan
- Type in any session's pane → orchestrator sees the typed content next loop iteration
- Click "pause autopilot" → orchestrator stops at next safe point (after current action completes), holds halt until operator resumes
- Approval-card decline with rationale → orchestrator integrates the rationale, revises plan

No keep-alive pings, no chatter. Autopilot is silent unless approval needed or task complete.

### §3.8 Audit + observability

Every orchestrator action (autopilot or operator-driven) writes to a new audit table `orchestrator_swarm_audit`:
```
{
  ts, session_name, action_type, intent_id, step, total_steps,
  approval_required, approval_status, payload_hash, result_status,
  operator_loop_state ('autopilot' | 'manual' | 'paused')
}
```

Operator can query this table via a workstation menu item ("Show recent orchestrator actions"). Useful for forensics when autopilot did something unexpected.

---

## §4 — New tickets (MB-T09–T13)

These slot into V3_TICKETS.md after MB-T08. Each is sized roughly comparable to MB-T07 (one ticket = one Claude Code session = ~3-5 days operator wall-clock).

### MB-T09 — Session prompt injection IPC + tile input footer

**Scope.** New IPC channel `workstation:session-send-prompt` with `{sessionName, prompt, envelope?}` payload. Main-process handler runs `tmux send-keys -t <sessionName> '<prompt>' Enter`. Tile footer input field (per §3.3) wires to this IPC. Approval-policy gate: tile-footer sends fire without approval (operator typed it directly = implicit approval); orchestrator-fired sends honor the per-session policy.

**Out of scope.** Orchestrator-side calling of this IPC (lands in MB-T11). Multi-line paste handling beyond single Enter (defer to followup). Envelope parsing on the claude side (envelope is just visible text in the pane, claude reads it as part of the prompt).

**Acceptance.** Unit tests for IPC handler dep-injection. Integration test with real tmux against a smoke-spawned bash session: send "echo hello" → verify pane buffer contains "hello" within 500ms. Tile footer wired in CONSOLE-T03's component (which becomes a tile body in MB-T12).

### MB-T10 — Spawned-session context tier (Tier 4)

**Scope.** Extend COARCH-T04 context builder with Tier 4 (`spawnedSessions` per §3.5). New daemon endpoint `GET /v3/sessions/:name/context-snapshot` returns `{recent_handoff, recent_console_tail, pending_intents, last_action_fired_at, last_operator_typed_at}` for one session. Workstation context-builder loops registered sessions, fetches snapshots, assembles Tier 4 payload. Threaded into orchestrator chat context per existing COARCH-T04 pattern.

**Out of scope.** Pending-intent tracking in orchestrator state (lands in MB-T11). Operator-typed timestamp tracking (deferred to followup; v3.0 always returns null for `last_operator_typed_at`).

**Acceptance.** Unit tests for context-builder Tier 4 assembly. Daemon endpoint contract tests. Cost-validation test: 8 sessions with realistic HANDOFF + console content → measured input token count per chat turn → assert under 30KB total (Tier 4 cap).

### MB-T11 — Orchestrator action tools + autopilot loop

**Scope.** Extend v3 schema `OrchestratorOutputSchema` with the action types per §3.6 (`send-prompt-to-session`, `spawn-session`, `kill-session`, `pull-handoff-from-session`, `assign-task`). Each action type renders as MB-T07 OrchestratorCard with action-specific preview. Approval policy resolver: per-session policy + action-type → approval-required boolean. Approved actions fire via existing IPC channels (MB-T09 for send-prompt, MB-T05 for spawn, new IPC for kill, daemon HTTP for HANDOFF pull).

Autopilot loop in orchestrator chat: operator says "go" or sets autopilot per-session → orchestrator enters loop per §3.7 → halts on approval card → resumes on operator approve/decline. Autopilot state persists across orchestrator chat turns (intent_ids, last action timestamps).

**Out of scope.** "Assign-task" decomposition is heuristic for v3.0 — orchestrator chooses send-prompts based on its own judgment, no formal task-decomposition algorithm. Refinement deferred to v3.1.

**Acceptance.** Unit tests per action type. Integration test: spawn 2 sessions (smoke harness), set autopilot, fire a multi-step plan via "assign-task," verify both sessions receive their prompts in correct order, verify approval card surfaces for commit-touching prompt, verify operator approval resumes loop.

### MB-T12 — Auto-mount-on-spawn + tile-mode console panel + tiling layout

**Scope.** Repurpose CONSOLE-T03 console panel from menu-launched/single-session to tile-mounted/multi-session. New shell region above the chat splitter renders a tile grid. Each tile = one session = one CONSOLE-T03 component instance. Spawn handler (MB-T05) emits `workstation:session-spawned` event → shell handler creates a new tile, mounts the panel, binds to the session.

Tiling: drag-to-resize tile borders, drag-to-swap tile headers, detach-to-window button (opens new BrowserWindow with same renderer), collapse-to-icon-strip button. Default layout per §3.3 grid-fit rules. State persists to electron-store keyed by session name.

**Out of scope.** Custom tile arrangements beyond the §3.3 grid-fit defaults are operator-only (operator drags to arrange, no programmatic layout API). Workspace save/restore (saving a layout for later) deferred to v3.1. Detached-tile inter-process state sync is fire-and-forget (detached tile shows the same xterm.js render but operator can't drag it back into the main window in v3.0; closing the detached window re-tiles in main).

**Acceptance.** Unit tests for tile layout calculator (grid-fit per N). Integration test: spawn 4 sessions, verify 2x2 grid renders, drag tile border → neighboring tiles resize, kill 1 session → tile collapses, remaining 3 reflow to 1+2 layout. Console panel multi-mount test (already partially covered by MB-F-CONSOLE-T03-MULTI-PANEL followup; this ticket closes it).

### MB-T13 — Per-session approval policy + audit table

**Scope.** Per-session approval policy stored in daemon DB column on session table (`approval_policy` enum: tight/medium/loose, default medium). Workstation tile header surfaces approval-policy picker (dropdown). Default policy configured via workstation settings (existing MB-T11 settings UI from prior scope, now MB-T11-old/MB-T13-new — needs renumber, see §6). New audit table `orchestrator_swarm_audit` per §3.8. Audit-write happens at action-fire time. Workstation menu item "Show recent orchestrator actions" opens a modal with audit query.

**Out of scope.** Audit retention policy (defer to v3.1). Audit export to file (defer). Approval-policy presets beyond tight/medium/loose (defer).

**Acceptance.** Unit tests for policy resolver (per-session policy + action-type → approval-required boolean per §3.2). Daemon migration test for new column + table. Audit-write integration test: fire 5 actions of varying types via the orchestrator → assert 5 audit rows with correct fields. Operator-facing approval-policy-change test: pick "tight" on a session → next orchestrator send-prompt to that session surfaces a card.

---

## §5 — Frozen surfaces — what this re-scope DOES NOT change

These remain authoritative as previously ratified. The re-scope adds NEW surfaces; it modifies NONE of these.

- **CONDUCTOR_API_CONTRACT.md v2.2.0** (committed `a7e8d4f`) — daemon HTTP/WS API contract. Re-scope adds new endpoints (per §3.5 Tier 4 snapshot) and new audit-write surface, but does NOT modify any existing /v2/* or /v3/* contract.
- **WORKSTATION_CONTRACT.md cf1848a** — base workstation surface contract. Re-scope EXTENDS §5 (UI surfaces) and §6 (IPC + endpoints) and §7 (schema enforcement) with new sections; does NOT modify existing sections.
- **packages/dispatch-core/src/v3/schema.ts** (committed `232fbaa`) — v3 schema. Re-scope ADDS new discriminated-union members to `OrchestratorOutputSchema` and adds new schemas for `WorkstationSpawnedEvent`, `SessionContextSnapshot`, `OrchestratorSwarmAuditRow`. Does NOT modify existing schemas.
- **MB-T01–T08, COARCH-T01–T04, CONSOLE-T01–T03 ticket bodies** — preserved as the foundational layer. The 8 Tier-1 wiring followups from these tickets become PRE-REQUISITES to MB-T09–T13 (you can't build the autonomy layer on top of un-wired foundation).

The frozen-contract bidirectional fence (per project instructions §3.4) holds. Re-scope is operator-arbitrated additive content. Mechanical translation of these new surfaces into v3 schema additions can be CC-delegated under tight scope after operator ratifies §1–§4.

---

## §6 — Wiring batch first, then re-scope tickets

The 8 Tier-1 wiring followups from yesterday's batch close gaps in the foundational layer. These MUST land before MB-T09–T13 because:
- MB-T12 (auto-mount on spawn + tiling) depends on MB-F-CONSOLE-T03-SHELL-INTEGRATION (panel needs to be mountable in shell, not just menu)
- MB-T11 (orchestrator action tools) depends on MB-F-MB-T07-* (orchestrator cards need full preload/IPC/audit-client wiring)
- MB-T09 (session prompt injection) depends on MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION (sessions need to actually run claude, not orphan)

Recommended sequencing:

**Batch 6 — Wiring batch (8 Tier-1 followups, ~1-2 sessions):**
- MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION (validated fix per dogfood test 2026-05-03)
- MB-F-MB-T05-POST-SPAWN-LIVENESS-CHECK
- MB-F-MB-T07-CARD-BRIDGE-PRELOAD-WIRING
- MB-F-MB-T07-MAIN-IPC-WIRING
- MB-F-MB-T07-DAEMON-AUDIT-CLIENT
- MB-F-MB-T07-CARD-CONTEXT-CACHE
- MB-F-MB-T07-ORCHESTRATOR-CARD-EMITTER
- MB-F-CONSOLE-T03-SHELL-INTEGRATION
- MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT
- MB-F-MB-T08-VISION-PROJECT-LIST-CONFIG (operator arbitration on path A vs B from yesterday's MB-T08 close)

**Batch 7-11 — Re-scope tickets (MB-T09–T13, one ticket per batch):**
- Batch 7: MB-T09 (session prompt injection)
- Batch 8: MB-T10 (Tier 4 context)
- Batch 9: MB-T11 (action tools + autopilot loop) — biggest ticket
- Batch 10: MB-T12 (tiling layout + auto-mount)
- Batch 11: MB-T13 (approval policy + audit)

**Batch 12 — Phase 3 dogfood:**
- Operator runs the full conductor loop: spawn 4-8 sessions, set autopilot, give a multi-step task, verify the swarm executes with checkpoints surfacing as expected.

**Note on MB-T11 renumber.** The previously-ratified MB-T11 (settings UI from MB-F-MB-T05-API-KEY-SETTINGS-UI followup) collides with the new MB-T11 (action tools + autopilot loop). Resolution at ratification time: either rename old MB-T11 → MB-T14 (settings UI lands after autonomy layer) or rename new MB-T11 → MB-T11-new with a different numbering scheme. Operator arbitration needed at ratification.

**Wall-clock estimate.** Conservative two-agent-loop pacing: 8-12 sessions = roughly 4-7 weeks. Optimistic with parallelization where the dependency graph allows: 3-5 weeks. Adds ~4-6 weeks to v3.0 path-to-ship vs. previously-ratified scope.

---

## §7 — Operator decision surface

Before this doc anchors V3_TICKETS.md additions, operator arbitrates:

**Q1 — Ratify or revise.** Adopt §1–§4 as ratified, mark this doc the source of truth, file MB-T09–T13 in V3_TICKETS.md. OR revise specific sections (call out which) before ratifying. OR reject and choose a different path (ship v3.0 as-currently-scoped + push autonomy to v3.1/v4).

**Q2 — MB-T11 renumber.** Old MB-T11 (settings UI) → MB-T14 (autonomy lands first), OR new ticket → MB-T11-new (settings UI keeps its number).

**Q3 — Wiring-batch sequencing.** Land all 8 wiring followups in one batch (recommended), OR interleave wiring with MB-T09 to keep momentum.

**Q4 — Cost re-validation trigger.** Tier 4 context (per §3.5) materially expands per-turn input tokens. Run a cost-validation spike before MB-T10 ships, OR accept the MB-S01 cost projections cover this scope, OR defer cost re-validation to a follow-on if operator dogfood surfaces a cost concern.

These are pre-registration gates. Surface answers, then this doc gets ratified and lands in `/mnt/project/`.

---

## §8 — What this means for the broader roadmap

Per project instructions §7, current path-to-marvelous estimate is 12-22 weeks. With this re-scope:

- **v3.0 ship slips by ~4-6 weeks** (5 new tickets at two-agent-loop pacing).
- **Cairn formalization, Cairn-tooling, Group Alpha binaries** — all downstream of Conductor — get materially easier because the conductor actually conducts. Operator-load reduction in those phases offsets the v3.0 expansion.
- **Net path-to-Group-Alpha-shipping: roughly neutral, possibly faster.**
- **Net path-to-marvelous: 16-28 weeks (vs. prior 12-22), with 25-50% surprise margin (20-42 weeks realistic).**

The case for the slip is operator-experience: a v3.0 that ships without autonomy is a tool that doesn't reduce operator load, which means the downstream phases continue to be operator-bottlenecked, which means the original 12-22 estimate was already optimistic. The re-scope doesn't add work; it **moves work forward** that was implicitly assumed.

---

**End of draft. Awaiting operator ratification per §7.**
