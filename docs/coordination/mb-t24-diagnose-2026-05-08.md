# MB-T24 Phase 1 Diagnose — Auto/Ask mode toggle + spawn-flow gating

**Authored:** 2026-05-08 (Terminal A, MB-T24 Phase 1)
**Worktree:** `~/Desktop/Automata/foxworks-dispatch-mbt24/` (branch `mbt24-worktree`)
**Base SHA:** `c6ee1fa` (post-Round-3 cleanup; HEAD on `main` at session start)
**Sibling sessions:** B (`mbt25-worktree`, MB-T25 plan-usage), C (`mbt28-worktree`, MB-T28 BUILD.md parser), D (`mbt34-worktree`, MB-T34 Anthropic API client). Per per-session-worktree isolation, content-sweep + working-tree-blocking + index-race are structurally impossible (Round 4 §3.12 pivot). Push-rebase contention is the new cross-session failure mode.

---

## I. Scope summary

MB-T24 lands a workstation-wide **dispatch-mode toggle** (`Auto` | `Ask`) in the chat-shell header-bar:

- **Auto** — orchestrator-fired actions fire without per-action operator confirmation (still respects per-session BUILD.md `Approval policy`).
- **Ask** — orchestrator-fired actions surface a quick-pick decision in chat before firing.
- Toggle state persists across workstation restart.

**Critical surface inventory finding** (see §IV-Q-MBT24-5): the prompt §2 claim that "spawn flow logic exists and is operational" — i.e. that an existing spawn-decision code path can simply be gated by reading the new toggle — is **[NOT KNOWN] / [INACCURATE]** against current code. See §III-D for the evidence trail. Wiring MB-T24's gate semantics requires a deliberate architectural choice; surfaced as Q-MBT24-5 (REQUIRES OPERATOR ARBITRATION).

---

## II. Surface inventory

Read cover-to-cover at `c6ee1fa`:

### II-A. `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx` (183 lines)

[KNOWN] Layout:

- Outer reserved zone: `=== BEGIN: MB-T22 header-bar extension point (MB-T26/MB-T27 territory) ===` (chat-shell.tsx:52-81 props block, 116-160 DOM block).
- Nested zones inside reserved zone (already landed):
  - `=== BEGIN: MB-T26 cost-meter slot prop ===` (61-69) + DOM (125-159).
  - `=== BEGIN: MB-T27 model-mix slot prop ===` (70-80) + DOM (145-157).
- Header-bar element at 132-158 with `data-testid="chat-shell-header-bar"`, `role="toolbar"`, `aria-label="Chat shell header"`, flex-row layout, `gap: '8px'`, `padding: '4px 8px'`.
- Slot ordering documented at chat-shell.tsx:130 + `t26-t27-coord.md:75-80`:
  ```
  [plan-usage MB-T25 future] | [cost-meter MB-T26] | [model-mix MB-T27]
  ```

MB-T24's slot lands as a SIBLING zone inside the same outer MB-T22 reserved zone, alongside MB-T26 and MB-T27. The new ordering must be operator-decided (see Q-MBT24-4).

### II-B. `packages/dispatch-workstation/src/chat-shell/mount.ts` (299 lines)

[KNOWN] Pattern:

- `MountChatShellOptions` (84-116) hosts `renderCostMeter?: () => ReactNode` (98) and `renderModelMix?: () => ReactNode` (114).
- `resolveRenderCostMeter(opts)` (213-221) returns `(() => ReactNode) | undefined`. Resolution order: explicit override → bridge-derived closure → undefined.
- `resolveRenderModelMix(opts)` (237-263) mirrors the pattern; reads `window.workstationBridge.onSpawnResult` for path 2.
- `mountChatShell` (266-285) calls both `resolveRenderCostMeter(opts)` + `resolveRenderModelMix(opts)`, passes both into `root.render(createElement(ChatShell, { tabs, renderCostMeter, renderModelMix }))`.
- `CoarchitectBridge` interface (60-70) extends `StreamingBridge` and adds optional `onCostUpdate?` (Q-MBT26-5=d push-based bridge method).

MB-T24's wiring mirrors the cost-meter pattern: a `resolveRenderDispatchModeToggle(opts)` that resolves either an explicit override or a closure built from bridge.getDispatchMode/setDispatchMode (per Q-MBT24-1 disposition).

