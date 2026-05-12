# MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW — Bottom-rail cost-meter real-data flow (aggregator + emission channel + production wiring)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW (SPECULATIVE Phase 4 forward-positioning)
**Date authored:** 2026-05-12
**Authored under:** §3.4 operator-supervised mechanical translation discipline (full-build-mode dispatch §3.2) + Round 10 max-aggressive parallelization dispatch /tmp/dispatch-p5.txt (P5a sub-workstream; operator-acknowledged speculative-revision risk per dispatch STATUS FRAMING)
**Authoring delegate:** P5 sub-session (gen-4 orchestrator HSO peer repurposed, Round 10 cascade)
**Authoring anchor commit (HEAD at authoring time):** `a34f519`
**Cairn ladder anchor:** full-build-mode dispatch §2 T4 (Bottom rail — Conductor controls) Phase 4 follow-on per P3 PROVISIONAL Phase 4 roadmap `d009e6f` §1.4 row `MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION` + dispatch §0 "Cost meter accuracy" Phase 3 trigger.

**SPECULATIVE Phase-4 status:** `[SPECULATIVE per dispatch §0 STATUS FRAMING]` Phase 3 visual-verification not yet triggered. Operator explicitly accepts revision-cost. Post-Phase-3 evidence may RATIFY / RESHAPE / DISCARD this ticket. Treat scope as plausible, not committed.

**Closes / advances:**
- `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` (Tier 3 — filed at T4 WB14 findings `4e8ec96` §IX) — **primary closure target**: replaces `coarchitect-ipc.ts:89` `ipcMain.handle('coarchitect:getDailyCost', () => 0)` STUB with real-data aggregator.
- `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` (Tier 3 — FOLLOWUPS.md:273) — closure path advanced per Sub-Q-T8-A resolution; PTY-scrape route is one option among four.
- `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (Tier 2 — T4 WB14 findings §IX) — partial closure: cost-meter production wiring already landed at T4 WB13 `7abb649` via `resolveRenderCostMeter`; this ticket closes the *data-source* arm. Mount-wiring for MaxParallelCounter + BypassPermsIndicator + PlanTimerText remain in row.
- Full-build-mode dispatch §1 Bottom rail bullet 6 (`conductor api · $0.42 today` cost meter) — structural ship landed at T4 WB8 `edb0fba`; **this ticket advances cost-meter from $0.00-stub render → real-data render**.
- Audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §10.6 row "cost meter $/day" — advances from SHIPPED-with-stub → SHIPPED-with-real-aggregation.

**Depends on (all merged):**
- MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS (`f8fc24d` ticket body; WB14 docs at `4e8ec96`) — `BottomRailCostMeter` component + `resolveRenderCostMeter` mount.ts production wiring shipped; consumer surface unchanged by T8.
- MB-T26 cost-meter bridge surface (`coarchitectBridge.onCostUpdate` at `preload.mts:48`; `coarchitect:cost-update` broadcast channel + `coarchitect:getDailyCost` IPC stubs) — bridge plumbing intact; only data sources are STUB.
- MB-T-HSO-WIRE WB14b refactor (`coarchitect-ipc.ts` surviving subset) — captureUsageToLedger + broadcastCostUpdate were ORPHANED + removed in WB14a; T8 reauthors the emitter under HSO architecture.
- v2 schema `CostInfoSchema` (`packages/dispatch-core/src/v2/schema.ts:120-125`) — FROZEN per CLAUDE.md §1; daemon `/v2/sessions` already emits `cost_info: { usd_today, usd_this_month, token_count }` per session (MOCK_COST_INFO at `dispatch-daemon/src/routes/sessions.ts:63`; real-integration deferred per `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2).

**Downstream gates:**
- T7 (Visual polish) cost-meter format work shipped at `c37ebe5` (prefix/suffix per `conductor api · ... today`); T8 does NOT touch visual rendering.
- T9 (Plan-timer data flow — sibling) shares the architectural pattern (workstation aggregator + emission channel + mount auto-wire) — coordinate Sub-Q resolutions; consider single consolidated `WORKSTATION_CONTRACT.md` §6.6 amendment cycle if both tickets adopt new-IPC paths.
- Future MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION (per-session breakdown UX) — out-of-scope here; T8 ships aggregated-total only per Sub-Q-T8-C=(i) default.

**Estimated WB count:** 8-10 baseline (8 WB default path; +1-2 if Sub-Q-T8-A=(d) hybrid OR Sub-Q-T8-E=(β) daemon-side mock-to-real coordination triggered; +1 if `WORKSTATION_CONTRACT.md` §6.6 amendment triggered for new-IPC paths).

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

1. **Replaces `coarchitect-ipc.ts:89` STUB** `ipcMain.handle('coarchitect:getDailyCost', () => 0)` with a real-data return path. `[KNOWN]` per direct-read at HEAD `a34f519`: handler currently returns hardcoded 0. Replacement source-of-truth per Sub-Q-T8-A resolution.

2. **Reauthors the `coarchitect:cost-update` broadcast emitter** that was removed in MB-T-HSO-WIRE WB14a (per `coarchitect-ipc.ts:35-38` comment block: "Cost-meter capture helpers (broadcastCostUpdate, captureUsageToLedger) ... orphaned with the sendAndStream handler"). NEW emitter lives in NEW `packages/dispatch-workstation/src/main/cost-meter-aggregator.ts` (Sub-Q-T8-A=(c) workstation-side aggregator default; module name varies per Sub-Q-A).

3. **Aggregator implementation per Sub-Q-T8-A**: source-of-truth selection across PTY-scrape extension, daemon-side aggregator via `/v2/sessions` cost_info sum, workstation-side daemon-polling aggregator, OR hybrid.

