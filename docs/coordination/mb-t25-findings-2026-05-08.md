# MB-T25 Findings — Plan-Usage Ring Widget (Anthropic API plan-usage)

**Date:** 2026-05-08
**Final HEAD:** WB5 docs commit (this file)
**WB ladder:** Phase 1 → WB1 RED → WB2 GREEN ring-helpers → WB3 GREEN PlanUsageRing + mount path-2 → WB3.5 refactor (preload.mts dual-authorship resolution) → WB4 GREEN integration → WB5 docs (5-WB ladder + WB3.5 refactor; per Round 4 prompt Outcome A 5-WB ladder)
**Outcome classification (CLAUDE.md §2.11):** **Improved (capability enabled with operator-merge-gate-deferred verification).** Plan-usage ring widget ships with full consumer-side pipeline (mount.ts path-2 resolver + ChatShell slot rendering + PlanUsageRing component + ring-helpers pure fns), end-to-end verified by 6/6 integration suite. Live /v1/messages integration test + runtime electron smoke deferred to operator-merge gate per HALT 2 option (a) — D's MB-T34 preload.mts authorship is on mbt34-worktree branch (canonical per HALT 1 dual-authorship arbitration) and not yet merged to main. Deferral is operator-arbitrated coordination boundary, NOT session-side incomplete work.

---

## I. Summary

MB-T25 ships a plan-usage ring widget that displays Anthropic API plan-usage as a single SVG outer ring (% of `tokens` dimension used) with em-dash placeholder until the first API response observed. The widget lands as the leftmost-of-3 slot inside the existing `chat-shell-header-bar` element established by Terminal C's MB-T26 (`09b38ce`); slot ordering at operator-side merge will be `[Auto/Ask MB-T24] | [plan-usage MB-T25 — this] | [cost-meter MB-T26] | [model-mix MB-T27]` per Q-MBT25-3 + A's Q-MBT24-4=far-left disposition.

Architecture follows MB-T26 cost-meter as the visual + structural template: `cost-meter.tsx` (71 lines) → `plan-usage-ring.tsx` (114 lines + ring-helpers.ts 138 lines). useEffect-subscribe-at-mount pattern; cleanup-fn returned to React for unmount; `bridge?` optional prop with em-dash placeholder when null.

**Two-source [KNOWN] verification of the architectural API question:** my Phase 1 `.d.ts` read of `@anthropic-ai/sdk@0.92.0` confirmed `MessageStream.response.headers` exposure (consumer side); Terminal D's MB-T34 Phase 1 spike (`c09bd09 origin/mbt34-worktree`) confirmed live server-emission of 13 `anthropic-ratelimit-*` headers across 4 dimensions (producer side). This evidence pattern is now extending across two sessions in two worktrees from disjoint angles — **two-session [KNOWN]** of the same architectural contract. Methodology evidence flagged for Round 4 evidence document §3.

`Q-MBT25-7=a` (operator-confirmed at WB1 ack 2026-05-08): `selectPrimaryDimension` returns the `tokens` (combined input+output) dimension as primary — single-glance UX clarity for v3.0. Multi-dimension drilldown deferred to v3.1 followup `MB-F-T25-MULTI-DIMENSION-RING-DRILLDOWN` (Tier 3).

**Ring renders empty in v3.0 standalone runs of mbt25-worktree** until D's mbt34-worktree merges to main, because D's `coarchitect-ipc.ts` MB-T34 zone ships the `coarchitect:rate-limit-update` IPC broadcast emission. The pipeline is wired end-to-end at the consumer side; broadcast emission lights it up at operator-merge time.

---

## II. WB ladder reference

| WB | Commit | Type | Tests | Note |
|---|---|---|---|---|
| Phase 1 | `1cf07f5` | spike | n/a | Surface inventory + Q-MBT25-1..6 + R-MBT25-1..6 with tentative dispositions; SDK `.d.ts` read confirming `Response.headers` exposure |
| WB1 | `d187b62` | red | 0/26 + 1/6 (incidental wrapper-render pass) | Scaffold plan-usage-ring + ring-helpers + 2 RED probes (32 assertions); chat-shell.tsx + mount.ts sentinel-zone additions |
| WB2 | `7e14cd4` | green | 26/26 + 88 sibling unchanged | ring-helpers.ts pure-fn impl (5 fns: arcPath, tintForPercentage, formatResetCountdown, computePercentageUsed, selectPrimaryDimension); 100% line coverage; 95.45% branch coverage |
| WB3 | `a8c1bfa` | green | 6/6 + 88 sibling unchanged | PlanUsageRing component impl + mount.ts path-2 wiring + (then-duplicate) preload.mts MB-T25 zone |
| WB3.5 | `63b9ca6` | refactor | 88 unchanged | Removed duplicate `onRateLimitUpdate` from preload.mts MB-T25 zone per HALT 1 option (a) — D's MB-T34 zone owns canonical authorship (filed `MB-F-PARALLEL-CAIRN-WORKTREE-DUAL-AUTHORSHIP-OVERLAP` Tier 1) |
| WB4 | `f448139` | green | 6/6 + 109 sibling unchanged | Integration test plan-usage-roundtrip.test.tsx exercising full mountChatShell → ChatShell → PlanUsageRing → bridge subscription pipeline against fixture-emitted RateLimitState |
| WB5 | this commit | docs | n/a | Findings + FOLLOWUPS amendments + outcome classification |