### II-C. `packages/dispatch-workstation/src/chat-shell/cost-meter.tsx` (71 lines)

[KNOWN] Component structure:

- `CostMeterBridge` interface (23-29) — single method `onCostUpdate`.
- `CostMeterProps` (31-34) — optional `bridge?: CostMeterBridge | null`.
- Pure-render `formatCost` helper (36-39).
- Component (48-70): `useEffect` subscribes at mount, calls cleanup on unmount; `useState<number | null>` for the displayed value; renders `chat-shell-cost-meter-slot` wrapper + `chat-shell-cost-meter-value` span.

This is the structural template MB-T24's `dispatch-mode-toggle.tsx` mirrors — same shape (bridge interface + props + component) but with two methods (get + set) instead of one (subscribe).

### II-D. `packages/dispatch-workstation/src/main/preload.mts` (179 lines)

[KNOWN] Existing `coarchitectBridge` exposure (1-56):

- Domain methods: `fetchHistory`, `postMessage`, `sendAndStream`, `getBuildDocConfig` / `setBuildDocConfig` / `clearBuildDocConfig`, `onStreamChunk` / `onStreamDone` / `onStreamError`.
- MB-T26 zone (32-55): `onCostUpdate` (push-based, with internal initial fetch via `coarchitect:getDailyCost` + subscription to `coarchitect:cost-update`).

[KNOWN] `workstationBridge` exposure (75-142): houses spawn-related and per-session-state methods (`getSessionApprovalPolicy`, `putSessionApprovalPolicy`, `getSessionAutopilotEnabled`, `setSessionAutopilotEnabled`, etc.).

[KNOWN] `commitsBridge` exposure (162-179): single method `listCommits`.

MB-T24's two new methods (`getDispatchMode` + `setDispatchMode`) live inside a new `=== BEGIN: MB-T24 dispatch-mode bridge ===` zone. **Open question:** which bridge object? `coarchitectBridge` (chat domain), `workstationBridge` (workstation-state methods), or a NEW `dispatchModeBridge`? See Q-MBT24-6 below (added during inventory).

### II-E. `packages/dispatch-workstation/src/main/coarchitect-ipc.ts` (441 lines)

[KNOWN] Per-handler inventory of the `sendAndStream` path (221-440):

- 219 lines of streaming logic (mock-vs-live branching, history+context wiring, Tier 4 fan-out, action-fire routing).
- `routeOrchestratorOutput` (316) returns one of `{kind: 'card-or-multi-choice'}`, `{kind: 'action-fire-without-card'}`, `{kind: 'no-card'}`, or similar (full enum in `orchestrator-output-router.ts`).
- **Action-fire route** (334-432): consults `dispatchAction` with deps `fireSendPrompt`, `fireSpawn`, `fireKill`, `firePullHandoff`, `startIntent`. **`fireSpawn` (365-374) throws unconditionally** with the message `'orchestrator-fired spawn-new-session not wired in v3.0 (MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED)'`.
- MB-T26 cost-meter zone (13-19, 118-171, 178-191) is independent of the action-fire route.

[KNOWN, anti-fabrication evidence] **There is NO existing dispatch-mode-aware quick-pick gate in coarchitect-ipc.ts.** The prompt §2 claim "the spawn surface behavior (Auto bypasses, Ask quick-picks) is implemented in coarchitect-ipc.ts spawn flow logic" does not match the code at `c6ee1fa`. See §III-D evidence.

### II-F. Existing QUICK_PICK rendering surface

[KNOWN] `packages/dispatch-workstation/src/coarchitect/chat-content-markers.ts` (1-50+): parses `QUICK_PICK: ["opt1", "opt2"]` markers out of orchestrator-emitted assistant messages. `parseQuickPickMarker(content) → { stripped, options }`.

[KNOWN] `packages/dispatch-workstation/src/coarchitect/chat-panel.tsx:170-194`: ChatPanel renders `<QuickPickButtons options={...} onSelect={(text) => streamingBridge?.sendAndStream(text)} />` inline below assistant bubbles that contain a parsed QUICK_PICK marker. The selected option text is sent back to the orchestrator as a fresh `sendAndStream` invocation.

