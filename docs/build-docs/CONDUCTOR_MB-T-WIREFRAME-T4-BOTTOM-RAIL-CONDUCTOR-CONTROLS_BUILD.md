# MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS — Bottom-rail Conductor controls (brand + tabs + mode toggle + indicators + meters)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-12
**Authored under:** §3.4 operator-supervised mechanical translation discipline (full-build-mode dispatch §3.2)
**Authoring delegate:** T4 sub-session (gen-4 orchestrator dispatch, Phase 1 second batch, Round 9 of cairn-under-stress)
**Authoring anchor commit (HEAD at authoring time):** `8eab991`
**Cairn ladder anchor:** full-build-mode dispatch §2 workstream T4 (Bottom rail — Conductor controls)
**Closes / advances:**
- Audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §6 (Dim 3 Conductor panel): advances `BUILD.md tab` row from gap → SHIPPED (conditional on Sub-Q-T4-B resolution); reinforces `chat-shell-header-bar` chrome rows (cost meter, plan ring, mix indicator, dispatch-mode-toggle slot ordering).
- Audit §10.4 "max-parallel counter" row: advances from gap → SHIPPED (conditional on Sub-Q-T4-E resolution).
- Audit §10.6 "cost meter $/day" row: SHIPPED-with-aggregation per Sub-Q-T4-C resolution.
- Audit §10.7 "PlanRing / MixIndicator placement" — visual layout per wireframe; no architectural change.
- Full-build-mode dispatch §2 T4 enumeration items 1-7 (all seven bullets).

**Depends on (all merged):**
- MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE (Wave B WB10 GREEN at `ea11bc7`; full ladder `a1f7a03→ea11bc7`) — Frame C surface; the bottom rail visually sits below Frame C/A in Frame C primary mode.
- MB-T-WIREFRAME-T1-SESSION-DATA-FLOW (`4414ef9` per `tile-grid/mount.ts:174` linter annotation) — sessions stream; T4 max-parallel counter consumes the same surface.
- MB-T20 chat panel (chat-shell base) — `chat-shell.tsx` hosts `chat-shell-header-bar` (per `chat-shell.tsx:171` data-testid) where tabs + chrome already live.
- MB-T22 commits-ipc + commits-tab (`commits-tab.tsx`) — Commits tab already shipped as second tab.
- MB-T24 dispatch-mode-toggle (`dispatch-mode-toggle.tsx`) — Auto/Ask toggle already shipped; preload bridge `dispatchModeBridge.{get,set}DispatchMode` (preload.mts:281).
- MB-T26 cost-meter (`cost-meter.tsx`) — cost-meter component + `coarchitectBridge.onCostUpdate` IPC subscription (preload.mts:48) already shipped.
- MB-T34 rate-limit bridge (`plan-usage-ring.tsx`) — plan-usage ring component + `coarchitectBridge.onRateLimitUpdate` IPC subscription (preload.mts:79) already shipped.
- MB-T25 mix-indicator (`mix-indicator.tsx`) — model-mix indicator already shipped; sibling slot in chat-shell-header-bar.

**Downstream gates:**
- T5 (BUILD.md driven dispatch) populates the BUILD.md tab body once its parser ships; T4 ships the tab SHELL + minimal content per Sub-Q-T4-B resolution.
- T7 (Visual polish) consumes the bottom-rail structure after T4 ships behavior + layout; T7 refines CSS / colors / spacing to match wireframe precisely.

**Estimated WB count:** 12 WBs baseline (12 WB default path; 11-14 swing per Sub-Q resolutions; +1-2 if frozen-surface §6 amendments triggered).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first to understand binding vs deferred work.
2. Read §3 (Sub-Q gate arbitrations) — seven operator decisions parameterize WB scope; defaults are `[MODELED]` recommendations.
3. Read §4 (WB ladder) for execution order. WBs are construction-order-aware: probe-then-impl per cairn discipline.
4. §5-§9 are operational supports — cross-references, self-check expectations, definition of done, risk register, IPC amendment outline.

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed in this session via direct source read; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence. Operator-frozen-envelope outcomes are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per full-build-mode dispatch §2 T4 enumeration + §3.2 mechanical-translation authorization:

1. **Conductor brand label** — adds a NEW `data-testid="bottom-rail-brand"` element rendering the literal text "Conductor" inside the bottom-rail host element per Sub-Q-T4-A resolution. Visual styling deferred to T7.

2. **Tab switcher: Chat / Commits / BUILD.md** — extends the existing chat-shell tab strip (per `chat-shell.tsx` tab host; Chat + Commits already shipped by MB-T20 + MB-T22) with a third tab `BUILD.md`. Tab content per Sub-Q-T4-B resolution.

3. **BUILD.md tab content pane** — NEW `packages/dispatch-workstation/src/chat-shell/build-md-tab.tsx` component renders BUILD.md content per Sub-Q-T4-B (renderer-side fs read via existing `coarchitectBridge.getBuildDocConfig` + renderer file read OR NEW IPC `workstation:read-build-md` OR placeholder shell).

4. **Auto/Ask mode toggle** — REUSES existing MB-T24 `dispatch-mode-toggle.tsx` component; ensures slot placement in bottom-rail layout matches wireframe (left-of-cost-meter; pill-styled toggle). Visual restyle per Sub-Q-T4-G resolution (defer to T7 vs in-scope here).

5. **bypass-perms indicator** — NEW `packages/dispatch-workstation/src/chat-shell/bypass-perms-indicator.tsx` component renders a `<span data-testid="bypass-perms-indicator">` with red-triangle warning visual when dispatchMode='auto' AND/OR specific bypass condition per Sub-Q-T4-F. May derive purely from `dispatchModeBridge.getDispatchMode()` or expose new state.

6. **max-parallel counter** — NEW `packages/dispatch-workstation/src/chat-shell/max-parallel-counter.tsx` component renders `<span data-testid="max-parallel-counter">max-parallel · N/M</span>` where N = current active session count, M = configured max-parallel. Data source per Sub-Q-T4-E.

7. **Cost meter** — REUSES existing MB-T26 `cost-meter.tsx` component; ensures slot placement in bottom-rail per wireframe + verifies aggregation semantics per Sub-Q-T4-C resolution (existing component shows daily total; aggregation surface confirmed or extended).

8. **Plan timer** — REUSES existing MB-T34 / MB-T25 `plan-usage-ring.tsx` component + extends with a NEW text-label sibling `<span data-testid="plan-timer-text">Max plan resets in Xh Xm</span>` rendering the countdown derived from RateLimitState. Data source per Sub-Q-T4-D.

9. **Bottom-rail layout host** — per Sub-Q-T4-A, EITHER extends `chat-shell-header-bar` element (currently hosts dispatch-mode-toggle + cost-meter + mix-indicator + plan-usage-ring per `chat-shell.tsx:171-219`) OR introduces a NEW `<div id="bottom-rail">` region in `workstation-shell.html` OR introduces a NEW renderer surface adjacent to chat-shell. Resolution determines whether changes are additive within chat-shell OR span workstation-shell.html + new sentinel zones.

