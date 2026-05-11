# MB-T-HSO-WIRE — HSO autonomy loop wiring + v3.0 path removal

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-11
**Authored under:** §3.4 operator-supervised mechanical translation discipline
**Authoring delegate:** orchestrator session (Opus 4.7), bounded by GATE 2 arbitrations 2026-05-11
**Authoring anchor commit (HEAD at authoring time):** `b312f4a`
**Cairn ladder anchor:** v3.5 critical path Phase 2 per `docs/coordination/v35-operational-readiness-2026-05-10.md` §6.1
**Closes:** v3.5-alpha wiring gap per plan §1.3 ("mechanism shipped + wiring missing + evidence absent")
**Depends on (all merged):** MB-T35-revised (`f8c679d`), MB-T36 (closed), MB-T37 (`38b1a03`), MB-T38 (`70674e1`), MB-T39 (`bb2698f`), MB-T40 (`5704dd2`), MB-T41 (`c88048c`)
**Downstream gates:** Dogfood Phase A → B → C → D → Q-V35-7(a) measurement → v3.5-alpha ship-gate
**Estimated WB count:** 14-17 (range depends on Sub-Q-B resolution)

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchors) first to understand what is binding vs deferred.
2. Read §3 (GATE 3 sub-arbitrations) — three operator decisions are pre-execution prerequisites for specific WBs.
3. Read §4 (WB ladder) for execution order. WBs are construction-order-aware per plan §1.3 Obs-3 (writer → pool).
4. §5-§8 are operational supports — cross-references, self-check, definition-of-done, risk register.

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed in this session; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence. Arbitration outcomes from GATE 2 are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per GATE 2 2026-05-11:

1. Instantiates OrchestratorPoolManager at `app.whenReady()` in `packages/dispatch-workstation/src/main/main.ts`. Pool auto-spawns `__orchestrator_active` at workstation startup.
2. Constructs shared EventEmitter (or equivalent dispatch-event surface) that dispatchActionVariant emits to and SwarmStateWriter + PeerSummaryHarvester subscribe to. Closes T1's finding: "even if dispatchActionVariant were called, no SwarmStateWriter would observe it because the emitter has zero subscribers in src/".
3. Wires SwarmStateWriter (`packages/dispatch-workstation/src/coarchitect/swarm-state-writer.ts`) into production. Writer persists `docs/swarm-state.md` (per plan §5.1 Q-V35-2). Construction order: writer instantiated and subscribed before pool fires.
4. Wires PeerSummaryHarvester (`packages/dispatch-workstation/src/coarchitect/peer-summary-harvester.ts`) into production. Harvester subscribes to per-peer PTY observers + emits on shared EventEmitter when summary captured.
5. Authors pty-stream-relay marker-parse observer in main process. Observer subscribes to `pty-stream-relay.ts:47` `__orchestrator_active` filtered stream, accumulates chunks per MB-T39 multi-chunk-fix pattern, parses action-variant markers via existing `chat-content-markers.ts` (MB-T35-revised), calls dispatchActionVariant on valid markers. Surfaces malformed markers as chat error messages (no silent drop) per MB-T35-revised acceptance.
6. Wires MB-T13 per-session approval-policy interception between parse and dispatch-execute. Approval-required actions queue pending approval; auto-approved actions fire immediately.
7. Injects MB-T41 `packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md` (23,408 bytes per `c88048c`) into `__orchestrator_active` spawn via `--append-system-prompt` argv. Mechanism deferred to Sub-Q-A (§3.1).
8. Removes v3.0 API-orchestrator path entirely. Consumer files removed: `AnthropicChatClient`, `routeOrchestratorOutput`, `orchestrator-card-emitter`, `cardContextCache`, v3.0 `dispatchAction` + `defaultDispatchActionDeps`, v3.0 `orchestrator-action-handler`, `coarchitect:sendAndStream` handler at `coarchitect-ipc.ts:314`. Eight files in total; exact file list verified at WB14 pre-write scan.
9. Cleans up MB-T40 PtyStreamingBridgeImpl per Sub-Q-C disposition (§3.3): either wires class into chat-shell mount.ts as production path OR removes class entirely.
10. Adds probe-C-06 collision detection: workstation startup detects pre-existing `__orchestrator_active` (operator manual `tmux new-session`) and halt-and-surfaces on daemon `SessionAlreadyRegistered` 409. No retry, no overwrite.
11. Wires dispatch-web auth via token-injection per Q-GATE-2-4. Workstation injects auth token into dispatch-web iframe/window on launch. Closes `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` Tier 1 ship-gate blocker. Packaging (X absorb or Y parallel ticket) deferred to Sub-Q-B (§3.2).
12. Runtime-launch smoke verification per CLAUDE.md §4.6 + `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE` — Electron launches cleanly to `WINDOW_READY` sentinel within ~10 seconds with auto-spawned `__orchestrator_active` registered to daemon.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify `packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md` content. Operator territory per plan §5.1; trust `c88048c` authoring per Q-GATE-1=A.
- Does NOT modify frozen surfaces: `REGISTRY.md` §2, `docs/build-docs/CONDUCTOR_API_CONTRACT.md`, `packages/dispatch-core/src/v3/schema.ts` §1-§13, `docs/build-docs/WORKSTATION_CONTRACT.md` §6. If Sub-Q-A=(a) is selected (extend SpawnSessionRequest), the schema modification escalates to operator-arbitrated frozen-contract amendment per CLAUDE.md §2.4 — separately handled, not absorbed.
- Does NOT re-arbitrate any of the 8 GATE 2 decisions. Sub-Q-A/B/C surfaces three open mechanism choices; these are scoped operator decisions, not re-arbitrations of the 8 frozen outcomes.
- Does NOT modify `docs/coordination/v35-operational-readiness-2026-05-10.md`. D-2 plan-doc edits are operator-edit, queued for AFTER ticket-authoring per Q-GATE-2-D-2.
- Does NOT modify `docs/FOLLOWUPS.md` mid-ticket. Followup filings happen at WB17 closure as a single docs commit.
- Does NOT measure Q-V35-7(a) thresholds (60-min / ≥2 handoffs / ≥80%). Measurement is dogfood Phase D, downstream of merge.
- Does NOT modify `c88048c` MB-T41 prompt artifact via wiring work. If prompt defects surface during MB-T-HSO-WIRE WB-cycles, halt-and-surface to operator per §5.1 operator-content-review territory.

