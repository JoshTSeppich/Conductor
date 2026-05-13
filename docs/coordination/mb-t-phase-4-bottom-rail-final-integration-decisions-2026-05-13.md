# MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION — Operator Decisions

**Date:** 2026-05-13
**Author:** SESSION-`r12-phase4-bottom-rail-integration-body` (Opus 4.7) under Round 12 §3.9 plugin-loaded Wave 1 SPECULATIVE dispatch (territory manifest `r12-phase4-bottom-rail-integration-body.txt`)
**Anchor:** ticket body `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION_BUILD.md` co-landing at this commit.
**Status:** PENDING-OPERATOR-RESOLUTION — Sub-Q gates §3.1-§3.6 await operator-ack at HALT-TICKET-BODY-PRE-COMMIT OR HALT-PRE-WAVE-2-EXECUTION.

---

## §0 — Purpose

This doc captures operator Sub-Q resolutions for `MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION` per Round 12 §3.9 Wave 1 SPECULATIVE body-drafting forward-positioning. Operator decisions land here as `[KNOWN-OPERATOR-ARBITRATED]` rows; ticket body §3 retains the alternates table for archaeology + §3.6+ retains "operator decision pending" lines until ack lands.

Pattern mirrors sibling T10 decisions doc (`mb-t-wireframe-t10-decisions-2026-05-12.md`) — captures operator-arbitrated turn outputs for future cairn-audit traceability. T11 ticket (BYPASS-PERMS) did NOT author a separate decisions doc because Sub-Qs were auto-defaulted under Wave 4 envelope per its dispatch directive; this ticket follows T10 precedent (explicit decisions doc) because Round 12 Wave 1 is body-drafting-only and Wave 2 execution will reference this doc for Sub-Q ack-at-dispatch-time.

---

## §1 — Operator pre-arbitration anchors (Round 12 §3.9 Wave 1 dispatch)

`[KNOWN per Round 12 §3.9 Wave 1 dispatch-queue-current.md row]`:
- Scope = consumer-mount-wiring consolidation for max-parallel + bypass-perms (Phase 4 follow-on to T10 + T11).
- Sibling pattern direction = T9 `de6620e` `resolveRenderPlanTimerText` precedent (mount factory + slot supplier; renderer-side wiring; zero frozen-surface touch).
- SPECULATIVE STATUS FRAMING = revision-cost explicitly accepted; post-Wave-1-cohort evidence may RATIFY / RESHAPE / DISCARD; Wave 2 dispatch follows.

`[KNOWN per territory manifest r12-phase4-bottom-rail-integration-body.txt]`:
- WRITE territory: this decisions doc + ticket body + coord doc only.
- READ-ONLY: full chat-shell + tile-grid + main + dispatch-daemon source + schema + Round 11 archive + BYPASS-PERMS coord docs + T10 decisions + FOLLOWUPS.md.
- FORBIDDEN: ALL packages/**/*.{ts,tsx} (NO implementation; body-drafting only) + FOLLOWUPS.md edit + cairn-*.md + orchestrator-state + dispatch-queue + manifest dir + CLAUDE.md + frozen contracts.

`[KNOWN per operator auto-ack 2026-05-13]`: "HALT-TERRITORY-ACK auto-acked per Round 11 §1.A surface-only semantics + MAX-AUTONOMY-WITHIN-FENCES dispatch §2 auto-ack envelope. Proceed with your scope-brief work. ANNOUNCEMENT-class — no reply needed."

`[KNOWN per Phase 1 diagnose `a5e8425ce76f9ae5b`]`: 6 Sub-Qs enumerated (Q-BR-1 through Q-BR-6); 7 risks (R1-R7); 5-8 WB ladder shape estimate.

---

## §2 — Sub-Q gate disposition table (operator decisions pending)

