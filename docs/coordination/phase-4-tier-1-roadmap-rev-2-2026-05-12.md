# Phase 4 Tier 1 Ticket Roadmap — Rev 2 (2026-05-12)

**Status:** SUPERSEDES `docs/coordination/phase-4-tier-1-roadmap-draft.md` (`d009e6f` original; PROVISIONAL Wave-0). Rev-2 incorporates Wave-1 closures (T8 + T9), Wave-2 in-flight (T10 + Cluster A draft), Cluster A operator-acked single-bundle scope, and Phase 3 trigger-tooling readiness. **Still PROVISIONAL** per dispatch STATUS FRAMING — Phase 3 visual-verification has not been triggered; operator-acknowledged revision-cost remains in force for every `[SPECULATIVE]`-labeled row.

**Authored:** 2026-05-12 by `__orchestrator_standby-p3-rev` sub-session per Round 11 Wave 3 dispatch + manifest `docs/coordination/territorial-manifests/orch-standby-p3-roadmap-rev.txt`.
**HEAD at authoring time:** `d342986` (`green(MB-F-CHATSHELL-POLISH-REMAINING): WB1 paired` — Wave-2 in-flight `t1-chatshell-polish` ship).
**Manifest WRITE territory:** this file + `phase-4-roadmap-update-notes-2026-05-12.md` + `phase-4-tier-1-roadmap-draft.md` (PRESERVED as-is; rev-2 supersedes by reference, not by overwrite).
**READ-ONLY consulted:** `phase-4-status-2026-05-12.md` (`__orchestrator_active` Wave-2 synthesis) + `phase-4-synthesis-2026-05-12.md` (`52f3d04` Cluster A DRAFT) + T8/T9/T10 build-doc heads + `phase-4-tier-1-roadmap-draft.md`.

**Anchor commits verified [KNOWN] via `git --no-pager log --oneline <SHA> -1` at HEAD `d342986`:**

| SHA | Subject | Source |
|---|---|---|
| `155933f` | `green(MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW): WB-final — decisions + findings + coord + ticket-body (β) amendment` | T8 closure |
| `afd3778` | `green(MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW): WB8 — runtime smoke + findings doc + FOLLOWUPS/audit operator-stamp surface` | T9 closure |
| `52f3d04` | `docs(phase-4-synthesis-2026-05-12): __orchestrator_active Wave-N sequencing + Cluster A bundled ticket-body DRAFT (MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS)` | Cluster A scope |
| `a8e9a76` | `green(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): WB10 — verify:phase-3-smoke CLI + §C amendment draft + findings doc + FOLLOWUPS row 335 closure stamp` | Phase 3 trigger readiness (P1 γ tooling) |

Confidence labels per CLAUDE.md §2.2: `[KNOWN]` direct-read at HEAD `d342986`; `[MODELED]` reasoned from observed facts + stated model; `[SPECULATIVE per dispatch STATUS FRAMING]` forward claim awaiting Phase 3 evidence.

---

## §0 — Reading protocol (Rev 2)

1. §1 — Rev-1 → Rev-2 redline summary (what changed; what's new; what's now closed).
2. §2 — Cluster status table (post-Wave-1 / post-Wave-2-in-flight snapshot per companion `phase-4-status-2026-05-12.md` §3.1 + extension).
3. §3 — Updated roadmap candidates per cluster (NEW + CHANGED + CLOSED rows enumerated; UNCHANGED rows cite draft anchor by row name).
4. §4 — Phase 3 trigger readiness (Phase-3-tooling shipped at `a8e9a76`; operator-trigger criteria + recommended sequencing).
5. §5 — Cluster A bundle status (DRAFT-only in synthesis §2; formal build-doc not yet authored).
6. §6 — Updated parallelization clusters + Wave-N sequencing.
7. §7 — Updated open questions for operator.
8. §8 — Anti-fabrication audit + provenance.

---

## §1 — Rev-1 → Rev-2 redline summary

### §1.1 — Closed / advanced since draft (`d009e6f`)