[MODELED] Therefore the existing QUICK_PICK mechanism is **orchestrator-driven** (orchestrator decides whether to emit `QUICK_PICK:` based on its system prompt + context); the renderer is purely passive. There is no workstation-side gate that says "if Ask mode, intercept this orchestrator-fired action and synthesize a QUICK_PICK message."

### II-G. Operator-driven spawn flow (`spawn-ipc.ts`, 314 lines)

[KNOWN] Operator clicks the spawn modal `[Spawn]` button → renderer fires `workstation:spawn-requested` IPC (preload.mts:78) → spawn-ipc.ts handler runs `spawn-handler.ts buildTmuxArgs + tmuxRunner` → emits `workstation:spawn-result` to all webContents.

[KNOWN] `spawn-handler.ts:91` defines `SpawnPermissionMode = 'auto' | 'ask'` — **but this is a DIFFERENT concept** than MB-T24 dispatch-mode. `permissionMode` is a per-spawn field that controls the spawned `claude` binary's `--dangerously-skip-permissions` flag (cairn finding #94). It is NOT related to chat-shell quick-pick gating.

⚠️ **Naming-collision risk.** Using the bare names `auto` and `ask` for MB-T24 dispatch-mode would collide nominally (not technically) with `SpawnPermissionMode`. See Q-MBT24-7 (added during inventory).

### II-H. Persistence patterns (codebase convention)

[KNOWN] Per CLAUDE.md §3.5, dispatch-workstation persists state via raw `fs.readFileSync`/`writeFileSync` of JSON files in `app.getPath('userData')`. Established modules:

- `splitter-state.ts` (35 lines) — single-key JSON, env-override `MB_SPLITTER_STATE_DIR`. Simplest pattern.
- `autopilot-state-store.ts` (173 lines) — per-session keyed map JSON, env-override `MB_AUTOPILOT_STATE_DIR`. More elaborate.
- `tile-grid-state.ts` (143+ lines) — per-tile keyed map. Mirrors splitter-state.ts comments.

Dispatch-mode is a single global toggle, NOT keyed. The closest fit is `splitter-state.ts`. CLAUDE.md §3.5: "Mirror this pattern for all new persistence. Do NOT install electron-store."

### II-I. MB-T26 findings (template for MB-T24 docs)

[KNOWN] `docs/coordination/mb-t26-findings-2026-05-07.md` (215 lines): structure I'll mirror at WB5 — §I summary, §II WB ladder reference table, §III acceptance verification, §IV runtime smoke, §V cross-session events, §VI Q/R dispositions, §VII outcome classification, §VIII methodology incidents.

[KNOWN] MB-T26 commit `53a9fa3` (WB4 docs commit) — final SHA of the cost-meter ladder. Cost-meter probe-01 test pattern (`packages/dispatch-workstation/test/unit/cost-meter/probe-01-cost-meter-render.spec.tsx`) is the unit-test template MB-T24 mirrors.

### II-J. Frozen-territory verification

[KNOWN] Files MB-T24 touches (per prompt §5): all under `packages/dispatch-workstation/src/chat-shell/`, `packages/dispatch-workstation/src/main/`, `packages/dispatch-workstation/test/`, `docs/coordination/`, `docs/FOLLOWUPS.md`. None are listed as frozen contracts in §0. Specifically:

- `dispatch-core/src/v3/schema.ts` — NOT touched. Dispatch-mode is workstation-internal; no cross-package contract.
- `coarchitect-ipc.ts` — touched ONLY if Q-MBT24-5 disposition is "wire at action-fire route." Other dispositions avoid this surface entirely.

---

## III. Cross-session map

[KNOWN, from `git worktree list`]:

| Session | Worktree | Branch | Ticket | Header-bar slot? |
|---|---|---|---|---|
| Terminal A (this) | `foxworks-dispatch-mbt24/` | `mbt24-worktree` | MB-T24 Auto/Ask | YES — sibling to T25/T26/T27 |
| Terminal B | `foxworks-dispatch-mbt25/` | `mbt25-worktree` | MB-T25 plan-usage | YES — sibling to T24/T26/T27 |
| Terminal C | `foxworks-dispatch-mbt28/` | `mbt28-worktree` | MB-T28 BUILD.md parser | NO (different package) |
| Terminal D | `foxworks-dispatch-mbt34/` | `mbt34-worktree` | MB-T34 Anthropic API client | NO (different package) |