| Sub-Q | Question | Recommendation `[MODELED]` | Operator disposition | Captured-at-commit |
|---|---|---|---|---|
| BR-1 | Consumer wiring path | **(a) Renderer-side `resolveRenderXxx` mirroring T9 `de6620e` precedent** | PENDING | (forthcoming HALT-PRE-WAVE-2-EXECUTION ack) |
| BR-2 | MaxParallel N (active session count) data flow | **(a) Renderer-internal sessions-stream filter (RATIFY T10 Sub-Q-T10-A=α default)** | PENDING | (forthcoming) |
| BR-3 | MaxParallel M (limit) source-of-truth | **(b) Workstation settings file (`<userData>/max-parallel.json` mirroring `splitter-state.ts` raw-fs pattern per CLAUDE.md §3.5)** | PENDING | (forthcoming) |
| BR-4 | Cost-meter + plan-timer refresh in scope? | **(b) Out-of-scope (this ticket = max-parallel + bypass-perms mount-wiring only; data-source ARMs remain in their respective Tier 2/3 followups per CLAUDE.md §2.12)** | PENDING | (forthcoming) |
| BR-5 | `createBypassPermsSource()` instantiation lifetime | **(a) `main.ts` singleton threaded through `defaultSpawnHandlerDeps`** | PENDING | (forthcoming) |
| BR-6 | IPC channel name+shape (only if Q-BR-1=(b)) | **(c) Skip — use Q-BR-1=(a) renderer-side path** | PENDING | (forthcoming; CONDITIONAL on BR-1) |

### §2.1 — Default-disposition rationale summary

`[MODELED]`:
- All six defaults converge on **ship-velocity + zero-frozen-surface-touch + matched T9 `de6620e` sibling precedent**.
- (a) renderer-side for BR-1 is the lone shipped mount-wiring pattern at HEAD (T9 `resolveRenderPlanTimerText`; T8 `resolveRenderCostMeter` is structurally similar). Zero contract amendment.
- (a) renderer-internal for BR-2 RATIFIES T10's auto-defaulted Sub-Q-T10-A; minimal change; current `max-parallel-counter.tsx:64-65` inline filter logic stays operative.
- (b) settings-file for BR-3 is the natural escalation from T4 const-16 placeholder + matches `splitter-state.ts` 35-line precedent + persists across launches. CLAUDE.md §3.5 canonical raw-fs pattern (no electron-store install per CLAUDE.md §9).
- (b) out-of-scope for BR-4 honors CLAUDE.md §2.12 anti-absorption; cost-meter + plan-timer **consumer mount-wiring is already shipped** at T8/T9; their open ARMs are data-source work (separate tickets).
- (a) singleton for BR-5 preserves DI testability per T11 WB2 design intent — `createBypassPermsSource` factory shape (`93-119`) explicitly signals lifetime-owner-elsewhere.
- (c) skip for BR-6 is CONDITIONAL on BR-1=(a); operator only revisits if BR-1 escalates.

### §2.2 — Non-default escalation triggers