4. **Emission channel selection per Sub-Q-T8-B**: reuse existing `coarchitect:cost-update` (recommended) OR introduce new `workstation:cost-meter` IPC channel.

5. **Cadence + lifecycle per Sub-Q-T8-D**: poll interval / event-driven / on-spawn-result-attach + on-detach lifecycle.

6. **Per-session attribution per Sub-Q-T8-C**: aggregated daily-total only (recommended default; matches wireframe `conductor api · $X.XX today`) OR per-session breakdown payload (forward-compat for `MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION` follow-on).

7. **Daemon mock-to-real coordination per Sub-Q-T8-E**: T8 ships workstation-side aggregator consuming daemon's MOCK_COST_INFO as-is (recommended); daemon-side real-Anthropic-integration deferred to sibling `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2; OR T8 also drives daemon-side mock-to-real coordination (out-of-default-scope).

8. **Audit reclassification + FOLLOWUPS closure stamps**: WB-final docs update audit §10.6 row + close `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` Tier 3 row + advance `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` per Sub-Q-A path-taken.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify `BottomRailCostMeter` component body (`bottom-rail-cost-meter.tsx`) — consumer-surface is stable; data-flow change is upstream-only.
- Does NOT modify `CostMeter` component (MB-T26 `cost-meter.tsx`) — original surface preserved per T4 WB13 `if (false) void CostMeter` no-op guard.
- Does NOT modify `chat-shell.tsx` slot props or `mount.ts` `resolveRenderCostMeter` — T4 WB13 production-wiring shipped; T8 changes only what the bridge subscriber emits.
- Does NOT close `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2 row in full — only the cost-meter arm; MaxParallelCounter + BypassPermsIndicator + PlanTimerText mount-wiring deferred (T9 advances PlanTimerText).
- Does NOT modify v2 schema (`CostInfoSchema` is FROZEN per CLAUDE.md §1; daemon `/v2/sessions` cost_info shape is binding).
- Does NOT modify daemon `MOCK_COST_INFO` constant nor close `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2 — daemon mock-to-real is sibling scope (Sub-Q-T8-E=(α) default).
- Does NOT add per-session cost UI breakdown (Sub-Q-T8-C=(ii) escalation; defer to MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION dedicated ticket).
- Does NOT modify frozen surfaces unless Sub-Q-T8-B=(ii) `workstation:cost-meter` is selected (then `WORKSTATION_CONTRACT.md` §6.6 amendment scope surfaces at HALT-WB-PRE-COMMIT per CLAUDE.md §2.4 — separate operator-arbitrated `contract:` commit).
- Does NOT modify `dispatch-core/src/v3/schema.ts` (§1-§13 FROZEN).
- Does NOT introduce electron-store; persistence (if any) mirrors `splitter-state.ts` raw `fs` pattern per CLAUDE.md §3.5.
- Does NOT touch Frame C / tile-grid / action-bar / detail-pane / chat panel body — strictly bottom-rail cost-data territory.

---

## §2 — Arbitration anchor (operator-frozen via P5 dispatch /tmp/dispatch-p5.txt + full-build-mode dispatch 2026-05-11)

### §2.1 — P5 dispatch enumeration (binding)

`[KNOWN-OPERATOR-ARBITRATED]`

Per /tmp/dispatch-p5.txt P5a: "MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW — cost accumulator across spawned CC sessions; flows into BottomRailCostMeter (T4 WB8 shipped placeholder per Sub-Q-T4-C=i; real-data flow deferred to Phase 4); Source-of-truth: aggregated daily cost from per-session token/cost emissions; daemon-side accumulator + workstation IPC channel; Wireframe target: bottom rail shows `conductor api · $X.XX today` per dispatch §1 wireframe inventory."

Operator pre-arbitrated:
- Scope = cost-meter data flow (NOT visual, NOT new component).
- Source-of-truth direction = "per-session token/cost emissions" + "daemon-side accumulator + workstation IPC channel" — biases Sub-Q-T8-A toward (b/c/d) aggregator paths over (a) PTY-scrape OR (e) accept-stub.

### §2.2 — Visual-comparison gate (dispatch §3.5)

`[KNOWN-OPERATOR-ARBITRATED]`

Per full-build-mode dispatch §3.5: `green:wiring` AUTO-ACK requires headless screenshot generation OR operator-manual-screenshot fallback. T8 is data-flow (not visual), but WB-final smoke per CLAUDE.md §4.6 verifies that BottomRailCostMeter renders non-zero text post-emission. Until T6/MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING headless pipeline ships (in flight at `030c2d6`), operator-manual-screenshot fallback at HALT-WB-FINAL-PRE-COMMIT.

### §2.3 — Frozen-contract amendment scoping (binding pattern)

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.3: NEW IPC channels require `WORKSTATION_CONTRACT.md` §6.6 amendment per CLAUDE.md §2.4 (operator-arbitrated separate `contract:` commit). T8 default Sub-Q recommendations minimize new-channel introductions (Sub-Q-T8-A=(c) workstation-side aggregator; Sub-Q-T8-B=(i) reuse existing `coarchitect:cost-update` broadcast). Non-default selections escalate amendment scope.

If both T8 and T9 (sibling — plan-timer data flow) adopt new-IPC paths, recommend single consolidated `contract(GATE-T8-T9-§6.6-additions): ...` commit covering all new channels (operator decision at Sub-Q resolution time; mirrors T4 + Wave B WB-§6 `0f0e762` consolidated-amendment precedent).

### §2.4 — Construction order (file ownership for parallel-CC discipline)

`[KNOWN per dispatch §5.1 + this ticket §5.3]`