**Relevant overlap:** Terminal B (`mbt25-worktree`) is also extending `chat-shell.tsx` + `mount.ts` with a sibling header-bar slot. Per per-worktree isolation, my edits + B's edits land on parallel branches. Operator-side merge resolves the sentinel-zone authorship at integration time.

[MODELED] Slot-ordering coordination: the prompt §4 recommends "toggle LEFT of plan-usage ring as a higher-priority operator-control surface", implying:
```
[Auto/Ask MB-T24] | [plan-usage MB-T25] | [cost-meter MB-T26] | [model-mix MB-T27]
```
Confirmed via Q-MBT24-4 below.

### III-D. Anti-fabrication evidence: prompt §2 claim vs current code

The prompt §2 (line 108) asserts:
> The "spawn" surface behavior (Auto bypasses, Ask quick-picks) is implemented in coarchitect-ipc.ts spawn flow logic — that logic exists and is operational.

I read `coarchitect-ipc.ts` cover-to-cover (441 lines). Evidence:

1. `grep -rn "quick.pick\|quickPick\|approval\|ask\|auto" packages/dispatch-workstation/src/main/` returns no matches for spawn-decision quick-pick gating. Hits cluster around `approval-policy-resolver.ts` (per-session BUILD.md policy, frozen surface) and `autopilot-state-store.ts` (per-session autopilot state). Neither implements a workstation-wide dispatch-mode gate.

2. `coarchitect-ipc.ts:365-374` `fireSpawn` throws unconditionally with `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED`. Orchestrator-fired spawn IS NOT WIRED in v3.0.

3. `spawn-ipc.ts` (314 lines) has no quick-pick gate — operator-driven spawn fires immediately on `workstation:spawn-requested`.

4. The QUICK_PICK rendering path in `chat-panel.tsx:170-194` is purely orchestrator-driven (orchestrator emits `QUICK_PICK:` markers; renderer is passive).

[KNOWN] **No existing spawn-decision code path reads any "dispatchMode" or equivalent.** The prompt's claim is [INACCURATE] against `c6ee1fa`.

This means MB-T24's "spawn-flow wiring" sub-acceptance (§2 acceptance bullets 2 + 3) requires a real wiring change, not just hooking into existing code. Q-MBT24-5 surfaces options.

---

## IV. Open questions Q-MBT24-N (operator-arbitrated dispositions required at HALT 0)

### Q-MBT24-1 — Persistence backend

**Options:**
- (a) Mirror `splitter-state.ts` (single-file JSON, env-override `MB_DISPATCH_MODE_STATE_DIR`). 35-line module. **Tentative recommended.**
- (b) Mirror `autopilot-state-store.ts` (more elaborate map shape). Overkill for a single global toggle.
- (c) New module pattern. Adds inconsistency.

[KNOWN] CLAUDE.md §3.5: "Mirror this pattern for all new persistence. Do NOT install electron-store." [MODELED] (a) is the established v3.0 convention for global single-toggle state.

**Tentative disposition: (a).**

### Q-MBT24-2 — Default mode on first install

**Options:**
- (a) `Ask` — operator must opt INTO Auto consciously. Mirrors the spawn-handler.ts:88 comment: "operator-arbitrated §7.2: 'ask' on first launch; operator opts INTO 'auto' consciously" (a precedent for default-conservative).
- (b) `Auto` — frictionless onboarding; operator must opt OUT. Faster first-impression.

[MODELED] (a) is the safer default and matches existing spawn-handler precedent. **Tentative disposition: (a) Ask.**

### Q-MBT24-3 — Toggle UI shape

**Options:**
- (a) Two-button segmented control (`[Auto] [Ask]`), one selected. Compact, matches header-bar aesthetic; familiar mode-picker pattern. **Tentative recommended.**
- (b) Checkbox + label (`[ ] Auto mode`). Smaller; ambiguous when off (does off mean Ask, or no preference?).
- (c) Toggle switch (iOS-style). Visually heavier; unidiomatic in dispatch-workstation surfaces (no other toggle of this style exists).
- (d) Native `<select>` dropdown like `tile-approval-picker.tsx`. Heavier visual weight; over-engineered for binary state.

