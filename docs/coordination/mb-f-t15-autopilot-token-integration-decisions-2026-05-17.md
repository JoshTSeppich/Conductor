# MB-F-T15-AUTOPILOT-TOKEN-INTEGRATION — Decisions doc (gen-7 arbitration record)

**Session**: `r12-cw2-t15-autopilot-token-integration` (Round 12 R12-CLOSURE-Wave-2; V4 12-cap cascade; gen-7 dispatched 2026-05-17)
**Companion findings**: `docs/coordination/mb-f-t15-autopilot-token-integration-findings-2026-05-17.md`

---

## §I — Arbitrations

| ID | Question | Resolution | Source |
|---|---|---|---|
| Q-MBF-T15-1 | Stale-dispatch class: closure-target row body anticipates a data source ("autopilot telemetry") that was never instrumented; meanwhile a different data source (§C.5 PTY-scrape via `13b7607` + `63f9b03`) shipped the closure-symptom 7 days before this session's dispatch. Disposition? | **(α) RESOLVED-BY-EQUIVALENCE** — APPROVED. Row stamped CLOSED 2026-05-17 with PTY-scrape mechanism cited as the structural delivery vector. New Tier-3 row `MB-F-T15-AUTOPILOT-LOOP-STRUCTURED-TOKEN-TRACKING` filed in the same FOLLOWUPS commit to preserve the deferred direct-instrumentation intent for any future per-intent attribution consumer (e.g., MB-T26 cost-meter family). | Gen-7 arbitration 2026-05-17 ~12:00 MDT (this session's HALT 0 surface → gen-7 ack). |
| Q-MBF-T15-2 | Manifest-territory contradiction: closure-path-literal ("autopilot telemetry") requires writes to `src/main/autopilot-*.ts` (FORBIDDEN); only TERRITORY-permissible NEW file is `tile-grid/autopilot-token-bridge.ts` (renderer-side, with no upstream to subscribe to). Expand territory or reframe? | **Reframe at "renderer-side per-session token meter via `setSessions`" granularity.** No territory expansion; no `autopilot-token-bridge.ts` authored (it would be dead code). | Gen-7 arbitration 2026-05-17 ~12:00 MDT — implicit in (α) approval (territory-expansion path γ rejected by approval of α). |
| Q-MBF-T15-3 | Cross-source confusion: if a future autopilot-side emitter is ever wired, would it race PTY-scrape on `s.tokensUsed`? | **Pre-mitigation documented**: if `MB-F-T15-AUTOPILOT-LOOP-STRUCTURED-TOKEN-TRACKING` ever closes, it must split into a distinct field (e.g., `tokensUsedByIntent: Record<intent_id, number>`) rather than racing on `tokensUsed`. Findings §VI R-MBF-T15-3 documents the constraint for the future-closure session. | Operator pre-clearance via gen-7 arbitration; concrete schema-shape decision deferred to closure-time arbitration of the new Tier-3 row. |
| Q-MBF-T15-4 | Outcome classification per CLAUDE.md §2.11 — "No improvement + structural finding" or "Capability enabled with known limitations"? | **No improvement + structural finding.** This session shipped zero source-code changes; the structural finding is that §C.5 PTY-scrape mechanism delivered the closure-symptom under a different upstream-identity than the row body anticipated. "Capability enabled with known limitations" would imply this session enabled the capability; §C.5 (commits `13b7607` + `63f9b03` 2026-05-10) enabled it. | Session-arbitrated under gen-7 "your call" delegation in the arbitration message. |

---

## §II — Operator / gen-7 directive trace

| Step | Action | Anchor |
|---|---|---|
| 1 | Gen-7 dispatched `r12-cw2-t15-autopilot-token-integration` per V4 cascade 2026-05-17. | `/tmp/r12-cw2-t15-autopilot-token-integration-boot.md` + `/tmp/r12-cw2-shared-bootstrap.md` |
| 2 | Session executed §A inheritance reads (7 files) + §B Phase-1 diagnose (cairn-phase-1-diagnose plugin agent `a0435fdb2d35f5a8d`, 35 tool calls) + §C stale-dispatch grep (1 hit = `14bae97` filing commit, no closure stamp). | Session transcript |
| 3 | Session direct-Read verified Phase-1 critical claims (autopilot-loop token-free; `TileGridSessionEntry.tokensUsed?` + `tokenBudget?` present; `tile-grid-app.tsx:329-337` §C.5 subscription live; `13b7607` + `63f9b03` commit anchors). | This session's STANDBY message §"Phase-1 verified findings" |
| 4 | Session surfaced HALT-COARCH-CONSULTATION-NEEDED-MB-F-T15-AUTOPILOT-TOKEN-INTEGRATION to gen-7 with 3 closure-path options (α RESOLVED-BY-EQUIVALENCE / β defer-and-reframe / γ territory expansion). | This session's first STANDBY message |
| 5 | Operator SUBAGENT-RATIONED protocol issued 2026-05-17 ~11:58 MDT — for ≤2 WB sessions skip cairn-phase-1-diagnose; use direct Read. Sub-session ACK'd one-line. | Operator correction in session transcript |
| 6 | Gen-7 arbitration ack 2026-05-17 ~12:00 MDT: path (α) APPROVED with 7-step closure plan + invocation of gen-6 §1.2 STAMP-LAG precedent. | Gen-7 arbitration message (this session input) |
| 7 | Session authored this decisions doc + companion findings doc + executed FOLLOWUPS stamp + WB-final commit. | This commit |

---

## §III — Closure-path-α steps executed

Per gen-7 7-step plan:

