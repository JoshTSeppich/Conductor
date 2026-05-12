# MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW — Bottom-rail plan-timer real-data flow (rate-limit source + emission channel + mount auto-wire)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW (SPECULATIVE Phase 4 forward-positioning)
**Date authored:** 2026-05-12
**Authored under:** §3.4 operator-supervised mechanical translation discipline (full-build-mode dispatch §3.2) + Round 10 max-aggressive parallelization dispatch /tmp/dispatch-p5.txt (P5b sub-workstream; operator-acknowledged speculative-revision risk per dispatch STATUS FRAMING)
**Authoring delegate:** P5 sub-session (gen-4 orchestrator HSO peer repurposed, Round 10 cascade)
**Authoring anchor commit (HEAD at authoring time):** `a34f519`
**Cairn ladder anchor:** full-build-mode dispatch §2 T4 (Bottom rail — Conductor controls) Phase 4 follow-on per P3 PROVISIONAL Phase 4 roadmap `d009e6f` §1.4 row `MB-T-PHASE-4-PLAN-TIMER-RESET-COUNTDOWN-ACCURACY` + dispatch §0 "Plan timer accuracy" Phase 3 trigger.

**SPECULATIVE Phase-4 status:** `[SPECULATIVE per dispatch §0 STATUS FRAMING]` Phase 3 visual-verification not yet triggered. Operator explicitly accepts revision-cost. Post-Phase-3 evidence may RATIFY / RESHAPE / DISCARD this ticket. Treat scope as plausible, not committed.

**Closes / advances:**
- `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2 — FOLLOWUPS.md:274) — **primary closure target**: PlanRing rate-limit data path went silent post-MB-T-HSO-WIRE WB14a removal of `captureRateLimitToBroadcast`. T9 reauthors emitter per Sub-Q-T9-A resolution.
- `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` (Tier 3 — T4 WB14 findings `4e8ec96` §IX) — refinement on `state.requests?.reset` primary vs alternatives; T9 ratifies or refines per Sub-Q-T9-B.
- `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (Tier 2 — T4 WB14 findings §IX) — PARTIAL closure: T9 ships PlanTimerText mount auto-wire arm. MaxParallelCounter + BypassPermsIndicator arms remain (separate Phase 4 follow-ons).
- Full-build-mode dispatch §1 Bottom rail bullet 7 (`Max plan resets in 2h 47m` + 38% progress ring) — structural ship landed at T4 WB10 `4dc4f32` (PlanTimerText) + MB-T25 (PlanUsageRing); **this ticket advances plan-timer from null-state render → real-data render**.
- Audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §10.7 row "PlanRing placement" — advances from SHIPPED-with-stub → SHIPPED-with-real-rate-limit-source.

**Depends on (all merged):**
- MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS (`f8fc24d` ticket body; WB14 docs at `4e8ec96`) — `PlanTimerText` component + ring-helpers `RateLimitState` type shipped; consumer surface unchanged by T9.
- MB-T34 rate-limit bridge (`coarchitectBridge.onRateLimitUpdate` at `preload.mts:79`; `coarchitect:rate-limit-update` broadcast channel + `coarchitect:getRateLimitState` IPC stub) — bridge plumbing intact; only data source is STUB (`coarchitect-ipc.ts:94` returns null).
- MB-T-HSO-WIRE WB14b refactor (`coarchitect-ipc.ts` surviving subset) — `captureRateLimitToBroadcast` + `broadcastRateLimitUpdate` + `latestRateLimitState` ORPHANED + removed in WB14a; T9 reauthors the emitter under HSO architecture.
- MB-T25 plan-usage-ring (`plan-usage-ring.tsx`) — ring consumer of same `RateLimitState`; sibling subscriber; T9 ensures both PlanTimerText + PlanUsageRing receive updates from new source.

**Downstream gates:**
- T7 (Visual polish) — plan-timer visual format already shipped at T4 WB10 (`Max plan resets in Xh Ym`); T9 does NOT touch visual rendering.
- T8 (Cost-meter data flow — sibling) shares architectural pattern (workstation aggregator + emission channel + mount auto-wire) — coordinate Sub-Q resolutions; consider single consolidated `WORKSTATION_CONTRACT.md` §6.6 amendment cycle if both adopt new-IPC paths.
- Future `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` analog for plan-data (PTY-scrape from CC CLI plan-usage bar) — out-of-scope here; T9 defers PTY-scrape to dedicated follow-on per Sub-Q-T9-A=(c) default.

**Estimated WB count:** 8-10 baseline (8 WB default path; +1-2 if Sub-Q-T9-A=(a) workstation Anthropic-API-ping spike surfaces auth/secret complexity OR Sub-Q-T9-D=(ii) new-IPC path triggered; +1 if `WORKSTATION_CONTRACT.md` §6.6 amendment triggered).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first to bind vs deferred work.
2. Read §3 (Sub-Q gate arbitrations) — five operator decisions parameterize WB scope; defaults `[MODELED]` recommendations.
3. Read §4 (WB ladder) for execution order. WBs are construction-order-aware: probe-then-impl per cairn discipline.
4. §5-§9 are operational supports — cross-refs, self-check expectations, definition of done, risk register, IPC amendment outline.

Confidence labels per CLAUDE.md §2.2: `[KNOWN]` observed in this session via direct source read at HEAD `a34f519`; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence — especially binding for Phase-4 forward-positioned claims per dispatch /tmp/dispatch-p5.txt STATUS FRAMING.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per full-build-mode dispatch §2 T4 follow-on + P5 dispatch /tmp/dispatch-p5.txt:

1. **Replaces `coarchitect-ipc.ts:94` STUB** `ipcMain.handle('coarchitect:getRateLimitState', () => null)` with a real-data return path. `[KNOWN]` per direct-read at HEAD `a34f519`: handler currently returns hardcoded null per comment block "MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO (Tier 2) tracks the PTY-scrape-based replacement; until migrated, returns null."

2. **Reauthors the `coarchitect:rate-limit-update` broadcast emitter** that was removed in MB-T-HSO-WIRE WB14a (per `coarchitect-ipc.ts:35-38` comment block: "Cost-meter capture helpers ... and rate-limit capture helpers (broadcastRateLimitUpdate, captureRateLimitToBroadcast, latestRateLimitState) — orphaned with the sendAndStream handler"). NEW emitter lives in NEW `packages/dispatch-workstation/src/main/rate-limit-aggregator.ts` (name varies per Sub-Q-T9-A).