---

## §2 — Arbitration anchor (operator-frozen 2026-05-11 GATE 2)

The 8 arbitration decisions resolved during orchestrator GATE 2 bind ticket scope. Cited verbatim or near-verbatim where possible:

### §2.1 — Q-GATE-2-1 (Q-OR-1): PTY-replaces-API, REMOVE v3.0 path

`[KNOWN-OPERATOR-ARBITRATED]`

v3.5 HSO PTY path replaces the v3.0 API path entirely. Eight v3.0 consumer files become removal candidates (enumerated at WB14 pre-write).

Sub-resolution Q-OR-1.b: `[KNOWN-RESOLVED-AT-IPC-LAYER]` chat-panel routes via `window.coarchitectBridge.sendAndStream` → `ipcRenderer.invoke('workstation:session-send-prompt')` (preload.mts:17). v3.0 fallback at chat-panel layer: NONE. preload.mts:16 retention comment ("coarchitect:sendAndStream handler in coarchitect-ipc.ts retained for non-chat-panel callers") becomes obsolete; coarchitect-ipc.ts:314 handler removed in WB14.

Sub-resolution Q-OR-1.c: `[KNOWN-OPERATOR-ARBITRATED]` cost model: PTY-only → Max-plan keychain absorbs orchestrator runtime. CostMeter data-path migrates per `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION`; moved from post-v3.5 → in-scope. PlanUsageRing data-path migrates per `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO`; moved from post-v3.5 → in-scope.

### §2.2 — Q-GATE-2-2 (Q-OR-2): pool auto-spawn at workstation startup

`[KNOWN-OPERATOR-ARBITRATED]`

Sub-resolution Q-OR-2.a: bridge pattern (pool auto-spawn IS in scope; manual-spawn dogfood pattern obsoleted).
Sub-resolution Q-OR-2.b: activation timing = at workstation startup (not flag-gated, not lazy on first chat-panel input).
Sub-resolution Q-OR-2.c: argv injection mechanism — DEFERRED to GATE 3 Sub-Q-A (§3.1 below). Must resolve before WB11.

Construction order: `[KNOWN-PLAN-OBS-3]` writer → harvester → parser observer → approval-policy interception → pool. Pool's `_spawnAndRegister` fires LAST so subscribers exist before HSO emits any marker.

### §2.3 — Q-GATE-2-3 (Q-OR-3): chat-marker-parse on PTY emission (auto-routing)

`[KNOWN-OPERATOR-ARBITRATED]`

Action-variant markers parsed from `__orchestrator_active` PTY stdout auto-route to dispatchActionVariant. Parser host: `packages/dispatch-workstation/src/main/pty-stream-relay.ts` main-process observer. NOT renderer-side `PtyStreamingBridgeImpl` (which is dead-code per D-1; renderer subscribes for UI display only — dispatch fires from main).

MB-T13 per-session approval-policy intercepts between parse-detect and dispatch-execute. Auto-approved actions fire immediately; approval-required actions queue.

Q-OR-3 source attribution: surfaced by T1 (verify-swarm-state sub-session) during HALT-VERIFY-EXTENDED bonus work 2026-05-10 — not pre-existing in plan doc. T1 to be added to plan §7.3 at D-2 plan-doc edit window.

### §2.4 — Q-GATE-2-4: MB-F-DISPATCH-WEB-AUTH-PERSISTENCE = token-injection

`[KNOWN-OPERATOR-ARBITRATED]`

Workstation injects auth token into dispatch-web iframe/window on launch. Implementation site: dispatch-web mount in workstation renderer (BrowserView/iframe); auth injection at mount-time via URL param / postMessage / window-level token-handoff. Tier 1 ship-gate blocker → CLOSED once token-injection wiring lands. Closes `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE`.

Packaging (Sub-Q-B): DEFERRED to GATE 3 (§3.2 below). Must resolve before WB15 (or before separate ticket dispatch if Y).

### §2.5 — Q-GATE-2-5: §A.4.R operational-readiness reading

`[KNOWN-OPERATOR-ARBITRATED]`

§A.4.R v3.5-alpha checklist NOT satisfied by "ticket merged" alone — loop must actually run. 7 merged ☑ rows become CONDITIONAL pending wiring + measurement; 3 ☐ rows ("HSO 60-min", "≥2 handoffs", "≥80% action variants") still NOT MEASURED at MB-T-HSO-WIRE merge time.

This ticket completes the wiring; dogfood Phase D performs the measurement. §A.4.R 9/9 ☑ achievable only after dogfood Phase D evidence captured.

MB-T-HSO-WIRE narrative position: "completing §A.4.R", NOT "new scope beyond §A.4.R".

### §2.6 — Q-GATE-2-6: Q-V35-7(a) thresholds confirmed as stated

`[KNOWN-OPERATOR-ARBITRATED]`

- HSO active runs **60-min** orchestration without crash
- **≥2 successful handoffs** during run
- **≥80% action variants** fire correctly

No drift since post-audit plan `c147037`. These thresholds bind v3.5-alpha ship-gate. This ticket targets achievability (wires the measurement-capable path); does not perform measurement.

### §2.7 — D-1: MB-T40 PtyStreamingBridgeImpl dead-code absorbed into Q-OR-1 removal scope

`[KNOWN-OPERATOR-ARBITRATED]`