[MODELED] (a) two-button segmented control is the cleanest visual sibling to `chat-shell-cost-meter-slot` (monospace, small text, inline-block) and provides a clear "this control has two equally-prominent values" affordance. **Tentative disposition: (a).**

### Q-MBT24-4 — Header-bar slot ordering

**Options:**
- (a) Toggle FAR-LEFT (left of plan-usage): `[Auto/Ask] | [plan-usage] | [cost-meter] | [model-mix]`. Operator-control surface gets prime position. Prompt §4 recommends this. **Tentative recommended.**
- (b) Toggle FAR-RIGHT (right of model-mix): `[plan-usage] | [cost-meter] | [model-mix] | [Auto/Ask]`. De-emphasizes the toggle; treats it as "less important than meters."
- (c) Toggle BETWEEN plan-usage and cost-meter: `[plan-usage] | [Auto/Ask] | [cost-meter] | [model-mix]`. Awkward; mixes meters and controls.

[MODELED] (a) far-left is the prompt §4 recommendation and matches "operator-control surface > observability surface" priority. **Tentative disposition: (a).**

### Q-MBT24-5 — Spawn-flow wiring (CRITICAL — see §III-D)

**Architectural ambiguity:** the prompt §2 claim that spawn-flow logic "exists and is operational" is [INACCURATE] per §III-D evidence. Wiring MB-T24's gate semantics requires a deliberate choice:

**Options:**
- (a) **Inject into orchestrator system prompt** — read `dispatchMode` in `coarchitect-ipc.ts sendAndStream` handler, prepend a directive to the system prompt (e.g. "DISPATCH_MODE: ask — emit QUICK_PICK: markers before any orchestrator-fired action") or add to `buildContext()` payload. Orchestrator decides whether to emit QUICK_PICK based on the directive. **Soft gate — orchestrator adherence is not load-bearing.** Followup `MB-F-T24-SPAWN-FLOW-HARD-GATE` tracks the renderer-side hard gate.
- (b) **Wire at the action-fire route** (`coarchitect-ipc.ts:334-432`) — when `dispatchMode === 'ask'`, intercept `kind: 'action-fire-without-card'`, do NOT invoke `dispatchAction`, instead emit a synthetic assistant chat message with `QUICK_PICK: ["confirm", "cancel"]` markers + the parsed action payload. Operator clicks "confirm" → re-fires through orchestrator. **Hard gate** but requires non-trivial state-threading; may not survive a clean integration test under v3.0's `fireSpawn`-throws constraint.
- (c) **Operator-driven spawn gate only** — wire at `spawn-ipc.ts handle('workstation:spawn-requested')`. When `dispatchMode === 'ask'`, surface a confirmation modal/quick-pick BEFORE running `spawn-handler.ts`. Bypasses orchestrator-fired path entirely (which currently throws anyway). **Hard gate** at the only currently-functional spawn surface.
- (d) **Ship UI + persistence + bridge only; defer ALL spawn-flow wiring** — make `dispatchMode` readable via bridge but plumb it into nothing. File `MB-F-T24-SPAWN-FLOW-WIRING` Tier 1 followup. Acceptance bullets 2 + 3 (Auto bypasses / Ask surfaces) become deferred. Honest framing per CLAUDE.md §2.11: "Capability enabled with known limitations."

[KNOWN] Current code state: orchestrator-fired spawn throws (b is partially wired at the dispatch site but cannot be tested end-to-end without a live spawn path). Operator-driven spawn has no gate (c is greenfield). System-prompt injection is the lightest touch (a).

[MODELED] My read: (a) + (d-deferred) is the honest framing. Ship MB-T24 as a lightweight orchestrator-side directive + workstation-side bridge surface; flag the renderer-side hard gate as a Tier 1 followup. The existence of `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED` confirms hard-gate work is operator-aware-deferred at the mechanism layer.

[SPECULATIVE] Operator may want (c) — gating operator-driven spawn at `workstation:spawn-requested` — since that is the only currently-firing spawn path and a gate there is testable end-to-end today. But the ticket scope explicitly says "the existing spawn-decision code path" implying chat-side, which doesn't exist for spawn currently.