Operator may select non-default for any Sub-Q. Expected scope adjustments:
- **Sub-Q-BR-1=(b) IPC push channel**: +1-2 WBs for IPC channel + preload bridge + `WORKSTATION_CONTRACT.md §6.6` amendment + HALT-WB-PRE-COMMIT operator wording-review (cairn `contract:` prefix per §2.3).
- **Sub-Q-BR-1=(c) hybrid (max-parallel renderer-side; bypass-perms IPC)**: +1 WB for bypass-perms-only IPC channel + partial §6.6 amendment.
- **Sub-Q-BR-2=(b) daemon-side aggregator**: +1-2 WBs for new daemon route + cross-package contract amendment surface; opens cross-ticket dependency with daemon roadmap.
- **Sub-Q-BR-3=(a) renderer const**: -1 WB (no settings-file module); v1 minimum that preserves T4 const-16 semantics; defers persistence to follow-on.
- **Sub-Q-BR-3=(c) BUILD.md preamble**: +2-3 WBs for `MB-T28` parser amendment + workstation observer; opens cross-ticket dependency with `MB-T-PHASE-4-BUILD-MD-REAL-FIXTURE-CYCLE` Phase-3-trigger-dependent ticket.
- **Sub-Q-BR-3=(d) daemon config**: +1 WB for daemon endpoint + workstation poll wiring; cross-package contract amendment.
- **Sub-Q-BR-4=(a) in-scope refresh**: +0-2 WBs for cost-meter + plan-timer mount-wiring sanity verification (no data-source touches; just ensure no regression after max-parallel + bypass-perms factory additions).
- **Sub-Q-BR-4=(c) full-rail refresh**: +3-5 WBs absorbing `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` (Tier 3) + `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2). Breaks CLAUDE.md §2.12 anti-absorption discipline unless operator explicitly arbitrates as scope expansion.
- **Sub-Q-BR-5=(b) lazy factory**: -0 WBs; factory becomes stateful (acceptable trade).
- **Sub-Q-BR-5=(c) module-scoped const**: -0 WBs but loses test substitutability; mirrors `rateLimitAggregator` (`coarchitect-ipc.ts:94`) symmetry at cost of DI.
- **Sub-Q-BR-6 active (only if BR-1=(b))**: drives contract amendment cycle; operator wording-review HALT per CLAUDE.md §1.

---

## §3 — Cross-references

### §3.1 — Sibling tickets

- T10 decisions `mb-t-wireframe-t10-decisions-2026-05-12.md` — precedent for this file's shape; Sub-Q-T10-A/B/C/D/E still PENDING per T10 doc (this ticket's BR-2 RATIFIES T10's recommended (α); BR-3 advances T10's Sub-Q-B (β) settings-file recommendation).
- T11 BYPASS-PERMS findings `mb-t-phase-4-bypass-perms-indicator-data-flow-findings-2026-05-13.md` — Sub-Q-T11-A/B/C/D/E auto-defaulted under Wave 4 envelope; provides architectural precedent (pluggable-source skeleton + spawn-handler integration + component-prop seam).
- T9 ticket body — `resolveRenderPlanTimerText` (`de6620e`) mount-wiring shape precedent.

### §3.2 — Related followups

- `MB-F-BOTTOM-RAIL-MOUNT-WIRING-FINAL-INTEGRATION` (Tier 2 — T11 WB7 findings §VII at `28b0086`) — **primary closure target**.
- `MB-F-BYPASS-PERMS-CONSUMER-WIRING` (Tier 2 — T11 WB7 findings §VII at `28b0086`) — **absorbed** into this ticket.
- `MB-F-MAX-PARALLEL-CONFIG-SOURCE` (Tier 3 — T4 WB14 findings §IX) — closure-conditional on Sub-Q-BR-3 disposition; (b) settings-file path closes it; (a) const path leaves OPEN.
- `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` (Tier 3) — cost-meter **data source** ARM; out-of-scope per Sub-Q-BR-4=(b) default.
- `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2) — plan-timer **data source** ARM; out-of-scope per Sub-Q-BR-4=(b) default.
- `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE` (Tier 1 per CLAUDE.md §4.6) — WB8 runtime smoke is the gate.

### §3.3 — Cairn methodology anchors

- CLAUDE.md §1 frozen-contract enumeration (`WORKSTATION_CONTRACT.md §6.6` not in default-path; Sub-Q-BR-1=(b) escalation triggers).
- CLAUDE.md §2.4 operator-arbitrated contract amendments (only Sub-Q-BR-1=(b) / Sub-Q-BR-2=(b) trigger).
- CLAUDE.md §2.7 per-path discipline + pathspec-on-commit per `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1.
- CLAUDE.md §2.12 anti-absorption discipline — Sub-Q-BR-4=(b) default honors this; (c) full-rail-refresh option would violate.
- CLAUDE.md §3.3 sentinel zones in `main.ts` — WB6 authors new `=== BEGIN: MB-T-PHASE-4-BOTTOM-RAIL ===` zone outside existing Fix-A/B/C/89/92/Session-3/Probe-92 ranges.
- CLAUDE.md §3.5 raw-fs persistence precedent — Sub-Q-BR-3=(b) default path leverages `splitter-state.ts:1-35` shape; CLAUDE.md §9 forbids electron-store install.
- CLAUDE.md §3.7 esbuild renderer-surface scripts — chat-shell renderer bundle already includes `MaxParallelCounter` + `BypassPermsIndicator` per T4/T10/T11; no new build script needed.
- CLAUDE.md §4.6 runtime-launch smoke — WB8 mandatory smoke step.

### §3.4 — Round 12 §3.9 forward-positioning

`[KNOWN per Round 12 dispatch]`: Wave 1 = body-drafting cohort (this session); Wave 2 = execution-phase dispatch. Decisions doc remains OPEN until Wave 2 entry; operator may ack at HALT-PRE-WAVE-2-EXECUTION OR auto-default per dispatch envelope.

---

## §4 — Append history

This doc supports append-only operator-decision capture. Each operator ack lands as a new §N row referencing the Sub-Q + verbatim wording + commit SHA at ack time.

(append below as operator dispositions land)

---

`[KNOWN per Round 12 §3.9 STATUS FRAMING]`: SPECULATIVE — Wave 1 body-drafting forward-position. Sub-Q resolutions captured here are pre-arbitration anchors that may be revised at Wave 2 execution-phase entry or post-Phase-3 visual-verification evidence.