T8 primary territory:
- NEW `packages/dispatch-workstation/src/main/cost-meter-aggregator.ts` (Sub-Q-T8-A=(b/c/d); name varies per (a) PTY-scrape selection)
- MOD `packages/dispatch-workstation/src/main/coarchitect-ipc.ts:89` (replace STUB `() => 0` with real-aggregator-driven response; add broadcast emitter call sites)
- CONDITIONAL MOD `packages/dispatch-workstation/src/main/main.ts` sentinel zone (new aggregator startup wiring + IPC handler registration if Sub-Q-T8-B=(ii))
- CONDITIONAL MOD `packages/dispatch-workstation/src/main/preload.mts` (new bridge method if Sub-Q-T8-B=(ii))
- CONDITIONAL NEW `packages/dispatch-workstation/src/main/cost-meter-pty-source.ts` (if Sub-Q-T8-A=(a) PTY-scrape; mirror `tile-token-scraper.ts` pattern)
- CONDITIONAL MOD `WORKSTATION_CONTRACT.md` §6.6 (amendment if Sub-Q-T8-B=(ii); separate `contract:` commit per CLAUDE.md §2.4)
- WB-final NEW `docs/coordination/mbtwft8-findings-2026-05-12.md`
- WB-final MOD `docs/FOLLOWUPS.md` (close `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED`; advance `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` per path taken)

Path-disjoint from co-active sub-sessions per dispatch §5.1:
- T9 ticket-body (plan-timer data flow — sibling): `src/main/rate-limit-aggregator.ts` (sibling pattern) + `coarchitect-ipc.ts:94` (different STUB) — coordinate WB-§6 amendment if both adopt new-IPC paths.
- T7-successor visual-polish work: `src/frame-c/` + `src/chat-shell/` UI styling — path-disjoint from `src/main/`.
- T4-successor `commit-plan-doc-1334`: completed at WB14 `4e8ec96`; territory free.

Path-overlap risk:
- `coarchitect-ipc.ts` is touched by both T8 (line 89 cost STUB replacement) and T9 (line 94 rate-limit STUB replacement). MUST coordinate edit window via `docs/coordination/t8-t9-coord-2026-05-12.md` (create at T8 WB1 if T9 sub-session active) OR sequence the two ticket WB ladders rather than running concurrently.

---

## §3 — Sub-Q gate arbitrations REQUIRED before specific WBs

Five operator decisions parameterize WB scope. Surface at HALT-TICKET-BODY-PRE-COMMIT for batch resolution. Defaults if unresolved are `[MODELED]` recommendations.

### §3.1 — Sub-Q-T8-A: Aggregator source-of-truth

Required before **WB2** (aggregator probe) + **WB3** (impl). Default if unresolved: **(c) Workstation-side daemon-polling aggregator**.