**Tentative disposition: (a) + file MB-F-T24-SPAWN-FLOW-HARD-GATE Tier 1 followup.** REQUIRES OPERATOR ARBITRATION at HALT 0.

### Q-MBT24-6 — Bridge object placement (added during inventory)

**Options:**
- (a) Add to `coarchitectBridge` (chat domain) — sibling to `onCostUpdate`. Keeps chat-shell-related methods together. **Tentative recommended.**
- (b) Add to `workstationBridge` — sibling to `getSessionApprovalPolicy` / `getSessionAutopilotEnabled` (operator-control bridges). Conceptually fits but adds chat-domain coupling.
- (c) NEW `dispatchModeBridge` exposure — additive surface, separate concerns. Most isolated; mirrors `commitsBridge` precedent (preload.mts:175-179).

[MODELED] (a) is the simplest if dispatch-mode is read by the chat orchestrator path (Q-MBT24-5 disposition (a)). (c) is the cleanest if dispatch-mode is conceptually independent of chat. [SPECULATIVE] (c) gives clearer separation if a follow-up ticket adds renderer-side hard gate logic that doesn't go through coarchitectBridge.

**Tentative disposition: (c) NEW `dispatchModeBridge`.** Aligns with `commitsBridge` precedent for additive surfaces; preserves the "chat domain" purity of `coarchitectBridge`.

### Q-MBT24-7 — Naming (added during inventory: collision risk)

[KNOWN] `SpawnPermissionMode = 'auto' | 'ask'` already exists at `spawn-handler.ts:91`. Reusing the bare strings `'auto'` and `'ask'` for `DispatchMode` would create a nominal (not technical) collision in the codebase: two distinct concepts with identical value vocab.

**Options:**
- (a) `DispatchMode = 'auto' | 'ask'` — same vocab, scoped under a different type alias. Compatible with the ticket's natural language ("Auto mode bypasses... Ask mode surfaces...") and the toggle UI labels. Naming collision is purely typographic.
- (b) `DispatchMode = 'autopilot' | 'manual'` (or similar) — disambiguates from `SpawnPermissionMode` but diverges from the ticket's natural language and the toggle UI labels.

[MODELED] (a) preserves the natural-language alignment + UI-label clarity. The naming collision is type-safe (different alias, different domain). **Tentative disposition: (a).**

---

## V. Risks R-MBT24-N

### R-MBT24-1 — Q-MBT24-5 disposition mismatch (ARCHITECTURAL)

If operator dispositions Q-MBT24-5 = (b) or (c) instead of my tentative (a), the WB ladder shifts substantially:
- (b) requires writing synthetic-message logic + state threading in coarchitect-ipc.ts; +1 WB scope.
- (c) requires operator-driven spawn gate in spawn-ipc.ts (modal pop + IPC roundtrip); +1 WB scope, frozen-territory check needed against spawn-ipc.ts.

**Mitigation:** surface clearly at HALT 0; do NOT proceed past Phase 1 until disposition confirmed.

### R-MBT24-2 — Header-bar slot drift if Terminal B (MB-T25) lands first

If Terminal B's `mbt25-worktree` push lands on operator-side merge before mine, my sentinel-zone placement may need adjustment. Per per-worktree isolation, this is operator-arbitrated at integration time.

**Mitigation:** my sentinel zones are documented as additive siblings; integration-side merge conflict resolves to operator's slot-order preference.

### R-MBT24-3 — Persistence module env-override leak across parallel sessions

If both MB-T24 and MB-T25 export their persistence modules and tests use `MB_DISPATCH_MODE_STATE_DIR` overrides, parallel test runs could conflict on a shared tmp directory. Established pattern (`MB_AUTOPILOT_STATE_DIR`, `MB_SPLITTER_STATE_DIR`) uses per-process tmp dirs in vitest, so risk is low.

**Mitigation:** test fixture creates a fresh `os.tmpdir()` subdirectory per probe-01 run; cleanup on `afterEach`.

### R-MBT24-4 — Existing pre-existing test failures (CLAUDE.md §4.5)

[KNOWN] Pre-existing failures noted: `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` (Tier 2) + `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` (Tier 3). MB-T24 must NOT re-diagnose these; will note in WB5 verification surface.