| Row | Disposition | Anchor |
|---|---|---|
| `MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION` (Cluster F) | **ADVANCED via T8 SHIP** — daemon-side pure-fn aggregator ratified Sub-Q-T8-A=(b) + Sub-Q-T8-C=(i) aggregated-total-only; per-session attribution remains future-Phase-4-Wave-N work IF Phase 3 surfaces UX requirement. `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` Tier 3 = PARTIAL-ADVANCED; full closure on sibling-WB5 ship. | `155933f` T8 WB-final + β-amendment |
| `MB-T-PHASE-4-PLAN-TIMER-RESET-COUNTDOWN-ACCURACY` (Cluster F) | **ADVANCED via T9 SHIP** — full 8-WB ladder shipped; NEW Sub-Q disposition `(f) skeleton-with-deferred-source` adopted; `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` Tier 3 = RATIFIED-CLOSED (Sub-Q-T9-B=(i) `state.requests?.reset` confirmed); `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` PlanTimerText arm = PARTIAL-CLOSED at T9 WB7. Source-of-truth plug remains DEFERRED per Sub-Q-T9-A=(f). | `afd3778` T9 WB8 |
| ~~`MB-T-PHASE-4-METHODOLOGY-γ-HEADLESS-SCREENSHOT`~~ | **SHIPPED PRE-WAVE-1** — P1 sub-session `MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING` shipped `verify:phase-3-smoke` CLI + headless electron + screenshot capture pipeline + §C envelope amendment + closed `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` (FOLLOWUPS.md:335). T9 WB8 already consumed γ tooling (TARGET-ABSENT graceful-degradation per Phase-3-tooling scope-limited to frame-c-root sentinel). | `a8e9a76` MB-T-METHODOLOGY-PHASE-3 WB10 |

### §1.2 — Cluster reshape since draft