1. **Author findings doc** ✓ — `docs/coordination/mb-f-t15-autopilot-token-integration-findings-2026-05-17.md`
2. **Stamp FOLLOWUPS:189** ✓ — `→ CLOSED 2026-05-17 by r12-cw2-t15-autopilot-token-integration RESOLVED-BY-EQUIVALENCE via PTY-scrape (13b7607 + 63f9b03 §C.5) — autopilot-loop direct instrumentation deferred to MB-F-T15-AUTOPILOT-LOOP-STRUCTURED-TOKEN-TRACKING (Tier 3 NEW)`
3. **Author decisions doc** ✓ — this file
4. **File new Tier-3 row** ✓ — `MB-F-T15-AUTOPILOT-LOOP-STRUCTURED-TOKEN-TRACKING` appended to `docs/FOLLOWUPS.md` (operator-stamp envelope per shared bootstrap §F.7)
5. **WB-final commit** ✓ — `green(MB-F-T15-AUTOPILOT-TOKEN-INTEGRATION): WB-final — RESOLVED-BY-EQUIVALENCE via PTY-scrape (13b7607 + 63f9b03 §C.5)`
6. **Push + verify empty `origin/main..HEAD`** ✓
7. **STANDBY-ACK to gen-7** ✓

---

## §IV — Precedent invoked

**Gen-6 §1.2 STAMP-LAG-CLOSURE-PATTERN** (`d6b4107` + `735703f` + FOLLOWUPS:372):

| Property | Gen-6 §1.2 origin (row 74) | This session (row 189) |
|---|---|---|
| Closure work shipped at | Batch-6 Session-C `9cc238b` 2026-05-04 (`red 93c474b` + `green a89e52a` + merge + `60058a1` sentinel) | §C.5 `63f9b03` + `13b7607` 2026-05-10 |
| Row state at closure time | NOT stamped | NOT stamped |
| Lag between closure + stamp | 12 days (2026-05-04 → 2026-05-16) | 7 days (2026-05-10 → 2026-05-17) |
| Detection mechanism | Wave T1-CLOSURE-Wave-1 re-dispatch (`SESSION-r12-t1c-w1-t08-onboarding-renderer-mount`) HALTED at HALT 0 phase-1-diagnose | Wave R12-CLOSURE-Wave-2 re-dispatch (this session) HALTED at HALT 0 + direct-Read triangulation |
| Stamping orchestrator | Gen-6 mediated `d6b4107` | Gen-7 mediated this WB-final commit |
| Companion methodology row filed | `MB-F-FOLLOWUPS-RESOLVED-SWEEP-DISCIPLINE` (FOLLOWUPS:372, Tier 3) | `MB-F-T15-AUTOPILOT-LOOP-STRUCTURED-TOKEN-TRACKING` (FOLLOWUPS:383, Tier 3) |
| Key divergence | Row 74's anticipated path == shipped path (just unstamped) | Row 189's anticipated path != shipped path (PTY-scrape ≠ autopilot loop telemetry); EQUIVALENCE argument needed |

The MB-F-T15 case is a structurally-richer analog: the gen-6 §1.2 case was pure stamp-lag with identical anticipated/shipped paths; the gen-7 MB-F-T15 case requires *equivalence* (different upstream data source delivering the same user-visible symptom). Both cases triggered HALT-STALE-DISPATCH or HALT-COARCH-CONSULTATION at HALT 0 of the re-dispatched session via Phase-1 triangulation — preserving anti-fabrication discipline per MEMORY.md `feedback_stale_dispatch_detection`.

---

## §V — Forward propagation

**Memory anchor candidates** (none authored this session; surfaced for future sessions):

- The Round 12 §1.2 emergent class **followups-stamp-lag-gap (SWEEP-DISCIPLINE)** has a sub-class: **closure-by-equivalence** where the shipped mechanism differs from the row-anticipated mechanism. The detection signal is identical (Phase-1 triangulation catches mismatch between row body and HEAD state); the closure mechanism differs (`d6b4107`-style direct stamp vs. this session's equivalence-arbitration + RESOLVED-BY-EQUIVALENCE stamp). Future cascade-selection pre-check primitive (gen-6 §1.2 closure-path-β `git log --all --grep <row-id>` macro) catches BOTH sub-classes when extended to check for *any* commit body referencing the closure-path TEXT (not just the row-id) — e.g., grep for "onTileTokenUpdate" + "setSessions" + "tokensUsed" against §C.5 commits would have caught this case pre-dispatch.

- **Tier-classification heuristic for equivalence-closures**: when closure-by-equivalence is invoked, the stamp text should explicitly cite the divergent-mechanism upstream + the rationale, and the companion-Tier-3 row should preserve the originally-anticipated mechanism for future-closure consumers. This session's stamp + companion row format is the proposed template.

---

## §VI — Cross-references

- Companion findings: `docs/coordination/mb-f-t15-autopilot-token-integration-findings-2026-05-17.md`
- Phase-1 diagnose agent: `a0435fdb2d35f5a8d`
- Gen-7 arbitration message: this session input 2026-05-17 ~12:00 MDT
- Operator SUBAGENT-RATIONED protocol: this session input 2026-05-17 ~11:58 MDT
- Gen-6 §1.2 precedent: `d6b4107` + `735703f` + FOLLOWUPS:372
- Round 12 archive: `docs/cairn-under-stress-round-12.md` §1.2
- MEMORY: `feedback_stale_dispatch_detection`
- Manifest: `docs/coordination/territorial-manifests/r12-cw2-t15-autopilot-token-integration.txt`
- Boot prompt: `/tmp/r12-cw2-t15-autopilot-token-integration-boot.md`
- Shared bootstrap: `/tmp/r12-cw2-shared-bootstrap.md`
