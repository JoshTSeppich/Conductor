# Conductor v3.5 BUILD — Hot-Swap Orchestrator (HSO) Architecture

**Status:** DRAFT-PENDING-SPIKE-HSO-02 — SPIKE-HSO-01 ratified at commit `c1b78c4` (2026-05-08); §3 architecture KNOWN-VIABLE; D1-D5 architectural requirements operative. Pending: SPIKE-HSO-02 (handoff Shape A vs Shape B per §4.2) before §5 ticket dispatch (excepting MB-T36 per Q-V35-4 re-arbitration 2026-05-08).

**Authoring posture:** Drafted by chat-Claude (Opus 4.7) under operator best-judgment authorization 2026-05-08 per project instructions §3.4 mechanical translation carve-out. Operator authors final text. This document is for review only.

**Supersedes (conditional on spike pass):** `CONDUCTOR_V3_RESCOPE_DRAFT.md` §3.5 (Orchestrator context), §3.7 (Autopilot loop). Keeps §3.1 (lifecycle), §3.2 (per-session approval policy), §3.3 (tile layout), §3.4 (orchestrator-to-session protocol), §3.6 (action tools), §3.8 (audit + observability) unchanged.

**Effective:** Conditional. If SPIKE-HSO-01 returns ratification-positive evidence per §4.3, this doc anchors v3.5 ticket additions. If spike returns ratification-negative or ambiguous, v3.0 wireframe-operational ships against the API-orchestrator path per `CONDUCTOR_V3_RESCOPE_DRAFT.md` §3.7 (existing) plus the v3.0-path tickets enumerated in §5-fallback below.

**Repo state at draft:** main HEAD `534ab52` (post-Round-5 HALT 2 merge of mbt11a + mbt11b). v3.0 ticket set MB-T09–T13 shipped. Round 6 (mbt24/25/28/34) shipped. Wireframe-operational gap diagnosed in chat-Claude exchange 2026-05-08 at 4 layers: (1) action variant IPC routing unshipped, (2) orchestrator-fired spawn unshipped, (3) turn-detection unshipped, (4) Tier 4 content policy unspecified. This doc proposes a single architecture that addresses all 4 layers via a different primitive than v3.0's API-orchestrator.

**Anchored against:** `CONDUCTOR_V3_RESCOPE_DRAFT.md` (rescope), `CONDUCTOR_API_CONTRACT.md` v2.2.0, `WORKSTATION_CONTRACT.md` (frozen base sections), `dispatch-core/src/v3/schema.ts` (Tier4PayloadSchema, OrchestratorOutputSchema action variants from MB-T11-A), `packages/dispatch-workstation/src/coarchitect/context-builder.ts` (current 6-tier injection), `packages/dispatch-workstation/src/coarchitect/tier4-builder.ts` (current Tier 4 assembly), `packages/dispatch-daemon/src/console/buffer.ts` (DEFAULT_CAPACITY 50000 ring), `MB-F-T11A-IPC-ROUTING-ROUND-6`, `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED`.

---

## §1 — The product, in one paragraph

[MODELED] Conductor v3.5 is a swarm orchestration workstation where the **orchestrator is itself a CC CLI session** — symmetric primitive with the spawned peer sessions it drives. The orchestrator runs under Claude Max subscription substrate (no per-token marginal cost), reads `BUILD.md` as canonical state on every turn, emits action variants via markdown markers, and drives peer sessions through existing daemon/tmux IPC channels. A pool manager maintains an active orchestrator + pre-warmed standby; when active hits context-window pressure, the standby reads BUILD.md fresh and seamlessly takes over. Conversation history within any single orchestrator session is ephemeral scratchpad; the canonical swarm state lives in BUILD.md (operator-authored goal state) and a sibling `swarm-state.md` (orchestrator-authored running state). This pattern collapses cost (subscription absorbs orchestrator runtime), unifies primitives (orchestrator and spawned sessions share PTY/registry/console-panel infrastructure), and sidesteps the conversation-state-staleness failure mode by treating orchestrator instances as stateless workers against canonical state stores.

---

## §2 — What changed from v3.0 rescope