3. **Rate-limit source-of-truth selection per Sub-Q-T9-A**: workstation Anthropic-API-ping / daemon-side ping / PTY-scrape from CC CLI plan-bar / accept-stub.

4. **Dimension selection per Sub-Q-T9-B** (refines `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION`): T4 WB10 default uses `state.requests?.reset` primary (`plan-timer-text.tsx:35-49`); T9 ratifies or refines (e.g., `tokens` primary, hybrid, or new "plan" dimension if Anthropic API exposes one).

5. **Poll cadence per Sub-Q-T9-C**: poll interval / per-response-piggyback / event-driven hybrid.

6. **Emission channel per Sub-Q-T9-D**: reuse existing `coarchitect:rate-limit-update` (recommended) OR new `workstation:plan-timer` IPC channel.

7. **Mount auto-wire** (closes `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` PlanTimerText arm): MOD `packages/dispatch-workstation/src/chat-shell/mount.ts` to add `resolveRenderPlanTimerText()` returning a closure that subscribes to `coarchitectBridge.onRateLimitUpdate` + supplies `<PlanTimerText state={...} nowMs={Date.now()} />`. Mirrors existing `resolveRenderCostMeter` pattern.

8. **Plan-name surfacing per Sub-Q-T9-E**: "Max plan" literal (current `plan-timer-text.tsx:69` hardcoded) / from API response field if Anthropic exposes / config-derived.

9. **Audit reclassification + FOLLOWUPS closure stamps**: WB-final docs update audit §10.7 row + close/advance `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` Tier 2 + advance `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` Tier 3 + partial-close `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify `PlanTimerText` component body (`plan-timer-text.tsx`) — pure prop-driven; consumer-surface stable; data-flow change is upstream-only. EXCEPTION: Sub-Q-T9-E=(β/γ) plan-name surfacing may require additional `planName?: string` prop (minor additive).
- Does NOT modify `PlanUsageRing` component (MB-T25 `plan-usage-ring.tsx`) — sibling consumer of same `RateLimitState`; receives updates transparently via existing bridge.
- Does NOT modify `RateLimitState` / `RateLimitDimension` types at `ring-helpers.ts:26-43` — types are stable; new data merely populates them.
- Does NOT close `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2 row in full — only the PlanTimerText arm; MaxParallelCounter + BypassPermsIndicator arms remain (separate Phase 4 follow-ons).
- Does NOT modify v2/v3 schemas (no daemon contract additions in default path).
- Does NOT add new daemon endpoints (Sub-Q-T9-A=(b) daemon-side ping is out-of-default-scope; opens cross-package amendment cycle).
- Does NOT modify frozen surfaces unless Sub-Q-T9-D=(ii) `workstation:plan-timer` is selected (then `WORKSTATION_CONTRACT.md` §6.6 amendment scope surfaces at HALT-WB-PRE-COMMIT per CLAUDE.md §2.4 — separate operator-arbitrated `contract:` commit).
- Does NOT introduce electron-store; persistence (if any) mirrors `splitter-state.ts` raw `fs` pattern per CLAUDE.md §3.5.
- Does NOT touch Frame C / tile-grid / action-bar / detail-pane / chat panel body — strictly bottom-rail plan-timer data territory.
- Does NOT close `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` Tier 3 (sibling territory — T8 advances it).

---

## §2 — Arbitration anchor (operator-frozen via P5 dispatch /tmp/dispatch-p5.txt + full-build-mode dispatch 2026-05-11)

### §2.1 — P5 dispatch enumeration (binding)

`[KNOWN-OPERATOR-ARBITRATED]`

Per /tmp/dispatch-p5.txt P5b: "MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW — Max plan reset countdown; flows into PlanTimerText (T4 WB10 shipped per Sub-Q-T4-D=i reuse-onRateLimitUpdate; real-data flow deferred to Phase 4); Source-of-truth: rate-limit-state requests-dimension primary; reset-time field; Wireframe target: `Max plan resets in 2h 47m` + 38% progress ring per dispatch §1."

Operator pre-arbitrated:
- Scope = plan-timer data flow (NOT visual, NOT new component).
- Source-of-truth direction = "rate-limit-state requests-dimension primary; reset-time field" — strongly biases Sub-Q-T9-B toward (i) `state.requests?.reset` primary (matches T4 WB10 shipped default).
- Source surface NOT specified ((a)/(b)/(c) all admissible); Sub-Q-T9-A remains open.

### §2.2 — Visual-comparison gate (dispatch §3.5)

`[KNOWN-OPERATOR-ARBITRATED]`

Per full-build-mode dispatch §3.5: `green:wiring` AUTO-ACK requires headless screenshot generation OR operator-manual-screenshot fallback. T9 is data-flow (not visual), but WB-final smoke per CLAUDE.md §4.6 verifies that PlanTimerText renders non-em-dash countdown text post-emission. Until T6/MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING headless pipeline ships (in flight at `030c2d6`), operator-manual-screenshot fallback at HALT-WB-FINAL-PRE-COMMIT.

### §2.3 — Frozen-contract amendment scoping (binding pattern)

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.3: NEW IPC channels require `WORKSTATION_CONTRACT.md` §6.6 amendment per CLAUDE.md §2.4 (operator-arbitrated separate `contract:` commit). T9 default Sub-Q recommendations minimize new-channel introductions (Sub-Q-T9-A=(c) PTY-scrape OR (a) workstation-direct; Sub-Q-T9-D=(i) reuse existing `coarchitect:rate-limit-update` broadcast). Non-default selections escalate amendment scope.

If both T8 (sibling — cost-meter data flow) and T9 adopt new-IPC paths, recommend single consolidated `contract(GATE-T8-T9-§6.6-additions): ...` commit covering all new channels.

### §2.4 — Construction order (file ownership for parallel-CC discipline)

`[KNOWN per dispatch §5.1 + this ticket §5.3]`