**Total tests authored: 38** (probe-01-math 26 + probe-07-plan-usage-ring 6 + plan-usage-roundtrip integration 6).

[KNOWN] from `pnpm --filter dispatch-workstation exec vitest run` scoped sweeps at WB4 commit time: 109 tests passing across 13 test files spanning chat-shell + ring-helpers + cost-meter + chat-shell-mix-indicator + integration/chat-shell + plus unchanged. The single pre-existing failure is `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` per CLAUDE.md §4.5; not re-diagnosed per WB.

---

## III. Acceptance verification

Per ticket scope (Round 4 prompt §3 Outcome A):

| Acceptance | Status | Verification |
|---|---|---|
| Ring updates within 5s of API response with new headers | VERIFIED | Integration test `plan-usage-roundtrip.test.tsx` fires fixture-emitted RateLimitState updates synchronously through the bridge.onRateLimitUpdate cb; React commits within ms; assertion verifies countdown text + tint testid update. The 5s budget is the asynchronous IPC + React commit envelope; integration test is upper-bounded by happy-dom test runtime (<100ms total). Live /v1/messages timing deferred per (DEFERRED) row below. |
| Color tinting matches wireframe (green/yellow/red at thresholds) | VERIFIED | 3 separate fixture-driven integration tests verify tint testid mapping at 5% (green), 75% (yellow), 90% (red). Threshold values from prompt §3 In-scope: `<70%` green, `70-85%` yellow, `>=85%` red. Probe-01-math suite asserts threshold boundaries (69→green, 70→yellow, 84→yellow, 85→red) at 26/26 GREEN. |
| Reset countdown renders in `Hh MMm` format | VERIFIED | Probe-01-math suite asserts format: `5h 30m`, `4h 05m` (zero-pad), `0h 45m`, `0h 00m` (past-clamp), ISO-string accept; integration test asserts `/^(?:4h 5\dm\|5h 00m)$/` regex match against fixture emitted at `now + 5h`. |
| Unit tests for ring math + tinting helpers | VERIFIED | probe-01-math 26/26 GREEN at WB2; coverage report 100% line / 100% statement / 100% function / 95.45% branch on ring-helpers.ts. Branch-coverage gap (line 86 `largeArcFlag=1` branch) tracked at `MB-F-T25-RING-HELPERS-LARGE-ARC-FLAG-BRANCH-COVERAGE` (Tier 3) — does not block ship per operator's WB2 ack ("100% line coverage on ring-helpers.ts" was the spec). |
| Visual consistency with MB-T26 cost-meter slot | VERIFIED | probe-05-header-bar-slot 6/6 GREEN preserved at WB3 + WB4 (MB-T26 contract intact); plan-usage-roundtrip integration test asserts both slots render in the same `chat-shell-header-bar` element + plan-usage-slot is index-0 child (ordering reservation per Q-MBT25-3). |
| **Live-API integration test (real /v1/messages call)** | **DEFERRED** | Operator HALT 2 option (a) 2026-05-08 — D's preload.mts MB-T34 zone (canonical `onRateLimitUpdate` authorship) is on `mbt34-worktree` branch + not yet merged to main. Live integration on mbt25-worktree solo would observe the documented placeholder state (no SVG; em-dash). **Closure path:** operator merges `mbt34-worktree` to main + my mbt25-worktree rebases → live `/v1/messages` call via D's IPC pipeline → ring updates within 5s. Tracked at `MB-F-T25-RUNTIME-VERIFICATION-DEFERRED-MERGE-GATE` (Tier 2). |
| **Runtime electron smoke (workstation boots, ring visible, ring updates)** | **DEFERRED** | Same closure path as live-API row. Per CLAUDE.md §4.6, runtime smoke MUST happen before merge to main. My WB5 marks this as DEFERRED with closure path; operator at merge gate runs `pnpm --filter dispatch-workstation exec electron dist/main/main.js` and observes WINDOW_READY + new MB-T25 sentinel emission (or equivalent) within ~10s. Tracked at `MB-F-T25-RUNTIME-VERIFICATION-DEFERRED-MERGE-GATE` (Tier 2). |