10. **Audit reclassification** — this ticket's findings doc (WB-final docs) updates audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §6 Dim 3 Conductor panel rows + §10.4 max-parallel + §10.6 cost-meter + §10.7 PlanRing placement per closures landed.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify Frame C (`frame-c/`) or tile-grid surfaces. Strictly bottom-rail territory.
- Does NOT modify MB-T20 chat panel body (`chat-shell/chat-panel.tsx` or equivalent — chat tab content unchanged).
- Does NOT modify MB-T22 commits-tab.tsx body (Commits tab content unchanged; only tab strip extended for BUILD.md).
- Does NOT modify MB-T26 cost-meter.tsx body (cost-meter component reused as-is; aggregation source extension per Sub-Q-T4-C may add a new IPC but does not change the component's prop surface).
- Does NOT modify MB-T34 / MB-T25 plan-usage-ring.tsx body (component reused; new text-label sibling added; ring rendering unchanged).
- Does NOT modify MB-T24 dispatch-mode-toggle.tsx body (Sub-Q-T4-G=(β) restyling deferred to T7 per default; if (α) selected, no change).
- Does NOT close `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` (Tier 2 at `98ef86c`) — T4's amendments add new rows but the broader §6 audit is a sibling scope.
- Does NOT introduce daemon-side endpoints (no new `/v3/*` routes). All new IPC is renderer↔main per Sub-Q-T4-{B,C,D} resolutions.
- Does NOT modify frozen surfaces unless Sub-Q-T4-B=(i) `workstation:read-build-md` OR Sub-Q-T4-C=(ii) `workstation:cost-meter` OR Sub-Q-T4-D=(ii) `workstation:plan-timer` is selected, in which case `WORKSTATION_CONTRACT.md` §6.6 amendment scope is surfaced at HALT-WB-PRE-COMMIT per CLAUDE.md §2.4 (separate operator-arbitrated commit per dispatch §3.3 pattern; mirrors the Wave B WB-§6 `0f0e762` consolidated-amendment precedent).
- Does NOT modify `dispatch-core/src/v3/schema.ts` (FROZEN §1-§13; no schema additions required by T4 scope).
- Does NOT introduce electron-store or any new persistence library (CLAUDE.md §3.5 — mirror `splitter-state.ts` raw `fs` pattern if any new persistence is needed).
- Does NOT close `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` (Tier 2 at `6217ea0`) — Frame Router frame-mode subscription is sibling row; cross-ref only.
- Does NOT ship full visual polish (CSS precision per wireframe pixel placement) — T7 territory; T4 ships structural elements + functional wiring + minimal styling.

---

## §2 — Arbitration anchor (operator-frozen via full-build-mode dispatch 2026-05-11)

### §2.1 — Dispatch §2 T4 enumeration (binding)

`[KNOWN-OPERATOR-ARBITRATED]`

Per `docs/coordination/full-build-mode-dispatch.md` §2 T4: T4 ships the seven bullets enumerated in §1.1 of this ticket body. Operator pre-arbitrated this scope as the canonical wireframe-parity workstream for the bottom-rail Conductor-controls surface; sub-session may draft ticket body as operator-supervised mechanical translation per dispatch §3.2.

### §2.2 — Visual-comparison gate (dispatch §3.5)

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.5 closure-path-γ addition to auto-ack envelope §C: `green:wiring` AUTO-ACK requires headless screenshot generation OR operator-manual-screenshot fallback. WB-final smoke (per CLAUDE.md §4.6 runtime-launch smoke + dispatch §3.5 visual-diff gate) consumes the screenshot path. Until T6 headless pipeline ships, operator-manual-screenshot at HALT-WB-FINAL-PRE-COMMIT.

### §2.3 — Frozen-contract amendment scoping (binding pattern)

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.3: NEW IPC channels require WORKSTATION_CONTRACT.md §6.6 amendment per CLAUDE.md §2.4 (operator-arbitrated separate commit; sub-session drafts amendment text, operator HALT-PRE-COMMIT reviews exact language). T4 default Sub-Q recommendations minimize new-channel introductions (Sub-Q-T4-B=(ii) renderer-side fs via existing bridge; Sub-Q-T4-C=(i) reuse existing cost-update; Sub-Q-T4-D=(i) reuse existing rate-limit-update; Sub-Q-T4-E=(i) renderer-internal from sessions stream). Non-default selections escalate to amendment scope (mirrors Wave B WB-§6 `0f0e762` consolidated-amendment pattern for `workstation:read-swarm-state`).

If multiple T4 channels are selected as new IPC, recommend single consolidated `contract(GATE-T4-§6.6-additions): ...` commit covering all new channels — operator decision at Sub-Q resolution time.

### §2.4 — Construction order (file ownership for parallel-CC discipline)

`[KNOWN per dispatch §5.1 + this ticket §5.3]`

T4 primary territory:
- NEW `packages/dispatch-workstation/src/chat-shell/build-md-tab.tsx` (Sub-Q-T4-B)
- NEW `packages/dispatch-workstation/src/chat-shell/bypass-perms-indicator.tsx`
- NEW `packages/dispatch-workstation/src/chat-shell/max-parallel-counter.tsx`
- NEW `packages/dispatch-workstation/src/chat-shell/conductor-brand.tsx` (small label component)
- NEW `packages/dispatch-workstation/src/chat-shell/plan-timer-text.tsx` (text-label sibling to plan-usage-ring)
- MOD `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx` (extend `chat-shell-header-bar` element with new slots; add BUILD.md tab to tab strip)
- CONDITIONAL MOD `packages/dispatch-workstation/src/chat-shell/mount.ts` (subscribe to new bridges if Sub-Q-T4-{C,D,E} add new IPC subscriptions)
- CONDITIONAL MOD `packages/dispatch-workstation/src/main/main.ts` sentinel zone (new IPC handlers if Sub-Q-T4-B=(i) / Sub-Q-T4-C=(ii) / Sub-Q-T4-D=(ii))
- CONDITIONAL MOD `packages/dispatch-workstation/src/main/preload.mts` (new bridge methods if Sub-Q-T4-{B,C,D}=(new-IPC))
- CONDITIONAL MOD `WORKSTATION_CONTRACT.md` §6.6 (amendment if §6-touching Sub-Q resolutions selected; separate `contract:` commit per CLAUDE.md §2.4)

Path-disjoint from co-active sub-sessions per dispatch §5.1:
- T2 ticket-body (Focused session terminal stream): `src/frame-c/detail-pane.tsx` — different surface
- T3 ticket-body (Action bar `kill/diff/merge/focus`): `src/frame-c/action-bar.tsx` — different surface
- T5 ticket-body (BUILD.md driven dispatch): MAY OVERLAP if BUILD.md tab content is wired in T5 — coordinate via coord note at WB1 if Sub-Q-T4-B=(i)/(ii) selected
- T6 ticket-body (Methodology infrastructure): orthogonal — no file overlap
- T7 ticket-body (Visual polish): SEQUENTIAL — T7 consumes T4 output; no concurrency

---

## §3 — Sub-Q gate arbitrations REQUIRED before specific WBs

Seven operator decisions parameterize WB scope. Surface at HALT-TICKET-BODY-PRE-COMMIT for batch resolution. Defaults if unresolved are `[MODELED]` recommendations.

### §3.1 — Sub-Q-T4-A: Bottom-rail host element

Required before **WB1** (host probe) + **WB2** (impl). Default if unresolved: **(α) Extend chat-shell-header-bar**.

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (α) Extend chat-shell-header-bar (recommended) | The existing `<div data-testid="chat-shell-header-bar">` (per `chat-shell.tsx:171`) already hosts dispatch-mode-toggle + cost-meter + mix-indicator slots; T4 extends it to host Conductor brand label + max-parallel counter + bypass-perms indicator + plan-timer-text. The chat-shell-header-bar IS the wireframe's bottom rail (chat-shell renders bottom-region per workstation-shell.html `#chat-region`). | NONE (renderer-only extension; no DOM region addition) | LOW — purely additive slot extension |
| (β) NEW separate `#bottom-rail` DOM region in workstation-shell.html | NEW `<div id="bottom-rail" data-testid="bottom-rail">` adjacent to or replacing `#chat-region` in workstation-shell.html. NEW renderer-surface directory `src/bottom-rail/` mounted via auto-mount (mirrors Frame C pattern). Existing chat-shell continues to host Chat/Commits panes inside `#chat-region`. | NONE structurally; but disambiguates DOM region | HIGH — DOM region addition; mount factory; build-script; full bottom-rail React tree |
| (γ) NEW React component hosting all bottom-rail chrome at top of chat-shell | NEW `src/chat-shell/bottom-rail.tsx` component mounted by chat-shell.tsx ABOVE the tab content. All chrome lives in this component; chat-shell-header-bar slot is left as-is for transitional compat. | NONE | MEDIUM — component composition refactor; chat-shell.tsx layout change |

`[MODELED]` Recommend **(α)** for ship-velocity + zero-DOM-region-addition. Rationale: `chat-shell-header-bar` IS already the bottom-rail per architectural placement (chat-region sits at workstation bottom; chat-shell-header-bar is the top of chat-region per `chat-shell.tsx:171-219` layout); existing chrome (dispatch-mode-toggle + cost-meter + mix-indicator + plan-usage-ring) already lives there. T4 is mostly additive slot-extension. Sub-Q-A=(β) is architecturally cleaner long-term (separate concerns: chat-shell renders tabs; bottom-rail renders chrome) but is +5-7 WB scope explosion. Sub-Q-A=(γ) is a viable middle-ground if operator wants component-level isolation without DOM region change.

Operator decision pending.

### §3.2 — Sub-Q-T4-B: BUILD.md tab content source

Required before **WB5** (BUILD.md tab probe) + **WB6** (impl). Default if unresolved: **(iii) Defer BUILD.md content; ship tab shell only**.

| Option | Content source | Dependency | Frozen-surface touch |
|---|---|---|---|
| (i) NEW IPC `workstation:read-build-md` | Main-process reads BUILD.md from `coarchitectBridge.getBuildDocConfig()` resolved path; exposes content as `workstationBridge.readBuildMd(): Promise<string>` mirroring `workstation:read-swarm-state` pattern. Renderer-side tab body parses + renders. | None beyond existing build-doc config bridge | YES — `WORKSTATION_CONTRACT.md` §6.6 amendment (operator-arbitrated, separate `contract:` commit per CLAUDE.md §2.4) |
| (ii) Renderer-side fs read via existing bridge | Renderer reads BUILD.md path from `coarchitectBridge.getBuildDocConfig()` (preload.mts:22), then invokes `workstationBridge.readSwarmState()` pattern via fs IPC — wait, no fs IPC for arbitrary files exists. Falls back to (i) effectively. ❌ NOT VIABLE without amendment. | (deprecated — falls into (i)) | (n/a) |
| (iii) Defer BUILD.md tab content; placeholder shell (recommended) | Ship the tab strip with BUILD.md tab clickable but body shows placeholder text "BUILD.md tab — content shipped by MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH". T5 wires the actual content when its parser/loader ships. | None | NONE |
| (iv) Reuse coarchitectBridge.getBuildDocConfig only | Render the config metadata (path, status) but NOT the parsed BUILD.md body. Honest "partial content" UX. | None — existing bridge | NONE |

`[MODELED]` Recommend **(iii) Defer with placeholder** for ship-velocity + scope-disjointness with T5. Rationale: T5 BUILD.md driven dispatch is the canonical owner of BUILD.md parsing + content rendering per dispatch §2 T5 ("BUILD.md parser; Auto-dispatch logic; Loaded-status indicator; Task-count display; Blocked/Ready breakdown"). T4 ships the tab SLOT in the tab strip + placeholder body; T5 fills the body. Sub-Q-B=(i) is canonically-correct IPC scope but couples T4 to a frozen-surface amendment cycle that T5 will need anyway — operator may prefer to land the amendment under T5 ownership. Sub-Q-B=(iv) is a useful interim if operator wants "some BUILD.md state visible at T4 ship time".

Operator decision pending.

### §3.3 — Sub-Q-T4-C: Cost meter aggregation source

Required before **WB7** (cost-meter probe) + **WB8** (impl). Default if unresolved: **(i) Reuse existing MB-T26 onCostUpdate**.

`[KNOWN]` MB-T26 cost-meter bridge (preload.mts:48 `coarchitectBridge.onCostUpdate`) pushes total daily USD via `coarchitect:getDailyCost` initial-fetch + `coarchitect:cost-update` broadcast. The `cost-meter.tsx` component renders the current total. Operator dispatch flagged `workstation:cost-meter` as potentially needed — verify whether existing surface aggregates per Sub-Q-C.

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (i) Reuse existing onCostUpdate (recommended) | `coarchitectBridge.onCostUpdate` already provides aggregated daily total. T4 verifies the aggregation semantics match wireframe's "conductor api · $X today" via [KNOWN]-direct-read of `coarchitect-ipc.ts::captureUsageToLedger`. If aggregation is correct, no new IPC needed. Operator-flagged `workstation:cost-meter` is satisfied by existing channel. | NONE | LOW |
| (ii) NEW IPC `workstation:cost-meter` aggregated endpoint (operator-flagged) | NEW main-process aggregator + bridge method `workstationBridge.getCostMeterState(): Promise<{ daily: number; perSession: Record<string, number>; ... }>`. Provides finer-grained surface for future per-session breakdown. | YES — `WORKSTATION_CONTRACT.md` §6.6 amendment | MEDIUM (+2 WBs: amendment cycle + impl) |
| (iii) Hybrid | Continue using `onCostUpdate` for live total; add `workstation:cost-meter` for one-shot detailed snapshot. Forward-compatible. | YES — §6.6 amendment | HIGH (+3 WBs: amendment + dual wiring) |

`[MODELED]` Recommend **(i) Reuse existing** UNLESS direct-read at WB7 RED authoring reveals aggregation gap. Rationale: ship-velocity + zero-§6-touch. Investigation at WB7 RED authoring is mechanical (read `coarchitect-ipc.ts::captureUsageToLedger` to verify aggregation semantics; if "daily total" matches wireframe, done; if "per-session only" or "per-message only", escalate to (ii) or (iii)). Operator dispatch's flag for `workstation:cost-meter` reflects uncertainty about existing surface; (i)'s verification step resolves the uncertainty.

Operator decision pending — surface in HALT recommendation with note that WB7 RED authoring will perform the direct-read investigation; if (i) proves insufficient post-investigation, escalate via HALT-WB7-PRE-COMMIT.

### §3.4 — Sub-Q-T4-D: Plan timer data source

Required before **WB9** (plan-timer probe) + **WB10** (impl). Default if unresolved: **(i) Reuse existing MB-T34 onRateLimitUpdate**.

`[KNOWN]` MB-T34 rate-limit bridge (preload.mts:79 `coarchitectBridge.onRateLimitUpdate`) pushes `RateLimitState` snapshots from `captureRateLimitToBroadcast` in coarchitect-ipc.ts. The `plan-usage-ring.tsx` component (MB-T25) renders the ring. Operator dispatch flagged "Plan timer source: investigate existing daemon state vs new endpoint" — Sub-Q-D resolves this.

| Option | Mechanism | Source-of-truth | Frozen-surface touch |
|---|---|---|---|
| (i) Reuse existing onRateLimitUpdate (recommended) | `RateLimitState` likely contains `unified_rate_limit_window_resets_at` field (per Anthropic API X-RateLimit-* headers). Renderer-side derives "Xh Xm" countdown from `resetsAt - now()`. NEW component `plan-timer-text.tsx` consumes the same MB-T25 prop-drilled `RateLimitState`. | Anthropic API response headers (via Conductor API client) | NONE |
| (ii) NEW IPC `workstation:plan-timer` | Dedicated main-process endpoint providing pre-computed `{ resetsAtMs: number; progressPct: number; planName: string }`. | Same as (i) but pre-computed at main; renderer is consumer-only. | YES — §6.6 amendment |
| (iii) Daemon SSE subscription | Daemon-side proxy for rate-limit state; SSE push to renderer. Sibling of T1 daemon-SSE row 271 closure path. | Daemon-side | YES — new SSE endpoint + §6 amendment + daemon implementation |

`[MODELED]` Recommend **(i) Reuse existing** for ship-velocity + zero-§6-touch + leverages already-shipped MB-T34 surface. Investigation at WB9 RED authoring will direct-read `anthropic-api-client.ts` to verify `RateLimitState` shape includes `unified_rate_limit_window_resets_at` (or equivalent reset-time field). If existing state has the field, (i) ships purely in renderer. If absent, escalate via HALT-WB9-PRE-COMMIT.

Operator decision pending.

### §3.5 — Sub-Q-T4-E: max-parallel counter source

Required before **WB3** (max-parallel probe) + **WB4** (impl). Default if unresolved: **(i) Renderer-internal from sessions stream**.

| Option | N (active count) | M (max-parallel) | Frozen-surface touch |
|---|---|---|---|
| (i) Renderer-internal (recommended) | Count from T1's sessions stream (via the same Sub-Q-T1-A surface T1 shipped at `4414ef9`); filter by `status === 'open'` for "active" semantics. | Configured max-parallel from `coarchitectBridge.getBuildDocConfig()` (preload.mts:22) OR from a renderer-internal const (16 per wireframe shown). | NONE |
| (ii) Workstation-side via dispatch-pool state | NEW IPC `workstation:max-parallel-state` reading from `main/orchestrator-pool.ts` OR equivalent pool state. | Same as (i) for M; N from pool state. | YES — §6.6 amendment |
| (iii) Daemon-side cluster count | Daemon-managed cluster-wide session count. Sibling of T1 daemon-SSE row 271. | Daemon-side. | YES — §6 amendment + daemon impl |

`[MODELED]` Recommend **(i) Renderer-internal** for ship-velocity + zero-§6-touch. Rationale: T1 (`4414ef9`) shipped the sessions stream; T4 max-parallel-counter consumes the same surface for N. M (max-parallel limit) can be a renderer-internal const initially (16 per wireframe) with a Tier 3 followup `MB-F-MAX-PARALLEL-CONFIG-SOURCE` for operator-arbitrated configuration source. Wave B + T1 pattern: ship renderer-internal first, then escalate persistence/configuration in a follow-on ticket if operator-load-bearing.

Operator decision pending.

### §3.6 — Sub-Q-T4-F: bypass-perms indicator visibility logic

Required before **WB11** (bypass-perms probe) + **WB12** (impl). Default if unresolved: **(i) Derive from dispatchMode='auto'**.

`[KNOWN]` Wireframe shows a red-triangle warning labeled "bypass perms" prominently in the bottom rail. The semantic match to today's dispatch-mode is: when `dispatchMode === 'auto'`, operator has bypassed the per-action review gate; warning indicator surfaces this.

| Option | Visibility logic | Source | Effort |
|---|---|---|---|
| (i) Derive from dispatchMode='auto' (recommended) | Component reads `dispatchModeBridge.getDispatchMode()` (preload.mts:282); renders indicator visible when mode='auto', hidden when mode='ask'. Reactive via `dispatchModeBridge.setDispatchMode` round-trip + window event OR Sub-Q-T4-A=(α) shared chat-shell state. | dispatchModeBridge | LOW |
| (ii) Dedicated bypass-perms state | NEW persistence + IPC for separate `bypassPerms: boolean` state independent of dispatchMode. Operator can have ask-mode + bypass-perms-enabled (or auto-mode + perms-respect-still-enabled). | NEW `bypass-perms-state.ts` + IPC + §6.6 amendment | HIGH |
| (iii) Defer to T7 visual polish | T4 places the slot but indicator visibility logic is hard-coded `true` (always show). T7 wires visibility logic. | None | ZERO |

`[MODELED]` Recommend **(i) Derive from dispatchMode='auto'** as the simplest mapping. Wireframe context (red-triangle warning, "Auto" highlighted in same row) strongly implies indicator is auto-mode warning. Sub-Q-F=(ii) is over-engineered for shipped UX (no precedent for bypass-perms as separable state). Sub-Q-F=(iii) is acceptable if operator wants T4 to be purely layout-with-no-behavior.

Operator decision pending.

### §3.7 — Sub-Q-T4-G: Auto/Ask mode toggle visual restyle

Required before **WB12** (visual finalization) IF (β) selected; default if unresolved: **(α) Reuse existing as-is (defer restyle to T7)**.

| Option | Mechanism | Effort |
|---|---|---|
| (α) Reuse existing as-is (recommended) | `dispatch-mode-toggle.tsx` shipped at MB-T24; reused unchanged in T4. T7 polish ticket restyles to wireframe pill-toggle visual. | ZERO |
| (β) Restyle in T4 | T4 modifies `dispatch-mode-toggle.tsx` CSS/markup to match wireframe pill-toggle (Auto dark/highlighted; Ask light). | MEDIUM (+1 WB) |

`[MODELED]` Recommend **(α)** to maintain T4 scope discipline. Visual restyle is T7 territory per dispatch §2 T7 ("CSS for tile-grid layout matching wireframe ... bottom rail layout precision").

Operator decision pending.

---

## §4 — WB ladder

12 WBs baseline (defaults: Sub-Q-A=(α), Sub-Q-B=(iii), Sub-Q-C=(i), Sub-Q-D=(i), Sub-Q-E=(i), Sub-Q-F=(i), Sub-Q-G=(α)). 11-14 WB swing per Sub-Q resolutions; +1-2 if frozen-surface §6.6 amendments triggered (separate `contract:` commit per pattern).

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CLAUDE.md §2.4; per-path `git add` AND per-path `git commit -- <paths>` per CLAUDE.md §2.7 + Tier 1 MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION; Q7 inspects `git diff --cached --name-only` at commit time; push after each cairn-grammar commit per CLAUDE.md §2.6.

### WB1 — `red(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): probe-mbtwt4-01-conductor-brand`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtwt4-01-conductor-brand.spec.tsx` (NEW; new test directory if absent). Asserts: mounting `chat-shell` with default props renders an element with `data-testid="bottom-rail-brand"` containing the literal text "Conductor". Probe fails RED — no such element exists at HEAD.
**Acceptance:** probe RED. Commit body Q1-Q9.
**Frozen contracts touched:** none.

### WB2 — `green(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): conductor brand + bottom-rail host`

**Type:** green
**Scope:** GREEN per Sub-Q-T4-A:
- (α) MOD `chat-shell.tsx`: extends `chat-shell-header-bar` element with a NEW Conductor brand slot. NEW small component `chat-shell/conductor-brand.tsx` (~15 lines) exports `<ConductorBrand />` rendering `<span data-testid="bottom-rail-brand">Conductor</span>`. Slot placement: leftmost in header-bar (per wireframe).
- (β) NEW workstation-shell.html `#bottom-rail` DOM region + NEW renderer surface + ConductorBrand mounted there. Surface mount script + esbuild script update.
- (γ) NEW `chat-shell/bottom-rail.tsx` host component + ConductorBrand consumed by it.
**Acceptance:** WB1 probe flips RED → GREEN. Commit body Q1-Q9.

### WB3 — `red(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): probe-mbtwt4-02-max-parallel-counter`

**Type:** red
**Scope:** RED probe at `probe-mbtwt4-02-max-parallel-counter.spec.tsx` (NEW). Asserts: chat-shell with mocked sessions stream (Sub-Q-T4-E=(i)) renders `<span data-testid="max-parallel-counter">max-parallel · N/M</span>` where N matches active session count from the mocked stream. Probe fails RED — component absent.
**Acceptance:** probe RED. Commit body Q1-Q9.

### WB4 — `green(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): max-parallel counter component + slot`

**Type:** green
**Scope:** GREEN at NEW `chat-shell/max-parallel-counter.tsx` + MOD `chat-shell.tsx` (slot integration):
- (i) Component consumes sessions stream per Sub-Q-T4-A surface OR direct subscription to the T1-shipped sessions-stream surface (mirrors `tile-grid/mount.ts:185` `workstationBridge` pass-through pattern). Filters by `status === 'open'` for N; uses const M=16 for default max-parallel.
- (ii)/(iii) Conditional IPC + bridge + main-process handler additions.
**Acceptance:** WB3 probe flips RED → GREEN. Commit body Q1-Q9.
**Followup recommendation if M=16 hardcoded:** file Tier 3 `MB-F-MAX-PARALLEL-CONFIG-SOURCE` for operator-arbitrated configuration source.

### WB5 — `red(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): probe-mbtwt4-03-build-md-tab-shell`

**Type:** red
**Scope:** RED probe at `probe-mbtwt4-03-build-md-tab-shell.spec.tsx` (NEW). Asserts (per Sub-Q-T4-B):
- (iii) default: tab strip contains a `<button data-testid="chat-shell-tab-build-md">BUILD.md</button>`; clicking it switches active tab to BUILD.md; content area shows `<div data-testid="build-md-tab-placeholder">...</div>`.
- (i) full: same tab + content area shows BUILD.md parsed text (asserted via mock IPC `workstation:read-build-md`).
- (iv) partial: same tab + content area shows config metadata only.

Probe fails RED — BUILD.md tab absent in current tab strip.
**Acceptance:** probe RED. Commit body Q1-Q9.
**Sub-Q-T4-B blocker:** WB6 cannot proceed until Sub-Q-T4-B resolves content source. Probe shape parameterized.

### WB6 — `green(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): BUILD.md tab + content per Sub-Q-T4-B`

**Type:** green
**Scope:** GREEN:
- MOD `chat-shell.tsx` tab strip: adds `<button data-testid="chat-shell-tab-build-md">BUILD.md</button>` as third tab + wires `activeTab === 'build-md'` content rendering.
- NEW `chat-shell/build-md-tab.tsx` component renders per Sub-Q-T4-B:
  - (iii) static placeholder: "BUILD.md tab — content shipped by MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH".
  - (i) reads via NEW `workstation:read-build-md` IPC (requires WORKSTATION_CONTRACT.md §6.6 amendment — separate `contract:` commit BEFORE WB6 GREEN per CLAUDE.md §2.4).
  - (iv) reads config metadata via `coarchitectBridge.getBuildDocConfig`.
**Acceptance:** WB5 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-T4-B=(i).

### WB7 — `red(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): probe-mbtwt4-04-cost-meter-aggregation`

**Type:** red
**Scope:** RED probe at `probe-mbtwt4-04-cost-meter-aggregation.spec.tsx` (NEW). Asserts (per Sub-Q-T4-C): cost-meter rendered in chat-shell-header-bar consumes daily aggregated total from the active source (mock `coarchitectBridge.onCostUpdate` for (i); mock `workstationBridge.getCostMeterState` for (ii)/(iii)). Verifies "conductor api · $X.XX today" text shape.

Also at WB7 RED authoring: **direct-read investigation** of `coarchitect-ipc.ts::captureUsageToLedger` aggregation semantics (per Sub-Q-T4-C investigation requirement). Document finding in WB7 commit body Q6: does existing `onCostUpdate` surface emit aggregated-daily-total OR per-session OR per-message?

Probe fails RED at HEAD — cost-meter not currently in chat-shell-header-bar slot per current `chat-shell.tsx:171-219` (verify; may already be there).

**Acceptance:** probe RED. Commit body Q1-Q9 INCLUDES aggregation-investigation finding.

### WB8 — `green(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): cost-meter integration + (conditional) workstation:cost-meter IPC`

**Type:** green
**Scope:** GREEN per Sub-Q-T4-C investigation outcome:
- (i) Reuse: MOD `chat-shell.tsx` to slot existing `cost-meter.tsx` in the bottom-rail layout per wireframe.
- (ii) NEW IPC: add `workstation:cost-meter` ipcMain handler + bridge method + WORKSTATION_CONTRACT.md §6.6 amendment (separate `contract:` commit). Wire cost-meter component to new bridge.
- (iii) Hybrid: both wirings.
**Acceptance:** WB7 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-T4-C=(ii)/(iii). HALT-WB8-PRE-COMMIT if (ii)/(iii).

### WB9 — `red(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): probe-mbtwt4-05-plan-timer-text`

**Type:** red
**Scope:** RED probe at `probe-mbtwt4-05-plan-timer-text.spec.tsx` (NEW). Asserts: chat-shell with mocked `coarchitectBridge.onRateLimitUpdate` rendering a RateLimitState with `unified_rate_limit_window_resets_at` field → `<span data-testid="plan-timer-text">Max plan resets in Xh Ym</span>` renders the countdown.

Also at WB9 RED authoring: **direct-read investigation** of `anthropic-api-client.ts` `RateLimitState` shape — verify reset-time field name + format (epoch ms vs ISO string). Document in WB9 commit body Q6.

**Acceptance:** probe RED. Commit body Q1-Q9.
**Sub-Q-T4-D blocker:** WB10 cannot proceed until Sub-Q-T4-D resolves source.

### WB10 — `green(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): plan-timer-text component + slot`

**Type:** green
**Scope:** GREEN per Sub-Q-T4-D:
- (i) Reuse: NEW `chat-shell/plan-timer-text.tsx` consumes RateLimitState from MB-T34 onRateLimitUpdate stream (subscribe directly OR prop-drilled from chat-shell). Renders "Max plan resets in Xh Ym" via `Math.floor((resetsAt - now()) / 3600000) + 'h ' + Math.floor(...%3600000/60000) + 'm'`. Sibling-slot to plan-usage-ring.
- (ii) NEW IPC `workstation:plan-timer` + §6.6 amendment.
- (iii) Daemon SSE.
**Acceptance:** WB9 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-T4-D=(ii)/(iii).

### WB11 — `red(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): probe-mbtwt4-06-bypass-perms-indicator`

**Type:** red
**Scope:** RED probe at `probe-mbtwt4-06-bypass-perms-indicator.spec.tsx` (NEW). Asserts (per Sub-Q-T4-F):
- (i) Indicator `<span data-testid="bypass-perms-indicator">⚠ bypass perms</span>` visible when mocked `dispatchModeBridge.getDispatchMode()` resolves to `'auto'`; hidden when `'ask'`.
- (ii) Dedicated bypass-perms state mock.
- (iii) Always-visible (static).
**Acceptance:** probe RED — component absent. Commit body Q1-Q9.

### WB12 — `green(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): bypass-perms indicator + final layout consolidation`

**Type:** green
**Scope:** GREEN:
- NEW `chat-shell/bypass-perms-indicator.tsx` component per Sub-Q-T4-F:
  - (i) consumes `dispatchModeBridge.getDispatchMode()` + subscribes to updates via window event OR shared state OR re-fetch on chat-shell remount.
  - (ii) NEW state module + IPC + §6.6 amendment.
  - (iii) static always-visible.
- MOD `chat-shell.tsx` to slot the indicator in bottom-rail layout (between dispatch-mode-toggle and cost-meter per wireframe).
- Final layout pass: verify all bottom-rail elements (Conductor brand, tabs, dispatch-mode-toggle, bypass-perms, max-parallel counter, cost-meter, mix-indicator, plan-usage-ring, plan-timer-text) are present in the chat-shell-header-bar element with reasonable left-to-right ordering per wireframe.
**Acceptance:** WB11 probe flips RED → GREEN. All WB1-WB11 probes pass post-WB12 layout pass. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-T4-F=(ii).

### WB13 — `green(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): runtime-launch smoke verification + headless screenshot (or operator-manual fallback)`

**Type:** green (smoke harness)
**Scope:** per CLAUDE.md §4.6 + dispatch §3.5 visual-comparison gate:
1. Build fresh (`pnpm --filter dispatch-workstation build`).
2. Launch electron from dist; capture WINDOW_READY sentinel.
3. Headless screenshot if T6 pipeline shipped; else operator-manual-screenshot at HALT-WB13-FINAL-PRE-COMMIT.
4. Visual-diff against wireframe target — bottom rail element presence + ordering.
5. Operator-manual interaction: click BUILD.md tab → placeholder shows; click Auto toggle → bypass-perms indicator appears; click Ask toggle → indicator hides.
**Acceptance:** all 5 steps verified. Evidence: `docs/coordination/mbtwt4-runtime-smoke-2026-05-12.md`.
**Frozen contracts touched:** none.
**HALT preserved:** HALT-WB13-FINAL-PRE-COMMIT per dispatch §3.5.

### WB14 — `docs(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): findings doc + audit reclass + followup filings`

**Type:** docs
**Scope:** Author `docs/coordination/mbtwt4-findings-2026-05-12.md` per format anchor `mb-t-wireframe-c1p2-frame-c-surface-findings-2026-05-11.md` (sections I-X). Audit doc updates per §1.1 item 10. Followup recommendations:
- (Conditional Sub-Q-T4-B=(iii)) cross-reference T5 ownership of BUILD.md tab content
- (Conditional Sub-Q-T4-E=(i)) file Tier 3 `MB-F-MAX-PARALLEL-CONFIG-SOURCE`
- Cross-ref `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (Tier 1 at `64d9249`) for visual-diff gate
- Cross-ref `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP` (Tier 2 at `6217ea0`) — Frame Router subscription (sibling row; not closed by T4)
**Acceptance:** findings doc + FOLLOWUPS.md cross-ref + audit reclassification stamp land. Commit body Q1-Q9.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED by this ticket

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| Audit §6 BUILD.md tab gap | (audit row) | Sub-Q-T4-B implementation | WB6 (shell) + T5 (content) |
| Audit §10.4 max-parallel counter gap | (audit row) | Sub-Q-T4-E=(i) renderer-internal | WB4 |
| Audit §10.6 cost-meter $/day | (audit row; partial closure already by MB-T26) | Sub-Q-T4-C resolution + layout | WB8 |
| Audit §10.7 PlanRing placement | (audit row) | layout consolidation | WB10 + WB12 |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- **WB4** may discover that the T1 sessions-stream surface (per Sub-Q-T1-A resolution at `4414ef9`) is not easily consumable from chat-shell territory — chat-shell renders into `#root` (chat-region), not `#frame-c-root`. The CustomEvent-via-window pattern (T1 Sub-Q-A=δ) is renderer-global so should work, but verify at WB4 RED authoring. File Tier 2 followup if non-trivial bridging required.
- **WB6** (Sub-Q-T4-B=(iii) default) leaves BUILD.md tab body as placeholder; T5 closure is the canonical follow-on. Note in WB14 docs.
- **WB8** (Sub-Q-T4-C=(i) default) verification may surface that `onCostUpdate` emits per-message instead of per-day-aggregated — escalate to (ii)/(iii) via HALT-WB8-PRE-COMMIT.
- **WB10** (Sub-Q-T4-D=(i) default) verification may surface that `RateLimitState` does not include a reset-time field — escalate to renderer-side time-accounting OR HALT-WB10-PRE-COMMIT for new-IPC scope.
- **WB12** layout consolidation may reveal that chat-shell-header-bar (Sub-Q-A=(α)) becomes visually crowded with the new slots; file Tier 3 `MB-F-BOTTOM-RAIL-VISUAL-DENSITY` for T7 polish prioritization.
- **WB13** smoke may surface that BUILD.md tab placeholder content is jarring; soften copy.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| MB-T20 chat panel | (MB-T20 commit chain) | `chat-shell.tsx` (full file; understand tab strip + header-bar slot architecture) |
| MB-T22 commits-tab | (MB-T22 commit chain) | `commits-tab.tsx` (precedent for adding tab content components) |
| MB-T24 dispatch-mode-toggle | (MB-T24 commit chain) | `dispatch-mode-toggle.tsx` + preload.mts:281 dispatchModeBridge |
| MB-T26 cost-meter | (MB-T26 commit chain) | `cost-meter.tsx` + preload.mts:48 onCostUpdate + coarchitect-ipc.ts::captureUsageToLedger |
| MB-T25 plan-usage-ring | (MB-T25 commit chain) | `plan-usage-ring.tsx` + preload.mts:79 onRateLimitUpdate |
| MB-T34 rate-limit | (MB-T34 commit chain) | preload.mts:79 RateLimitState shape + coarchitect-ipc.ts MB-T34 zone |
| MB-T-WIREFRAME-T1-SESSION-DATA-FLOW | `4414ef9` | sessions-stream surface (which Sub-Q-T1-A was selected — read the ticket body + WB-final commit) |
| MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE | `ea11bc7` | WB-§6 amendment precedent (`0f0e762` consolidated cross-session amendment) for any T4 amendment authoring |

### §5.4 — Cross-refs (open followups; NOT closed by this ticket)

- `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` (Tier 2 at `6217ea0`) — Frame Router subscription gap; sibling row.
- `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (Tier 1 at `64d9249`) — informs visual-diff gate at WB13.
- `MB-F-RUNTIME-BUILD-STALENESS-INVISIBLE-PROGRESS` (Tier 1 at `11f6f29`) — informs rebuild-before-smoke discipline.
- `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` (Tier 1 at `c2abb28`) — T4 advances Dim 3 conductor-panel parity; full visual parity is iterative.
- `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION` (Tier 1) — dispatch §3.3 reinforcement: pathspec-add AND pathspec-commit BOTH; Q7 inspects `git diff --cached --name-only`.
- `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` (Tier 2 at `98ef86c`) — T4 amendments add new §6.6 rows but the broader retroactive audit is a separate scope.

### §5.5 — Plan-doc anchors (read at WB1 start)

- `docs/coordination/full-build-mode-dispatch.md` §1 (wireframe element inventory — Bottom rail section)
- §2 T4 enumeration (binding 7 bullets)
- §3.3 frozen-contract amendment scoping
- §3.5 visual-comparison gate addition to §C
- §5.1 concurrent session target; §5.3 operator interaction cadence

### §5.6 — Audit-doc anchors (read at WB1 start)

- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §6 (Dim 3 Conductor panel) — closure target rows
- §10.4 (max-parallel counter)
- §10.6 (cost meter)
- §10.7 (PlanRing placement)
- §3 amendment 2026-05-11 (Frame C row) — precedent for "shipped at structural level" stamp pattern

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CLAUDE.md §2.4 / CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1/3/5/7/9/11 RED | N/A — observational RED | BEHAVIOR (DOM rendering via @testing-library/react or source-text via fs.readFileSync) | No — RED probes | No — probe-only | No | KNOWN/MODELED applied | new test/unit/chat-shell/ path; verify via `git diff --cached --name-only` at commit time | N/A | No (red:probe AUTO-ACK per §C) |
| WB2/4/6/8/10/12 GREEN | (see corresponding RED) | BEHAVIOR (real component mount + bridge mock OR direct integration) | No — impl load-bearing | No | conditional on Sub-Q-T4-{B,C,D,F}=(new-IPC) selections | KNOWN/MODELED applied | per-WB ownership stays within chat-shell/ + (conditional) main.ts | N/A | conditional HALT for new-IPC §6.6 amendment |
| WB13 smoke | N/A | BEHAVIOR (real electron + real DOM; optional headless screenshot) | No — verifies WB1-WB12 integration | No | No | KNOWN per observed sentinels | none — observational | N/A | HALT-WB13-FINAL-PRE-COMMIT per §3.5 |
| WB14 docs | N/A | N/A | N/A | No — docs/coordination/ + audit edits | No | KNOWN per direct ticket-execution evidence | docs paths disjoint from production | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1-WB12 cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin/main.
2. **Bottom-rail elements shipped**: chat-shell-header-bar (or alternate Sub-Q-T4-A host) contains: Conductor brand label, Chat/Commits/BUILD.md tab strip, dispatch-mode-toggle (reused), bypass-perms-indicator, max-parallel counter, cost-meter (reused), mix-indicator (reused), plan-usage-ring (reused), plan-timer-text.
3. **BUILD.md tab clickable**: tab switches active content; body shows per Sub-Q-T4-B resolution.
4. **Auto/Ask toggle functional**: reuses MB-T24 surface; bypass-perms indicator visibility derives from dispatchMode per Sub-Q-T4-F=(i) default.
5. **max-parallel counter renders live N/M**: N from sessions stream; M from configured source per Sub-Q-T4-E.
6. **Cost meter renders aggregated daily total**: per Sub-Q-T4-C resolution.
7. **Plan timer renders countdown**: "Max plan resets in Xh Ym" per Sub-Q-T4-D resolution.
8. **5-package typecheck CLEAN** per CLAUDE.md §4.4 (one command at a time; workstation focus).
9. **No regression in v3.5 probes** — chat-shell + frame-c suites continue to pass.
10. **WB13 runtime smoke**: WINDOW_READY + Frame C/A default mount + bottom-rail elements present in DOM. Visual verification via headless screenshot (if T6 ships) OR operator-manual-screenshot.
11. **WB14 findings doc + audit reclassification stamp land**: §6 Dim 3 + §10.4 + §10.6 + §10.7 rows reclassified per closures.
12. **Operator-visible UX**: Frame C as default shell mode + bottom rail visible with new chrome; Auto/Ask toggle changes bypass-perms visibility; clicking BUILD.md tab does not crash.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| chat-shell-header-bar layout becomes visually crowded with new slots (Sub-Q-A=α) | `[MODELED-MEDIUM]` (8+ chrome elements in one row) | `[MODELED-LOW]` UX clutter; not functional regression | T7 polish ticket consumes T4 output for spacing/wrapping; file Tier 3 `MB-F-BOTTOM-RAIL-VISUAL-DENSITY` at WB14 if surfaced |
| T1 sessions-stream surface (Sub-Q-T1-A resolution) is not easily consumable from chat-shell territory — chat-shell mounts into `#root` (chat-region), not `#frame-c-root`; the renderer-global CustomEvent pattern (Sub-Q-T1-A=δ) should bridge | `[MODELED-LOW]` (window-event pattern is renderer-global) | `[MODELED-MEDIUM]` (+1-2 WBs if non-trivial bridging needed) | WB4 RED authoring reads T1 final commit to verify; HALT-WB4-PRE-COMMIT if non-trivial |
| Sub-Q-T4-C=(i) cost-meter aggregation may not match wireframe semantics — `onCostUpdate` could emit per-session instead of per-day-aggregated | `[MODELED-MEDIUM]` (depends on coarchitect-ipc.ts implementation) | `[MODELED-MEDIUM]` (+1-2 WBs if new-IPC escalation needed) | WB7 RED authoring direct-reads `coarchitect-ipc.ts::captureUsageToLedger`; HALT-WB7-PRE-COMMIT for escalation |
| Sub-Q-T4-D=(i) plan-timer source — `RateLimitState` may not include `unified_rate_limit_window_resets_at` field | `[MODELED-LOW]` (Anthropic API has reset-time headers; client likely captures) | `[MODELED-MEDIUM]` (+1-2 WBs if new-IPC needed) | WB9 RED authoring direct-reads `anthropic-api-client.ts`; HALT-WB9-PRE-COMMIT for escalation |
| Sub-Q-T4-B=(i) `workstation:read-build-md` new-IPC scope expansion mid-ticket | `[KNOWN]` if (i) chosen | `[MODELED-MEDIUM]` (separate `contract:` commit per CLAUDE.md §2.4; +2 WBs amendment cycle) | Default to (iii) deferred-to-T5; only escalate if operator wants BUILD.md content in T4 |
| Sub-Q-T4-F=(i) bypass-perms indicator updates reactive to dispatchMode change — re-fetch pattern may stale | `[MODELED-MEDIUM]` (chat-shell remount on mode-change pattern OR window event) | `[MODELED-LOW]` (operator-visible stale state until next interaction) | WB12 implementation includes subscription to dispatchMode change events; verify via probe |
| BUILD.md tab placeholder copy is jarring vs wireframe expectation | `[MODELED-MEDIUM]` (placeholder copy is visible) | `[MODELED-LOW]` (operator-acceptable per Sub-Q-T4-B=(iii) deferral framing) | Soften placeholder copy at WB6; cross-ref T5 ownership prominently |
| Frame Router default mode 'C' + bottom-rail crowding interact poorly — Frame C primary user is in tile/detail focus mode, may not see bottom rail prominently | `[MODELED-LOW]` (wireframe shows them coexisting) | `[MODELED-LOW]` (operator UX subjective) | WB13 smoke verifies visual; T7 polish refines if surfaced |
| Cross-session conflict with T7 (visual polish) at WB12 layout consolidation | `[MODELED-LOW]` (T7 is sequential after T4 per §2.4) | `[MODELED-LOW]` (T7 consumes T4 output) | Coordinate via coord note at T7 spawn if T4 still in flight |
| `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2 row 271) — max-parallel counter inherits stale sessions if external session death not reconciled | `[KNOWN]` | `[MODELED-LOW]` (N count slightly inflated for externally-killed sessions; same as tile-grid today) | Cross-ref in WB14 docs; do NOT close row 271 |
| Tier 1 MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION — staged paths could include other-session work if `git add -A` accidentally used | `[KNOWN-DEFENDED]` per dispatch discipline reinforcement | `[MODELED-HIGH]` (cross-session work could be absorbed) | Per-path `git add -- <path>` AND per-path `git commit -- <paths>`; Q7 inspects `git diff --cached --name-only` at commit time per CLAUDE.md §2.7 |

---

## §9 — IPC amendment outline (conditional)

If Sub-Q resolution selects any new-IPC option, the corresponding amendment text follows the precedent of Wave B WB-§6 `0f0e762` consolidated §6.6 amendment. Channel-level outline:

### §9.1 — `workstation:read-build-md` (conditional on Sub-Q-T4-B=(i))

| Field | Value |
|---|---|
| Direction | renderer → main (invoke/handle) |
| Payload | none |
| Response | `Promise<string>` — raw UTF-8 content of BUILD.md at the configured path |
| Bridge surface | `window.workstationBridge.readBuildMd(): Promise<string>` |
| Path resolution | reads from `coarchitectBridge.getBuildDocConfig()` resolved path |
| Fallback | ENOENT → empty string OR explicit "no BUILD.md configured" error |
| Consumer | `src/chat-shell/build-md-tab.tsx` |

### §9.2 — `workstation:cost-meter` (conditional on Sub-Q-T4-C=(ii)/(iii))

| Field | Value |
|---|---|
| Direction | renderer → main (invoke/handle) |
| Payload | none |
| Response | `Promise<{ dailyUsd: number; perSessionUsd?: Record<string, number>; lastUpdatedMs: number }>` (shape TBD per investigation) |
| Bridge surface | `window.workstationBridge.getCostMeterState()` |
| Aggregation source | main-process aggregator reading from coarchitect-ipc.ts ledger |
| Consumer | `src/chat-shell/cost-meter.tsx` (existing component extended OR new wrapping) |

### §9.3 — `workstation:plan-timer` (conditional on Sub-Q-T4-D=(ii))

| Field | Value |
|---|---|
| Direction | renderer → main (invoke/handle) |
| Payload | none |
| Response | `Promise<{ resetsAtMs: number; progressPct: number; planName: string }>` |
| Bridge surface | `window.workstationBridge.getPlanTimer()` |
| Source | main-process derives from `anthropic-api-client.ts` RateLimitState OR shared state |
| Consumer | `src/chat-shell/plan-timer-text.tsx` + `plan-usage-ring.tsx` |

Each new channel landing as a SEPARATE `contract(GATE-T4-§6.6-<channel>): WORKSTATION_CONTRACT.md §6.6 amendment — ...` commit per CLAUDE.md §2.4 + Wave B `0f0e762` precedent; OR consolidated `contract(GATE-T4-§6.6-consolidated): ...` if multiple channels selected (operator decision at Sub-Q resolution time).

---

**End of MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS ticket body.**

Pending operator resolutions before WB ladder execution:
- Sub-Q-T4-A (§3.1) — bottom-rail host element (α extend chat-shell-header-bar / β NEW DOM region / γ NEW React component)
- Sub-Q-T4-B (§3.2) — BUILD.md tab content source (i new IPC / iii defer-with-placeholder / iv config-metadata-only)
- Sub-Q-T4-C (§3.3) — cost meter aggregation source (i reuse / ii new IPC / iii hybrid; WB7 RED investigation gates)
- Sub-Q-T4-D (§3.4) — plan timer data source (i reuse / ii new IPC / iii daemon SSE; WB9 RED investigation gates)
- Sub-Q-T4-E (§3.5) — max-parallel counter source (i renderer-internal / ii workstation pool / iii daemon)
- Sub-Q-T4-F (§3.6) — bypass-perms indicator visibility (i dispatchMode-derived / ii dedicated state / iii defer)
- Sub-Q-T4-G (§3.7) — Auto/Ask toggle visual restyle (α reuse-as-is-defer-to-T7 / β restyle-in-T4)

Plus filesystem-convention question: dispatch-recommended path `docs/build-docs/tickets/MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS.md` vs existing convention `docs/build-docs/CONDUCTOR_<NAME>_BUILD.md` (this draft uses existing convention; operator may relocate at HALT ack OR adopt new convention going forward).