The v3.0 rescope (CONDUCTOR_V3_RESCOPE_DRAFT.md) modeled the orchestrator as an in-process API client (`AnthropicChatClient`) calling `messages.create()` per tick with full tiered context rebuilt each call. Per-tick API token cost was real. Conversation continuity was achieved by rebuilding context every call (not by accumulating in the model's session memory). v3.0 wireframe-operational required: (a) action variant IPC routing wired (MB-F-T11A-IPC-ROUTING-ROUND-6), (b) orchestrator-fired spawn implemented (MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED), (c) turn-detection layer (unspecified in v3.0 rescope; surfaced as gap during 2026-05-08 chat-Claude probe), (d) Tier 4 content policy (also unspecified beyond "60KB ceiling reconciled HALT 2 Option A").

v3.5 inverts the orchestrator primitive:

- **Orchestrator is a CC CLI session, not an API client.** Spawned via the same tmux + registry primitives as peer sessions. Visible in tile-grid (or a dedicated orchestrator tile region). Console panel renders its activity via existing CONSOLE-T01/T02/T03 primitives.
- **Cost model is subscription, not per-token.** Claude Max billing absorbs orchestrator runtime. Self-summary token costs (proposed earlier in chat-Claude exchange) collapse to $0 marginal. Per-tick API expense disappears.
- **State management inverts.** Active orchestrator's conversation history is short-lived scratchpad. BUILD.md is canonical operator-authored state. swarm-state.md is canonical orchestrator-authored running state (what's been done, what's in-flight, outstanding decisions). Hot-swap from active to standby requires only: standby reads BUILD.md + swarm-state.md, becomes active, no handoff document required (Shape B per §3.5).
- **Action variant emission shifts protocol.** v3.0 emits structured `OrchestratorOutput` JSON via API response_format. v3.5 emits action variants as markdown markers in the orchestrator session's stdout, parsed by an action-variant-router consuming the orchestrator's PTY stream. Reuses existing `chat-content-markers.ts` parsing primitive already shipped.
- **Tier 4 context flows differently.** v3.0 builds Tier 4 from registry + per-session snapshot fetches before each API call. v3.5 active orchestrator runs self-summary prompts against peer sessions on detected idle (the proposal from chat-Claude 2026-05-08 exchange), populates swarm-state.md, hot-swap successors read swarm-state.md as input.
- **Turn-detection requirement narrows.** v3.0 needed daemon-side ANSI-parsing + state classification per-session. v3.5 needs only operator-perceptible idle-detection on the orchestrator's own pane (for hot-swap trigger) + simple quiescence detection on peers (for self-summary trigger). ANSI-parsing of the Anthropic spinner glyph is no longer load-bearing because the orchestrator session itself reasons over its peers' summaries, not over their raw stdout.

The v3.0 foundational layer (MB-T01–T08, COARCH-T01–T04, CONSOLE-T01–T03, MB-T09–T10, MB-T11-A/B, MB-T12–T13, MB-T16, MB-T17, MB-T24, MB-T25, MB-T28, MB-T34) is preserved unchanged. None of it is wasted; v3.5 builds the autonomy layer on a different primitive than v3.0 anticipated.

---

## §3 — Architecture, end to end

### §3.1 Stateless orchestrator pattern

[MODELED] Each orchestrator instance is a CC CLI session spawned via the same SpawnIpcController + tmux primitive that spawns peer sessions. Distinguishing properties:

- Spawned with an HSO-specific system prompt (per §3.6, MB-T41 ships the prompt)
- Tile-grid registry tracks it under a reserved name (e.g., `__orchestrator_active`, `__orchestrator_standby`) so tile rendering can specialize layout if needed
- Has same IPC channels as peer sessions: PTY streaming via CONSOLE-T01, console panel via CONSOLE-T03, tile-grid mounting via MB-T12
- Reads BUILD.md and swarm-state.md as initial context (per §3.2)
- Emits action variants as markdown markers parsed by action-variant-router (per §3.6)
- Has bounded lifetime: terminated and replaced per hot-swap policy (per §3.4)

[MODELED] **Statelessness is conventional, not enforced.** The orchestrator session has its own conversation history within its lifetime. The "stateless" claim is that decision-quality must not depend on that history accumulating beyond a few recent turns — because the canonical state stores (BUILD.md + swarm-state.md) carry all load-bearing context. Verifying this property is a SPIKE-HSO-01 acceptance criterion (§4.3).

### §3.2 BUILD.md and swarm-state.md as canonical state stores

[MODELED] **BUILD.md (operator-authored, frozen-contract scope per §3.4 of project instructions):**

- Operator's source of truth for what the swarm should accomplish
- Contains: goals, ticket plan, frozen contract surfaces, scope boundaries, halt-and-surface points
- Parsed by MB-T28-shipped BUILD.md parser (143/143 GREEN, 100% line coverage) — already on main
- Read by every orchestrator instance at startup and at every handoff
- Operator-only authorship; orchestrator never writes here

**swarm-state.md (orchestrator-authored, sibling file):**

- Orchestrator's running notes about swarm execution state
- Contains: which peer sessions exist + their states + their last-known summaries, which actions have fired and outcomes, outstanding decisions awaiting operator arbitration, unresolved errors or halts in any peer
- Updated by active orchestrator on a schedule (per §3.7 — every N turns or on significant state transition)
- Read by hot-swap successor at handoff to reconstruct state without conversation history
- Operator can read this file but does not author into it; corrections happen via direct operator messages to the active orchestrator (which then updates swarm-state.md)

[SPECULATIVE] **Open question: does swarm-state.md need to be a single file or a directory?** A directory of per-peer-session files (`swarm-state/<sessionName>.md`) might map cleaner to the per-session Tier 4 model. Single file is simpler for spike. SPIKE-HSO-01 may surface evidence informing this.

### §3.3 Hot-swap pool

[MODELED] **Pool composition:** at any time, exactly two orchestrator sessions exist:

- **Active:** receives operator messages, drives peer sessions, writes swarm-state.md
- **Standby:** spawned, has read BUILD.md + swarm-state.md initial state, sits idle in tile region

**Pool transitions:**

| Event | Action |
|---|---|
| Workstation startup | Spawn active. After active confirms ready, spawn standby. |
| Active hits handoff trigger | Send "handoff" message to active → active writes final swarm-state.md update → terminate active → standby promoted to active → spawn new standby reading current swarm-state.md |
| Active crashes | Standby promoted immediately → spawn new standby. Forensic: log active's last PTY output to a crash-log file; operator inspects later. |
| Operator manual handoff | Operator triggers handoff via tile-grid action; same flow as automatic. |
| Workstation shutdown | Active writes final swarm-state.md → terminate active → terminate standby. |

**Standby readiness:** standby is "ready" when it has spawned, ingested BUILD.md, ingested current swarm-state.md, and surfaced an "OK" marker in its stdout. Pool manager waits for this marker before considering standby promotable.

### §3.4 Handoff trigger policy

[MODELED] Three-tier trigger hierarchy:

1. **Token-count trigger (primary).** [KNOWN per SPIKE-HSO-01 D3] Monitor CC CLI status-bar token count via PTY stream subscription (CONSOLE-T01 broadcaster). Trigger handoff at 65% of model context window (~130,000 tokens for 200K window). Provides ~15-turn clean-handoff window before 70% (~140K) hard threshold. Token-count monitoring ratified over turn-count monitoring per SPIKE-HSO-01 finding F9: response length declines on repeated patterns; turn-count is unreliable proxy for actual capacity consumption. Production implementation: parse `[0-9]+ tokens$` regex from CC CLI status-bar last line of PTY stream output every N seconds (recommended N ≤ 5).
2. **Turn-count trigger (backstop).** Every N turns regardless of context state — defends against token-pressure detection failure. Default N = 50 (SPECULATIVE; SPIKE-HSO-01 informs).
3. **Quality-degradation trigger (deferred).** If active starts producing low-confidence outputs or repeating prior decisions. Hard to detect mechanically; likely v3.6+ scope.

**Operator override:** operator can force handoff at any time (see §3.3 manual transition).

### §3.5 Handoff protocol — Shape B (default), Shape A (fallback)

[MODELED] **Shape B (default per recommendation):** orchestrator continuously maintains swarm-state.md as it works. Handoff = kill active + promote standby. No handoff document is generated at handoff time. Continuity comes from swarm-state.md being current. **Standby's first action after promotion: read swarm-state.md (already in its initial context), apply any operator messages that arrived during handoff window, proceed.**

**Shape A (fallback if Shape B fails empirically):** at handoff trigger, active is asked "produce 10-line handoff summary covering outstanding swarm goals, sessions in flight, pending decisions." Summary written to `docs/coordination/handoff-<timestamp>.md`. Standby reads BUILD.md + swarm-state.md + handoff summary as initial input.

[MODELED] Shape B is more cairn-aligned (BUILD.md + swarm-state.md ARE the source of truth, no special-case handoff data), but requires active to maintain swarm-state.md correctly and continuously. Shape A is more defensive (orchestrator gets one explicit chance to summarize state before death).

**[KNOWN per SPIKE-HSO-01 finding F6 + D2]:** swarm-state.md summary entries may not preserve the weight behind outstanding HALTs sufficiently for stateless workers reading from cold context. Active orchestrators with full conversation history apply more conservative HALT-discipline than fresh successors reading only fixture summaries. Production swarm-state.md schema MUST include explicit halt-urgency metadata per Shape A or Shape B implementation:

- `halt_urgency: high | medium | low` per active HALT entry
- `halt_emitted_at: <ISO timestamp>` per active HALT entry  
- `halt_blocking: <list of dependent ticket scopes>` per active HALT entry

These fields are operator-arbitrated additions to the swarm-state.md schema. MB-T38 (state-writer ticket) is responsible for emitting them; MB-T41 (system prompt) is responsible for instructing the orchestrator how to populate them. SPIKE-HSO-02 must validate against this enriched schema, not the candidate spike fixture format.

**SPIKE-HSO-02 (§4.2) arbitrates Shape B vs Shape A based on empirical evidence.**

### §3.6 Action variant emission via markdown markers

[MODELED] v3.0 emits action variants via API response_format pinning the response to `OrchestratorOutputSchema`. CC CLI sessions don't have response_format. v3.5 uses a **markdown-marker protocol**:

```
[ACTION:send-prompt-to-session]
session: foo
prompt: |
  <prompt content>
[/ACTION]
```

[MODELED] Reuses existing `chat-content-markers.ts` parser already shipped via `chat-panel.tsx` integration. Parser extension required: add ACTION marker block parsing, validate inner content against per-action-type payload schema (existing in `dispatch-core/src/v3/schema.ts` §12), reject malformed markers with surfaced error (operator sees orchestrator's invalid output rather than silent drop).

**[KNOWN per SPIKE-HSO-01 finding F4 + D4]:** pull-handoff-from-session is always a solo-turn action. The result of pull-handoff informs the NEXT turn's action (typically spawn-session or send-prompt-to-session), not the same turn. Bundling pull-handoff with a consequent action in a single turn violates the §2 "one action per turn" protocol and creates state-inconsistency risk.

**Production system prompt (MB-T41) MUST explicitly state:**
> "After emitting a pull-handoff-from-session action, the result content informs your NEXT turn's reasoning. Do NOT bundle pull-handoff with spawn-session, send-prompt-to-session, or any other action variant in the same turn. Wait for the handoff content to enter your context, then decide your next action on the subsequent turn."

This rule was discovered during SPIKE-HSO-01 HALT 3.5 fixture construction (single fixture row conflated pull-handoff + spawn into one S04 entry; structural ambiguity surfaced).

**[KNOWN per SPIKE-HSO-01 finding F3 + D1]:** HSO orchestrator initialization MUST use `--append-system-prompt` flag, NOT user-message injection. User-message injection of system-level authority claims triggers Sonnet 4.6's prompt-injection detection and is correctly refused as a §2.1 anti-fabrication response. MB-T37 (OrchestratorPoolManager) spawn logic MUST encode `claude --dangerously-skip-permissions --model claude-sonnet-4-6 --append-system-prompt "$(cat <hso-system-prompt-path>)"` as the canonical spawn command.

**Halt protocol:** if marker validation fails, the action-variant-router emits a marker-error chat message visible to operator, does NOT fire the action, and surfaces the failure to active orchestrator's next turn (so it can self-correct). This is §3.18 operator-artifact halt-and-surface applied at the IPC layer.

### §3.7 Tier 4 self-summary harvesting

[MODELED] Active orchestrator runs the following per peer session, on detected peer-idle:

1. Detect peer quiescence: no stdout chunks for N seconds (default 3, SPECULATIVE; SPIKE-HSO-01 informs)
2. Send peer the summary prompt: "Give me a 5-line summary of what you completed this turn. If still working, respond with TURN_INCOMPLETE."
3. Capture peer's response from PTY stream (next stdout block)
4. If TURN_INCOMPLETE: do nothing, wait for next quiescence
5. If summary: append to swarm-state.md under that peer's section
6. Action variant emission triggered by significant state changes (peer summary contains new error, peer summary indicates completion of assigned task, etc.)

**[KNOWN per SPIKE-HSO-01 scenario 2]:** TURN_INCOMPLETE protocol is honored 1/1 binary in spike conditions. Sonnet 4.6 distinguishes mid-work peer turns from completed turns reliably when given explicit summary-prompt language. Latency: ~1 second for TURN_INCOMPLETE response (no partial-summary attempt). High-fidelity completed-turn summaries: 3/3 in spike (100%); summaries faithfully echo source qualifiers (F1 anti-fabrication applied autonomously to summary generation).

**Summary format ratified by SPIKE-HSO-01:** task / files-touched / result / completion-status / no-follow-up. This format is currently EMERGENT (substrate behavior, not explicit prompt structure). MB-T41 (production system prompt) MUST formalize this as deterministic schema for downstream MB-T35-revised parser consumption. Emergent format is unsuitable for parser-anchored consumption.

**Cost model:** [KNOWN] zero per-call API cost (Max subscription). **Latency:** ~3-5 seconds per summary roundtrip. **Fidelity:** session self-report — can lie or omit; cairn discipline mitigates but doesn't eliminate. Raw PTY stream remains available via console panel for operator verification when summary fidelity is in question.

[KNOWN per SPIKE-HSO-01 scenario 2 KNOWN-PASS]: Sonnet 4.6 under CC CLI honors TURN_INCOMPLETE protocol with 100% binary fidelity (1/1 in spike conditions). Production HSO can rely on TURN_INCOMPLETE as a structured signal for "peer is mid-work; do not interpret partial output as turn-complete." MB-T39 (peer summary harvester) implementation: when peer response = "TURN_INCOMPLETE" string, hold for next quiescence window; do NOT update swarm-state.md with partial content.

### §3.8 Substrate-portability properties

[MODELED] HSO architecture inherits all substrate-portability claims from cairn-arc-synthesis.md §8 because the orchestrator IS a CC CLI session running cairn primitives. Substrate selection is a spawn-flag choice:

- Default: **Sonnet 4.6** (operator-ratified default under current Max subscription; KNOWN-VIABLE per SPIKE-HSO-01 ratification 2026-05-08)
- Optional: Sonnet 4.5 (Round 5 substrate-portability evidence; not directly tested for HSO in SPIKE-HSO-01)
- Optional: Haiku 4.5 (faster, cheaper subscription consumption, lower reasoning depth — appropriate for narrow orchestration tasks; substrate-viability untested for HSO; spike before deployment)
- Optional: Opus 4.7 (highest reasoning, biggest context; substrate-viability untested for HSO; spike before deployment)
- Operator can swap orchestrator substrate without code changes — only spawn-flag changes

[MODELED] This makes substrate-experimentation cheap. Operator can A/B test orchestrator substrates by spawning HSO instances with different `--model` flags (Sonnet 4.6 is the Max default; explicit flags select alternates), observing decision quality on identical BUILD.md + swarm-state.md inputs, ratifying empirically.

---

## §4 — Spike requirements (must pass before any tickets fire)

### §4.1 SPIKE-HSO-01 — Orchestrator-as-CC-session viability — [RATIFIED 2026-05-08, commit `c1b78c4`]

**Scope:** spawn a single Sonnet 4.6 CC CLI session under a candidate HSO system prompt. Operator drives it through 5-10 simulated swarm scenarios. Measure structured-output reliability, conversation-state-management feasibility, latency, Max rate-limit headroom.

**Acceptance scenarios:**

1. **Action variant emission:** simulate 10 scenarios where operator messages the orchestrator with a goal that should produce an action variant (spawn, send-prompt, kill, pull-handoff, assign-task). Measure: % of turns producing valid markdown-marker action variants parseable by `chat-content-markers.ts` extended for ACTION blocks. **Acceptance: ≥80% well-formed on first turn, ≥95% well-formed within 1 self-correction round.**
2. **Self-summary fidelity:** spawn a peer CC session, drive it through 3 turns of varied complexity (simple file edit, multi-step reasoning, error encounter). Send orchestrator the summary prompt for each peer turn. Measure: summary captures key facts (files touched, outcomes, errors). **Acceptance: ≥80% high-fidelity on subjective operator review, TURN_INCOMPLETE protocol honored when peer is genuinely mid-work.**
3. **Hot-swap continuity:** clone scenario state into swarm-state.md format. Spawn fresh CC session as "successor", inject BUILD.md + swarm-state.md, ask "what should the swarm do next." Measure: does the fresh session produce coherent decisions matching what the active session was doing? **Acceptance: operator subjective review of decisions = "consistent with active's trajectory" on ≥80% of handoffs.**
4. **Context-window growth rate:** measure conversation history growth across 30 turns of typical orchestration. Compute: at what turn count does context fullness cross 70%. **Acceptance: turn count establishes the §3.4 backstop trigger; no specific threshold required.**
5. **Max rate-limit headroom:** orchestrator + 3 peer sessions running for 30 minutes of operator-driven simulation. Track Max usage indicator. **Acceptance: usage delta < 20% over the 30-min window. If it bursts >20%, swarm-scale Max headroom is insufficient and architecture needs Plan-B (per-token API for orchestrator only, or smaller default substrate).**

**Halt criteria — spike fails:**

- Action variant emission < 80% well-formed even after self-correction → markdown-marker protocol is unreliable at this substrate; either pivot to MCP tool integration if available, or fall back to v3.0 API-orchestrator path
- Self-summary fidelity < 80% OR TURN_INCOMPLETE not honored → self-summary harvesting is unreliable; Tier 4 needs different content policy
- Hot-swap continuity < 80% → swarm-state.md isn't sufficient state for stateless workers; architecture needs handoff document (Shape A) or fundamental rethink
- Max rate-limit usage delta > 20% in 30 min → swarm-scale Max bound binds; cost-collapse claim is invalidated for non-trivial swarms

**Operator-only territory:** SPIKE-HSO-01 is operator-supervised; chat-Claude does not author the spike system prompt as final text — drafts only.

**Ratification result (2026-05-08):** All 5 acceptance scenarios PASS. Substrate ratified. 5 architectural requirements (D1-D5) operative. 5 followup tickets filed (MB-F-HSO-01-*). See `docs/adr/HSO-01-orchestrator-substrate-viability.md` for full evidence and ADR.

### §4.2 SPIKE-HSO-02 — Handoff protocol shape

**Scope:** conditional on SPIKE-HSO-01 acceptance scenario 3 passing. Test Shape B (swarm-state.md only) vs Shape A (swarm-state.md + handoff document). Single CC orchestrator session forced through 5 simulated handoffs. Measure: which shape produces better continuity per operator subjective review.

**Acceptance:**

- If Shape B operator-rated ≥ Shape A on ≥4 of 5 handoffs → Shape B ratified for v3.5
- Otherwise Shape A ratified
- Result documented as ADR `docs/adr/HSO-02-handoff-shape.md`

### §4.3 Combined ratification gate

[KNOWN] SPIKE-HSO-01 ratified 2026-05-08 (commit `c1b78c4`). Architecture KNOWN-VIABLE per Sonnet 4.6 substrate. D1-D5 operative. 

[Q-V35-4 re-arbitrated 2026-05-08]: MB-T36 (orchestrator-fired spawn) authorized to fire post-SPIKE-HSO-01 / pre-SPIKE-HSO-02 due to architecture-independence per §5.2. All other §5 tickets remain gated on SPIKE-HSO-02 ratification + MB-T41 operator-only authoring.

Remaining gate:
- **SPIKE-HSO-02 ratifies Shape B** → §5 tickets MB-T35-revised + MB-T37 + MB-T38 + MB-T39 + MB-T40 + MB-T41 fire as written
- **SPIKE-HSO-02 ratifies Shape A** → §5 tickets fire with MB-T38 scope adjusted (handoff document generation in addition to swarm-state.md)
- **SPIKE-HSO-02 fails** → v3.5 architecture not viable at handoff layer; pivot operator decision required

---

## §5 — Tickets (DRAFT-PENDING-SPIKE; conditional on §4 ratification)

[MODELED] All tickets below are DRAFT and do not fire until SPIKE-HSO-01 and SPIKE-HSO-02 return ratification-positive evidence. After ratification, tickets are operator-arbitrated for inclusion in V3_TICKETS.md or a sibling V3.5_TICKETS.md per operator choice.

### MB-T41 — HSO system prompt + markdown-marker protocol spec

[MODELED] **Scope:** author the HSO orchestrator system prompt (operator-arbitrated authoring under §3.4) defining: action variant emission protocol, BUILD.md / swarm-state.md reading discipline, self-summary triggering rules, halt-and-surface protocol, cairn primitives the orchestrator must honor. Ship as a frozen artifact at `packages/dispatch-workstation/src/coarchitect/hso-system-prompt.md`.

**Out-of-scope:** any code change. This is an artifact authoring ticket.

**Acceptance:** prompt is ratified verbatim from SPIKE-HSO-01 evidence. SPIKE-HSO-01 acceptance scenario thresholds must hold against this exact prompt text.

**Confidence:** prompt structure is MODELED until SPIKE-HSO-01 measurements confirm.

### MB-T35-revised — Action variant emission via markdown markers

[MODELED] **Scope:** extend `chat-content-markers.ts` parser to recognize `[ACTION:...]...[/ACTION]` blocks. Validate inner content against `dispatch-core/src/v3/schema.ts` §12 per-action payload schemas. Wire valid action variants to existing IPC channels (action-variant-ipc.ts, new file). Surface invalid markers as visible chat error messages (no silent drop).

**Action wiring:**

- `send-prompt-to-session` → existing `WorkstationSessionSendPromptRequest` IPC + tmux sendKeys
- `spawn-session` → existing `SpawnIpcController.handleSpawnRequest` (depends on MB-T36 for orchestrator-fired spawn implementation)
- `kill-session` → tmux kill-session + PATCH `/v2/sessions/:name/state` killed
- `pull-handoff-from-session` → GET `/v2/sessions/:name/handoff`
- `assign-task` → existing `WorkstationSessionSendPromptRequest` with taskDescription as prompt + parameters in envelope

Each handler checks `approvalRequired` against session policy resolver (already shipped via `approval-policy-resolver-shim.ts`) before firing. Closes `MB-F-T11A-IPC-ROUTING-ROUND-6`.

**Out-of-scope:** orchestrator session pool management (MB-T37), state file writing (MB-T38).

**Acceptance:** RED probe per action variant exercising marker → IPC dispatch path. GREEN when all 5 action types fire correctly. Self-check on commit body per §3.8 audit.

### MB-T36 — Orchestrator-fired spawn

[MODELED] **Scope:** replace `fireSpawn` placeholder throw at `coarchitect-ipc.ts:365-374` with real implementation. Read `readDispatchMode()` first. When `'ask'`, gate through `SpawnConfirmGate` (existing). When `'auto'`, fire unconditionally via `SpawnIpcController.handleSpawnRequest`. Closes `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED` and pairs with `MB-F-T24-ORCHESTRATOR-FIRED-SPAWN-GATE` closure (extends MB-T24's hard-gate to this path).

**Architecture-independence:** [MODELED] this ticket's scope is identical whether v3.5 HSO architecture or v3.0 API-orchestrator architecture ships. The fireSpawn implementation does not depend on orchestrator substrate. **Could ship pre-spike** if operator wants progress on architecture-independent work, but strict cairn discipline says wait until §4 ratifies to avoid scope-thrash if spike invalidates.

**Out-of-scope:** any change to which surface is calling fireSpawn. The caller — orchestrator-action-handler.ts — receives the implementation pointer. v3.5 wires it from the action-variant-router (§MB-T35-revised). v3.0-fallback wires it from the action-handler-dispatcher.

**Acceptance:** RED probe simulating orchestrator-fired spawn at both ask-mode and auto-mode. GREEN when both paths succeed without throwing. Self-check on commit body.

### MB-T37 — Orchestrator pool manager

[MODELED] **Scope:** new module `packages/dispatch-workstation/src/coarchitect/hso-pool.ts`. Manages the active + standby orchestrator pair per §3.3 transitions. Spawns orchestrators via existing SpawnIpcController. Tracks active vs standby in tile-grid registry under reserved names. Subscribes to active's PTY stream for handoff-trigger detection. Issues handoff via §3.4 policy. Promotes standby to active on trigger or crash.

**Frozen-contract reads:**

- `SpawnIpcController` (MB-T05-shipped)
- `tile-grid-state.ts` (MB-T12-shipped)
- `console-bridge` (CONSOLE-T03-shipped)

**New surface (additive):**

- HSO-namespaced reserved session names (`__orchestrator_active`, `__orchestrator_standby`)
- Pool transition events (active-spawned, standby-ready, handoff-triggered, handoff-complete)
- Tile-grid render specialization for orchestrator tiles (visual distinction; SPECULATIVE — operator may want simple "marked as orchestrator" tag rather than full layout change)

**Out-of-scope:** orchestrator's internal behavior (defined by MB-T41 system prompt). State file management (MB-T38). Self-summary harvesting (MB-T39). Chat panel rendering (MB-T40).

**Acceptance:** RED probes for each §3.3 transition. GREEN when pool correctly maintains 1 active + 1 standby invariant under all transition types including crash. Self-check on commit body. May require small ADR documenting tile-grid render specialization choice.

### MB-T38 — BUILD.md / swarm-state.md write protocol

[MODELED] **Scope:** new module `packages/dispatch-workstation/src/coarchitect/swarm-state-writer.ts`. Subscribes to action-variant-router emissions and to peer-session state changes (via tile-grid registry events). Maintains `<workspace>/swarm-state.md` (path TBD per operator arbitration; SPECULATIVE — likely under `docs/` or workspace root). Writes are atomic (existing `writeAtomicJson` pattern but for markdown).

**BUILD.md scope:** [KNOWN] BUILD.md is operator-only authorship per existing §3.4. This ticket does NOT write to BUILD.md. It only reads BUILD.md (via existing MB-T28 parser) to verify context and only writes to swarm-state.md.

**Frozen-contract preservation:** §3.4 boundary held. Orchestrator does not write to BUILD.md, contracts, schemas, or other frozen surfaces. Writes are scoped to swarm-state.md only.

**Conditional scope expansion:** if SPIKE-HSO-02 ratifies Shape A, this ticket also generates handoff-summary documents at `docs/coordination/handoff-<timestamp>.md` on handoff trigger.

**Out-of-scope:** orchestrator pool management (MB-T37). Self-summary harvesting (MB-T39).

**Acceptance:** RED probes verifying swarm-state.md updates correctly on simulated state transitions. GREEN when format matches HSO system prompt's swarm-state.md schema (defined in MB-T41 artifact). Self-check on commit body.

### MB-T39 — Tier-4 self-summary harvester

[MODELED] **Scope:** new module `packages/dispatch-workstation/src/coarchitect/peer-summary-harvester.ts`. Subscribes to all peer sessions' PTY streams via existing CONSOLE-T01 broadcaster. Detects per-peer quiescence (3-second no-stdout-chunk window; SPECULATIVE; SPIKE-HSO-01 informs threshold). On quiescence, sends summary prompt via existing prompt-injection IPC (MB-T09-shipped). Captures peer response, validates TURN_INCOMPLETE vs summary, hands valid summaries to swarm-state-writer (MB-T38) for inclusion.

**Frozen-contract reads/uses:**

- CONSOLE-T01 broadcaster
- MB-T09 prompt-injection IPC
- MB-T28 BUILD.md parser (read-only, for verifying summary relevance)

**Out-of-scope:** orchestrator session itself (MB-T37). State file writing protocol (MB-T38). Action variant routing (MB-T35-revised).

**Acceptance:** RED probes simulating peer quiescence at varied scenarios. GREEN when summary prompt fires correctly, TURN_INCOMPLETE is honored, valid summaries reach swarm-state-writer. Self-check on commit body. May surface SPIKE-HSO-01 evidence as load-bearing for threshold tuning.

### MB-T40 — Chat-panel rendering refactor

[MODELED] **Scope:** rewrite `chat-panel.tsx` to consume PTY stream from active orchestrator session via existing CONSOLE-T03 primitives, instead of consuming AnthropicChatClient streamMessages output. Operator messages typed in chat panel are sent via prompt-injection IPC (MB-T09-shipped) to active orchestrator. Action variant markers parsed via MB-T35-revised parser; non-marker text rendered as orchestrator chat replies.

**Schema impact:** [KNOWN] none. Existing `chat-content-markers.ts` parsing extended (MB-T35-revised), not replaced. ChatPanel state shape changes minimally.

**Frozen-contract preservation:** chat-panel.tsx is dispatch-workstation territory; refactor is internal. WORKSTATION_CONTRACT.md §X chat-panel surface (if any) preserved.

**AnthropicChatClient disposition:** [MODELED] becomes one-off use for non-orchestrator API calls (predictCommitCreating LLM classifier per `MB-F-T11B-PREDICT-COMMIT-CREATING-IMPL`, or removed entirely if no remaining consumers). Operator-arbitrated at v3.5 ship.

**Out-of-scope:** orchestrator session itself (MB-T37). Pool management. Action variant emission (uses MB-T35-revised parser as a dependency).

**Acceptance:** RED probes simulating operator typing in chat panel + orchestrator response routing. GREEN when full operator-orchestrator-action-loop fires through PTY/IPC instead of API. Self-check on commit body. Existing chat panel tests adapted, not deleted.

### §5-fallback — v3.0 API-orchestrator path tickets (if SPIKE-HSO-01 fails)

[MODELED] If §4 spikes invalidate HSO architecture, these tickets fire instead per the v3.0 path:

- **MB-T35-v3.0** — action variant IPC routing per `MB-F-T11A-IPC-ROUTING-ROUND-6` followup body, consuming orchestrator-output-router output from AnthropicChatClient
- **MB-T36** — orchestrator-fired spawn (architecture-independent; same scope either way)
- **MB-T37-v3.0** — turn-detection layer (ANSI parsing of CC spinner + chevron + halt markers per chat-Claude 2026-05-08 analysis)
- **MB-T38-v3.0** — Tier 4 content policy (per-session byte cap, allocation policy, ANSI handling)
- **MB-T39-v3.0** — orchestrator wake mechanism (subscribe to turn-detection events, schedule buildContext + messages.create() ticks)

[MODELED] 5 tickets v3.0-fallback, mostly same names but different internal architecture. Operator-arbitrated whether to ship v3.0-fallback as v3.0.x or as v3.0 patch directly.

---

## §6 — Frozen surfaces — what this DOES NOT change

[KNOWN] preserved as additive-only:

- `CONDUCTOR_API_CONTRACT.md` v2.2.0 — daemon API surface unchanged. Orchestrator (whether HSO or API) consumes existing endpoints.
- `WORKSTATION_CONTRACT.md` base sections — IPC channel surface preserved. New IPC channels for HSO pool + state-writer additive only.
- `dispatch-core/src/v3/schema.ts` — no changes. Tier4PayloadSchema unchanged. OrchestratorOutputSchema action variants unchanged. SessionContextSnapshotSchema unchanged (it's already permissive enough for either architecture).
- `dispatch-core/src/v2/schema.ts` — no changes.
- All MB-T01–T34 tickets — preserved unchanged.
- BUILD.md operator-authored authority per project instructions §3.4 — orchestrator never writes to BUILD.md. swarm-state.md is a sibling, not an amendment.
- Cairn primitives (project instructions §3.1–§3.8) — apply uniformly to HSO orchestrator and peer sessions.

---

## §7 — Operator decision surface (questions to arbitrate at ratification)

Before §5 ticket bodies anchor in V3.5_TICKETS.md or sibling, operator arbitrates:

**Q-V35-1 — Ratify or revise.** Adopt §1–§4 as ratified pending SPIKE-HSO-01 + SPIKE-HSO-02. SPIKE-HSO-01 dispatch authored only after this Q resolves.

**Q-V35-2 — swarm-state.md location.** Three plausible:
- (a) repository root: `swarm-state.md` (operator-visible alongside README.md)
- (b) `docs/swarm-state.md` (alongside other operator docs)
- (c) workspace ephemera: `.swarm-state.md` (gitignored; per-checkout state)

Recmd: (b). Stays in operator's reading line of sight without polluting root.

**Q-V35-3 — Single file vs directory for swarm-state.** Single `swarm-state.md` (simpler) or `swarm-state/<sessionName>.md` directory (cleaner per-session mapping). Recmd: single file for SPIKE-HSO-01; directory if spike surfaces single-file scaling issues.

**Q-V35-4 — MB-T36 sequence.** [Re-arbitrated 2026-05-08 post-SPIKE-HSO-01 ratification.] MB-T36 may fire post-SPIKE-HSO-01 / pre-SPIKE-HSO-02 — architecture-independent scope per §5.2 (works for both v3.5 HSO and v3.0-fallback paths). Other §5 tickets remain strict-post-SPIKE-HSO-02 + post-MB-T41-operator-authoring. See `docs/build-docs/q-v35-4-re-arbitration.md` (or equivalent path) for full re-arbitration record.

**Q-V35-5 — Substrate default.** Sonnet 4.5, Sonnet 4.6, Haiku 4.5, Opus 4.7? Operator-arbitrated 2026-05-08: Sonnet 4.6 (current Max subscription default). SPIKE-HSO-01 measures viability against this substrate; if Sonnet 4.6 fails acceptance, alternate substrate selection becomes a follow-on spike question.

**Q-V35-6 — Renumber MB-T35-revised vs MB-T35.** Use MB-T35 (replaces v3.0-path version) or new number MB-T42 (preserves provenance)? Recmd: MB-T35-revised explicit name in this doc; rename to MB-T42 at ratification time to avoid confusion in V3_TICKETS.md history.

**Q-V35-7 — Wireframe-operational target.** v3.5 wireframe-operational ship-gate criteria — what defines "done"? Plausible:
- (a) HSO active runs continuous orchestration loop for 60 minutes without crash, handoff completes successfully ≥2 times, action variants fire correctly ≥80% of attempts, no operator intervention required for routine state transitions
- (b) Same as (a) but ≥120 minutes
- (c) Some other threshold

Recmd: (a) for v3.5 dogfood entry. (b) for v3.5.1 ship-confidence.

---

## §8 — Roadmap impact (relative to v3.0)

[MODELED] **If §4 spikes pass:**

- **v3.0 wireframe-operational tickets (MB-T35–T40 v3.0-fallback) replaced** by v3.5 ticket set (MB-T35-revised + MB-T36 + MB-T37 + MB-T38 + MB-T39 + MB-T40 + MB-T41).
- **Net ticket count:** 7 vs 5 v3.0-fallback, but some are smaller (MB-T36 is architecture-independent, MB-T38 is mostly write-discipline scaffolding) and infrastructure is reused.
- **Spike calendar cost — actual:** SPIKE-HSO-01 took ~4-5 hours operator-supervised wall-clock (2026-05-08). SPIKE-HSO-02 estimated ~1-2 hours operator-supervised when authorized.
- **Path α parallel work window (post-SPIKE-HSO-01, pre-SPIKE-HSO-02):** MB-T36 + operator-side authoring (Round 7 cairn evidence harvest, MB-T41 prep notes if operator chooses). ~2-4 hours wall-clock with parallel CC + operator tracks.
- **Wall-clock to v3.5 wireframe-operational:** under two-agent-loop pacing, ~7-9 sessions + 2 spikes. Calendar bounded by review bandwidth per project instructions §2.1.
- **Path-to-marvelous estimated calendar:** v3.5 ship adds ~2-4 weeks vs v3.0-direct path. Net path-to-Group-Alpha-binaries roughly neutral; HSO architecture reduces friction for downstream binaries because orchestrator-as-CC-session is the substrate Cairn-tooling and other Group Gamma work would consume anyway.

[MODELED] **If §4 spikes fail:**

- v3.0-fallback tickets (5) fire. Architecture pivot back to API-orchestrator path.
- Spike cost is sunk but produces evidence-of-failure that informs v3.x.x architecture decisions.
- v3.0 ship calendar matches prior estimate (~3-5 sessions + dogfood).

---

## §9 — Cross-references

- `CONDUCTOR_V3_RESCOPE_DRAFT.md` — v3.0 rescope, partially superseded by §3.5 + §3.7 in this doc on spike pass
- `cairn-arc-synthesis.md` §8 — substrate-portability claim consumed by §3.8
- Round 5 evidence at `~/Downloads/halts/round-5-chat-side-dispatch-error-post-mortem.md` — methodology evidence for HSO substrate selection
- `packages/dispatch-workstation/src/coarchitect/context-builder.ts` — current 6-tier injection; preserved for v3.0 fallback path, replaced for v3.5 path
- `packages/dispatch-workstation/src/coarchitect/tier4-builder.ts` — current Tier 4 assembly; preserved for v3.0 fallback, replaced by MB-T39 for v3.5
- `dispatch-core/src/v3/schema.ts` §12 — OrchestratorOutputSchema action variants from MB-T11-A; consumed by MB-T35-revised marker validation
- `chat-content-markers.ts` — existing parser extended by MB-T35-revised
- `MB-F-T11A-IPC-ROUTING-ROUND-6` — closed by MB-T35-revised
- `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED` — closed by MB-T36
- `MB-F-T24-ORCHESTRATOR-FIRED-SPAWN-GATE` — closed by MB-T36 paired closure

---

**End of v3.5 BUILD draft.**

Operator commits this file to `docs/build-docs/CONDUCTOR_V3.5_BUILD.md` (or operator-chosen path) under operator-authored commit. Subsequent CC work proceeds against this DRAFT-PENDING-SPIKE status: SPIKE-HSO-01 dispatch authoring is gated on operator ratification of §1–§4 and arbitration of §7 questions.

Confidence labels throughout: claims about repo state (MB-T28 100% line cov, frozen contract surfaces, existing ticket dispositions) are KNOWN per 2026-05-08 probe evidence. Claims about HSO behavior (substrate-portability, action variant emission reliability, hot-swap continuity, self-summary fidelity) are MODELED until SPIKE-HSO-01 returns evidence. Claims about empirical thresholds (3-second quiescence, 70% context fullness, 50-turn backstop, 80% acceptance bars) are SPECULATIVE pending spike-informed tuning.