T9 primary territory:
- NEW `packages/dispatch-workstation/src/main/rate-limit-aggregator.ts` (Sub-Q-T9-A=(a/b/c); name varies per source)
- MOD `packages/dispatch-workstation/src/main/coarchitect-ipc.ts:94` (replace STUB `() => null` with real-aggregator-driven response; add broadcast emitter call sites)
- MOD `packages/dispatch-workstation/src/chat-shell/mount.ts` (add `resolveRenderPlanTimerText()` mirroring `resolveRenderCostMeter`; closes PlanTimerText arm of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING`)
- CONDITIONAL MOD `packages/dispatch-workstation/src/main/main.ts` sentinel zone (aggregator startup wiring + IPC handler registration if Sub-Q-T9-D=(ii))
- CONDITIONAL MOD `packages/dispatch-workstation/src/main/preload.mts` (new bridge method if Sub-Q-T9-D=(ii))
- CONDITIONAL NEW `packages/dispatch-workstation/src/main/rate-limit-pty-source.ts` (if Sub-Q-T9-A=(c) PTY-scrape; mirror `tile-token-scraper.ts` pattern)
- CONDITIONAL MOD `WORKSTATION_CONTRACT.md` §6.6 (amendment if Sub-Q-T9-D=(ii); separate `contract:` commit per CLAUDE.md §2.4)
- WB-final NEW `docs/coordination/mbtwft9-findings-2026-05-12.md`
- WB-final MOD `docs/FOLLOWUPS.md` (close `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO`; advance `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION`; partial-close `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING`)

Path-disjoint from co-active sub-sessions per dispatch §5.1:
- T8 ticket-body (cost-meter data flow — sibling): `src/main/cost-meter-aggregator.ts` (sibling new file) + `coarchitect-ipc.ts:89` (different STUB — `getDailyCost` returns 0). SHARED EDIT TERRITORY at `coarchitect-ipc.ts`; coordinate via `docs/coordination/t8-t9-coord-2026-05-12.md` at WB1 if both sessions concurrently active.
- T7-successor visual-polish work: `src/frame-c/` + `src/chat-shell/` UI styling — path-disjoint from `src/main/`.
- T4-successor `commit-plan-doc-1334`: completed at WB14 `4e8ec96`; territory free.

Path-overlap risk:
- `coarchitect-ipc.ts` is touched by both T8 (line 89) and T9 (line 94). MUST coordinate edit window via coord note OR sequence the two WB ladders rather than running concurrently.
- `mount.ts` is touched by T9 (PlanTimerText slot) only — T8 cost-meter slot already shipped at T4 WB13 `7abb649`; no overlap.

---

## §3 — Sub-Q gate arbitrations REQUIRED before specific WBs

Five operator decisions parameterize WB scope. Surface at HALT-TICKET-BODY-PRE-COMMIT for batch resolution. Defaults if unresolved are `[MODELED]` recommendations.

### §3.1 — Sub-Q-T9-A: Rate-limit source-of-truth

Required before **WB2** (aggregator probe) + **WB3** (impl). Default if unresolved: **(c) PTY-scrape from CC CLI plan-usage bar (SPIKE-FIRST)**.

`[KNOWN]` per direct-read at HEAD `a34f519`:
- `coarchitect-ipc.ts:94` `ipcMain.handle('coarchitect:getRateLimitState', () => null)` — STUB returns null until migrated; closure comment cites `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` Tier 2.
- Pre-HSO-WB14a emitter `captureRateLimitToBroadcast` was sourced from "Anthropic API response headers (X-RateLimit-*) via AnthropicChatClient" per audit §8.K + FOLLOWUPS:274.
- AnthropicChatClient retention status: `[SPECULATIVE]` per FOLLOWUPS:274 "removed entirely if no remaining consumers"; direct-read at WB1 will verify.
- SPIKE-HSO-01 scenario-5 verified CC CLI status-bar exposes `token count`; plan-usage data visibility `[SPECULATIVE]` per `MB-F-A3` row.

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (a) Workstation-direct Anthropic-API ping | NEW `rate-limit-aggregator.ts` makes lightweight Anthropic API call at interval (Sub-Q-T9-C); parses `X-RateLimit-*` response headers into `RateLimitState`; emits via `coarchitect:rate-limit-update`. Requires Anthropic API key in workstation env. | NONE direct; introduces secret-management concern | MEDIUM — API call + secret handling + ADR per CLAUDE.md §2.8 spike-for-external-API |
| (b) Daemon-side Anthropic-API ping | NEW daemon endpoint `/v3/rate-limit-state` returning current `RateLimitState`; daemon owns Anthropic API call + secret. Workstation polls. | YES — daemon route addition + workstation IPC channel + `WORKSTATION_CONTRACT.md` §6.6 amendment | HIGH (daemon impl + cross-package contract) |
| (c) PTY-scrape from CC CLI plan-bar (recommended) | NEW `rate-limit-pty-source.ts` mirror of `tile-token-scraper.ts`; observes CC CLI output for plan-usage indicators (per SPIKE-HSO-01 — verify visibility); emits parsed state. **SPIKE REQUIRED FIRST** per CLAUDE.md §2.8 — CC CLI plan-data exposure is `[SPECULATIVE]`. | NONE | HIGH if visible (spike + scraper + emitter); ZERO if not visible (escalate to (a)/(b)/(d)) |
| (d) Accept STUB | No change; keep `() => null` STUB; do NOT close `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO`. Honest "—" render per dispatch §2.11 outcome classification "No improvement + structural finding". | NONE | ZERO |

`[MODELED]` Recommend **(c) PTY-scrape (SPIKE-FIRST)** for ship-velocity + zero-secret-mgmt + zero-§6-touch IF spike validates. Rationale: `MB-F-A3` closure path explicitly enumerates PTY-scrape per `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` precedent; §C.5 PTY-scrape infrastructure shipped at `13b7607` proves the pattern viable. WB2 spike-then-impl per CLAUDE.md §2.8: launch CC session; observe stdout for rate-limit indicators; ADR + binding decision. Sub-Q-A=(a) is faster impl-wise but introduces secret-management complexity (Anthropic API key in workstation env) — defer unless operator authorizes. Sub-Q-A=(b) is cleanest architecturally but couples T9 to daemon roadmap. Sub-Q-A=(d) is honest fallback if (c) spike reveals CC CLI does not expose plan-data; in that case operator may prefer (a) or (d) defer.

**Spike-then-impl gate** per CLAUDE.md §2.8: WB2 RED is parameterized; WB2.5 spike (ADR-MBTWFT9-A) documents CC CLI plan-data visibility; HALT-WB2-POST-SPIKE escalates if (c) not viable.

Operator decision pending.

### §3.2 — Sub-Q-T9-B: Dimension selection

Required before **WB3** (impl scope). Default if unresolved: **(i) `state.requests?.reset` primary (RATIFY T4 WB10 default)**.

`[KNOWN]` per `plan-timer-text.tsx:34-49` + T4 WB9 investigation: T4 default selects `state.requests?.reset` as primary plan-window signal (closest match per Anthropic API X-RateLimit-Requests-Reset semantics); `state.tokens?.reset` is fallback. `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` Tier 3 enumerates refinement options.

| Option | Primary source | Rationale |
|---|---|---|
| (i) `state.requests?.reset` (recommended — RATIFY T4 WB10) | Requests dimension = closest plan-window signal per Anthropic API headers. Per dispatch /tmp/dispatch-p5.txt P5b "rate-limit-state requests-dimension primary; reset-time field" — operator-direction. | Matches operator-direction in dispatch + T4 WB9 investigation finding |
| (ii) `state.tokens?.reset` primary | Tokens dimension = combined input+output; T4 WB10 shipped as fallback. Operator may prefer tokens semantics if requests dimension proves to drift from plan-window timing. | Alternative if Sub-Q-T9-A source produces drift in requests but stable tokens |
| (iii) Hybrid: prefer requests, fall through tokens, then inputTokens, then outputTokens (RATIFY current `plan-timer-text.tsx:34-49` fallback chain) | Current shipped fallback ladder | Maximum coverage under partial-header conditions |
| (iv) New "plan" dimension if Anthropic API exposes | `[SPECULATIVE]` — depends on Sub-Q-T9-A source surfacing a `plan_resets_at` field distinct from per-dimension resets. | Defer to spike findings |

`[MODELED]` Recommend **(i)** to ratify T4 WB10 default + match dispatch operator-direction. Sub-Q-B=(iv) is `[SPECULATIVE]` and deferred. Sub-Q-B=(iii) is the current fallback ladder — already shipped; explicit ratification removes ambiguity in `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` closure.

Operator decision pending.

### §3.3 — Sub-Q-T9-C: Poll cadence

Required before **WB6** (cadence probe) + **WB7** (impl). Default if unresolved: **(β) 60s interval (Sub-Q-A=(c) PTY-scrape is event-driven; daemon-direct or workstation-direct ping needs interval)**.

| Option | Cadence | Cost characteristic | Sub-Q-A compatibility |
|---|---|---|---|
| (α) Fixed short interval (e.g., 10s/30s) | Frequent updates; tighter countdown UX | Moderate API call rate or PTY-scrape load | All sources |
| (β) 60s interval (recommended) | Once per minute; matches countdown display granularity (minute-precision) | Low load | All sources |
| (γ) Event-driven only | Update only on spawn/detach/kill; no idle polling | Minimal load; countdown text gets stale (each minute the rendered text drifts from real) | (c) PTY-scrape only |
| (δ) Per-response-piggyback | Update only when CC sessions complete API calls (response headers carry rate-limit info) | Optimal — no extra API calls | (c) PTY-scrape only (per-response visible in CC stdout) |

`[MODELED]` Recommend **(β) 60s interval** for ship-velocity + UX-coherence (countdown updates once per visible minute change). Sub-Q-C=(α) is wasteful at minute-granularity display. Sub-Q-C=(γ) leaves countdown text stale between events. Sub-Q-C=(δ) is optimal but requires (a)/(b) source coupling; admissible only if Sub-Q-A=(c) PTY-scrape captures response-piggybacked rate-limit info.

Operator decision pending.

### §3.4 — Sub-Q-T9-D: Emission channel

Required before **WB4** (channel probe) + **WB5** (impl). Default if unresolved: **(i) Reuse existing `coarchitect:rate-limit-update`**.

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (i) Reuse existing `coarchitect:rate-limit-update` (recommended) | Aggregator emits via `webContents.send('coarchitect:rate-limit-update', state)` mirroring removed `broadcastRateLimitUpdate` pattern from MB-T-HSO-WIRE WB14a. Renderer subscribers (PlanTimerText via mount auto-wire + PlanUsageRing via existing mount.ts subscription) unchanged; `coarchitectBridge.onRateLimitUpdate` at `preload.mts:79` intact. | NONE (reuses existing channel) | LOW |
| (ii) NEW IPC `workstation:plan-timer` (operator-flagged at full-build-mode dispatch §3.3) | NEW main-process bridge method + push channel with pre-computed `{ resetsAtMs: number; progressPct: number; planName: string }` payload. Forward-compat for richer payload. | YES — `WORKSTATION_CONTRACT.md` §6.6 amendment | MEDIUM (+1 WB) |
| (iii) Hybrid | Keep `coarchitect:rate-limit-update` for `RateLimitState` live broadcasts; add `workstation:plan-timer` for pre-computed plan-specific snapshot. Forward-compat. | YES — §6.6 amendment | HIGH (+2 WBs) |

`[MODELED]` Recommend **(i)** for ship-velocity + zero-§6-touch + matches the original (pre-HSO-WB14a) emission pattern that both PlanTimerText + PlanUsageRing were designed for. Sub-Q-D=(ii) is operator-flagged in dispatch but only load-bearing if pre-computed payload (Sub-Q-T9-E=(γ) config-derived plan-name) is also selected; defer otherwise.

Operator decision pending.

### §3.5 — Sub-Q-T9-E: Plan-name surfacing

Required before **WB7** (mount-wire impl). Default if unresolved: **(α) "Max plan" literal (RATIFY T4 WB10 default)**.

`[KNOWN]` per `plan-timer-text.tsx:69`: current literal `Max plan resets in {text}` hardcoded "Max plan". Wireframe target shows "Max plan resets in 2h 47m" — literal matches.

| Option | Mechanism | Effort |
|---|---|---|
| (α) "Max plan" literal (recommended — RATIFY T4 WB10) | No change; component continues hardcoded. Matches wireframe exactly. | ZERO |
| (β) From API response field if Anthropic exposes | `[SPECULATIVE]` — Anthropic API may surface `plan_name` in headers or response body; if visible, parse and thread via `RateLimitState` extension. | MEDIUM — type extension + parser |
| (γ) Config-derived | NEW config field `dispatch-config.json:plan_name` OR env var; renderer reads via existing bridge. Operator-configurable. | MEDIUM — config schema extension |

`[MODELED]` Recommend **(α)** to ratify T4 WB10 default + match wireframe. Sub-Q-E=(β) is `[SPECULATIVE]`. Sub-Q-E=(γ) is over-engineered for v3.0 ship; defer to follow-on if operator wants multi-plan support.

Operator decision pending.

---

## §4 — WB ladder

8 WBs baseline (defaults: Sub-Q-A=(c) with spike, Sub-Q-B=(i), Sub-Q-C=(β), Sub-Q-D=(i), Sub-Q-E=(α)). 8-10 WB swing per Sub-Q resolutions. Construction order: probe-then-impl per cairn discipline. **WB2 includes a spike-then-impl gate per CLAUDE.md §2.8 for Sub-Q-T9-A=(c) PTY-scrape source validation.**

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CLAUDE.md §10.5; per-path `git add` per CLAUDE.md §2.7; push after each cairn-grammar commit per CLAUDE.md §2.6.

### WB1 — `red(MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW): probe-mbtwft9-01-current-stub-state`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtwft9-01-current-stub-state.spec.ts` (NEW). Source-text inspection of `packages/dispatch-workstation/src/main/coarchitect-ipc.ts:94`: asserts the `coarchitect:getRateLimitState` handler body is NOT the hardcoded `() => null` STUB (i.e., asserts the comment block at lines 91-93 has been removed AND body returns from an aggregator). Probe fails RED until WB3 GREEN replaces the STUB. **Also asserts mount.ts has NO `resolveRenderPlanTimerText` symbol at HEAD (PlanTimerText auto-wire absent per `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2)** — closes when WB7 lands.
**Acceptance:** probe RED on `expect(handlerSource).not.toMatch(/ipcMain\.handle\('coarchitect:getRateLimitState',\s*\(\)\s*=>\s*null\)/)` AND `expect(mountSource).toMatch(/resolveRenderPlanTimerText/)` — current sources fail both per HEAD `a34f519`.
**Frozen contracts touched:** none — probe-only.
**Q1-Q9 expected:** Q1=N/A; Q2=BEHAVIOR (fs-read sentinel); Q3=No; Q4=No; Q5=No; Q6=KNOWN/MODELED; Q7=new probe path-disjoint; Q8=N/A; Q9=No.

### WB2 — `spike(MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW): ADR-MBTWFT9-A — CC CLI plan-data PTY-visibility (CONDITIONAL on Sub-Q-A=(c))`

**Type:** spike (per CLAUDE.md §2.8 external-API discipline)
**Scope:** SPIKE: launch a real CC session; observe stdout for plan-usage indicators (look for `plan reset`, `Max plan`, `X-RateLimit-*`-derived lines, percentage indicators). Document findings in NEW `docs/adr/MBTWFT9-A-cc-cli-plan-data-visibility-2026-05-12.md` with confidence label + binding decision. If PTY-data visible → (c) confirmed; else escalate to operator with (a)/(b)/(d) options.
**Acceptance:** ADR committed under `spike:` commit grammar. Q1=YES (this WB IS the spike); Q2=BEHAVIOR (real CC launch + stdout capture).
**Conditional:** SKIPPED if Sub-Q-T9-A=(a)/(b)/(d). Always RUN if Sub-Q-T9-A=(c) default — surfaces revision at HALT-WB2-POST-SPIKE if non-viable.
**Frozen contracts touched:** none.

### WB3 — `red(MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW): probe-mbtwft9-02-aggregator-roundtrip`

**Type:** red
**Scope:** RED probe at `probe-mbtwft9-02-aggregator-roundtrip.spec.ts`. Asserts: NEW module `packages/dispatch-workstation/src/main/rate-limit-aggregator.ts` exports `createRateLimitAggregator(deps: { source: RateLimitSource })` returning `{ getLatestState(): RateLimitState | null; start(): void; stop(): void; onUpdate(cb: (state: RateLimitState) => void): () => void }`. Mock-injected source emits a `RateLimitState` with `requests.reset = now + 2h47m`; aggregator's `getLatestState()` returns that state.
**Acceptance:** probe RED — module absent. Commit body Q1-Q9.
**Sub-Q-T9-A blocker:** WB4 cannot proceed until Sub-Q-T9-A resolves (post-WB2 spike). Probe shape parameterized.

### WB4 — `green(MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW): rate-limit-aggregator impl`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/src/main/rate-limit-aggregator.ts` per Sub-Q-T9-A:
- (a) Workstation-direct Anthropic API ping: NEW HTTPS call to Anthropic API (e.g., `/v1/models` or minimal endpoint that returns rate-limit headers); parses `X-RateLimit-*` into `RateLimitState`.
- (b) Daemon-side ping: workstation polls daemon `/v3/rate-limit-state`; thin client only (daemon-side impl out-of-scope).
- (c) PTY-scrape: NEW `rate-limit-pty-source.ts` mirror of `tile-token-scraper.ts`; observes `IConsoleBroadcaster`-injected PTY chunks for plan-bar pattern (per WB2 ADR-confirmed regex); emits `RateLimitState`.
- (d) Accept STUB: aggregator stub-returns; ticket scope closes early with `MB-F-A3` REOPEN-PATH stamp + Tier 1 escalation.
**Acceptance:** WB3 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-A=(b).

### WB5 — `red(MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW): probe-mbtwft9-03-emission-channel`

**Type:** red
**Scope:** RED probe at `probe-mbtwft9-03-emission-channel.spec.ts`. Asserts: `coarchitect-ipc.ts` registers `rateLimitAggregator.onUpdate((state) => { webContents.send('coarchitect:rate-limit-update', state) })` wire-up at module init time. Mock injection: stub `ipcMain.handle` + `webContents.send`; trigger aggregator update; assert broadcast fired.
**Acceptance:** probe RED — wire-up absent. Commit body Q1-Q9.

### WB6 — `green(MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW): coarchitect-ipc.ts rate-limit-update emitter rewire`

**Type:** green
**Scope:** GREEN at MOD `packages/dispatch-workstation/src/main/coarchitect-ipc.ts:94` + adjacent lines:
- Replace STUB `ipcMain.handle('coarchitect:getRateLimitState', () => null)` with `() => rateLimitAggregator.getLatestState()`.
- ADD aggregator startup call from `registerIpcHandlers()` body OR from main.ts startup sentinel zone.
- ADD `rateLimitAggregator.onUpdate((state) => { for (const wc of allWebContents.getAllWebContents()) { if (!wc.isDestroyed()) wc.send('coarchitect:rate-limit-update', state); } })` mirroring removed `broadcastRateLimitUpdate` from MB-T-HSO-WIRE WB14a.
- Sub-Q-T9-D=(ii) variant: ALSO register `ipcMain.handle('workstation:plan-timer', ...)` + add bridge method in preload.mts + amend `WORKSTATION_CONTRACT.md` §6.6 (separate `contract:` commit BEFORE WB6 GREEN).
**Acceptance:** WB5 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-T9-D=(ii).

### WB7 — `green(MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW): mount.ts auto-wire resolveRenderPlanTimerText`

**Type:** green
**Scope:** GREEN at MOD `packages/dispatch-workstation/src/chat-shell/mount.ts`:
- NEW `resolveRenderPlanTimerText(bridge: CoarchitectBridge): (() => ReactNode) | undefined` closure mirroring `resolveRenderCostMeter` precedent (T4 WB13 `7abb649`).
- Closure body: subscribes to `bridge.onRateLimitUpdate((state) => setState(state))`; renders `<PlanTimerText state={state} nowMs={Date.now()} />`; uses `useEffect` + `setInterval(60_000)` (Sub-Q-T9-C=(β)) to refresh `nowMs` for live countdown.
- Wire closure into chat-shell `<ChatShell renderPlanTimerText={resolveRenderPlanTimerText(bridge)} />`.
- Bundle inclusion verification per T4 WB13 smoke pattern: `grep -c plan-timer-text dist/chat-shell/renderer.js` returns ≥1.
**Acceptance:** WB1 probe second assertion (mount.ts has `resolveRenderPlanTimerText`) flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none — mount.ts is workstation-internal.
**Consumer non-regression check (CLAUDE.md memory):** full chat-shell suite must remain GREEN; T4 WB13 production-wiring patterns preserved.

### WB-final (WB8) — `green(MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW): runtime-launch smoke + findings doc + audit + FOLLOWUPS`

**Type:** green (smoke + docs)
**Scope:** per CLAUDE.md §4.6 runtime-launch smoke + dispatch §3.5 visual-comparison gate:
1. Build fresh: `pnpm --filter dispatch-workstation build`.
2. Launch electron from `dist/main/main.js`.
3. Observe within ~10s: WINDOW_READY sentinel; PlanTimerText renders.
4. Trigger a CC session that emits rate-limit response headers (or wait for PTY-scrape per Sub-Q-T9-A=(c)); verify PlanTimerText text transitions from `Max plan resets in —` → `Max plan resets in Xh Ym` (X, Y from real rate-limit data).
5. Generate headless screenshot if MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING `030c2d6` pipeline ships; else operator-manual-screenshot at HALT-WB-FINAL-PRE-COMMIT.
6. Author `docs/coordination/mbtwft9-findings-2026-05-12.md` per Wave B findings format anchor (I-X sections).
7. Audit reclassification: `wireframe-vs-shipped-audit-2026-05-09.md` §10.7 plan-timer placement row: SHIPPED-with-stub → SHIPPED-with-real-source.
8. FOLLOWUPS.md:
   - STAMP `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` Tier 2 → CLOSED at WB6 GREEN commit (with Sub-Q-T9-A path-taken citation).
   - ADVANCE `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` Tier 3 → RATIFIED at WB6 per Sub-Q-T9-B=(i) (or REFINED per non-default resolution).
   - PARTIAL-STAMP `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2 — PlanTimerText arm CLOSED; MaxParallelCounter + BypassPermsIndicator arms remain OPEN.
   - Cross-ref `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` Tier 3 (T8 sibling).
**Acceptance:** all 8 steps verified. Commit body Q1-Q9.
**Frozen contracts touched:** none — smoke + docs only.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED / ADVANCED by this ticket

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (FOLLOWUPS:274) | 2 | WB4+WB6: aggregator replaces `() => null` STUB; rate-limit-update broadcasts restored | WB6 |
| `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` (T4 WB14 §IX) | 3 | RATIFIED per Sub-Q-T9-B=(i) OR REFINED per non-default | WB6 |
| `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (T4 WB14 §IX) | 2 | PARTIAL — PlanTimerText auto-wire arm CLOSED at WB7; MaxParallel + BypassPerms arms remain OPEN | WB7 (partial) |
| Audit §10.7 row "PlanRing placement" | (audit row) | WB6+WB7: real-source data flows; auto-wire renders countdown | WB-final |
| Full-build-mode dispatch §1 Bottom rail bullet 7 | (dispatch enumeration) | WB6+WB7 | WB-final |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB2 spike may reveal CC CLI does NOT expose plan-usage data → escalate to Sub-Q-T9-A=(a) workstation-direct Anthropic ping (or (d) accept-STUB). File Tier 1 methodology-incident if non-trivial scope swing.
- WB4 (Sub-Q-A=(a)) may surface secret-management complexity (Anthropic API key in workstation env, possibly conflicting with daemon API key); file Tier 2 `MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING` if non-trivial.
- WB6 broadcast emit during workstation startup may race webContents creation (mirrors T8 sibling risk). File Tier 3 if observed.
- WB7 mount.ts `setInterval(60_000)` for `nowMs` refresh may surface coordination issue with PlanUsageRing's own subscription. Both consumers should see the same state; verify via dual-consumer smoke. File Tier 3 if state-divergence observed.
- WB-final may surface that PlanTimerText displays `0h 0m` for ~minute when rate-limit window resets (sub-minute remainders truncate to 0 per `plan-timer-text.tsx:51-57`). UX-only; file Tier 3 cosmetic if operator flags.
- Phase 3 visual-verification may surface that wireframe progress-ring (`38%`) needs explicit data-flow wiring distinct from PlanTimerText. T9 covers timer text only; ring is shipped via MB-T25; if ring data flow is also broken, separate ticket needed.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS | `f8fc24d` body + `4e8ec96` WB14 findings | §3.4 Sub-Q-T4-D arbitration; WB9-WB10 plan-timer shipping; WB13 mount.ts production wiring (resolveRenderCostMeter precedent); WB14 §IX `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` + `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` filing |
| MB-T-HSO-WIRE WB14b | (commit chain; current coarchitect-ipc.ts surviving subset) | `coarchitect-ipc.ts:1-50` comment block — removed captureRateLimitToBroadcast + broadcastRateLimitUpdate context |
| MB-T34 rate-limit bridge | (MB-T34 chain) | `preload.mts:79` `onRateLimitUpdate` bridge; `ring-helpers.ts:26-43` `RateLimitState` shape |
| MB-T25 plan-usage-ring | (MB-T25 chain) | `plan-usage-ring.tsx`; sibling consumer of same RateLimitState |
| §C.5 tile-token-scraper | `13b7607` | `tile-token-scraper.ts` PTY-scrape pattern (Sub-Q-T9-A=(c) precedent) |
| SPIKE-HSO-01 scenario-5 | `docs/spike-evidence/HSO-01/scenario-5-results.md` | CC CLI status-bar token-count visibility evidence (plan-data visibility distinct; T9 WB2 spike validates) |

### §5.4 — Dispatch + audit doc anchors (read at WB1 start)

- `/tmp/dispatch-p5.txt` P5b (this ticket's authoring directive)
- `docs/coordination/full-build-mode-dispatch.md` §1 Bottom rail bullet 7 + §2 T4 enumeration + §3.3 frozen-contract pattern + §3.5 visual-comparison gate
- `docs/coordination/phase-4-tier-1-roadmap-draft.md` (`d009e6f`) §1.4 `MB-T-PHASE-4-PLAN-TIMER-RESET-COUNTDOWN-ACCURACY` row + §3 Phase-3-entry preconditions
- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §10.7 PlanRing placement row + §8.K rate-limit emission audit
- `docs/coordination/mbtwt4-findings-2026-05-12.md` §III architectural delta 3 (WB9 investigation finding) + §IX `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` filing
- `docs/coordination/v35-post-audit-plan-2026-05-10.md` §A.3.R (PlanRing instance ratification + data-path risk)
- `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T1-SESSION-DATA-FLOW_BUILD.md` (format precedent — §0-§9 structure)

### §5.5 — Co-active sub-session coordination (per dispatch §5.1)

- T8 ticket-body (cost-meter data flow — sibling): `src/main/cost-meter-aggregator.ts` (sibling new file) + `coarchitect-ipc.ts:89` (different STUB). SHARED EDIT TERRITORY at `coarchitect-ipc.ts`; coordinate via `docs/coordination/t8-t9-coord-2026-05-12.md` at WB1 if both sessions concurrently active. If both adopt new-IPC paths (Sub-Q-T8-B=(ii) + Sub-Q-T9-D=(ii)), single consolidated §6.6 amendment commit covering both channels.
- T7 visual-polish (`a34f519` HEAD) — completed; T7 territory does not overlap with `src/main/`.
- P3 Phase-4-roadmap meta-doc (`d009e6f`) — read-only reference; T9 advances row `MB-T-PHASE-4-PLAN-TIMER-RESET-COUNTDOWN-ACCURACY` from §1.4 cluster F.

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A | BEHAVIOR (fs-read sentinel) | No — stub + missing-mount still in place | No | No | KNOWN/MODELED | new test path-disjoint | N/A | No |
| WB2 SPIKE | YES (THIS IS the spike) | BEHAVIOR (real CC launch + stdout capture) | N/A — spike, not impl | No | No | KNOWN/MODELED/SPECULATIVE explicit | `docs/adr/` new | N/A | No |
| WB3 RED | conditional (Sub-Q-A=(a) workstation-Anthropic needs spike on auth/secret) | BEHAVIOR (mock-injected source) | No — module absent | No | No | KNOWN/MODELED | new probe path-disjoint | N/A | No |
| WB4 GREEN | per WB3 + WB2 ADR | BEHAVIOR (real aggregator unit) | No — impl load-bearing | No | conditional on Sub-Q-A=(b) | KNOWN/MODELED | src/main/rate-limit-aggregator.ts new | N/A | No |
| WB5 RED | N/A | BEHAVIOR (mock ipcMain + webContents) | No — wire-up absent | No | No | KNOWN/MODELED | new probe path-disjoint | N/A | No |
| WB6 GREEN | N/A | BEHAVIOR (real IPC + broadcast) | No — impl load-bearing | No | conditional on Sub-Q-D=(ii) | KNOWN/MODELED | coarchitect-ipc.ts line 94 zone + (conditional) preload.mts + WORKSTATION_CONTRACT.md §6.6 | N/A | No |
| WB7 GREEN | N/A | BEHAVIOR (mount.ts auto-wire + jsdom render) | No — closure absent | No | No | KNOWN/MODELED | mount.ts (additive `resolveRenderPlanTimerText`) | N/A | No |
| WB-final | N/A | BEHAVIOR (real electron launch + plan-timer render) | N/A — smoke verifies WB1-WB7 integration | No | No | KNOWN per observed sentinels | none — observational | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1-WB-final cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin/main per CLAUDE.md §2.6.
2. **`MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` Tier 2 CLOSED**: `coarchitect-ipc.ts:94` no longer returns hardcoded null; real aggregator surface flows.
3. **`coarchitect:rate-limit-update` broadcasts emitted**: aggregator updates fire renderer subscribers; both PlanTimerText (via mount auto-wire) AND PlanUsageRing (existing subscriber) receive updates.
4. **mount.ts auto-wire** for PlanTimerText (closes `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` PlanTimerText arm).
5. **5-package typecheck CLEAN** per CLAUDE.md §4.4 (one command at a time; no `&&` chains).
6. **No regression in shipped probes**: T4 chat-shell suite 72/72 GREEN preserved; MB-T25 plan-usage-ring consumer probes preserved.
7. **WB-final runtime-launch smoke** per CLAUDE.md §4.6 + dispatch §3.5: WINDOW_READY + plan-timer renders text matching `/Max plan resets in \d+h \d+m/` (not `—`) post-real-rate-limit emission; screenshot evidence.
8. **WB-final findings doc + audit reclassification + FOLLOWUPS updates lands**: `docs/coordination/mbtwft9-findings-2026-05-12.md`; audit §10.7 reclassification; FOLLOWUPS row updates per §5.1.
9. **Operator-visible UX**: plan-timer shows live countdown reflecting real Anthropic rate-limit window (or honest "—" if Sub-Q-T9-A=(d) accept-stub).

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sub-Q-T9-A=(c) WB2 spike reveals CC CLI does NOT expose plan-data | `[SPECULATIVE-MEDIUM]` per `MB-F-A3` row "investigate whether CC CLI status bar exposes plan-usage data" | `[MODELED-MEDIUM]` (path (c) becomes non-viable; fall back to (a)/(b)/(d)) | WB2 spike-then-impl per CLAUDE.md §2.8; HALT-WB2-POST-SPIKE-OPERATOR-ARBITRATION to surface scope swing |
| Sub-Q-T9-A=(a) workstation-direct ping requires Anthropic API key provisioning | `[KNOWN]` (workstation env may not currently carry Anthropic key; daemon-side currently owns) | `[MODELED-MEDIUM]` (cross-cutting secret-mgmt concern; CLAUDE.md §2.8 ADR required) | WB4 ADR documents key provisioning + scope; file Tier 2 `MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING` if non-trivial |
| WB6 broadcast emit during workstation startup races webContents creation (mirrors T8 sibling) | `[MODELED-LOW]` (`wc.isDestroyed()` guard precedent) | `[MODELED-LOW]` (UX-only; plan-timer snaps on next emission) | Guard with `wc.isDestroyed()` check; file Tier 3 if smoke observes |
| WB7 mount.ts auto-wire uses `setInterval(60_000)` which may drift on system clock changes | `[MODELED-LOW]` (Date.now() is monotonic-ish; setInterval is wall-clock) | `[MODELED-LOW]` (countdown text may jump on clock-change) | Document drift behavior in commit body; file Tier 3 if operator surfaces |
| Sub-Q-T9-D=(ii) `workstation:plan-timer` triggers `WORKSTATION_CONTRACT.md` §6.6 amendment cycle mid-ticket | `[KNOWN]` if (ii) chosen | `[MODELED-MEDIUM]` (separate operator-arbitrated commit per CLAUDE.md §2.4) | Default to (i) reuse; only escalate if pre-computed payload (Sub-Q-E=(γ)) is also operator-load-bearing |
| Shared edit territory at `coarchitect-ipc.ts:89` (T8) + `:94` (T9 sibling) | `[KNOWN]` per dispatch §5.5 | `[MODELED-MEDIUM]` (concurrent edit risk) | T8 + T9 coord note at WB1; sequence rather than concurrent if uncertain |
| PlanUsageRing + PlanTimerText state-divergence (separate subscriptions to same channel) | `[MODELED-LOW]` (both subscribe via same `onRateLimitUpdate`) | `[MODELED-LOW]` (cosmetic only) | WB-final smoke verifies both consumers render coherent state; file Tier 3 if observed |
| Phase 3 visual-verification post-T9-ship surfaces operator wants progress-ring data-flow (38% indicator) separate from text countdown | `[SPECULATIVE]` per dispatch STATUS FRAMING | `[MODELED-MEDIUM]` (ring is MB-T25 territory; separate ticket if broken) | T9 scope limited to PlanTimerText text; ring data flow is sibling concern; operator-acknowledged revision-cost per dispatch |
| AnthropicChatClient retention status `[SPECULATIVE]` per FOLLOWUPS:274 — may impact source-mechanism viability | `[KNOWN]` Tier 2 row uncertainty | `[MODELED-LOW]` (T9 designs around current HSO state — no AnthropicChatClient assumption) | WB1 read verifies current state; design is mock-or-real-transparent |

---

## §9 — WORKSTATION_CONTRACT.md §6.6 amendment outline (CONDITIONAL — per Sub-Q resolutions)

`[MODELED]` Amendment scope depends on Sub-Q resolutions; per dispatch §3.3 each new IPC channel = new operator-arbitrated amendment cycle. Drafted text below is mechanical-translation scaffold; operator arbitrates final language at HALT-WB-PRE-COMMIT.

### §9.1 — Sub-Q-T9-D=(ii): `workstation:plan-timer` (NOT recommended default)

If selected: §6.6 amendment adds row:

```
### §6.6.N — workstation:plan-timer

| Channel | Direction | Payload | Reply shape | Authority |
|---|---|---|---|---|
| `workstation:plan-timer` | renderer→main (ipcRenderer.invoke) | none | `{ resetsAtMs: number; progressPct: number; planName: string }` | source-of-truth main-process aggregator in `main/rate-limit-aggregator.ts` (NEW) |
| `workstation:plan-timer-update` | main→renderer (webContents.send) | `{ resetsAtMs: number; progressPct: number; planName: string }` | n/a (broadcast) | fired by aggregator on update |

Failure modes: ipc-invoke timeout (renderer-side 1000ms fallback to null); source failure (aggregator returns last-known + logs).
```

### §9.2 — Default path (recommended): NO §6 amendment

Sub-Q defaults (A=(c) with WB2 spike, B=(i), C=(β), D=(i), E=(α)) produce ZERO frozen-surface touch. Workstation-internal new module (`rate-limit-aggregator.ts` + conditional `rate-limit-pty-source.ts`) + reuse of existing `coarchitect:rate-limit-update` broadcast channel + reuse of existing `coarchitect:getRateLimitState` IPC handler (body change only). Auto-ack envelope §C operative throughout per dispatch §3.5 visual-comparison gate.

---

**End of MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW ticket body.**

Pending operator resolutions before execution (surface at HALT-TICKET-BODY-PRE-COMMIT):
- Sub-Q-T9-A (§3.1) — rate-limit source-of-truth ((a) workstation-direct Anthropic ping / (b) daemon-side ping / **(c) PTY-scrape SPIKE-FIRST (recommended)** / (d) accept-stub)
- Sub-Q-T9-B (§3.2) — dimension selection (**(i) `state.requests?.reset` primary (recommended; RATIFY T4 WB10)** / (ii) tokens primary / (iii) hybrid fallback ladder / (iv) new "plan" dimension)
- Sub-Q-T9-C (§3.3) — poll cadence ((α) short interval / **(β) 60s interval (recommended)** / (γ) event-driven only / (δ) per-response-piggyback)
- Sub-Q-T9-D (§3.4) — emission channel (**(i) reuse `coarchitect:rate-limit-update` (recommended)** / (ii) new `workstation:plan-timer` / (iii) hybrid)
- Sub-Q-T9-E (§3.5) — plan-name surfacing (**(α) "Max plan" literal (recommended; RATIFY T4 WB10)** / (β) from API response field / (γ) config-derived)