**5 of 7 criteria VERIFIED at session-side; 2 of 7 DEFERRED to operator-merge gate.** Per operator's WB4 ack ("§2.11 outcome classification working at acceptance-verification granularity — not just at WB-final outcome, but at criterion-by-criterion honesty"), the deferred items are explicitly NAMED with closure paths, not forced into VERIFIED via degraded-evidence runs on mbt25-worktree solo.

---

## IV. Runtime-launch smoke (CLAUDE.md §4.6) — DEFERRED to operator-merge gate

**Status:** DEFERRED per operator HALT 2 option (a) 2026-05-08.

**Reason:** WB3 + WB3.5 work touched `src/main/preload.mts` (MB-T25 zone added at WB3 then removed at WB3.5 per dual-authorship arbitration). At WB5, the only `src/main/*.ts` change relative to mbt25-worktree's branch-base (c6ee1fa main) is the WB3.5 NOTE comment in preload.mts pointing to D's MB-T34 zone authorship — net 0 lines of MB-T25 functional code in `src/main/`. Per CLAUDE.md §4.6, runtime smoke MUST happen before merge to main; the smoke is an operator-merge-gate concern.

**What happens at operator merge:**
1. Operator merges `mbt34-worktree` (D's branch) to main (or selects merge ordering)
2. Operator merges `mbt25-worktree` (my branch) to main + rebases as needed
3. Operator runs `pnpm --filter dispatch-workstation build` (full build chain — 9 esbuild scripts + tsc)
4. Operator runs `pnpm --filter dispatch-workstation exec electron dist/main/main.js`
5. Observes: WINDOW_READY sentinel within ~10s; chat-shell-plan-usage-slot present in DOM; em-dash placeholder until first API call; ring updates after a chat send (D's coarchitect-ipc.ts captureRateLimitToBroadcast fires)

**Pre-merge verification at session side:** `pnpm --filter dispatch-workstation typecheck` exits clean at every WB GREEN commit. Test-suite verification (109 GREEN) covers the consumer pipeline + sibling-zone discipline. The runtime electron smoke specifically catches `ERR_MODULE_NOT_FOUND`-class bugs that are invisible to typecheck + unit + integration suites; that risk is structurally lower for MB-T25's WB5 final state because:
- preload.mts MB-T25 net change is 0 functional lines (NOTE comment only)
- mount.ts net change is sentinel-zoned additive (no removal of existing logic)
- chat-shell.tsx net change is sentinel-zoned additive
- All my source paths import .js (compiled) artifacts per CLAUDE.md §3.4 discipline

Followup: `MB-F-T25-RUNTIME-VERIFICATION-DEFERRED-MERGE-GATE` (Tier 2) tracks closure at operator-merge gate.

---

## V. Cross-session events (parallel-cairn — 4-session run with A/C/D)

| Event | Timing | Resolution | Tracked at |
|---|---|---|---|
| **Outcome A confirmation via two-source [KNOWN]** | Phase 1 → HALT 0 ack | My Phase 1 `.d.ts` read confirmed `MessageStream.response.headers` exposure (SDK type-shape); D's MB-T34 Phase 1 spike `c09bd09` confirmed live server-emission of 13 `anthropic-ratelimit-*` headers across 4 dimensions. Two disjoint sessions, two disjoint angles, same architectural contract validated. Outcome A confirmed [KNOWN] not [MODELED] — full 5-WB ladder activated. | This findings doc §I + Round 4 evidence document §3 (operator-territory amendment) |
| **Operator HALT 0 dual-conditional gate** | Phase 1 commit → WB1 | Operator ack on Q-MBT25-1..6 + D's spike outcome ack received together 2026-05-08. Bridge method name aligned to D's API-level convention (`onRateLimitUpdate` not `onPlanUsageUpdate`). Slot ordering aligned to A's Q-MBT24-4=far-left → MB-T25 lands index-1 (second from left) at operator merge. | Phase 1 diagnose §VI HALT 0 gate detail; this findings doc §VI |
| **Q-MBT25-2a operator arbitration (extend coarchitectBridge vs separate planUsageBridge)** | HALT 0 | Operator confirmed (a) extend coarchitectBridge — domain-aligned with the existing chat-flow bridge family (onCostUpdate sibling). | Phase 1 diagnose §VI Q-MBT25-2; this findings doc §VI |
| **Methodology incident #1: MB-F-PARALLEL-CAIRN-WORKTREE-DUAL-AUTHORSHIP-OVERLAP** | WB3 → HALT 1 | At WB3 GREEN commit (`a8c1bfa`), I authored `coarchitectBridge.onRateLimitUpdate` in preload.mts MB-T25 zone. Concurrently on `mbt34-worktree`, D's WB5 (`f326d21`) authored the same method in preload.mts MB-T34 zone (with initial-fetch via 'coarchitect:getRateLimitState' invoke). Per-session worktree isolation eliminates concurrent shared-tree contention but does NOT prevent prompt-time scope overlap when two operator-authored prompts assign the same surface to two sessions independently. **Detection vector:** before authoring WB4, I `git fetch origin mbt34-worktree` (metadata only, no checkout per §8) and read D's commit body — explicit citation of preload.mts MB-T34 zone authoring confirmed the overlap. Surfaced to operator at HALT 1; option (a) arbitrated (D's authorship wins; my MB-T25 zone removed via WB3.5 refactor commit `63b9ca6`). | This findings doc §VIII (methodology); FOLLOWUPS row at this WB5 |
| **Operator HALT 2 option (a) — runtime smoke + live-API deferred to merge gate** | WB4 (pre-authorship) | Operator selected (a) "Author integration test on mbt25-worktree against fixture-emitted RateLimitState" via AskUserQuestion 2026-05-08. Runtime electron smoke + live-API integration explicitly deferred to operator-merge gate. Honest framing for §III acceptance: "Improved (capability enabled with operator-merge-gate-deferred verification)" not "Capability enabled with known limitations" because deferral is operator-arbitrated coordination boundary, not session-side incomplete work. | This findings doc §VIII |
| **Sibling-zone discipline preserved across MB-T20+T21+T22+T26+T27** | All WBs | Per-suite regression check at each GREEN commit time. Final WB4 state: 109 GREEN across chat-shell + ring-helpers + cost-meter + chat-shell-mix-indicator + integration/chat-shell. ZERO regression on Terminal C's MB-T26 territory or Terminal D's MB-T27 territory or Terminal A's existing MB-T22 territory or older Family-B (MB-T20+T21) territory. | All WB commit bodies + this findings doc §III |

**Methodology takeaway:** worktree isolation eliminates 4 of 4 documented shared-tree failure modes (index-race, working-tree-blocking, content-sweep, cross-session-stash) but introduces a 5TH distinct failure mode at the prompt-authoring level: **prompt-time scope overlap**. Both sessions executed perfect cairn discipline; the failure is at operator-prompt-authoring layer, not cairn-execution layer. Closure: operator-side prompt-authoring discipline — preload.mts (and similar shared additive surfaces) authorship ownership stated explicitly per surface in each session's prompt.

**Two-session [KNOWN] verification primitive (operator-territory ratification candidate):** my Phase 1 + WB4 work validated the consumer-side architectural contract; D's MB-T34 Phase 1 + WB4 + WB5 work validated the producer-side contract. Two sessions, different worktrees, different angles → same contract validated. This is two-source [KNOWN] applied at the cross-session granularity; pairs with Terminal 3's similar pattern in MB-T24 (operator-named at WB4 ack). Round 4 evidence §3 + §5 candidates strengthened.

---

## VI. Q-MBT25-1..7 final dispositions

All Q-MBT25-1..7 = (a) operator-confirmed across HALT 0 (Q1-6, 2026-05-08) and WB1 ack (Q7, 2026-05-08).

| ID | Disposition | Verified by |
|---|---|---|
| Q-MBT25-1 | (a) hand-rolled SVG | `arcPath` pure fn in ring-helpers.ts (~12 lines incl branches); probe-01-math suite 0/3/100% percentage tests pass; no chart library dependency added |
| Q-MBT25-2 | (a) push-based via `onRateLimitUpdate` | preload.mts MB-T34 zone (D's f326d21) implements push subscription pattern; integration test verifies subscribe count=1 at mount + cb-fired updates flow to DOM |
| Q-MBT25-2a | (a) extend coarchitectBridge | `mount.ts CoarchitectBridge.onRateLimitUpdate?` field added at WB3; type tightened from `unknown` → `RateLimitState` at WB3 GREEN |
| Q-MBT25-3 | surface-only at my session; operator-arbitrated at A's Q-MBT24-4=far-left | Plan-usage slot lands at chat-shell-header-bar index-0 in MY worktree (verified by integration test); A's MB-T24 toggle slot lands index-0 at operator merge per Q-MBT24-4=far-left → MB-T25 ends up index-1 (second from left) post-merge |
| Q-MBT25-4 | (a) empty rings + em-dash countdown placeholder | `formatCost(null)` analogue: countdown shows "—" when state=null; SVG element absent (state-conditional render); probe-07 + integration test both verify |
| Q-MBT25-5 | [MODELED] header-name; pure-fn helpers neutral to spelling | ring-helpers.ts `formatResetCountdown(reset, now)` + `computePercentageUsed(used, limit)` are signed against neutral arg shapes (number or ISO-string), insensitive to header-name spelling. D's actual header field-name capture from MB-T34 Phase 1 spike is the [KNOWN] reference — D's API client extracts headers and produces RateLimitState; my pure helpers consume the produced shape, NOT the raw header names |
| Q-MBT25-6 | (a) followup-only-shell for Outcome B; moot per Outcome A confirmation | Outcome A confirmed at HALT 0; Outcome B 4-WB ladder NOT activated. Tier 3 followup `MB-F-T25-RAW-FETCH-ALTERNATIVE` documented for completeness per WB1 ack |
| Q-MBT25-7 | (a) tokens-combined feeds outer ring | `selectPrimaryDimension(state) = state.tokens ?? null` in ring-helpers.ts; probe-01-math suite verifies 3 dispositions (tokens present, all-null, tokens-null-others-present); operator ack at WB1 cited "tokens-combined captures the dimension operators intuitively monitor for 'how much of my plan have I used'" |

---

## VII. R-MBT25-1..6 risk closures

| ID | Status | Resolution |
|---|---|---|
| R-MBT25-1 (cross-session sentinel-zone authorship in chat-shell.tsx + mount.ts between MB-T25 + MB-T24) | RESOLVED | Per-session worktree isolation eliminates concurrent contention. Slot-ordering Q-MBT25-3 surfaced for operator's A's Phase 1 arbitration; A's Q-MBT24-4=far-left → final ordering at operator merge: `[Auto/Ask MB-T24] | [plan-usage MB-T25] | [cost-meter MB-T26] | [model-mix MB-T27]`. My MB-T25 zone author at index-0-of-existing-slots; A's branch authors index-0 at merge time. No conflict expected; operator-merge-time interleaving is mechanical |
| R-MBT25-2 (D's MB-T34 export shape unknown at my Phase 1) | RESOLVED | D shipped through WB5 (`f326d21 origin/mbt34-worktree`); RateLimitState data contract is exactly the 4-dimension nested-bucket shape operator specified at HALT 0. My adapter pattern in `resolveRenderPlanUsageRing` path 2 + PlanUsageRingBridge interface narrowing gives clean type-safety. WB3 GREEN tightening of CoarchitectBridge.onRateLimitUpdate type from `unknown` → `RateLimitState` was the operator-mechanical-translation of D's contract per CLAUDE.md §3.4 |
| R-MBT25-3 (Outcome B materializes mid-WB-ladder) | RESOLVED | Outcome A confirmed at HALT 0 via two-source [KNOWN]; never had to pivot. Pre-mitigation by HALT 0 dual-conditional gate worked as designed |
| R-MBT25-4 (anthropic-ratelimit-* header field names drift) | RESOLVED | Pure-fn helpers signed against neutral arg shapes (number or ISO-string); insensitive to header-name spelling. D's API client owns header-extraction → produces canonical RateLimitState shape; my consumer pipeline is field-name-agnostic |
| R-MBT25-5 (DST midnight + 5-hour reset cycle interaction) | ACCEPTED | `formatResetCountdown(reset, now)` computes `reset - now` in epoch ms; DST transition gives a 23h or 25h day during the rare crossover. Acceptable for v3.0 — same DST limitation as MB-T26 cost-ledger date-key (R-MBT26-6 ACCEPTED). Documented limitation; no v3.1 followup |
| R-MBT25-6 (existing CLAUDE.md §4.5 pre-existing failure) | KNOWN-managed | `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` (Tier 2) cited at every WB-GREEN commit body; not re-diagnosed per CLAUDE.md §4.5; line moved 485→492 due to my MB-T26 + MB-T27 sentinel zone comment additions across the parallel-cairn run, same shape unchanged |

**NEW risk surfaced mid-ladder (filed at this WB5 §VIII):** R-MBT25-7 (cross-session prompt-authoring scope overlap on preload.mts) — closed at WB3.5 refactor (`63b9ca6`); methodology evidence filed as `MB-F-PARALLEL-CAIRN-WORKTREE-DUAL-AUTHORSHIP-OVERLAP` (Tier 1).

---

## VIII. Outcome classification per CLAUDE.md §2.11

**Improved (capability enabled with operator-merge-gate-deferred verification).**

This framing departs from CLAUDE.md §2.11's standard 7-classification list with operator-recommended new variant per WB4 ack 2026-05-08. The framing is honest about:
- **Improved**: ring widget functionality is shipped end-to-end at consumer side; sibling-zone discipline preserved across 5 ticket families (MB-T20+T21+T22+T26+T27); 109 tests GREEN.
- **Capability enabled**: the architectural contract is wired through (mount.ts path-2 + ChatShell slot + PlanUsageRing useEffect + ring-helpers pure fns). Activates at runtime once D's MB-T34 broadcast emission is merged + electron boots.
- **Operator-merge-gate-deferred verification**: live /v1/messages integration test + runtime electron smoke deferred per HALT 2 option (a) — the deferral is operator-arbitrated coordination boundary, not session-side incomplete work. Closure path is documented + tracked at `MB-F-T25-RUNTIME-VERIFICATION-DEFERRED-MERGE-GATE` (Tier 2).

**Why NOT "Capability enabled with known limitations":** that framing is for cases where the capability ships INHERENTLY incomplete (e.g., MB-T26's hardcoded MODEL_RATES — operator-editable rate table deferred to MB-T33). Here, the capability is COMPLETE at the consumer side; only the cross-session integration verification is deferred to merge gate. The deferral is exogenous (cross-session coordination), not endogenous (incomplete implementation).

**Why NOT "No regression; wiring verified; improvement case not exercised":** that framing is for changes where no behavior change is observable at session side. Here, the wiring IS exercised end-to-end at consumer side (109 tests GREEN); the unexercised path is specifically the cross-branch live integration, not the consumer pipeline.

### Methodology incident postmortem

`MB-F-PARALLEL-CAIRN-WORKTREE-DUAL-AUTHORSHIP-OVERLAP` (Tier 1, NEW at this WB-final) is the fifth distinct shared-tree-class failure mode documented under Round 4 worktree isolation. The mode summary:

- **Failure mode:** two operator-authored prompts assign the same surface (here: preload.mts onRateLimitUpdate authorship) to two sessions independently. Per-session worktree isolation eliminates concurrent shared-tree contention; this mode operates at the prompt-authoring layer, not the cairn-execution layer.
- **Detection vector:** my pre-WB4 cross-session check via `git fetch origin mbt34-worktree` + `git log` (metadata-only read per §8) caught D's preload.mts authorship in WB5 commit body; surfaced to operator at HALT 1.
- **Resolution:** operator option (a) — D's authorship wins; my MB-T25 zone removed via refactor commit (`63b9ca6`). Net change to MB-T25 territory in preload.mts: 0 functional lines, 1 NOTE comment pointing to D's zone.
- **Closure path:** operator-side prompt-authoring discipline — preload.mts (and similar shared additive surfaces) authorship ownership stated explicitly per surface in each session's prompt; no implicit "both sessions add here" overlap.
- **Methodology layer:** Tier 1 — structural finding requiring prompt-authoring-discipline amendment. Operator-only territory; this WB5 commit just files the evidence row at FOLLOWUPS.md.

### Two-session [KNOWN] verification primitive (operator-territory ratification candidate)

My Phase 1 + WB4 work validated the consumer-side architectural contract (mount.ts → ChatShell → PlanUsageRing → ring-helpers); D's MB-T34 Phase 1 + WB4 + WB5 work validated the producer-side contract (server header emission → SDK exposure → AnthropicAPIClient extraction → IPC broadcast). Two sessions, different worktrees, different angles → same architectural contract validated.

This evidence pattern pairs with Terminal A's MB-T24 (operator named the §3.19 candidate at A's WB4 ack 2026-05-08); two-ladder ratification of the cognitive-bandwidth-enablement primitive (operator-named at my WB4 ack). Round 4 evidence document §3 + §5 candidates now strengthened from "single-ladder evidence" to "two-ladder evidence." Operator-territory ratification at next dispatch wave; this WB5 just flags the evidence.

---

## IX. Followups filed (FOLLOWUPS.md amendments at this WB5)

| ID | Tier | Status | Closure path |
|---|---|---|---|
| `MB-F-T25-MULTI-DIMENSION-RING-DRILLDOWN` | 3 | OPEN | hover/click outer ring → popover with all 4 dimensions (requests, tokens-combined, input-tokens, output-tokens) shown as individual fill bars. Preserves Q-MBT25-7=a single-glance default for v3.0; adds detail-on-demand in v3.1. Operator-named at WB1 ack |
| `MB-F-T25-INITIAL-FETCH-ON-MOUNT` | 3 | CLOSED-on-file | Closed by D's MB-T34 WB5 (`f326d21`) which already implements `coarchitect:getRateLimitState` initial-fetch invoke at preload.mts MB-T34 zone. Filed for audit-trail; my v3.1 followup at WB3 commit body anticipated this gap; D's WB5 closed it |
| `MB-F-T25-RAW-FETCH-ALTERNATIVE` | 3 | DOCUMENTED-MOOT | Outcome B contingency option (raw-fetch alongside SDK call) operator-named at WB1 ack; moot per Outcome A confirmation at HALT 0. Filed for completeness — useful if SDK regresses + headers stop being exposed in a future SDK version |
| `MB-F-PARALLEL-CAIRN-WORKTREE-DUAL-AUTHORSHIP-OVERLAP` | 1 | OPEN | Methodology — fifth distinct shared-tree-class failure mode under worktree isolation; operates at prompt-authoring layer not cairn-execution layer; closure via operator-side prompt-authoring discipline amendment (operator-only territory) |
| `MB-F-T25-RING-HELPERS-LARGE-ARC-FLAG-BRANCH-COVERAGE` | 3 | OPEN | ring-helpers.ts line 86 `largeArcFlag = angle > Math.PI ? 1 : 0` — `=1` branch uncovered (95.45% branch coverage). RED-locked probe set covers 0%, 50%, 100% only. Closes by adding a percentage∈(50,100) test (e.g., 75%) to probe-01-math at v3.1 polish iteration |
| `MB-F-T25-RUNTIME-VERIFICATION-DEFERRED-MERGE-GATE` | 2 | OPEN | Live /v1/messages integration test + runtime electron smoke deferred per HALT 2 option (a). Closure: operator merges mbt34-worktree + mbt25-worktree to main → runs `pnpm --filter dispatch-workstation exec electron dist/main/main.js` → observes WINDOW_READY + chat-shell-plan-usage-slot in DOM + ring updates after a real chat send |

**Total: 6 followup rows (1 Tier 1 methodology + 1 Tier 2 deferred-verification + 4 Tier 3 polish/audit).**

---

## X. Confidence label summary

Per CLAUDE.md §2.2, every factual claim across all WB commit bodies + this findings doc carries a confidence label.

### [KNOWN] surfaces at WB5 final state
- SDK 0.92.0 type-shape: `MessageStream.response.headers` exposure (Phase 1 .d.ts read)
- Server-side header emission: confirmed by D's MB-T34 Phase 1 spike `c09bd09` (13 anthropic-ratelimit-* headers across 4 dimensions)
- Two-source [KNOWN] verification of architectural contract: my Phase 1 + D's spike (consumer + producer angles)
- Test-suite state: 109 GREEN at WB4 commit time + 1 §4.5 pre-existing
- Coverage on ring-helpers.ts: 100% line / 100% statement / 100% function / 95.45% branch
- Sibling-zone discipline: zero regression across MB-T20+T21+T22+T26+T27 territory
- D's MB-T34 commits visible via `git fetch origin mbt34-worktree` (metadata-only per §8): `c09bd09` (Phase 1), `bd69b15` (WB1 RED), `ea1d69b` (WB2), `3a700b7` (WB3), `eff3a68` (WB4), `f326d21` (WB5)
- Methodology incident `MB-F-PARALLEL-CAIRN-WORKTREE-DUAL-AUTHORSHIP-OVERLAP`: cited from D's f326d21 commit body claim of preload.mts MB-T34 zone authorship overlapping with my a8c1bfa MB-T25 zone authorship

### [MODELED] surfaces at WB5 final state
- RateLimitState data contract type: locally defined in ring-helpers.ts at WB2; ratchets to [KNOWN] at v3.1 if D exports the canonical type from MB-T34 client surface (deep-import per CLAUDE.md §3.4 mechanical-translation discipline)
- Live runtime electron smoke + live /v1/messages integration: untested at session side; [MODELED] expected behavior pending operator-merge-gate verification per HALT 2 option (a)
- Two-ladder ratification of cognitive-bandwidth-enablement primitive (T3 + me): operator-territory; this findings doc flags evidence, doesn't author the §3.19 amendment

### [SPECULATIVE] surfaces at WB5 final state
- Branch-coverage 100% needed for ship gate (ring-helpers.ts line 86): operator-deferred decision; tracked at MB-F-T25-RING-HELPERS-LARGE-ARC-FLAG-BRANCH-COVERAGE
- v3.1 followup priorities: MULTI-DIMENSION-RING-DRILLDOWN vs INITIAL-FETCH-ON-MOUNT (closed-on-arrival) vs RAW-FETCH-ALTERNATIVE — all Tier 3; operator prioritizes at v3.1 sprint planning

---

## References

### MB-T25 commits (this branch)
- Phase 1 spike: `1cf07f5 spike(MB-T25): Phase 1 — diagnose + decisions doc + DUAL-CONDITIONAL HALT 0 gate`
- WB1 RED: `d187b62 red(MB-T25): WB1 — scaffold plan-usage-ring + ring-helpers + 2 RED probes (32 tests authored)`
- WB2 GREEN: `7e14cd4 green(MB-T25): WB2 — ring-helpers.ts pure-fn impl (26/26 GREEN; 100% line cov)`
- WB3 GREEN: `a8c1bfa green(MB-T25): WB3 — PlanUsageRing component impl + mount path-2 wiring + preload.mts MB-T25 zone (6/6 GREEN)`
- WB3.5 refactor: `63b9ca6 refactor(MB-T25): WB3.5 — remove duplicate onRateLimitUpdate from preload.mts (D's f326d21 ships canonical)`
- WB4 GREEN: `f448139 green(MB-T25): WB4 — plan-usage-roundtrip integration test (6/6 GREEN; full-mount path-2 wiring verified end-to-end)`
- WB5 docs: see push log

### Phase 1 docs
- `docs/coordination/mb-t25-diagnose-2026-05-08.md` — surface inventory + Q-MBT25-1..6 + R-MBT25-1..6 + SDK type-shape evidence
- `docs/coordination/mb-t25-decisions-2026-05-08.md` — operator-skim review surface + WB ladder summary

### Source files (mine)
- `packages/dispatch-workstation/src/chat-shell/plan-usage-ring.tsx` (114 lines) — NEW WB1 + GREEN at WB3
- `packages/dispatch-workstation/src/chat-shell/ring-helpers.ts` (138 lines) — NEW WB1 + GREEN at WB2

### Source files (modified, mine)
- `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx` (sentinel-zoned additive at WB1; unchanged WB2-WB5)
- `packages/dispatch-workstation/src/chat-shell/mount.ts` (sentinel-zoned additive at WB1; path-2 wiring + type tightening at WB3)
- `packages/dispatch-workstation/src/main/preload.mts` (additive zone at WB3; removed at WB3.5 per HALT 1 option (a))

### Test files (mine)
- `packages/dispatch-workstation/test/unit/ring-helpers/probe-01-math.spec.ts` (189 lines, 26 tests)
- `packages/dispatch-workstation/test/unit/chat-shell/probe-07-plan-usage-ring.spec.tsx` (113 lines, 6 tests)
- `packages/dispatch-workstation/test/integration/chat-shell/plan-usage-roundtrip.test.tsx` (290 lines, 6 tests)

### CLAUDE.md sections governing
- §2.1, §2.2, §2.3, §2.4, §2.5, §2.7, §2.10, §2.11, §2.12 (anti-fab, confidence, cairn grammar, self-check Q1-Q9, halt, per-path stage, frozen contracts, outcome classification, followups)
- §3.3, §3.4, §3.5, §3.6 (sentinel zones, dispatch-core dist build, persistence pattern, test layout)
- §4.1, §4.2, §4.4, §4.5, §4.6 (WB ladder, HALT gates, verification ordering, pre-existing failures, runtime smoke)
- §7, §8, §9 (communication style, always/never)

### Cross-session reads (metadata only per §8)
- `git fetch origin mbt34-worktree`
- `git --no-pager log origin/mbt34-worktree --oneline -10`
- `git --no-pager log origin/mbt34-worktree -1 f326d21 --pretty=format:"%B"` (D's WB5 commit body for dual-authorship-overlap detection)

### Round 4 prompt scope governance
- `~/Downloads/round-4-prompts/round-4-prompt-mbt25.md` §0-§9 (worktree state, upstream dependency, cairn methodology, ticket scope, WB ladder, cross-session coordination, frozen-territory verification)

---

**MB-T25 ladder closed at this WB5.** Family-B (Conductor chat panel) progresses: MB-T20 (shell) → MB-T21 (Chat tab) → MB-T22 (multi-tab API + Commits tab) → MB-T26 (cost meter) shipped (4 prior tickets); MB-T25 (plan-usage ring — this) shipped at session-side with merge-gate-deferred runtime verification; MB-T27 (model-mix indicator) shipped (parallel Round 3); MB-T23 (Tasks tab) + MB-T24 (Auto/Ask toggle — Terminal A in flight Round 4) remain. Cross-session: Terminal D's MB-T34 (Anthropic API client) shipped through WB5 + provides the producer-side architectural counterpart to my MB-T25 consumer.