| Cluster | Draft framing | Rev-2 framing |
|---|---|---|
| **Cluster A — Spawn-handler field extensions** | "single bundled MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS recommended" | **OPERATOR-ACKED SINGLE-BUNDLE [KNOWN-OPERATOR-ARBITRATED]** per phase-4-synthesis §1.1 operator turn-3 ack. Scope DRAFT exists at synthesis §2 (`52f3d04`); formal build-doc `CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` **NOT YET AUTHORED** [KNOWN — file absent at HEAD `d342986`]. Wave-2 sibling `commit-plan-doc-1334` covers spawnMode arm independently; Sub-Q-C=(i) absorption logic gates whether bundled ticket implements spawnMode in-bundle or absorbs sibling ship. |
| **Cluster B — IPC-amendment-requiring** | "serialize on §6 amendment cycles; recommend single consolidated commit covering all 3 channels" | **REMAINS BLOCKED** [KNOWN] per phase-4-status §3.1 row B: "manifests at `e5c7c96` + Round-11 forbid §6.6 amendments". Cluster B → Phase-4-Wave-N-post-Round-11-territorial-relaxation pending. |
| **Cluster C — Renderer-only consumer additions** | 3 rows (lookup-session + focus-consumer + T2-header) | **PARTIAL IN-FLIGHT WAVE-2** [KNOWN]: `c5-ticket-wb1` covers focus-consumer (tile-grid-app integration trinity); `t3-ticket-body-0905` covers lookup-session (depends on c5-trinity). T2-header arm awaits Cluster A `spawnedAtMs` ship. |
| **Cluster D — Methodology infrastructure** | γ + δ + ε | γ SHIPPED PRE-WAVE-1; δ + ε pending. ε **READY FOR DISPATCH** since γ shipped (operator may dispatch now if Phase 3 entry timing depends on visual-diff automation). |
| **Cluster E — Visual polish residual** | "single follow-on or per-item depending on Phase 3 finding count" | **ACTIVELY ABSORBED WAVE-2** [KNOWN]: `t1-chatshell-polish` shipped first dogfood-target hex at `d342986` (HEAD); `verify-chat-mount-1319` + `t1-ticket-body-0905` continue residuals per `MB-F-CHATSHELL-POLISH-REMAINING`. Per-item granularity emerging at chat-shell level. |
| **Cluster F — Validation-driven** | 4 rows (cost-meter + plan-timer + BUILD.md fixture + tool-parse) | **2/4 ADVANCED** (T8 + T9 per §1.1 above). **+1 NEW Wave-2 row in-flight**: `t6-ticket-body-0905` authoring `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW` ticket body (closes 3rd arm of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` — MaxParallelCounter; BypassPermsIndicator arm only remaining). T8 + T9 architectural-pattern parity (aggregator + emission channel + mount auto-wire) inherited by T10. |

### §1.3 — NEW since draft (added to Rev-2)

| Row | Cluster | Why NEW |
|---|---|---|
| `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW` | F | Authored Wave-2 by `t6-ticket-body-0905` per T8/T9 architectural-pattern parity; closes `MB-F-MAX-PARALLEL-CONFIG-SOURCE` Tier 3 + 3rd arm of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2 |
| `MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW` (proposed) | F | 4th and final arm of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` post-T10 ship. **Coupled to Cluster A spawnMode arm**: BypassPermsIndicator consumes `TileGridSessionEntry.spawnMode` populated by Cluster A. Single-bundle absorption alternative exists if scope-creep tolerable. |
| `MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG` (CONDITIONAL on Sub-Q-T9-A) | F | Closes T9's deferred-source arm per Sub-Q-T9-A path selection (a / b / d). NEW followup `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` (proposed Tier 2 per T9 findings §VII) is the closure target. |
| `MB-T-PHASE-4-T8-SIBLING-EXEC` (operator-acked spawn) | F | Workstation src/main wiring for T8 — closes P5-shipped WB1 RED `31709e0` 2/2 conditions. Manifest scope: NEW `cost-meter-aggregator.ts` + MOD `coarchitect-ipc.ts:89` STUB removal. **OPERATOR-APPROVED** per phase-4-synthesis §1.1 row 1. |

### §1.4 — UNCHANGED since draft (cite by row name)

The following rows are unchanged in Rev-2 — refer to `phase-4-tier-1-roadmap-draft.md` (`d009e6f`) for full scope/anchor/preconditions/WB-estimate:

- `MB-T-PHASE-4-STATUS-DERIVATION-FROM-PTY` (Cluster B; §6.6-blocked)
- `MB-T-PHASE-4-FILTER-STATE-PERSISTENCE` (Cluster B; §6.6-blocked)
- `MB-T-PHASE-4-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Cluster B; §6.6-blocked)
- `MB-T-PHASE-4-METHODOLOGY-δ-DOM-PROBES` (Cluster D; pending)
- `MB-T-PHASE-4-METHODOLOGY-ε-VISUAL-DIFF` (Cluster D; γ shipped → ε dispatch-ready)
- `MB-T-PHASE-4-T7-RESIDUAL-VISUAL-GAPS` (Cluster E; partially absorbed by Wave-2)
- `MB-T-PHASE-4-BUILD-MD-REAL-FIXTURE-CYCLE` (Cluster F; Phase-3-trigger-dependent)
- `MB-T-PHASE-4-TOOL-PARSE-CC-FORMAT-DRIFT` (Cluster F; Phase-3-trigger-dependent)

---

## §2 — Cluster status table (Rev-2 snapshot)

[KNOWN] Extension of `phase-4-status-2026-05-12.md` §3.1 with Wave-2 in-flight + Wave-3 readiness deltas observed at HEAD `d342986`.

| Cluster | Pre-Wave-1 | Wave-1 ship | Wave-2 in-flight | Wave-3 readiness |
|---|---|---|---|---|
| **A — Spawn-handler field extensions** | 3 separate rows | NOT STARTED | `commit-plan-doc-1334` (spawnMode arm); synthesis §2 DRAFT (`52f3d04`) bundles model + spawnedAtMs (+ optional spawnMode absorption); formal build-doc **NOT AUTHORED** | Bundle build-doc authoring requires NEW manifest-spawned session per synthesis §4.1 |
| **B — IPC-amendment-requiring** | 3 rows | NOT STARTED | NONE (manifests forbid §6.6 amendments) | BLOCKED until operator relaxes §6.6 cycle |
| **C — Renderer-only consumer additions** | 3 rows | NOT STARTED | `c5-ticket-wb1` (focus-consumer); `t3-ticket-body-0905` (lookup-session sequential on c5-trinity) | T2-header awaits Cluster A `spawnedAtMs` |
| **D — Methodology infrastructure** | γ + δ + ε | γ SHIPPED (`a8e9a76`) | NONE | ε READY-FOR-DISPATCH (depends on γ + canonical wireframe target); δ PENDING |
| **E — Visual polish residual** | 1 row `[SPECULATIVE]` | NOT STARTED | `t1-chatshell-polish` (`d342986` WB1 paired); `verify-chat-mount-1319` + `t1-ticket-body-0905` follow-ons | Per-item granularity emerging at chat-shell level |
| **F — Validation-driven** | 4 rows | **T8 + T9 SHIP** (`155933f` + `afd3778`) | `t6-ticket-body-0905` (T10 body authoring) + operator-approved `phase4-t8-sibling-exec` pending dispatch | T10 ladder execution + T8-sibling exec ladder + Sub-Q-T9-A path-selection-conditional T9-sibling work |

---

## §3 — Updated roadmap candidates per cluster (Rev-2)

This section enumerates only **NEW + CHANGED + CLOSED** rows. UNCHANGED rows refer to draft per §1.4 above.

### §3.1 — Cluster A (Rev-2 bundle)

#### MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS (BUNDLED — formal authoring pending)

**Goal:** Extend `SpawnSessionResult` with `model?: string` + `spawnedAtMs: number` + `spawnMode?: 'auto' | 'ask'` (3 fields; spawnMode arm CONDITIONAL on Sub-Q-C absorption from sibling). Populate from spawn-handler request entry; propagate via `workstation:onSpawnResult` IPC; extend `TileGridSessionEntry` type at `tile-grid/tile-grid.tsx`; SessionList + DetailPane + BypassPermsIndicator consume as already-shipped consumers.

**Scope DRAFT** [KNOWN]: `phase-4-synthesis-2026-05-12.md` (`52f3d04`) §2 fully enumerates §2.1 scope + §2.3 5 Sub-Q gates + §2.4 7-9 WB ladder + §2.5 cross-references + §2.6 risk register + §2.7 definition of done. Operator turn-3 ack-ed all default Sub-Q resolutions (A=(i) workstation spawn-handler extension; B=(iii) workstation spawn-handler extension; C=(i) absorb sibling if landed first else implement in-bundle; D=scoped consumer suites; E=(α) include getContextWindow wiring closing `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` Tier 3).

**Formal build-doc status** [KNOWN — `ls docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` returned absent at HEAD `d342986`]: NOT YET AUTHORED. Mechanical-translation path: synthesis §4.2 maps §2.X sections of DRAFT → build-doc §N sections. **REQUIRES NEW MANIFEST-SPAWNED SESSION** with `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` in WRITE territory — current `__orchestrator_standby-p3-rev` manifest READ-ONLYs this path.

**WB count:** 7-9 (per synthesis §2.4); 7 default if Sub-Q-C=(i) absorbs sibling; 8-9 if in-bundle spawnMode implementation needed.

**§6.6 amendment:** ZERO under default Sub-Q resolutions (per synthesis §2.8). All extensions workstation-internal additive fields.

**Closes / advances:**
- `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` (T1 findings, Tier 3) — WB5 closure-path-(iii).
- `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` (T3 findings, Tier 2) — WB6 OR sibling absorption per Sub-Q-C.
- `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` (§C.5 WB4, Tier 3) — WB7 per Sub-Q-E=(α).
- P3 §1.1 rows MODEL-SOURCE-WIRING + UPTIME-SPAWN-TIME-SOURCE + SPAWN-MODE-FIELD (3 roadmap rows → 1 bundled ticket).
- Audit §7 Dim 5 rows `model` + `time` STUB → SHIPPED-VIA-WORKSTATION-EXTENSION.

**Preconditions:**
- NEW manifest-spawned session for build-doc authoring (operator dispatch).
- Path-disjoint coordination with `commit-plan-doc-1334` (shared edit territory at `spawn-handler.ts` + `tile-grid.tsx`).
- `c5-ticket-wb1` shared edit territory at `tile-grid-app.tsx` (coord at WB1).

**Anchor evidence:** `52f3d04` synthesis §2 DRAFT (full enumeration); P3 §4 Cluster A bundling recommendation; companion phase-4-status §6 Q3 operator-ack.

---

### §3.2 — Cluster F (Rev-2 additions + advancements)

#### MB-T-PHASE-4-T8-SIBLING-EXEC (operator-acked spawn pending)

**Goal:** Close P5 WB1 RED `31709e0` 2/2 conditions via workstation src/main wiring. NEW `packages/dispatch-workstation/src/main/cost-meter-aggregator.ts` (workstation-side poller importing daemon pure-fn `aggregateDailyCost`); MOD `coarchitect-ipc.ts:89` STUB → aggregator-driven handler + broadcast emitter on `coarchitect:cost-update` channel.

**Status:** OPERATOR-APPROVED per phase-4-synthesis §1.1 row 1 (turn-3 ack: "phase4-t8-sibling-exec spawn approved"). Awaits orchestrator dispatch with NEW manifest.

**Est WBs:** 4-6 (1 RED probe importing daemon pure-fn + 1 GREEN cost-meter-aggregator.ts + 1 RED STUB-removal probe + 1 GREEN coarchitect-ipc.ts:89 MOD + 1 docs + 1 runtime smoke per CLAUDE.md §4.6).

**§6.6 amendment:** ZERO. Cross-package import of daemon pure-fn is workstation-internal consumer per CLAUDE.md §3.4 (uses `dispatch-daemon/dist/cost-aggregator.js` compiled path).

**Closes:** P5-shipped WB1 RED `31709e0`; `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` Tier 3 (full closure); `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` cost-meter arm (full closure).

**Anchor evidence:** T8 findings §VIII closure-path (4 steps); phase-4-status §2 row 1; synthesis §1.1 row 1.

---

#### MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW (Wave-2 in-flight authoring)

**Goal:** Advance MaxParallelCounter from T4 Sub-Q-T4-E=(i) renderer-internal posture to authoritative-source posture. N (active count) + M (max-parallel limit) sources per Sub-Q-T10-A + Sub-Q-T10-B operator arbitration.

**Status:** IN-FLIGHT WAVE-2 — `t6-ticket-body-0905` authoring per Round 11 §3.9 Wave 2 manifest. Ticket body file `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW_BUILD.md` EXISTS at HEAD `d342986` (462 lines; full Sub-Q + WB ladder enumerated). Body landing commit per dispatch-queue COMPLETED section pending.

**Est WBs:** 8-10 baseline (8 WB default; +1-2 if Sub-Q-T10-B=(γ) workstation-pool-state requires NEW IPC channel + `WORKSTATION_CONTRACT.md` §6.6 amendment; +1 if Sub-Q-T10-D=(ii) persistence-via-fs-state escalates).

**Closes:** `MB-F-MAX-PARALLEL-CONFIG-SOURCE` Tier 3 (primary); `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` MaxParallelCounter arm (3rd of 4 arms — BypassPermsIndicator arm remains).

**Anchor evidence:** Build-doc head + grep extract verified at HEAD `d342986`; P3 §1.4 implied row; phase-4-status §3.1 row F.

---

#### MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG (CONDITIONAL — operator Sub-Q-T9-A path selection)

**Goal:** Close T9's deferred-source arm. Specifically implements `RateLimitSource` interface per Sub-Q-T9-A path selection (a / b / d).

**Three CONDITIONAL paths** [KNOWN per phase-4-status §4.2]:

| Path | Resulting work | Frozen-surface touch |
|---|---|---|
| (a) workstation Anthropic API key | NEW `rate-limit-anthropic-source.ts` + workstation key provisioning + plug into aggregator | None (operator decision; no precedent in workstation env) |
| (b) daemon-side ping + §6.6 | NEW `contract:` commit amending WORKSTATION_CONTRACT.md §6.6 with `workstation:plan-timer` channel; daemon route addition; workstation thin-client source | YES — §6.6 amendment |
| (d) accept-STUB indefinitely | File `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-NOT-FIXABLE-IN-CURRENT-ARCHITECTURE` Tier 2; reframe T9 closure status to "No improvement + structural finding" per CLAUDE.md §2.11 | None |

**Est WBs:** path-dependent. (a) 4-6 (key provisioning + impl + tests + docs); (b) 6-9 (§6.6 amendment cycle + daemon route + thin-client + tests + docs); (d) 0 (followup row only).

**Closes:** `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` (proposed Tier 2 per T9 findings §VII).

**Preconditions:** Operator Sub-Q-T9-A path selection (open Q1 in §7 below).

**Anchor evidence:** phase-4-status §2 row 2 + §4.2; T9 findings §VII.

---

#### MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW (proposed forward-position)

**Goal:** Close 4th and final arm of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (BypassPermsIndicator). Wire BypassPermsIndicator consumer to populated `spawnMode` field at `TileGridSessionEntry`.

**Status:** PROPOSED [MODELED] — surfaces post-Cluster-A bundle ship (BypassPermsIndicator data dependency is `TileGridSessionEntry.spawnMode` populated by Cluster A) OR after T10 ship (architectural-pattern parity).

**Est WBs:** 2-4 (renderer-only consumer subscription + scoped consumer probe + docs).

**§6.6 amendment:** ZERO. Renderer-only consumer of existing Cluster A field.

**Coupling decision** [SPECULATIVE]: alternative is to **absorb into Cluster A bundle** (would extend bundle from 3 fields → 4 wiring steps; +1 WB). Operator decides at Cluster A bundle build-doc authoring time.

**Closes:** `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` BypassPermsIndicator arm (full closure of T4 WB14 followup row).

**Anchor evidence:** phase-4-status §4.1 row table; T4 WB12 `26ff2c2` BypassPermsIndicator consumer; T3 `e713cbd` spawnMode prop ship-shy default; Cluster A synthesis §2.1.1 row 3.

---

### §3.3 — Cluster D-ε (dispatch-ready)

#### MB-T-PHASE-4-METHODOLOGY-ε-VISUAL-DIFF (UNCHANGED from draft; PROMOTION CHANGED)

**Promotion status:** Was "DEPENDS ON γ; serialize" in draft. Rev-2: **γ SHIPPED at `a8e9a76`** — ε is **DISPATCH-READY**. Operator may dispatch now if Phase 3 entry timing depends on visual-diff automation, OR defer to Phase-4 Wave-N post-Cluster-A.

Scope/WBs/anchor unchanged from draft §1.2 — see `phase-4-tier-1-roadmap-draft.md:217-229`.

---

## §4 — Phase 3 trigger readiness assessment

### §4.1 — γ tooling shipped [KNOWN]

`a8e9a76` `green(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): WB10 — verify:phase-3-smoke CLI + §C amendment draft + findings doc + FOLLOWUPS row 335 closure stamp` — Phase 3 visual-verification tooling operative:

- `verify:phase-3-smoke` CLI shipped
- Headless electron + screenshot capture pipeline operative
- §C envelope amended to integrate Phase-3 gates
- `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` (FOLLOWUPS.md:335) closure stamp landed

### §4.2 — Phase 3 trigger sufficiency (post-Wave-1) [MODELED]

Phase 3 visual-verification CAN now fire technically (γ tooling ready). Recommended trigger criteria per phase-4-synthesis §1.3:

1. Wave-2 in-flight sessions land their commits (`c5-ticket-wb1` trinity + `commit-plan-doc-1334` spawnMode + `t3-ticket-body-0905` lookup-session + `t1-chatshell-polish` polish + `verify-chat-mount-1319` polish + `t6-ticket-body-0905` T10 body) — estimated 1-3 days at Round-11 §3.9 cadence.
2. `phase4-t8-sibling-exec` lands (closes T8 P5 WB1 RED + workstation-visible cost-meter render).
3. Cluster A bundled ticket lands (closes model + spawnedAtMs arms; partially closes T2-header data-path arm of Cluster C downstream).
4. Operator-stamp pass applied (FOLLOWUPS + audit row deltas accumulated per phase-4-status §2).

Rationale [MODELED]: Phase-3 entry post-this-list maximizes RATIFY rate by minimizing the "honest em-dash visible to operator" surface that would dilute Phase-3 visual-verification signal.

### §4.3 — Operator override admissible

Per dispatch `/tmp/dispatch-p5.txt` STATUS FRAMING: operator may enter Phase 3 NOW (with Wave 1 + Wave 2 partial ship visible). Trade-off: Phase 3 entry RATIFIES / RESHAPES / DISCARDS Wave 1 + Wave 2 tickets per dispatch — earlier entry = earlier signal but lower-resolution surface.

### §4.4 — Phase-3-trigger evidence already collected [KNOWN]

T9 WB8 runtime smoke per CLAUDE.md §4.6 launched electron + captured screenshot `de6620e.png` (TARGET-ABSENT graceful-degradation per Phase-3-tooling scope-limited to frame-c-root sentinel; T9-specific UX validation requires operator-manual screenshot OR Phase-3 target-extension). Implication [MODELED]: Phase-3-tooling scope-extension may itself be a candidate Phase 4 row if multiple data-flow tickets surface graceful-degradation outcomes.

---

## §5 — Cluster A bundle status (DRAFT-only; formal build-doc not yet authored)

[KNOWN] State at HEAD `d342986`:

| Artifact | Path | Status |
|---|---|---|
| Scope DRAFT (full §1-§9 enumeration) | `docs/coordination/phase-4-synthesis-2026-05-12.md` §2 | EXISTS (`52f3d04`) — operator-arbitrated single-bundle per turn-3 ack |
| Formal build-doc ticket body | `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` | **ABSENT** (verified via `ls`) |
| Implementation (WB1-WB-final) | (not started) | (pending build-doc authoring) |

**Path-to-formal-authoring** per phase-4-synthesis §4.1+§4.2 mechanical-translation discipline:
1. NEW manifest-spawned session with `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` in WRITE territory.
2. Mechanical translation: synthesis §2.1 → build-doc §1; §2.2 → §2; §2.3 → §3; §2.4 → §4; §2.5 → §5; §2.6 → §8; §2.7 → §7; §2.8 → §9. Build-doc §6 (Self-check Q1-Q9 expectations) authored at formal-body time per CONDUCTOR_API_CONTRACT.md §10.5.
3. Operator review at HALT-TICKET-BODY-PRE-COMMIT (or auto-ack under expanded §C envelope per Round-9 §1.5 operator-acked envelope expansion under MAXIMUM PARALLELIZATION).
4. Spawn WB ladder execution session(s).

---

## §6 — Updated parallelization clusters + Wave-N sequencing

[MODELED] Per phase-4-status §4.1 + synthesis §1.2 + this rev:

### §6.1 — Wave 2 in-flight (concurrent with this rev authoring)

| Session | Cluster | Scope | Coord notes |
|---|---|---|---|
| `commit-plan-doc-1334` | A (spawnMode arm) | `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` (a) closure | If lands before Cluster A bundle → bundle absorbs as-is; if after → bundle implements directly |
| `c5-ticket-wb1` | C (tile-grid-app trinity) | focus-consumer + framemode-subscription + lookup-session anchor | Path-disjoint from Cluster A; shared edit territory at `tile-grid-app.tsx` (coord at WB1) |
| `t3-ticket-body-0905` | C (lookup-session) | `MB-F-FRAME-C-IPC-LOOKUP-SESSION` production wiring | Sequential dep on c5-trinity; path-disjoint from Cluster A |
| `t6-ticket-body-0905` | F (T10 body) | `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW` ticket body | Body landing pending; ladder execution after operator ack |
| `t1-chatshell-polish` | E (T7 polish) | `MB-F-CHATSHELL-POLISH-REMAINING` first dogfood-target hex | SHIPPED at HEAD `d342986` |
| `verify-chat-mount-1319` + `t1-ticket-body-0905` | E (T7 polish residuals) | continuation per `MB-F-CHATSHELL-POLISH-REMAINING` | Path-disjoint |
| `__orchestrator_standby-p3-rev` (this session) | (methodology meta) | Phase 4 roadmap rev-2 | Orthogonal |

### §6.2 — Wave 3 next (operator-direct sequencing)

| Priority | Work | Anchor | Required manifest scope |
|---|---|---|---|
| HIGH | `phase4-t8-sibling-exec` ladder execution | Operator-approved per synthesis §1.1; T8 findings §VIII | NEW `cost-meter-aggregator.ts` + MOD `coarchitect-ipc.ts:89` |
| HIGH | `MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS` build-doc formal authoring | Synthesis §2 DRAFT + operator-acked single-bundle | NEW `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` |
| MEDIUM | T10 ladder execution post body-land | t6-ticket-body-0905 ship | `chat-shell/` + (CONDITIONAL Sub-Q-T10-B=(γ)) §6.6 amendment + `max-parallel-ipc.ts` |
| MEDIUM | Operator-stamp pass | phase-4-status §2 | operator-only territory OR sherpa-authored manifest |
| LOW | Cluster D-ε visual-diff dispatch (now γ-unblocked) | Draft §1.2 row + γ ship | NEW visual-diff implementation paths |

### §6.3 — Wave N+ deferred

- Cluster B 3 IPC-amendment tickets (post-Round-11 territorial-relaxation).
- Sub-Q-T9-A path-conditional T9 source plug.
- BypassPermsIndicator data-flow (post-Cluster-A ship).
- BUILD.md real-fixture cycle + tool-parse drift (Phase-3-trigger-dependent).
- Cluster E per-item enumeration finalization (post-Phase-3 visual-diff).

---

## §7 — Updated open questions for operator (Rev-2)

`[SPECULATIVE]` Items requiring operator decision:

### Q1 — Sub-Q-T9-A path selection (CARRIED from phase-4-status §6 Q1)

Status: UNRESOLVED. Phase-4 work fires conditional on path:
- (a) workstation Anthropic API key — new T9-sibling ticket
- (b) daemon-side + §6.6 amendment — Cluster B sibling
- (d) accept-STUB indefinitely — followup-row-only closure

### Q2 — Cluster A bundle formal build-doc authoring trigger

When to dispatch the NEW manifest-spawned session for `CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` authoring? Options:
- (i) Immediately (operator dispatches now; synthesis §2 DRAFT is sufficient input)
- (ii) After Wave-2 lands (`commit-plan-doc-1334` resolved spawnMode arm absorption Q at WB1)
- (iii) After T8-sibling-exec lands (architectural-pattern reference complete)

**Recommended default** [MODELED]: (ii) — Sub-Q-C absorption decision is cleanest when sibling status is known.

### Q3 — BypassPermsIndicator scope coupling

Bundle into Cluster A bundle (+1 WB) OR separate ticket post-Cluster-A?

**Recommended default** [MODELED]: SEPARATE. Cluster A bundle is already 7-9 WBs at default; scope creep risk if absorbing. BypassPermsIndicator is a renderer-only 2-4 WB consumer ticket — small enough to ship independently.

### Q4 — Cluster D-ε dispatch timing

γ shipped → ε is dispatch-ready. Options:
- (i) Dispatch now (operator wants visual-diff automation before Phase 3 entry)
- (ii) Defer to post-Wave-3 (Cluster A + T8-sibling + T10 ladder land first)
- (iii) Defer to Phase 4 Wave-N (operator prefers manual Phase 3 visual-diff for current cascade)

### Q5 — Phase 3 entry timing (CARRIED from phase-4-status §6 Q4)

Recommended sequencing per §4.2: defer until Wave-2 in-flight lands + T8-sibling + Cluster A bundle + operator-stamp pass. Operator override admissible per dispatch STATUS FRAMING.

### Q6 — Phase-3-tooling scope extension (NEW)

T9 WB8 runtime smoke produced TARGET-ABSENT graceful-degradation (Phase-3-tooling sentinel scope-limited to frame-c-root). If multiple Phase-4 data-flow tickets produce TARGET-ABSENT outcomes, scope-extension may itself be a Phase 4 candidate row. Operator decides:
- (i) Accept TARGET-ABSENT as graceful-degradation; require operator-manual screenshot per ticket
- (ii) File new ticket: `MB-T-PHASE-4-METHODOLOGY-PHASE-3-TOOLING-SCOPE-EXTENSION` (add bottom-rail + max-parallel + tile-grid sentinels)

### Q7 — operator-stamp surface scheduling

7 FOLLOWUPS row deltas + 2 audit reclassifications enumerated in phase-4-status §2 remain accumulated. Operator decides natural-cycle timing.

---

## §8 — Anti-fabrication audit + provenance

### §8.1 — Anti-fabrication audit [KNOWN]

- Every commit SHA cited in §1 anchor table verified via `git --no-pager log --oneline <SHA> -1` at HEAD `d342986`.
- Every file path cited verified via `ls` (e.g., `CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` confirmed ABSENT — §5 row 2).
- Every cluster-status claim sourced from `phase-4-status-2026-05-12.md` + `phase-4-synthesis-2026-05-12.md` direct read.
- `[KNOWN]` / `[MODELED]` / `[SPECULATIVE]` labels per CLAUDE.md §2.2 — Wave 1 + Wave 2 closures are [KNOWN]; recommended Wave-N sequencing is [MODELED]; Phase-3-RATIFY-rate forecasts are [SPECULATIVE].

### §8.2 — Manifest territory honored [KNOWN]

- WRITE: this file (`phase-4-tier-1-roadmap-rev-2-2026-05-12.md`) + companion `phase-4-roadmap-update-notes-2026-05-12.md` (separate file authored at same time as this rev-2 per dispatch instruction).
- DRAFT FILE PRESERVED: `phase-4-tier-1-roadmap-draft.md` is unchanged in this rev. Manifest allowed WRITE on draft path but rev-2 supersedes by reference, not by overwrite — preserves `d009e6f` historical anchor.
- READ-ONLY consulted: `phase-4-status-2026-05-12.md` + `phase-4-synthesis-2026-05-12.md` + T8/T9/T10 build-doc heads + `phase-4-tier-1-roadmap-draft.md`.
- FORBIDDEN paths untouched: `packages/**` + `dispatch-queue-current.md` + `territorial-manifests/**` + `ORCHESTRATOR_STATE_CONTRACT.md` + `cairn-*.md` + `CLAUDE.md` + `CONDUCTOR_API_CONTRACT.md`. Verified clean via pre-commit `git status --short`.

### §8.3 — Provenance

**Authored by:** `__orchestrator_standby-p3-rev` sub-session per Round 11 Wave 3 dispatch.
**Authority:** dispatch-queue-current.md `__orchestrator_standby` row 29 + manifest `docs/coordination/territorial-manifests/orch-standby-p3-roadmap-rev.txt`.
**Anti-fabrication:** CLAUDE.md §2.1 enforced; every claim cite-anchored or labeled-speculative.
**Status:** Rev-2 of PROVISIONAL roadmap. Subject to RATIFY/RESHAPE/DISCARD post-Phase-3 entry per dispatch STATUS FRAMING.

**Source anchors:**
- `docs/coordination/phase-4-tier-1-roadmap-draft.md` (`d009e6f` PROVISIONAL Wave-0 — superseded by this rev-2)
- `docs/coordination/phase-4-status-2026-05-12.md` (Wave-1 closures + cluster status synthesis)
- `docs/coordination/phase-4-synthesis-2026-05-12.md` (`52f3d04` Cluster A DRAFT + Wave-N sequencing)
- `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW_BUILD.md` (T8 build-doc, post-`155933f` β-amendment)
- `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW_BUILD.md` (T9 build-doc)
- `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW_BUILD.md` (T10 body in-flight by `t6-ticket-body-0905`)
- Anchor commits: `155933f` (T8 closure) + `afd3778` (T9 closure) + `52f3d04` (Cluster A scope) + `a8e9a76` (Phase 3 trigger γ tooling) — all verified at HEAD `d342986`.

---

**End of Phase 4 Tier 1 Roadmap Rev 2 (2026-05-12).**