### R-MBT24-5 — preload.mts as shared-territory surface

[KNOWN, historical] Per `mb-t26-findings-2026-05-07.md:90`, `09b38ce` had a content-sweep of preload.mts under shared-tree conditions. Per per-worktree isolation, structurally impossible now. Risk closed.

### R-MBT24-6 — Soft gate orchestrator non-adherence (Q-MBT24-5=a)

If Q-MBT24-5 = (a) (system-prompt injection), the orchestrator may emit actions without QUICK_PICK markers even when `dispatchMode === 'ask'` (LLM directive non-adherence). MB-T24 acceptance bullet 3 ("Ask mode surfaces quick-pick before each spawn") is then conditional on orchestrator adherence — not load-bearing.

**Mitigation:** explicit "Capability enabled with known limitations" framing per CLAUDE.md §2.11 in the WB5 findings; followup `MB-F-T24-SPAWN-FLOW-HARD-GATE` tracks the hard gate.

### R-MBT24-7 — Push-rebase contention (per §1.4)

Per Round 4 §3.12 worktree pivot, push-rebase contention with Terminal B's `mbt25-worktree` is the new failure mode for parallel commits. Atomic-chain template includes `git pull --rebase --autostash` per prompt §1.4.

**Mitigation:** atomic-chain template per prompt §1.4 handles this. If push fails repeatedly, halt and surface.

---

## VI. WB ladder reference (as planned per prompt §3)

| WB | Type | Subject | Key probe(s) | Files (planned) |
|---|---|---|---|---|
| Phase 1 (this) | spike | Diagnose + decisions | n/a | `docs/coordination/mb-t24-diagnose-2026-05-08.md`, `docs/coordination/mb-t24-decisions-2026-05-08.md` |
| WB1 | red | Scaffold + RED probes + sentinel zones | probe-06-dispatch-mode-toggle, probe-01-persistence | `dispatch-mode-toggle.tsx` (NEW scaffold), `dispatch-mode-store.ts` (NEW scaffold), `chat-shell.tsx` (sentinel zone), `mount.ts` (resolver scaffold), `preload.mts` (sentinel zone scaffold), test files |
| WB2 | green | Persistence module GREEN | probe-01-persistence GREEN | `dispatch-mode-store.ts` (impl) |
| WB3 | green | Toggle UI + bridge methods GREEN | probe-06 GREEN; probe-04/05/03 unchanged | `dispatch-mode-toggle.tsx`, `preload.mts` (impl), IPC handler (new module per Q-MBT24-6=c) |
| WB4 | green | Spawn-flow wiring + integration test (per Q-MBT24-5 disposition) | dispatch-mode-roundtrip integration | depends on Q-MBT24-5 |
| WB5 | docs | Findings + followups | n/a | `mb-t24-findings-2026-05-08.md`, FOLLOWUPS.md amendments |

---

## VII. Confidence label summary

- [KNOWN] facts established by direct file reads at `c6ee1fa`: §II inventory entries; §III-D anti-fabrication evidence trail.
- [MODELED] tentative dispositions for Q-MBT24-1..7: §IV; built on observed code patterns + CLAUDE.md conventions.
- [SPECULATIVE] Q-MBT24-5 alternative dispositions (b, c): not endorsed by tentative recommendation.

All [MODELED] / [SPECULATIVE] claims become [KNOWN] only via operator arbitration at HALT 0 + subsequent WB-level verification.

---

## VIII. HALT 0 surface

After committing this diagnose + decisions doc and pushing to `origin mbt24-worktree`, I halt and surface to operator:

1. Q-MBT24-1..7 with tentative dispositions per §IV — ack required on each.
2. Q-MBT24-5 specifically requires arbitration: my tentative (a) + Tier 1 followup framing reflects honest assessment that "spawn flow logic operational" claim does not hold — but operator may want stricter scope.
3. R-MBT24-1 (architectural mismatch) directly hinges on Q-MBT24-5 disposition.
4. WB ladder per §VI is conditional on Q-MBT24-5 disposition; expected ladder is 5 WBs (Phase 1 + WB1-WB4 green + WB5 docs).

Halt discipline per §1.3: nothing happens during halt. No reads, no useful prep.