Per orchestrator session direct file read 2026-05-11: `PtyStreamingBridgeImpl` class (`packages/dispatch-workstation/src/coarchitect/pty-streaming-bridge.ts:27`) is never instantiated in production code (`grep -rn "new PtyStreamingBridgeImpl" packages/dispatch-workstation/src/` returns ∅). Production chat-shell `mount.ts` mounts ChatShell with `bridge: window.coarchitectBridge` — a contextBridge object exposed by preload.mts that directly satisfies the `StreamingBridge` interface and calls `workstation:session-send-prompt` IPC. PtyStreamingBridgeImpl is dead-code in production.

Disposition deferred to Sub-Q-C (§3.3 below). Default if unresolved: (β) remove (matches "Q-OR-1 v3.0-removal scope absorbs dead-code" framing).

`[KNOWN-CORRECTION]` Plan §7.4 MODELED claim 3 stated "PtyStreamingBridgeImpl is mounted in chat-shell mount.ts in production". This is incorrect; production wiring goes through `window.coarchitectBridge`. Correction queued for D-2 plan-doc edit window.

### §2.8 — D-2: plan-doc edits queued for AFTER GATE 3 ticket-authoring

`[KNOWN-OPERATOR-ARBITRATED]`

Plan-doc (`docs/coordination/v35-operational-readiness-2026-05-10.md`) edits queued for operator-edit AFTER this ticket lands:

- Add Q-OR-3 to plan §7.3 (T1-sourced, 2 candidate paths, RESOLVED 2026-05-11 = (a) chat-marker-parse)
- Promote §7.4 MODELED claims 1+2+3 to KNOWN; correct claim 3 per §2.7 above
- Update §6.3 line 665 zone enumeration: replace "Fix-A/B/C/89/92 zones" with actual 6-zone HIGH/MEDIUM-collision list per T4 sentinel inventory (38 zones cataloged; 6 HIGH/MEDIUM, 32 LOW/test-hook)
- Surface MB-T17 dual-AutopilotLoop finding to plan §7.1 (Q-OR-1 enrichment per T1+T4)
- Append §A.4.R re-arbitration outcome per §2.5 above
- Append §11 "GATE 2 arbitrations resolved 2026-05-11" with all 8 outcomes verbatim

Operator-edit, not delegated. Not in this ticket's WB scope.

---

## §3 — GATE 3 sub-arbitrations REQUIRED before specific WBs

Three operator decisions remain pre-execution prerequisites for specific WBs. Surface at HALT-MBTHSOWIRE-AUTHORED for operator resolution before WB7/WB14/WB15 fires.

### §3.1 — Sub-Q-A: argv injection mechanism for --append-system-prompt

Required before **WB11** (pool wiring with argv injection).

Current `packages/dispatch-workstation/src/main/spawn-handler.ts` `SpawnSessionRequest` interface accepts `{repoPath, sessionName, permissionMode}` per plan §7.2. No argv-extension field exists.

| Option | Mechanism | Frozen-surface touch | WB impact |
|---|---|---|---|
| (a) Extend SpawnSessionRequest | Add optional `appendSystemPromptPath?: string` (or `extraArgs?: readonly string[]`) field | YES — `packages/dispatch-core/src/v3/schema.ts` §1-§13 (frozen). REQUIRES separate operator-arbitrated frozen-contract amendment per CLAUDE.md §2.4 BEFORE WB11. | WB11 + frozen-contract amendment commit (separate from MB-T-HSO-WIRE cairn ladder) |
| (b) Env-var injection | Pool sets `CLAUDE_APPEND_SYSTEM_PROMPT` env before tmux new-session; spawn-controller reads env, appends argv | NO | WB11 only; spawn-handler.ts gains env-read logic (additive, no contract change) |
| (c) Pool-owned spawn-controller | Pool's `_spawnAndRegister` bypasses default spawn-handler; uses its own claude-with-prompt-extension spawn codepath | NO | WB11 only; parallel spawn-control codepath authored inside hso-pool.ts |

Operator decision pending.

### §3.2 — Sub-Q-B: token-injection scope packaging

Required before **WB15** (dispatch-web auth wiring) OR before separate ticket dispatch if (Y).

| Option | Packaging | WB count impact |
|---|---|---|
| (X) Absorb into MB-T-HSO-WIRE | +2-4 WBs (WB15a-d roughly: dispatch-web mount surface verification, token-holding API on workstation side, injection mechanism wiring, integration smoke) | 17 → 19-21 WBs total |
| (Y) Separate `MB-T-DISPATCH-WEB-AUTH-INJECTION` ticket | Parallel-CC track per CLAUDE.md §4.3. Distinct file territories (dispatch-web wiring is renderer-side; HSO wiring is main.ts) → safe parallel. Can land before/alongside/after MB-T-HSO-WIRE. | This ticket stays 15 WBs; separate ticket adds ~5-7 WBs in its own ladder |

`[MODELED]` Dogfood Phase B unblock timing: under (X), Phase B unblocked at MB-T-HSO-WIRE merge; under (Y), Phase B unblocked at whichever of the two tickets ships first (could be earlier under (Y) if dispatched in parallel; could be later if (Y) is deprioritized).

Operator decision pending.

### §3.3 — Sub-Q-C: PtyStreamingBridgeImpl disposition (D-1 absorbed)

Required before **WB14** (v3.0 removal + dead-code cleanup). Default if no decision before WB14 fires: (β).

| Option | Action | Aligns with |
|---|---|---|
| (α) Wire PtyStreamingBridgeImpl into chat-shell mount.ts as production path | Replace `bridge: window.coarchitectBridge` direct passthrough at chat-shell mount.ts with `bridge: new PtyStreamingBridgeImpl(...)`. Class becomes production wiring per MB-T40 authoring intent. | MB-T40 authoring intent; +1-2 WBs |
| (β) Remove PtyStreamingBridgeImpl class entirely | Delete `pty-streaming-bridge.ts`. MB-T40 functional intent (chat-panel routes via workstation:session-send-prompt IPC) preserved by existing contextBridge wiring. | D-1 "absorb into Q-OR-1 removal scope" framing; default; cleanest dead-code disposition |

Operator decision pending. Default = (β) per D-1 framing.