`[KNOWN]` per direct-read at HEAD `a34f519`:
- Daemon `/v2/sessions` GET response includes `cost_info: { usd_today, usd_this_month, token_count }` per session (`dispatch-daemon/src/routes/sessions.ts:104-115`; MOCK_COST_INFO constant 0.42/8.17/124500 deferred to `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2 for real-Anthropic-integration).
- v2 `CostInfoSchema` (FROZEN) at `dispatch-core/src/v2/schema.ts:120` is the contract surface.
- `tile-token-scraper.ts` PTY-scrape precedent shipped at `13b7607` (per-tile token-count parsing via `IConsoleBroadcaster` injection); cost-data PTY-scrape extension is the `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` closure path.

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (a) PTY-scrape extension | NEW `cost-meter-pty-source.ts` mirror of `tile-token-scraper.ts`; observes CC CLI status-bar output for cost values; emits per-session cost via NEW IPC channel; aggregator sums. `[SPECULATIVE]` per `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO`: CC CLI status-bar exposes token count but cost-data visibility TBD. SPIKE required. | NONE direct; PTY-scrape pattern is workstation-internal | HIGH — spike + new scraper + IPC + aggregator |
| (b) Daemon-side aggregator | NEW daemon endpoint `/v2/sessions/cost-summary` returning aggregated `{ usd_today_total: number; per_session?: Record<string, number> }` sum-of-cost_info; workstation polls/SSE. | YES — daemon route addition + workstation IPC channel + `WORKSTATION_CONTRACT.md` §6.6 amendment | HIGH (daemon impl + cross-package contract) |
| (c) Workstation-side daemon-polling aggregator (recommended) | NEW `main/cost-meter-aggregator.ts` polls daemon `/v2/sessions` at interval (Sub-Q-T8-D), sums `cost_info.usd_today` across all sessions, broadcasts via `coarchitect:cost-update` (Sub-Q-T8-B=(i) default). Reuses existing daemon emission surface (mock-or-real transparent to workstation). | NONE (reuses existing daemon endpoint + existing IPC broadcast channel) | LOW — single new aggregator module + minimal IPC handler rewire |
| (d) Hybrid (PTY + daemon) | (a) for token-count PTY-scrape per `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` v3.5 closure path AND (c) for cost dollar-aggregation. Two source channels. | NONE if both use existing channels; ELSE per (a)/(b)/(c) | HIGH (+2 WBs) |
| (e) Accept STUB | No change; keep `() => 0` STUB; do NOT close `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED`. Honest "$0.00 today" render per dispatch §2.11 outcome classification "Capability enabled with known limitations". | NONE | ZERO |

`[MODELED]` Recommend **(c)** for ship-velocity + zero-frozen-surface-touch + leverages existing daemon emission. Rationale: daemon already emits `cost_info` per session in `/v2/sessions` response (mock-or-real transparent to workstation); workstation aggregator polls + sums + broadcasts; existing `coarchitect:cost-update` channel intact (subscribers don't change). Sub-Q-A=(a) PTY-scrape is the canonical `MB-F-A2C` closure path but depends on CC CLI exposing cost data (`[SPECULATIVE]` per `MB-F-A3` row) — spike required first; defer to follow-on if (c) suffices. Sub-Q-A=(b) is cleaner architecturally (daemon owns aggregation) but adds cross-package contract churn. Sub-Q-A=(e) is honest if operator prefers to defer until daemon-side `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` lands first.

Operator decision pending.

### §3.2 — Sub-Q-T8-B: Emission channel

Required before **WB4** (channel probe) + **WB5** (impl). Default if unresolved: **(i) Reuse existing `coarchitect:cost-update`**.

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (i) Reuse existing `coarchitect:cost-update` (recommended) | Aggregator emits via `webContents.send('coarchitect:cost-update', total)` mirroring removed `broadcastCostUpdate` pattern from MB-T-HSO-WIRE WB14a. Renderer subscribers (BottomRailCostMeter + CostMeter) unchanged; `coarchitectBridge.onCostUpdate` at `preload.mts:48` intact. | NONE (reuses existing channel; matches the surviving subset comment block at `coarchitect-ipc.ts:35-38`) | LOW |
| (ii) NEW IPC `workstation:cost-meter` (operator-flagged at full-build-mode dispatch §3.3) | NEW main-process bridge method `workstationBridge.getCostMeterState()` + `workstation:cost-meter-update` push channel. Forward-compat for per-session payload (Sub-Q-T8-C=(ii)) and richer payload shape. | YES — `WORKSTATION_CONTRACT.md` §6.6 amendment (operator-arbitrated separate `contract:` commit per CLAUDE.md §2.4) | MEDIUM (+1 WB for amendment + impl) |
| (iii) Hybrid | Keep `coarchitect:cost-update` for daily-total live broadcasts; add `workstation:cost-meter` for one-shot detailed snapshot or per-session breakdown. Forward-compat. | YES — §6.6 amendment | HIGH (+2 WBs) |

`[MODELED]` Recommend **(i)** for ship-velocity + zero-§6-touch + matches the original (pre-HSO-WB14a) emission pattern that all existing subscribers were designed for. Sub-Q-B=(ii) is operator-flagged in dispatch but only load-bearing if per-session payload (Sub-Q-C=(ii)) is also selected; defer otherwise.

Operator decision pending.

### §3.3 — Sub-Q-T8-C: Per-session attribution payload

Required before **WB3** (aggregator probe payload shape). Default if unresolved: **(i) Aggregated daily-total only**.

| Option | Payload shape | Wireframe match |
|---|---|---|
| (i) Aggregated daily-total only (recommended) | Broadcast `number` (usd_today aggregated sum). Matches existing `coarchitectBridge.onCostUpdate(cb: (totalUsd: number) => void)` consumer signature. Wireframe `conductor api · $X.XX today` is the only consumer today. | EXACT |
| (ii) Per-session breakdown payload | Broadcast `{ total: number; per_session: Record<string, number> }`. Forward-compat for `MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION` follow-on. Existing subscribers consume `payload.total`; new subscribers consume `payload.per_session`. | Wireframe shows aggregated total only; per-session is future-UX. |

`[MODELED]` Recommend **(i)** for ship-velocity + consumer-signature stability. Sub-Q-C=(ii) is correct long-term but premature — Phase 3 visual-verification has not surfaced demand for per-session breakdown; deferring to dedicated follow-on ticket is the YAGNI-aligned move.

Operator decision pending.

### §3.4 — Sub-Q-T8-D: Poll cadence + lifecycle

Required before **WB6** (cadence probe) + **WB7** (impl). Default if unresolved: **(γ) on-spawn-result + on-detach lifecycle (event-driven; no idle polling)**.

| Option | Cadence | Cost characteristic |
|---|---|---|
| (α) Fixed interval (e.g., 5s / 15s / 30s) | Aggregator polls daemon `/v2/sessions` every N seconds. | Constant network load; updates visible within N seconds of cost change |
| (β) Event-driven only | Aggregator polls only on workstation events (spawn/detach/kill); no idle polling. | Minimal network load; cost meter snaps to new total on session-lifecycle event |
| (γ) Hybrid: event-driven + slow-interval safety net (recommended) | Event-driven primary (spawn/detach/kill triggers immediate refresh); slow-interval (e.g., 60s) safety net catches daemon-side updates from non-spawn events (e.g., session activity emitting new cost_info). | Low constant load + responsive to lifecycle events |
| (δ) Daemon-SSE subscription | Aggregator subscribes to daemon SSE; receives push on every cost_info update. Sibling of `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` row 271 daemon-SSE closure. | Optimal latency; requires daemon SSE endpoint (not yet shipped) |

`[MODELED]` Recommend **(γ)** for balanced load + responsiveness. Sub-Q-D=(α) wastes cycles when idle. Sub-Q-D=(β) misses cost-only daemon updates (mock today, but real-integration future). Sub-Q-D=(δ) is canonical but blocked on daemon SSE; defer.

Operator decision pending.

### §3.5 — Sub-Q-T8-E: Daemon mock-to-real coordination

Required before **WB-final** (closure-scope decision). Default if unresolved: **(α) T8 ships workstation-side aggregator only; daemon mock-to-real deferred**.

| Option | T8 scope | Closure implications |
|---|---|---|
| (α) Ship workstation-side aggregator only (recommended) | Aggregator consumes daemon MOCK_COST_INFO transparently; renders aggregated `$0.42 × N sessions` (mock × session count) until daemon-side `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2 lands. Honest "real-aggregator-with-mock-data" semantics. | Closes `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` Tier 3 (workstation-side STUB removed). Does NOT close `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2 (daemon mock-to-real is sibling ticket). |
| (β) T8 also drives daemon-side mock-to-real | T8 scope expands to include daemon Anthropic-API integration replacing MOCK_COST_INFO. | Closes both followups but doubles WB count (+5-7 WBs for daemon work) and adds cross-package coordination. |

`[MODELED]` Recommend **(α)** for scope discipline + clean ticket boundaries. Daemon mock-to-real is sibling concern; bundling violates §2.11 "no scope creep" + §2.12 followups-over-absorption.

Operator decision pending.

---

## §4 — WB ladder

8 WBs baseline (defaults: Sub-Q-A=(c), Sub-Q-B=(i), Sub-Q-C=(i), Sub-Q-D=(γ), Sub-Q-E=(α)). 8-10 WB swing per Sub-Q resolutions. Construction order: probe-then-impl per cairn discipline.

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CLAUDE.md §10.5; per-path `git add` per CLAUDE.md §2.7; push after each cairn-grammar commit per CLAUDE.md §2.6.

### WB1 — `red(MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW): probe-mbtwft8-01-current-stub-state`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtwft8-01-current-stub-state.spec.ts` (NEW). Source-text inspection of `packages/dispatch-workstation/src/main/coarchitect-ipc.ts:89`: asserts the `coarchitect:getDailyCost` handler body is NOT the hardcoded `() => 0` STUB (i.e., asserts the comment block at lines 86-88 has been removed AND the body returns from an aggregator). Probe fails RED until WB3 GREEN replaces the STUB.
**Acceptance:** probe RED on `expect(handlerSource).not.toMatch(/ipcMain\.handle\('coarchitect:getDailyCost',\s*\(\)\s*=>\s*0\)/)` — current source matches per HEAD `a34f519`.
**Frozen contracts touched:** none — probe-only.
**Q1-Q9 expected:** Q1=N/A; Q2=BEHAVIOR (fs-read sentinel); Q3=No (stub still present); Q4=No; Q5=No; Q6=KNOWN/MODELED; Q7=new probe path-disjoint; Q8=N/A; Q9=No.

### WB2 — `red(MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW): probe-mbtwft8-02-aggregator-roundtrip`

**Type:** red
**Scope:** RED probe at `probe-mbtwft8-02-aggregator-roundtrip.spec.ts` (NEW; vitest unit harness). Asserts: NEW module `packages/dispatch-workstation/src/main/cost-meter-aggregator.ts` exports `createCostMeterAggregator(deps: { fetchSessions(): Promise<SessionListV2> })` returning `{ getDailyTotal(): number; start(): void; stop(): void; onUpdate(cb: (total: number) => void): () => void }`. Mock-injected daemon-client returns 3 sessions × `cost_info.usd_today=0.42`; aggregator's `getDailyTotal()` returns 1.26 (= 3 × 0.42).
**Acceptance:** probe RED — module absent. Commit body Q1-Q9.
**Sub-Q-T8-A blocker:** WB3 cannot proceed until Sub-Q-T8-A resolves the source-of-truth mechanism. Probe shape parameterized — flag at HALT-WB2-PRE-COMMIT if Sub-Q-A unresolved.

### WB3 — `green(MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW): cost-meter-aggregator impl`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/src/main/cost-meter-aggregator.ts` per Sub-Q-T8-A:
- (a) PTY-scrape: NEW `cost-meter-pty-source.ts` (mirror tile-token-scraper.ts) + aggregator consumes per-session PTY-scraped values.
- (b) Daemon-side aggregator: workstation-side stays as thin client consuming new `/v2/sessions/cost-summary` daemon endpoint (out-of-scope here; flagged for cross-package coord).
- (c) Workstation-side daemon-polling aggregator (default): aggregator polls daemon `/v2/sessions` via HttpDaemonClient sibling pattern; sums `cost_info.usd_today`; exposes `getDailyTotal()`; broadcasts via `onUpdate` callbacks.
- (d) Hybrid: PTY-scrape for token count + daemon-polling for cost dollars.
**Acceptance:** WB2 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-A=(b) (daemon-side endpoint addition triggers contract amendment in daemon-side ticket; T8 only consumes).

### WB4 — `red(MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW): probe-mbtwft8-03-emission-channel`

**Type:** red
**Scope:** RED probe at `probe-mbtwft8-03-emission-channel.spec.ts`. Asserts: `coarchitect-ipc.ts` registers an `aggregator.onUpdate((total) => { webContents.send('coarchitect:cost-update', total) })` wire-up at module init time. Mock injection: stub `ipcMain.handle` + `webContents.send`; trigger aggregator update; assert broadcast fired.
**Acceptance:** probe RED — wire-up absent. Commit body Q1-Q9.

### WB5 — `green(MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW): coarchitect-ipc.ts cost-update emitter rewire`

**Type:** green
**Scope:** GREEN at MOD `packages/dispatch-workstation/src/main/coarchitect-ipc.ts:89` + adjacent lines:
- Replace STUB `ipcMain.handle('coarchitect:getDailyCost', () => 0)` with `() => costMeterAggregator.getDailyTotal()`.
- ADD aggregator startup call from `registerIpcHandlers()` body OR from main.ts startup sentinel zone (Sub-Q-T8-D=(γ) hybrid: start with event-driven primary + 60s safety net).
- ADD `costMeterAggregator.onUpdate((total) => { for (const wc of allWebContents.getAllWebContents()) { if (!wc.isDestroyed()) wc.send('coarchitect:cost-update', total); } })` mirroring removed `broadcastCostUpdate` from MB-T-HSO-WIRE WB14a.
- Sub-Q-T8-B=(ii) variant: ALSO register `ipcMain.handle('workstation:cost-meter', ...)` + add bridge method in preload.mts + amend `WORKSTATION_CONTRACT.md` §6.6 (separate `contract:` commit BEFORE WB5 GREEN).
**Acceptance:** WB4 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-T8-B=(ii).

### WB6 — `red(MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW): probe-mbtwft8-04-spawn-lifecycle-trigger`

**Type:** red
**Scope:** RED probe at `probe-mbtwft8-04-spawn-lifecycle-trigger.spec.ts`. Asserts (Sub-Q-T8-D=(γ) shape): aggregator subscribes to spawn-result + detach + kill events; on each event, immediately refetches + emits `onUpdate`. Mock IPC events; assert refetch + emit fired.
**Acceptance:** probe RED — lifecycle subscriptions absent. Commit body Q1-Q9.

### WB7 — `green(MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW): aggregator lifecycle + safety-net interval`

**Type:** green
**Scope:** GREEN at MOD `cost-meter-aggregator.ts`:
- Subscribe to `workstation:spawn-result` + `workstation:tile-detach-closed` + `workstation:session-kill` events (or similar — verify exact channels at WB-impl time).
- 60s safety-net interval per Sub-Q-T8-D=(γ); `start()` + `stop()` lifecycle.
- Idle when no sessions exist; resume on first spawn.
**Acceptance:** WB6 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none — workstation-internal event subscriptions only.

### WB-final (WB8) — `green(MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW): runtime-launch smoke + findings doc + audit + FOLLOWUPS`

**Type:** green (smoke + docs)
**Scope:** per CLAUDE.md §4.6 runtime-launch smoke + dispatch §3.5 visual-comparison gate:
1. Build fresh: `pnpm --filter dispatch-workstation build`.
2. Launch electron from `dist/main/main.js`.
3. Observe within ~10s: WINDOW_READY sentinel; BottomRailCostMeter renders.
4. Spawn ≥2 sessions; verify cost-meter text transitions from `conductor api · — today` → `conductor api · $X.XX today` (X.XX = aggregated `usd_today` × spawned-session-count via daemon mock).
5. Detach 1 session; verify cost-meter recomputes (or stays stable if detach excludes from sum per aggregator semantics).
6. Generate headless screenshot if MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING `030c2d6` pipeline ships; else operator-manual-screenshot at HALT-WB-FINAL-PRE-COMMIT.
7. Author `docs/coordination/mbtwft8-findings-2026-05-12.md` per Wave B findings format anchor (I What Shipped / II Q-disposition / III Architectural deltas / IV Probe distribution / V Architecture notes / VI Documentation drift / VII Consumer non-regression / VIII WB Skip Rationale / IX New Followups Filed / X Open Items).
8. Audit reclassification: `wireframe-vs-shipped-audit-2026-05-09.md` §10.6 cost-meter row: SHIPPED-with-stub → SHIPPED-with-real-aggregation (mock-data-pass-through per Sub-Q-E=α).
9. FOLLOWUPS.md:
   - STAMP `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` Tier 3 → CLOSED at WB5 GREEN commit.
   - Advance `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` Tier 3: closure-path-update reflecting (c) workstation-daemon-polling path adopted; PTY-scrape closure path remains valid future-alternative if daemon-side stays mocked indefinitely.
   - Cross-ref `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2 (daemon-side; NOT closed by T8).
   - Cross-ref `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2 (cost-meter arm closed; MaxParallelCounter + BypassPermsIndicator + PlanTimerText arms remain — T9 advances PlanTimerText).
**Acceptance:** all 9 steps verified. Commit body Q1-Q9.
**Frozen contracts touched:** none — smoke + docs only.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED / ADVANCED by this ticket

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` (T4 WB14 findings §IX) | 3 | WB3+WB5: aggregator replaces `() => 0` STUB | WB5 |
| `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` (FOLLOWUPS:273) | 3 | ADVANCED only — closure path (c) workstation-daemon-polling adopted; PTY-scrape path remains alternative for future daemon-removal scenarios | WB5 (advance) |
| `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (T4 WB14 findings §IX) | 2 | PARTIAL — cost-meter arm closed by T4 WB13 production wiring (`7abb649`) + T8 real-aggregator; row remains OPEN for MaxParallelCounter + BypassPermsIndicator + PlanTimerText arms | (no T8 stamp; T9 advances PlanTimer arm) |
| Audit §10.6 row "cost meter $/day" | (audit row) | WB5: real-aggregation via daemon `/v2/sessions` cost_info sum | WB-final |
| Full-build-mode dispatch §1 Bottom rail bullet 6 | (dispatch enumeration) | WB5 + WB7 (data flow) | WB-final |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB2/WB3 may surface that daemon `/v2/sessions` polling cadence (every 60s per Sub-Q-D=(γ) safety net) creates measurable workstation→daemon traffic at N=8+ sessions; file Tier 3 `MB-F-COST-METER-POLL-LOAD-N-SESSIONS` if observed.
- WB5 may discover that `allWebContents.getAllWebContents()` broadcast pattern (mirroring pre-HSO-WB14a) misses transient webContents during workstation startup race; file Tier 3 `MB-F-COST-METER-BROADCAST-STARTUP-RACE`.
- WB7 may discover that detach-event subscription channel has changed since MB-T-HSO-WIRE WB14a removal; file Tier 2 if non-trivial.
- WB-final smoke may surface that mock-data render (`$0.42 × N`) looks visually unrealistic to operator; defer to `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2 cross-ref; do NOT force `MOCK_COST_INFO` change in T8 scope.
- WB-final may surface that `BottomRailCostMeter` 2-decimal truncation rounds `$0.426` → `$0.42` losing precision visible in mock-data; file Tier 3 cosmetic if operator flags.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS | `f8fc24d` body + `4e8ec96` WB14 findings | §3.3 Sub-Q-T4-C arbitration; WB7-WB8 cost-meter shipping; WB13 production wiring; WB14 §IX `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` filing |
| MB-T-HSO-WIRE WB14b | (commit chain; current coarchitect-ipc.ts surviving subset) | `coarchitect-ipc.ts:1-50` comment block — removed captureUsageToLedger + broadcastCostUpdate context |
| MB-T26 cost-meter | (MB-T26 chain) | `cost-meter.tsx` component; `preload.mts:48` `onCostUpdate` bridge |
| §C.5 tile-token-scraper | `13b7607` | `tile-token-scraper.ts` PTY-scrape pattern (Sub-Q-T8-A=(a) precedent) |
| MB-F-DAEMON-PLAN-COST-ENDPOINTS sess-i | (daemon batch) | `dispatch-daemon/src/routes/sessions.ts:46-67` MOCK_COST_INFO + Q-I5=a arbitration |

### §5.4 — Dispatch + audit doc anchors (read at WB1 start)

- `/tmp/dispatch-p5.txt` P5a (this ticket's authoring directive)
- `docs/coordination/full-build-mode-dispatch.md` §1 Bottom rail bullet 6 + §2 T4 enumeration + §3.3 frozen-contract pattern + §3.5 visual-comparison gate
- `docs/coordination/phase-4-tier-1-roadmap-draft.md` (`d009e6f`) §1.4 `MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION` row + §3 Phase-3-entry preconditions
- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §10.6 cost-meter row
- `docs/coordination/mbtwt4-findings-2026-05-12.md` §III architectural delta 3 (WB7 investigation finding) + §IX `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` filing
- `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T1-SESSION-DATA-FLOW_BUILD.md` (format precedent — §0/§1/§2/§3/§4/§5/§6/§7/§8/§9 structure)

### §5.5 — Co-active sub-session coordination (per dispatch §5.1)

- T9 ticket-body (plan-timer data flow — sibling): `src/main/rate-limit-aggregator.ts` (sibling new file) + `coarchitect-ipc.ts:94` (different STUB — `getRateLimitState` returns null). SHARED EDIT TERRITORY at `coarchitect-ipc.ts`; coordinate via `docs/coordination/t8-t9-coord-2026-05-12.md` at WB1 if both sessions concurrently active. If both adopt new-IPC paths (Sub-Q-T8-B=(ii) + Sub-Q-T9-D=(ii)), single consolidated §6.6 amendment commit covering both channels.
- T7 visual-polish (`a34f519` HEAD) — completed; T7 territory does not overlap with `src/main/`.
- P3 Phase-4-roadmap meta-doc (`d009e6f`) — read-only reference; T8 advances row `MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION` from §1.4 cluster F.

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A | BEHAVIOR (fs-read sentinel) | No — stub still in place | No | No | KNOWN/MODELED | new test path-disjoint | N/A | No |
| WB2 RED | conditional (Sub-Q-A=(a) PTY-scrape needs spike on CC cost visibility) | BEHAVIOR (mock-injected daemon-client) | No — module absent | No | No | KNOWN/MODELED | new probe path-disjoint | N/A | No |
| WB3 GREEN | per WB2 | BEHAVIOR (real aggregator unit) | No — impl load-bearing | No | conditional on Sub-Q-A=(b) | KNOWN/MODELED | src/main/cost-meter-aggregator.ts new | N/A | No |
| WB4 RED | N/A | BEHAVIOR (mock ipcMain + webContents) | No — wire-up absent | No | No | KNOWN/MODELED | new probe path-disjoint | N/A | No |
| WB5 GREEN | N/A | BEHAVIOR (real IPC + broadcast) | No — impl load-bearing | No | conditional on Sub-Q-B=(ii) | KNOWN/MODELED | coarchitect-ipc.ts line 89 zone + (conditional) preload.mts + WORKSTATION_CONTRACT.md §6.6 | N/A | No |
| WB6 RED | N/A | BEHAVIOR (event-trigger mock) | No — subscription absent | No | No | KNOWN/MODELED | new probe path-disjoint | N/A | No |
| WB7 GREEN | N/A | BEHAVIOR (real subscription) | No — impl load-bearing | No | No | KNOWN/MODELED | cost-meter-aggregator.ts | N/A | No |
| WB-final | N/A | BEHAVIOR (real electron launch + cost-meter render) | N/A — smoke verifies WB1-WB7 integration | No | No | KNOWN per observed sentinels | none — observational | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1-WB-final cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin/main per CLAUDE.md §2.6.
2. **`MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` Tier 3 CLOSED**: `coarchitect-ipc.ts:89` no longer returns hardcoded 0; real aggregator response surfaces.
3. **`coarchitect:cost-update` broadcasts emitted**: aggregator updates fire renderer subscribers; `BottomRailCostMeter` renders non-em-dash value post-emission.
4. **Aggregator lifecycle covers spawn/detach/kill events** + safety-net interval (per Sub-Q-T8-D=(γ) default).
5. **5-package typecheck CLEAN** per CLAUDE.md §4.4 (one command at a time; no `&&` chains).
6. **No regression in shipped probes**: T4 chat-shell suite 72/72 GREEN preserved; MB-T26 cost-meter consumer probes preserved.
7. **WB-final runtime-launch smoke** per CLAUDE.md §4.6 + dispatch §3.5: WINDOW_READY + cost-meter renders text containing `$` (not `—`) with ≥1 session spawned; screenshot evidence.
8. **WB-final findings doc + audit reclassification + FOLLOWUPS updates lands**: `docs/coordination/mbtwft8-findings-2026-05-12.md`; audit §10.6 reclassification; FOLLOWUPS row updates per §5.1.
9. **Operator-visible UX**: post-spawn cost-meter shows aggregated total reflecting daemon's per-session emissions (mock-data-pass-through is acceptable per Sub-Q-T8-E=(α) honest semantics).

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sub-Q-T8-A=(a) PTY-scrape spike reveals CC CLI does not expose cost data | `[SPECULATIVE-MEDIUM]` per `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` analogous-uncertainty for plan-data | `[MODELED-MEDIUM]` (path (a) becomes non-viable; fall back to (c) or (e)) | WB2 spike-then-impl per CLAUDE.md §2.8; HALT-WB-PRE-COMMIT to surface to operator if blocking |
| Sub-Q-T8-A=(c) workstation daemon-polling at 60s cadence creates measurable load with N=8+ sessions | `[MODELED-LOW]` (single GET /v2/sessions request; lightweight payload) | `[MODELED-LOW]` (file Tier 3 `MB-F-COST-METER-POLL-LOAD-N-SESSIONS` if observed at smoke) | WB7 lifecycle includes event-driven primary; safety-net interval is fallback only |
| WB5 broadcast emit during workstation startup races webContents creation | `[MODELED-LOW]` (mirrors pre-HSO-WB14a behavior; `wc.isDestroyed()` guard precedent) | `[MODELED-LOW]` (UX-only — cost-meter snaps on first user event if missed initial) | Guard with `wc.isDestroyed()` check; file Tier 3 if smoke observes |
| Daemon-side MOCK_COST_INFO returns `usd_today=0.42` per session; aggregator displays `$X.XX = N × 0.42` which looks unrealistic to operator | `[KNOWN]` per `dispatch-daemon/src/routes/sessions.ts:63-67` | `[MODELED-LOW]` (honest semantics per Sub-Q-T8-E=(α); document in findings doc) | WB-final commit body cites mock-data-pass-through as expected behavior; cross-ref `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2 |
| Sub-Q-T8-B=(ii) `workstation:cost-meter` triggers `WORKSTATION_CONTRACT.md` §6.6 amendment cycle mid-ticket | `[KNOWN]` if (ii) chosen | `[MODELED-MEDIUM]` (separate operator-arbitrated commit per CLAUDE.md §2.4) | Default to (i) reuse; only escalate if per-session payload (Sub-Q-C=(ii)) is also operator-load-bearing |
| Shared edit territory at `coarchitect-ipc.ts:89` (T8) + `:94` (T9 sibling) | `[KNOWN]` per dispatch §5.5 | `[MODELED-MEDIUM]` (concurrent edit risk if both sessions write) | T8 + T9 coord note at WB1; sequence rather than concurrent if uncertain |
| `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2 daemon mock-to-real lands AFTER T8 — workstation aggregator may need to re-validate semantics under real daemon data | `[KNOWN]` Tier 2 deferred | `[MODELED-LOW]` (CostInfoSchema FROZEN; payload shape stable; aggregator pure-fn over `usd_today` sum) | T8 design is mock-or-real-transparent; cross-ref filed at WB-final |
| Phase 3 visual-verification post-T8-ship surfaces an entirely different cost-display UX expectation (e.g., operator wants per-session breakdown) | `[SPECULATIVE]` per dispatch STATUS FRAMING | `[MODELED-MEDIUM]` (ticket scope reshaped; T8 work partially superseded) | Operator-acknowledged revision-cost per dispatch; T8 ships honest aggregated-total; per-session UX is dedicated follow-on |

---

## §9 — WORKSTATION_CONTRACT.md §6.6 amendment outline (CONDITIONAL — per Sub-Q resolutions)

`[MODELED]` Amendment scope depends on Sub-Q resolutions; per dispatch §3.3 each new IPC channel = new operator-arbitrated amendment cycle. Drafted text below is mechanical-translation scaffold; operator arbitrates final language at HALT-WB-PRE-COMMIT.

### §9.1 — Sub-Q-T8-B=(ii): `workstation:cost-meter` (NOT recommended default)

If selected: §6.6 amendment adds row:

```
### §6.6.N — workstation:cost-meter

| Channel | Direction | Payload | Reply shape | Authority |
|---|---|---|---|---|
| `workstation:cost-meter` | renderer→main (ipcRenderer.invoke) | none | `{ daily_total_usd: number; per_session?: Record<string, number> }` | source-of-truth main-process aggregator in `main/cost-meter-aggregator.ts` (NEW) |
| `workstation:cost-meter-update` | main→renderer (webContents.send) | `{ daily_total_usd: number; per_session?: Record<string, number> }` | n/a (broadcast) | fired by aggregator on update |

Failure modes: ipc-invoke timeout (renderer-side 1000ms fallback to 0); daemon-poll failure (aggregator returns last-known + logs).
```

### §9.2 — Default path (recommended): NO §6 amendment

Sub-Q defaults (A=(c), B=(i), C=(i), D=(γ), E=(α)) produce ZERO frozen-surface touch. Workstation-internal new module (`cost-meter-aggregator.ts`) + reuse of existing `coarchitect:cost-update` broadcast channel + reuse of existing `coarchitect:getDailyCost` IPC handler (body change only). Auto-ack envelope §C operative throughout per dispatch §3.5 visual-comparison gate.

---

**End of MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW ticket body.**

Pending operator resolutions before execution (surface at HALT-TICKET-BODY-PRE-COMMIT):
- Sub-Q-T8-A (§3.1) — aggregator source-of-truth ((a) PTY-scrape / (b) daemon-side / **(c) workstation daemon-polling (recommended)** / (d) hybrid / (e) accept-stub)
- Sub-Q-T8-B (§3.2) — emission channel (**(i) reuse `coarchitect:cost-update` (recommended)** / (ii) new `workstation:cost-meter` / (iii) hybrid)
- Sub-Q-T8-C (§3.3) — per-session attribution payload (**(i) aggregated total only (recommended)** / (ii) per-session breakdown)
- Sub-Q-T8-D (§3.4) — poll cadence + lifecycle ((α) fixed interval / (β) event-driven only / **(γ) hybrid event-driven + 60s safety net (recommended)** / (δ) daemon SSE)
- Sub-Q-T8-E (§3.5) — daemon mock-to-real coordination (**(α) workstation-side only; daemon deferred (recommended)** / (β) also drive daemon-side)