---

## §4 — WB ladder

15-17 WBs depending on Sub-Q-B. Construction-order is plan §1.3 Obs-3 honored: shared EventEmitter → writer → harvester → parser observer → approval-policy → pool (instantiation triggers auto-spawn LAST).

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CLAUDE.md §10.5; per-path `git add` per §2.7; push after each cairn-grammar commit per §2.6.

### WB1 — `spike(MB-T-HSO-WIRE): chat-content-markers parser resilience under PTY chunking`

**Type:** spike
**Scope:** Validate that the existing `chat-content-markers.ts` parser (MB-T35-revised, shipped at `f8c679d`) reliably parses `[ACTION:...]...[/ACTION]` markers from real PTY stdout under chunking-boundary stress. Spike harness spawns a controlled claude session via existing `__orchestrator_active` reserved name, feeds known marker text, captures pty-stream-relay chunks at varying buffer sizes (1B / 16B / 64B / 1KB / one-chunk), verifies parser output matches input.
**Acceptance:** evidence ADR at `docs/coordination/spike-mbthsowire-01-marker-chunking-resilience-<date>.md` with KNOWN/MODELED labels per chunk-size scenario. Bind chunking strategy decision for WB7 parser observer.
**Frozen contracts touched:** none — spike is observational, no production code change.
**Risk:** `[MODELED]` if parser fails on small-chunk-boundary splits, WB7 GREEN scope expands to include accumulator pattern mirroring `peer-summary-harvester.ts:204-211` (MB-T39's TURN_INCOMPLETE first-chunk fast-path).

### WB2 — `red(MB-T-HSO-WIRE): shared dispatch-event EventEmitter contract + SwarmStateWriter subscriber probe`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/coarchitect/probe-mbthsowire-02-emitter-writer-subscribe.spec.ts` asserts: (1) a shared dispatch-event EventEmitter is constructed in main.ts at app.whenReady() before pool; (2) SwarmStateWriter `subscribe(emitter)` method (or equivalent) attaches a listener; (3) emitting an action-variant payload fires the writer's `writeSwarmState` method; (4) the listener attached BEFORE any pool spawn fires (construction order). Probe fails RED because main.ts does not currently construct this emitter or wire the writer (T1's finding).
**Acceptance:** probe asserts the 4 conditions and exits non-zero. Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only.

### WB3 — `green(MB-T-HSO-WIRE): SwarmStateWriter wired into main.ts construction order`

**Type:** green
**Scope:** GREEN implementation at `packages/dispatch-workstation/src/main/main.ts` (new sentinel zone `=== BEGIN: MB-T-HSO-WIRE shared-emitter-and-writer ===`). Construct EventEmitter; instantiate SwarmStateWriter; subscribe writer to emitter; verify subscription before any subsequent wiring. Honor `swarmStatePath = 'docs/swarm-state.md'` per plan §5.1 Q-V35-2.
**Acceptance:** WB2 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none.
**Consumer probes (CLAUDE.md memory):** verify no regression in main.ts startup sequence; existing `WINDOW_READY` sentinel still fires within ~10s.

### WB4 — `red(MB-T-HSO-WIRE): PeerSummaryHarvester subscriber + emitter contract probe`

**Type:** red
**Scope:** RED probe at `probe-mbthsowire-04-harvester-subscribe.spec.ts` asserts: harvester subscribes to peer PTY observers (via existing `IConsoleBroadcaster.addStdoutObserver` per MB-T37 contract); harvester emits captured summaries on the shared dispatch-event emitter; subscription order = writer-already-subscribed-then-harvester-subscribes. Probe fails RED.
**Acceptance:** probe RED with the 3 conditions. Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only.

### WB5 — `green(MB-T-HSO-WIRE): PeerSummaryHarvester wired into main.ts construction order`

**Type:** green
**Scope:** GREEN at main.ts sentinel zone (extend WB3 zone): instantiate PeerSummaryHarvester; wire to peer PTY observer fan-out + emit on shared emitter. Honor MB-T39 multi-chunk fix per `bb4c47c`.
**Acceptance:** WB4 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none.

### WB6 — `red(MB-T-HSO-WIRE): pty-stream-relay marker-parse observer probe`

**Type:** red
**Scope:** RED probe at `probe-mbthsowire-06-relay-marker-parse.spec.ts` asserts: pty-stream-relay observer subscribes to `__orchestrator_active` filtered stream (per `pty-stream-relay.ts:47`); chunks pass through accumulator + `chat-content-markers.ts` parser; valid `[ACTION:...]...[/ACTION]` markers invoke dispatchActionVariant with the parsed payload; malformed markers emit chat error (no silent drop); approval-policy interception is invoked between parse and dispatch (gate placeholder). Probe fails RED — observer does not exist.
**Acceptance:** probe RED with the 5 conditions. Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only. References frozen MB-T35-revised marker grammar by reading, not modifying.

### WB7 — `green(MB-T-HSO-WIRE): pty-stream-relay marker-parse observer + dispatchActionVariant caller wired`

**Type:** green
**Scope:** GREEN at `packages/dispatch-workstation/src/main/pty-stream-relay.ts` (extend existing module's `__orchestrator_active` filter with new observer; or author sibling module `packages/dispatch-workstation/src/main/action-marker-router.ts` consuming pty-stream-relay output — operator may prefer separation of concerns; flag at HALT-WB7-PRE-COMMIT). Chunk accumulator pattern mirrors MB-T39 multi-chunk-fix per WB1 spike binding. Invokes dispatchActionVariant on valid markers. Wires approval-policy gate placeholder (filled in WB9).
**Acceptance:** WB6 probe flips RED → GREEN. Commit body Q1-Q9. SURFACE HALT-WB7-PRE-COMMIT for operator review of separation-of-concerns choice (extend pty-stream-relay vs. sibling action-marker-router).
**Frozen contracts touched:** none. Reads existing `chat-content-markers.ts` per MB-T35-revised — no modification.

### WB8 — `red(MB-T-HSO-WIRE): MB-T13 approval-policy interception probe`

**Type:** red
**Scope:** RED probe at `probe-mbthsowire-08-approval-policy-gate.spec.ts` asserts: dispatchActionVariant invocation routes through MB-T13 per-session approval-policy resolver BEFORE action handler executes; auto-approved policy fires action immediately; approval-required policy queues action + emits operator-visible pending-approval state; rejection clears the queued action without firing. Probe fails RED — gate is placeholder in WB7.
**Acceptance:** probe RED with the 4 conditions. Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only. References frozen MB-T13 approval-policy resolver shim per `approval-policy-resolver-shim.ts` by reading.

### WB9 — `green(MB-T-HSO-WIRE): MB-T13 approval-policy interception wired`

**Type:** green
**Scope:** GREEN: replace WB7 placeholder gate with real MB-T13 approval-policy resolver call. Honor existing `MB-F-T13-SETTINGS-DEFAULT-POLICY-INTEGRATION` Tier 2 followup framing — default policy resolution is structural (SQL DEFAULT 'medium' + workstation-side resolver fallback).
**Acceptance:** WB8 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none. MB-T13 approval-policy resolver is shipped + frozen-shim-wrapped.

### WB10 — `red(MB-T-HSO-WIRE): OrchestratorPoolManager auto-spawn at app.whenReady probe`

**Type:** red
**Scope:** RED probe at `probe-mbthsowire-10-pool-autospawn.spec.ts` asserts: at app.whenReady(), OrchestratorPoolManager is instantiated (after writer + harvester + observer + policy all wired); pool calls `_spawnAndRegister` with reserved name `__orchestrator_active`; spawn argv includes `--append-system-prompt <path to orchestrator.md>`; the spawned session registers with daemon and appears in tile-grid. Probe fails RED — pool does not currently auto-instantiate.
**Acceptance:** probe RED with the 4 conditions. Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only.
**Sub-Q-A blocker:** WB11 cannot proceed until Sub-Q-A (§3.1) resolves the argv injection mechanism. Probe uses a placeholder for the argv mechanism — flagged at HALT-WB10-PRE-COMMIT.

### WB11 — `green(MB-T-HSO-WIRE): OrchestratorPoolManager auto-spawn + argv injection wired`

**Type:** green
**Scope:** GREEN at main.ts (extend sentinel zone): instantiate OrchestratorPoolManager AFTER writer + harvester + observer + policy. Pool fires auto-spawn at app.whenReady() — construction order writer→harvester→parser→policy→pool honored. Argv injection mechanism implemented per Sub-Q-A operator resolution: (a) extends SpawnSessionRequest + requires separate frozen-contract amendment OR (b) env-var injection OR (c) pool-owned spawn-controller.
**Acceptance:** WB10 probe flips RED → GREEN. Commit body Q1-Q9. SURFACE HALT-WB11-PRE-COMMIT operator review of Sub-Q-A mechanism implementation.
**Frozen contracts touched:** conditional on Sub-Q-A:
- (a) MODIFIES `packages/dispatch-core/src/v3/schema.ts` §1-§13 SpawnSessionRequest → requires separate `contract(MB-T-HSO-WIRE-argv): extend SpawnSessionRequest` cairn-grammar commit per CLAUDE.md §2.4 BEFORE WB11 GREEN
- (b) or (c): no frozen-contract touch
**Anti-pattern guards:** pool MUST halt-and-surface on daemon `SessionAlreadyRegistered` 409 (probe-C-06 from WB12). No retry, no overwrite.

### WB12 — `red(MB-T-HSO-WIRE): probe-C-06 __orchestrator_active collision-with-manual-spawn detection`

**Type:** red
**Scope:** RED probe at `probe-mbthsowire-12-collision-detection.spec.ts` asserts: when operator manual `tmux new-session -s __orchestrator_active` exists before workstation startup, pool's `_spawnAndRegister` detects `SessionAlreadyRegistered` daemon 409 + halt-and-surfaces (does not retry, does not overwrite, does not silently no-op). Surfaces operator-visible error: "Manual __orchestrator_active session exists; pool cannot auto-spawn. Kill the manual session OR disable pool auto-spawn." Probe fails RED — collision detection is placeholder in WB11.
**Acceptance:** probe RED. Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only.

### WB13 — `green(MB-T-HSO-WIRE): collision detection halt-and-surface wired`

**Type:** green
**Scope:** GREEN: pool's `_spawnAndRegister` checks daemon `/v2/sessions/__orchestrator_active` BEFORE attempting tmux spawn; on 409 (already-registered), emit operator-visible error to workstation + halt-and-surface; do NOT retry. Operator must resolve manually.
**Acceptance:** WB12 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none.

### WB14 — `refactor(MB-T-HSO-WIRE): v3.0 path removal + PtyStreamingBridgeImpl dead-code cleanup`

**Type:** refactor (asserts behavior preservation per CLAUDE.md §2.3; subject to §2.1 verification)
**Scope:** Remove v3.0 path consumer files (8 total; verified pre-write at WB14):
- `AnthropicChatClient` (location TBD pre-write; likely `packages/dispatch-workstation/src/coarchitect/` or similar)
- `routeOrchestratorOutput`
- `orchestrator-card-emitter`
- `cardContextCache`
- v3.0 `dispatchAction` + `defaultDispatchActionDeps`
- v3.0 `orchestrator-action-handler`
- `coarchitect:sendAndStream` IPC handler at `coarchitect-ipc.ts:314`
- preload.mts:16 retention comment removed; comment+code at preload.mts:11 updated to remove "was: coarchitect:sendAndStream send" reference

Plus per Sub-Q-C resolution:
- (α) wire PtyStreamingBridgeImpl into chat-shell mount.ts — replace `bridge: window.coarchitectBridge` direct passthrough at mount.ts auto-mount block with `bridge: new PtyStreamingBridgeImpl(...)` — OR
- (β default) remove `packages/dispatch-workstation/src/coarchitect/pty-streaming-bridge.ts` entirely — chat-shell continues using `window.coarchitectBridge` direct

**Acceptance:** all 5 workstation packages typecheck cleanly per CLAUDE.md §4.4; pre-WB13 test suite passes; runtime-launch smoke shows `WINDOW_READY` sentinel within ~10s. Commit body Q1-Q9 with explicit `[KNOWN]` claims of behavior preservation per removed file. SURFACE HALT-WB14-PRE-COMMIT for operator review of the 8-file removal list + Sub-Q-C disposition.
**Frozen contracts touched:** none — removal is dispatch-workstation territory; no contract modifications.
**Behavior-preservation claims:** each removed file's responsibilities must be either (a) absorbed by v3.5 PTY path now wired (WBs 1-13) OR (b) genuinely-orphaned dead code with no remaining consumer. Commit body lists each per-file disposition with `[KNOWN]` evidence (grep for callers).
**Risk:** `[MODELED-HIGH]` v3.0 path may have non-obvious consumers (e.g., test fixtures, integration tests). Pre-write `git grep` for each removed symbol's consumers; any unexpected consumer → halt-and-surface, not silent absorption.
**Followup closures (queued for WB17):**
- `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` (Tier 3) → CLOSED (CostMeter data-path migrated)
- `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2) → CLOSED (PlanUsageRing data-path migrated)

### WB15 — `green(MB-T-HSO-WIRE): dispatch-web token-injection wiring` [CONDITIONAL on Sub-Q-B=X]

**Type:** green (multi-step; may decompose to WB15a-d at HALT-WB15-PRE-COMMIT per Sub-Q-B operator resolution)
**Scope (if Sub-Q-B=X absorb):** workstation holds auth token (mechanism: probable extension of MB-T08 onboarding-shipped API-key path OR new auth-token bridge); dispatch-web mount in workstation renderer (BrowserView/iframe — site verified pre-write); auth injection at mount-time via URL param / postMessage / window-level handoff; dispatch-web accepts injected auth (vs requiring its own login flow).
**Acceptance:** dogfood Phase B re-execution shows dispatch-web rendered with auth bypassed; `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` Tier 1 → CLOSED. Commit body Q1-Q9.
**Frozen contracts touched:** `[MODELED-RISK]` may touch `WORKSTATION_CONTRACT.md` §6 if a new IPC channel is needed for token-handoff — operator-arbitrated frozen-contract amendment required separately, NOT absorbed.
**If Sub-Q-B=Y parallel ticket:** this WB is SKIPPED; separate `MB-T-DISPATCH-WEB-AUTH-INJECTION` ticket fires. MB-T-HSO-WIRE proceeds WB13 → WB16 (renumber).

### WB16 — `green(MB-T-HSO-WIRE): runtime-launch smoke verification`

**Type:** green (smoke harness; verifies WB1-15 integration)
**Scope:** per CLAUDE.md §4.6 + `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE`: `pnpm --filter dispatch-workstation exec electron dist/main/main.js` from fresh `pnpm --filter dispatch-workstation build`. Observe `WINDOW_READY` sentinel within ~10s. Observe `__orchestrator_active` auto-spawned + registered with daemon. Observe SwarmStateWriter writes `docs/swarm-state.md`. Observe PeerSummaryHarvester operational (depends on a peer existing — may need test fixture).
**Acceptance:** all 4 sentinels observed within smoke window. Commit body Q1-Q9.
**Frozen contracts touched:** none.
**Pre-existing-failure baseline (CLAUDE.md §4.5):** `MB-F-COARCHITECT-IPC-LINE-485-...` Tier 2 + `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` Tier 3 — NOT re-diagnosed per §4.5 discipline. Smoke evaluates against post-WB15 state, not against pre-existing baseline.

### WB17 — `docs(MB-T-HSO-WIRE): findings doc + followup closures + MB-T-HSO-WIRE closure`

**Type:** docs
**Scope:** author `docs/coordination/mb-t-hso-wire-findings-<date>.md` per mb-t40-findings-2026-05-09.md format anchor: I What Shipped / II Q-MBTHSOWIRE Dispositions / III Ambiguity Ratifications / IV Probe Distribution / V Architecture Notes / VI Documentation Drift Acknowledgments / VII Consumer Non-Regression / VIII WB Skip Rationale (e.g., if Sub-Q-B=Y) / IX New Followups Filed.

Followup file/close updates to `docs/FOLLOWUPS.md`:
- CLOSE `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` (Tier 3) per WB14 CostMeter migration
- CLOSE `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2) per WB14 PlanUsageRing migration
- CLOSE `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` (Tier 1) per WB15 token-injection (if Sub-Q-B=X) OR move closure to parallel ticket (if Sub-Q-B=Y)
- File any NEW followups surfaced during WBs 1-16

**Acceptance:** findings doc + FOLLOWUPS.md commit lands; HEAD at MB-T-HSO-WIRE closure cited in plan §A.4.R update (D-2 operator-edit window).
**Frozen contracts touched:** none — docs only.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED by this ticket

| Followup | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` | Tier 3 | CostMeter data-path migrates to PTY-scrape per v3.0 removal | WB14 |
| `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` | Tier 2 | PlanUsageRing data-path migrates per v3.0 removal | WB14 |
| `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` | Tier 1 | Token-injection wiring | WB15 (if Sub-Q-B=X) or separate ticket (if Sub-Q-B=Y) |
| (NEW) `MB-F-MBT40-PTYSTREAMINGBRIDGEIMPL-DEADCODE-IN-PROD` | Tier 3 (absorbed) | D-1 → Sub-Q-C resolution; no separate row filed | WB14 |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB1 spike may discover chunking-boundary parse failures → new Tier 2 followup if accumulator pattern needs to be authored bespoke vs. mirroring MB-T39
- WB7 separation-of-concerns choice (extend pty-stream-relay vs sibling action-marker-router) may surface architecture-decision rationale → ADR at `docs/coordination/`
- WB11 (Sub-Q-A=a) requires frozen-contract amendment to SpawnSessionRequest → separate operator-arbitrated commit per CLAUDE.md §2.4 + ADR
- WB14 may discover non-obvious v3.0 consumers (test fixtures, integration tests) → if surfaced, halt-and-surface; potential scope expansion or new Tier 2 followup
- WB16 smoke may surface MB-T17 dual-AutopilotLoop instance issues per T1+T4 finding → if surfaced, file Tier 2 followup

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| MB-T35-revised | `f8c679d` | `chat-content-markers.ts` marker grammar — KNOWN; bind WB6 probe scope |
| MB-T37 | `38b1a03` | `hso-pool.ts` ConsoleIpcController + addStdoutObserver contract — KNOWN; bind WB7 + WB11 |
| MB-T38 | `70674e1` | `swarm-state-writer.ts` writeSwarmState + writeHandoffDoc; D9 separate-call-stack discipline — KNOWN; bind WB3 |
| MB-T39 | `bb2698f` (+ `bb4c47c` multi-chunk fix) | `peer-summary-harvester.ts` TURN_INCOMPLETE + multi-chunk accumulator — KNOWN; bind WB5 + WB7 |
| MB-T40 | `5704dd2` | `pty-stream-relay.ts` __orchestrator_active filter — KNOWN; bind WB7 |
| MB-T41 | `c88048c` | `orchestrator.md` content — operator territory per §5.1; NOT re-read here |

### §5.4 — Plan-doc anchors (read at WB1 start)

- `docs/coordination/v35-operational-readiness-2026-05-10.md` §1.3 (HSO Wave 1+2 production wiring status — KNOWN snapshot pre-MB-T-HSO-WIRE)
- §5 (operator-only outstanding work — items 1-6, 5 of which resolved at GATE 2)
- §6.1 (critical path) + §6.3 (parallel-CC opportunities)
- §7.3 (risks — likelihood + impact, mitigation per row)
- §7.4 (MODELED claims — claims 1+2 promoted at GATE 2; claim 3 CORRECTED at GATE 2; claim 4 confirmed at Q-GATE-2-6)

### §5.5 — T4 sentinel-zone inventory (read at WB1, WB3, WB7, WB11 start)

`[KNOWN-PRESERVED-IN-T4-PANE]` T4 sub-session (commit-plan-doc) cataloged 38 sentinel zones in `main.ts`; 6 HIGH/MEDIUM-collision identified for MB-T-HSO-WIRE Phase 1 read scope (NOT just plan §6.3's "Fix-A/B/C/89/92" colloquial framing). The 6 zones: MB-T40 PTY relay, §C.5 tile token scraper, MB-T17 autopilot IPC, MB-T09/T11 IPC handlers, plus 2 others to be re-confirmed at T4 GATE 3 dispatch. T4 holding for GATE 3 dispatch; will surface full enumeration when dispatched.

---

## §6 — Self-check protocol per WB commit (CLAUDE.md §10.5)

Every cairn-grammar commit (red / green / spike / contract / refactor) carries a Q1-Q9 self-check block in the commit body. Standard answers for this ticket below; per-WB deviations flagged in WB scope.

| Q | Standard answer for MB-T-HSO-WIRE WBs |
|---|---|
| Q1 — API verified by spike? | WB1 spike binds chunking strategy for WB7. Other WBs cite WB1 spike + MB-T35-revised + MB-T39 multi-chunk fix as API anchors. |
| Q2 — Test exercises behavior or MOCKS? | RED + GREEN pairs use real EventEmitter + real pty-stream-relay (no mocks for the dispatch path). Approval-policy resolver uses MB-T13 frozen shim (real call). |
| Q3 — If implementation deleted, test passes? | NO (RED probes fail; GREEN implementations make them pass). |
| Q4 — Anything outside contract spec? | Each WB's "Frozen contracts touched" section lists explicit boundaries. WB11 (Sub-Q-A=a) is the only WB that may touch a frozen contract; surfaced as separate amendment commit. |
| Q5 — Modified contract without approval? | NO. WB11 (Sub-Q-A=a) requires separate operator-arbitrated frozen-contract amendment commit BEFORE WB11 GREEN per CLAUDE.md §2.4. |
| Q6 — Any unlabeled claim in commit body? | All claims labeled `[KNOWN]` / `[MODELED]` / `[SPECULATIVE]` per CLAUDE.md §2.2. |
| Q7 — Touched files another parallel session might modify? | Answer against actual `git status` per CLAUDE.md §2.7. main.ts is shared territory — only one sub-session may write at a time during WB execution. |
| Q8 — Bypass PATCH /v2/sessions/:name/state? | NO. State mutations honor existing v2 contract. |
| Q9 — Work during unauthorized halt? | NO. HALT-WB7-PRE-COMMIT + HALT-WB11-PRE-COMMIT + HALT-WB14-PRE-COMMIT + HALT-WB15-PRE-COMMIT all gate operator-review before commit. |

### §6.1 — Per-WB HALT-PRE-COMMIT inventory

WBs requiring operator HALT-PRE-COMMIT review before commit fires (in addition to the standard cairn ladder cadence):

- **WB7**: separation-of-concerns choice (extend pty-stream-relay vs. sibling action-marker-router)
- **WB11**: Sub-Q-A mechanism implementation review (especially (a) requires prior frozen-contract amendment)
- **WB14**: 8-file v3.0 removal list verification + Sub-Q-C disposition (α wire vs β remove)
- **WB15**: Sub-Q-B confirm absorb-X scope + dispatch-web mount surface identification + token-handoff IPC channel review (potentially frozen-surface)

---

## §7 — Definition-of-done

MB-T-HSO-WIRE is COMPLETE when ALL of the following are KNOWN-evidence-captured:

1. All 14-17 WBs commit + push per CLAUDE.md §2.6 (per-commit-push discipline). `git log --oneline origin/main..HEAD` returns empty after each WB push.
2. WB16 runtime-launch smoke shows: `WINDOW_READY` sentinel within ~10s + `__orchestrator_active` auto-spawned + daemon-registered + `docs/swarm-state.md` written after first action emission.
3. WB17 findings doc shipped at `docs/coordination/mb-t-hso-wire-findings-<date>.md` per mb-t40-findings format.
4. Followups CLOSED per §5.1 (with WB14 + WB15 anchors).
5. No frozen-contract amendment without separate operator-arbitrated `contract:` commit per CLAUDE.md §2.4.
6. All 5 workstation packages typecheck cleanly per CLAUDE.md §4.4 verification ordering.
7. Sub-Q-A/B/C decisions captured in commit bodies + findings doc.

### §7.1 — What MB-T-HSO-WIRE completion does NOT achieve

Per Q-GATE-2-5 (operational-readiness reading):

- Does NOT measure Q-V35-7(a) thresholds. That is dogfood Phase D's responsibility.
- Does NOT close §A.4.R checklist 9/9 ☑. 3 measurement rows still ☐ until dogfood Phase D evidence.
- Does NOT ship v3.5-alpha. v3.5-alpha ship-gate requires MB-T-HSO-WIRE merge + dogfood Phase A/B/C/D + Q-V35-7(a) thresholds met.

---

## §8 — Risk register

### §8.1 — Known risks (per plan §7.3 anchor)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wiring MB-T37/T38/T39 surfaces integration issues unit tests didn't catch | Medium | High — could extend MB-T-HSO-WIRE 50-100% beyond estimate | Per CLAUDE.md §4.6: runtime-launch smoke at WB16; consumer probes per WB per (CLAUDE.md memory). |
| Tier 4 buildTier4Payload races with PeerSummaryHarvester writes | Medium | Medium | WB1 spike + WB5 GREEN consumer probe verify Tier 4 fan-out semantics. |
| addStdoutObserver fan-out ordering between wirePtyRelay + tile-token-scraper + new pool subscriber | Low | Medium | Subscribers are non-redirecting per `hso-pool.ts:5-9`; ordering invariants documented per MB-T37 ConsoleIpcController contract. |
| tmux `__orchestrator_active` collision (operator manual-spawn coexists) | Medium | High | WB12 + WB13 probe-C-06 + halt-and-surface on 409. |
| v3.0 + v3.5 paths fire same action twice (during transition) | Low post-WB14 | High | WB14 v3.0 removal is atomic-per-file; no transition period of dual-fire. |
| MB-T41 prompt content has gaps not surfaced by SPIKE-HSO-01/02 | Low (per Q-GATE-1=A trust) | High | Operator content review per Q-GATE-1=A skipped; risk accepted. If gaps surface at WBs, halt-and-surface to operator. |
| MB-T17 dual-AutopilotLoop instance per T1+T4 finding | `[MODELED]` Medium | Medium | If surfaced at WB16, file Tier 2 followup; not in MB-T-HSO-WIRE scope to fix. |
| Frozen-contract amendment chain (WB11 Sub-Q-A=a) introduces upstream coordination overhead | Medium (if (a) selected) | Medium | Separate `contract:` cairn-grammar commit per CLAUDE.md §2.4 BEFORE WB11 GREEN; operator-arbitrated. |

### §8.2 — Escalation triggers (HALT all work + surface)

Per CLAUDE.md §2.10 + orchestrator GATE-2 escalation list:

- Frozen contract amendment required mid-WB (other than the WB11 Sub-Q-A=a pre-planned amendment)
- Operator-territory work surfaces (system prompt content review, strategic decisions, ticket scope changes beyond Sub-Q-A/B/C)
- Cross-session conflict (two sub-sessions writing to `main.ts`)
- Anti-fabrication concern (unverifiable claim from sub-session)
- Test failure outside CLAUDE.md §4.5 pre-existing baseline

### §8.3 — Anti-patterns to avoid

- ❌ Skipping construction order: pool MUST be instantiated AFTER writer + harvester + observer + policy
- ❌ Mocking pty-stream-relay or `chat-content-markers.ts` parser in production wiring (mocks allowed in RED probes only)
- ❌ Silent absorption of unexpected v3.0 consumers at WB14 — always halt-and-surface
- ❌ Force-push to origin/main (CLAUDE.md commit-safety protocol)
- ❌ `git add -A` or `git add .` (CLAUDE.md §2.7 per-path discipline)
- ❌ Chained operator-arbitrated actions behind verification commands (CLAUDE.md §4.2)
- ❌ Re-diagnosing pre-existing test failures per CLAUDE.md §4.5
- ❌ `MB_TEST_HOOKS=1` gates ANY production wiring (test-hook regions are test-only per §3.3 sentinel zones)
- ❌ Modifying `c88048c` MB-T41 prompt as part of wiring debugging
- ❌ "Useful prep" during HALT states (CLAUDE.md §2.5)

---

## §9 — Closing posture

`[KNOWN-AUTHORED-UNDER-§3.4-OPERATOR-SUPERVISED-MECHANICAL-TRANSLATION]`

This ticket body translates the 8 operator-frozen GATE 2 arbitration decisions into a WB ladder. The arbitrations are binding; scope decisions per WB are bounded by them. Sub-Q-A/B/C surface three remaining operator decisions as pre-WB blockers, not as re-arbitrations of GATE 2 outcomes.

The cairn methodology applies throughout: red→green→Q1-Q9→commit→push per WB; per-path `git add`; halt-and-surface for any new arbitration question; no frozen-contract amendment without explicit operator authorization.

Operator review at HALT-MBTHSOWIRE-AUTHORED gates Phase 4 (GATE 4) execution. T4 (commit-plan-doc) holds for dispatch with sentinel-zone inventory + 6-zone HIGH/MEDIUM-collision context. T2 (verify-chat-mount) alive + idle, available for parallel-CC dispatch if a sub-track parallelizes cleanly. T3 (c5-ticket-wb1) post-forward-fix standing by.

**End MB-T-HSO-WIRE build doc.**
