# Phase 4 Tier 1 Ticket Roadmap — Rev 3 (2026-05-13)

**Status:** SUPERSEDES `phase-4-tier-1-roadmap-rev-2-2026-05-12.md` (`738b576`). Rev-3 incorporates Round 11 Wave 3 closures (`3e9a203` + `294ed23` + `6ce548f` + `ff290c2`), adds Phase 5 scoping candidates from existing FOLLOWUPS Tier 1/2 rows not absorbed by Phase 4, and prepares Phase 3 visual-verification integration point (pending — results doc not yet authored at HEAD `178b994`).

**Authored:** 2026-05-13 by `__orchestrator_standby-p3-rev` sub-session per Round 11 Wave 4 dispatch + manifest `orch-standby-p3-roadmap-rev.txt` (operator-direct extension per dispatch text; manifest TERRITORY listing not yet updated for rev-3 path — see §1 drift observation below).
**HEAD at authoring time:** `178b994` (`spike(§3.9): Round 11 Wave 4 — 3 new manifests + 5 QUEUED entries`).
**Companion:** `phase-4-roadmap-update-notes-2026-05-13.md` (compact redline TL;DR).
**PRESERVED predecessors:** `phase-4-tier-1-roadmap-draft.md` (`d009e6f` Wave-0) + `phase-4-tier-1-roadmap-rev-2-2026-05-12.md` (`738b576` Wave-3) — both retained as historical anchors.

**Anchor commits verified [KNOWN] via `git --no-pager log --oneline <SHA> -1` at HEAD `178b994`:**

| SHA | Subject | Wave-3 disposition |
|---|---|---|
| `3e9a203` | `green(MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS): WB-final — findings doc + cluster-a coord doc + (β) scope-final stamp` | Cluster A bundle SHIPPED (rev-2 §5 absence-finding CLOSED) |
| `294ed23` | `docs(MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING): WB-final — findings + coord docs (closure (a) end-to-end stamp + 4 Tier-2/3 followups proposed + 5 RECURRENCE incidents cataloged)` | spawnMode arm CLOSED via `commit-plan-doc-1334` sibling |
| `6ce548f` | `docs(MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW): WB5 — findings doc + FOLLOWUPS/audit operator-stamp surface` | T10 ladder partial (WB5 ≠ WB-final) — outcome "Capability enabled with known limitations" |
| `ff290c2` | `docs(c5-ticket-wb1): WB-final — coord doc + trinity findings doc` | Cluster C tile-grid-app integration trinity CLOSED — outcome "Capability enabled with known limitations" |

**Build-doc state at HEAD `178b994`** [KNOWN — verified via `ls`]:
- `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` — **NOW PRESENT** (rev-2 §5 ABSENCE finding closed by Wave-3 `2d938dc` cluster-a body landing).
- `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW_BUILD.md` — present (T10 ladder in flight; WB5 partial).

Confidence labels per CLAUDE.md §2.2: `[KNOWN]` direct-read at HEAD `178b994`; `[MODELED]` reasoned from observed facts + stated model; `[SPECULATIVE per dispatch STATUS FRAMING]` forward claim awaiting Phase 3 evidence.

---

## §0 — Reading protocol (Rev 3)

1. §1 — Manifest drift observation (Wave 4 territory-ack noting rev-3 path implicit-authorization).
2. §2 — Rev-2 → Rev-3 redline summary (Wave-3 closures absorbed; new Phase 5 forward-positioning section).
3. §3 — Cluster status table (Wave-3 post-snapshot; Wave-4 in-flight observed).
4. §4 — Updated roadmap candidates per cluster (CLOSED + CHANGED + UNCHANGED rows).
5. §5 — Phase 3 visual-verification readiness assessment (results pending — integration point reserved).
6. §6 — **NEW: Phase 5 scoping candidates** from FOLLOWUPS Tier 1/2 rows not absorbed by current Phase 4 scope.
7. §7 — Updated parallelization clusters + Wave-N sequencing.
8. §8 — Updated open questions for operator.
9. §9 — Anti-fabrication audit + provenance.

---

## §1 — Manifest drift observation (Wave 4 territory-ack)

[KNOWN] At HEAD `178b994`, manifest `orch-standby-p3-roadmap-rev.txt` TERRITORY listing was UNCHANGED from Wave 3:
- `phase-4-tier-1-roadmap-draft.md`
- `phase-4-tier-1-roadmap-rev-2-2026-05-12.md`
- `phase-4-roadmap-update-notes-2026-05-12.md`

Operator-direct dispatch Wave-4 text directs authoring of `phase-4-tier-1-roadmap-rev-3-2026-05-13.md` — this path is NOT explicitly in the manifest TERRITORY list. Dispatch-queue row 32 references the same manifest with Wave-4 scope.

**Interpretation per Round 7 §3.3 operator-direct authority + Round-11 natural-convention-extension** [MODELED]: rev-3 + companion update-notes-2026-05-13 implicitly authorized under same-convention extension. Two file naming conventions established in Wave 3:
- `phase-4-tier-1-roadmap-rev-N-<date>.md`
- `phase-4-roadmap-update-notes-<date>.md`

**Closure-path-α candidate** [MODELED]: manifest may be updated to list rev-3 paths explicitly (operator decision); methodology amendment candidate is "Wave-N continuation of an established sub-session task implicitly extends TERRITORY to next-rev file under same convention." Files this row as a forward-propagation observation in §6 (Phase 5 candidates) under methodology cluster.

**Status:** Surfacing the drift as part of rev-3 anti-fabrication discipline (§9.1). Operator review at rev-3 ratification.

---

## §2 — Rev-2 → Rev-3 redline summary

### §2.1 — CLOSED since rev-2

| Rev-2 row | Closure | Anchor | Notes |
|---|---|---|---|
| `MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS` (Cluster A bundle) | **WB-final SHIPPED** | `3e9a203` (WB-final) + `2d938dc` (body) + `ce1d828` + `f943d21` + `5328a97` (3 cairn WBs) | 4-commit cairn ladder + WB-final docs. Sub-Q-C=(ii) sibling-only (NOT (i) as synthesis predicted — diverged); Sub-Q-E=(β) deferred (NOT (α) as synthesis recommended — diverged). WB6 spawnMode + WB7 getContextWindow **sibling-deferred**. Closes `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` Tier 3 + 3 P3 §1.1 roadmap rows. Architecture: option-b NEW MODULE discipline + zero frozen-surface touch. |
| `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` Tier 2 | **CLOSED via sibling** | `294ed23` (`commit-plan-doc-1334` WB-final docs) | Closure (a) end-to-end stamp. Cluster A absorbed via Sub-Q-C=(ii) sibling-only choice. 5 RECURRENCE incidents cataloged in findings §VI. 4 Tier-2/3 followups proposed. |
| `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` + `MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` + `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` (Cluster C trinity) | **CLOSED WB-final** | `ff290c2` (c5-ticket-wb1 WB-final) | Trinity findings doc + 3 new modules + WorkstationBridgeShape changes. Outcome §2.11 "Capability enabled with known limitations". End-to-end picture across c5 + downstream tickets. |

### §2.2 — ADVANCED since rev-2

| Rev-2 row | Advancement | Anchor | Notes |
|---|---|---|---|
| `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW` | WB5 partial (5 commits: `5b4a744` + `8ea83a0` + `76f95c7` + `9ec2b6a` + `6ce548f`) | `6ce548f` (WB5 docs) | Outcome §2.11 "Capability enabled with known limitations". Sub-Q-T10 resolutions: all RATIFY/(i)/(α) due to manifest excluding workstation source. NOT yet WB-final — ladder continues. |

### §2.3 — Rev-2 forward-positions REVISED by Wave 3 reality

| Rev-2 §3 row | Rev-2 forward prediction | Wave-3 outcome | Rev-3 disposition |
|---|---|---|---|
| Cluster A "Sub-Q-C=(i) absorb if landed first; implement otherwise" | (i) absorb-if-landed | **(ii) sibling-only** (NOT (i)) — Cluster A bundle explicitly defers spawnMode arm to sibling regardless of landing order | Forward-position synthesis-default-suggestion-vs-shipped-decision: synthesis recommendation NOT binding. Future rev: weaken "recommended default" framing on Cluster-A-like Sub-Qs to "synthesis recommendation; operator may revise at ticket-body-authoring time." |
| Cluster A "Sub-Q-E=(α) include getContextWindow wiring closing MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP" | (α) include in-bundle | **(β) deferred** (NOT (α)) — getContextWindow wiring deferred to sibling | Same pattern: scope-narrowing diverged from synthesis default. `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` Tier 3 REMAINS OPEN per Wave-3 (β) disposition. |
| Cluster A "build-doc ABSENT" | rev-2 §5 finding | **PRESENT** at `2d938dc` | Closure stamp at rev-3 §2.1. |
| `MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG` (CONDITIONAL Sub-Q-T9-A) | Pending operator path selection | UNCHANGED — Sub-Q-T9-A path still unresolved | Remains in §4.2 Cluster F (CONDITIONAL); see open Q1. |

### §2.4 — NEW since rev-2 (Phase 5 forward-positioning)

New section §6 introduces Phase 5 scoping candidates harvested from FOLLOWUPS Tier 1/2 OPEN rows not already absorbed by Phase 4 scope. See §6 for full enumeration. Categories:
- **Vision §8.1 ship-gate** (onboarding renderer mount; project-list config; console panel shell integration)
- **HSO architecture + dispatch automation** (multi-row cluster)
- **Wireframe parity infrastructure** (visual-verification gap; methodology runtime verification)
- **Parallel-cairn methodology hardening** (index-race; working-tree-blocking; stash-cross-session; worktree migration)
- **Test infrastructure** (Electron process leak; worktree dist crash; dispatch-core post-pull rebuild)
- **Tier 2 recent rows from Wave-3-shipped tickets** (auto-attach; lifecycle UI mirroring; build-md spec; etc.)

### §2.5 — UNCHANGED from rev-2 (cite by row name)

The following rev-2 rows are unchanged in rev-3 — refer to `phase-4-tier-1-roadmap-rev-2-2026-05-12.md` (`738b576`) for full scope/anchor/preconditions/WB-estimate:

- `MB-T-PHASE-4-T8-SIBLING-EXEC` (operator-approved; Wave-3 not started; awaits orchestrator dispatch)
- `MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW` (Wave-4 in-flight via `phase4-t9-exec` per dispatch-queue Wave-4 row)
- `MB-T-PHASE-4-METHODOLOGY-ε-VISUAL-DIFF` (Wave-4 in-flight via `phase4-t8-exec` per dispatch-queue Wave-4 row)
- `MB-T-PHASE-4-STATUS-DERIVATION-FROM-PTY` (Cluster B; §6.6-blocked)
- `MB-T-PHASE-4-FILTER-STATE-PERSISTENCE` (Cluster B; §6.6-blocked)
- `MB-T-PHASE-4-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Cluster B; §6.6-blocked)
- `MB-T-PHASE-4-METHODOLOGY-δ-DOM-PROBES` (Cluster D; pending)
- `MB-T-PHASE-4-T7-RESIDUAL-VISUAL-GAPS` (Cluster E; Wave-2/3 absorption continues)
- `MB-T-PHASE-4-BUILD-MD-REAL-FIXTURE-CYCLE` (Cluster F; Phase-3-trigger-dependent)
- `MB-T-PHASE-4-TOOL-PARSE-CC-FORMAT-DRIFT` (Cluster F; Phase-3-trigger-dependent)
- `MB-T-PHASE-4-T2-HEADER-DATA-PATH` (Cluster C; now unblocked — Cluster A `spawnedAtMs` SHIPPED at `3e9a203`)

---

## §3 — Cluster status table (Rev-3 snapshot)

| Cluster | Pre-Wave-1 | Wave-1 | Wave-2 | Wave-3 | Wave-4 in-flight | Wave-4-N readiness |
|---|---|---|---|---|---|---|
| **A — Spawn-handler field extensions** | 3 separate rows | — | `commit-plan-doc-1334` spawnMode; synthesis DRAFT | **CLOSED via `3e9a203` bundle WB-final** + spawnMode sibling `294ed23` | — | DONE (getContextWindow + spawnMode in-bundle WBs sibling-deferred per (β) narrowing — see §6 candidate ROW-A1) |
| **B — IPC-amendment-requiring** | 3 rows | — | — | — | — | BLOCKED — Round-11 forbid §6.6 amendments |
| **C — Renderer-only consumer additions** | 3 rows | — | `c5-ticket-wb1` trinity (in-flight) + `t3-ticket-body-0905` lookup-session | **TRINITY CLOSED via `ff290c2`** | — | T2-header **NOW UNBLOCKED** (Cluster A `spawnedAtMs` shipped) |
| **D — Methodology infrastructure** | γ + δ + ε | — | — | γ shipped at `a8e9a76` | **ε in-flight via `phase4-t8-exec`** (Wave-4 dispatch-ready promoted) | δ pending |
| **E — Visual polish residual** | 1 row `[SPECULATIVE]` | — | `t1-chatshell-polish` (`d342986`) | (continuation) | (continuation per `verify-chat-mount-1319` + `t1-ticket-body-0905`) | Per-item granularity at chat-shell level |
| **F — Validation-driven** | 4 rows | T8 + T9 SHIP | — | T10 WB5 (partial); `commit-plan-doc-1334` spawnMode | **`phase4-t9-exec` BypassPermsIndicator ticket** (Wave-4 dispatch-ready promoted); T10 ladder continues | T10 WB-final + T8-sibling-exec + Sub-Q-T9-A path-conditional plug |
| **G — Phase 5 forward-positioning** (NEW in rev-3) | n/a | n/a | n/a | n/a | n/a | See §6 for ~15 candidates harvested from FOLLOWUPS |

---

## §4 — Updated roadmap candidates per cluster (Rev-3)

This section enumerates only NEW + CHANGED rows. UNCHANGED rows refer to rev-2 §1.4 + rev-3 §2.5 lists.

### §4.1 — Cluster A (Wave-3 SHIPPED; Cluster-A-related residuals only)

#### ROW-A1: `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` Tier 3 closure (CONDITIONAL — Sub-Q-E=(β) deferred from Cluster A bundle)

**Status:** REMAINS OPEN per Wave-3 (β) narrowing. Cluster A bundle explicitly deferred getContextWindow wiring out-of-scope.

**Closure path:** Workstation-internal renderer-only patch wiring `getContextWindow(entry.model ?? '')` at TileGridApp entry construction; replaces `tile-header.tsx:139` hardcoded `tokenBudget = 200_000` with derived value. ~1-2 WB scope.

**Cluster:** Forward-position as Phase 4 Wave-N residual OR roll into Phase 5 chat-shell polish bundle. Operator decides priority.

**Anchor evidence:** Cluster A findings §IX (3 patterns surfaced for §3.9.D archive) + Wave-3 Sub-Q-E=(β) commit body.

---

### §4.2 — Cluster C (T2-header data-path NOW UNBLOCKED)

#### MB-T-PHASE-4-T2-HEADER-DATA-PATH (PROMOTED — was DEPENDS-ON)

**Status change:** Was "DEPENDS ON Cluster A `spawnedAtMs` ship". Cluster A bundle SHIPPED at `3e9a203` (WB5 GREEN `f943d21` ships spawnedAtMs field per build-doc §4). **Dependency now satisfied** — row is dispatch-ready.

**Scope:** Replace `uptime —` + `plan —` placeholder text in `TerminalHeaderBar` with real data. `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH` Tier 2 (T2 findings) is the closure target. Thread `spawnedAtMs` from `TileGridSessionEntry` + surface plan-name from existing rate-limit-state (T4 `PlanTimerText` pattern at `4dc4f32` consumer).

**Est WBs:** 3-4 (1 RED/GREEN uptime wiring; 1 RED/GREEN plan-name wiring; 1 docs; +1 runtime smoke).

**§6.6 amendment:** ZERO. Renderer-only consumer.

**Preconditions:** ~~MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE~~ NOW SHIPPED via Cluster A bundle.

**Anchor evidence:** `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH` Tier 2 (T2 findings §III); rev-3 §2.1 Cluster A WB5 GREEN `f943d21`.

---

### §4.3 — Cluster F Wave-3 partial + Wave-4 in-flight

#### MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW (Wave-3 WB5 partial → Wave-4 continuation)

**Status:** WB5 docs landed at `6ce548f` — outcome §2.11 "Capability enabled with known limitations" per scope-narrowed Sub-Q-T10-A/B/C/D resolutions (all RATIFY/(i)/(α) due to manifest excluding workstation source per `phase4-t9-t10-exec.txt` Wave-3 manifest).

**Wave-4 next step** [MODELED]: WB-final landing or scope-expansion ticket per Sub-Q resolutions. Build-doc §3 enumerates Sub-Q-T10-B=(γ) workstation-pool-state path requiring §6.6 amendment — currently NOT in active manifest scope.

**Closes:** `MB-F-MAX-PARALLEL-CONFIG-SOURCE` Tier 3 (primary at WB5 partial) + `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` MaxParallelCounter arm (3rd of 4 — BypassPermsIndicator 4th arm in Wave-4 ticket).

**Anchor evidence:** `6ce548f` WB5 docs.

---

#### MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW (Wave-4 in-flight)

**Status change:** Was "PROPOSED" in rev-2 §3.2. Now **IN-FLIGHT** via `phase4-t9-exec` per dispatch-queue Wave-4 row + manifest `phase4-t9-bypass-perms.txt`.

**Scope:** Wire BypassPermsIndicator consumer to populated `spawnMode` field at `TileGridSessionEntry` (now shipped via Cluster A bundle `3e9a203` + sibling closure `294ed23`). Closes 4th and final arm of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2.

**Est WBs:** 2-4 baseline. Dispatch-queue does not name WB count; rev-3 inherits rev-2 estimate.

**Anchor evidence:** dispatch-queue Wave-4 row; rev-2 §3.2 proposed framing; rev-3 Cluster A spawnMode SHIPPED + Cluster A bundle field shipped enable closure.

---

#### MB-T-PHASE-4-T8-SIBLING-EXEC (operator-approved — Wave-4-ready)

**Status:** OPERATOR-APPROVED per phase-4-synthesis §1.1 (turn-3 ack). NOT in Wave-4 in-flight queue at HEAD `178b994` (the Wave-4 dispatch-queue snapshot does not list `phase4-t8-sibling-exec` as IN-FLIGHT). Pending orchestrator dispatch with NEW manifest.

**Cluster B context** [MODELED]: T8 sibling exec is Cluster F (workstation-side wiring closure), NOT Cluster B (§6.6 amendment) — workstation→daemon cross-package import via `dispatch-daemon/dist/cost-aggregator.js` per CLAUDE.md §3.4 (compiled-artifact path). ZERO §6.6 touch.

**Recommendation** [MODELED]: dispatch at Wave-5 or Wave-N+1 (post-Wave-4 BypassPermsIndicator + ε visual-diff completion). Or operator may dispatch concurrent — sibling-exec scope is path-disjoint from Wave-4 in-flight.

**Anchor evidence:** synthesis §1.1 row 1; rev-2 §3.2 unchanged; T8 findings §VIII closure path.

---

### §4.4 — Cluster D (Wave-4 ε in-flight)

#### MB-T-PHASE-4-METHODOLOGY-ε-VISUAL-DIFF (Wave-4 in-flight)

**Status change:** Was "DISPATCH-READY" in rev-2 §3.3 (γ shipped pre-Wave-1). Now **IN-FLIGHT** via `phase4-t8-exec` per dispatch-queue Wave-4 row + manifest `phase4-t8-methodology-epsilon.txt`.

**Scope per rev-2:** automated wireframe-vs-shipped image diff so visual regressions are caught in CI rather than operator screenshots. Depends on γ headless-screenshot pipeline (shipped at `a8e9a76`) AND canonical wireframe target image committed (`docs/coordination/wireframe-target-2026-05-11.png` per dispatch §0).

**Est WBs:** 5-8 per rev-2 §1.2 row.

**Anchor evidence:** dispatch-queue Wave-4 row; rev-2 §3.3 promotion; γ ship at `a8e9a76`.

---

## §5 — Phase 3 visual-verification readiness assessment (Rev-3)

### §5.1 — Phase 3 active dispatch state [KNOWN]

`__orchestrator_active` running Phase 3 visual verification execution per Wave-4 dispatch-queue row 1 + manifest `orch-active-phase3-visual-verify.txt`. TERRITORY allows:
- `docs/coordination/phase-3-visual-verification-results-2026-05-13.md` (results doc — NOT YET AUTHORED at HEAD `178b994`)
- `docs/coordination/coord-phase3-vv-2026-05-13.md` (coord doc — NOT YET AUTHORED at HEAD `178b994`)
- `packages/dispatch-workstation/dist-screenshots/**` (screenshot output dir)

**Screenshot output observed at HEAD `178b994`** [KNOWN — verified via `ls`]: `packages/dispatch-workstation/dist-screenshots/178b994.png` (single artifact; HEAD-anchored filename per γ tooling convention).

**Active orchestrator status** [MODELED]: appears to be in-progress (screenshot captured; analysis docs pending). May land before, during, or after rev-3 commit. Rev-3 reserves §5.2 below as the integration point for results.

### §5.2 — Phase 3 results integration point (RESERVED — pending results doc)

When `phase-3-visual-verification-results-2026-05-13.md` lands, rev-4 or rev-3-amendment will absorb:
- Phase 3 visual-gap finding count + severity distribution
- Promotion-gate firings for rev-2 §3 + rev-3 §4 rows (`MB-T-PHASE-4-T7-RESIDUAL-VISUAL-GAPS` per-item enumeration; per-Cluster-X visual-trigger evidence)
- RATIFY / RESHAPE / DISCARD dispositions for `[SPECULATIVE per dispatch STATUS FRAMING]`-labeled rev-2/rev-3 candidate rows
- Phase 5 candidate-promotion gates for §6 rows

Until results land, rev-3 stands at current state; all Phase 3 trigger predictions in rev-2 §4.2 remain operative.

### §5.3 — Phase 3 trigger sufficiency state [MODELED]

Per rev-2 §4.2 recommended Phase-3 trigger sequencing:
1. Wave-2 in-flight sessions land — **partial: c5-trinity DONE (`ff290c2`); polish sessions continuing**
2. `phase4-t8-sibling-exec` lands — **NOT YET LANDED**
3. Cluster A bundled ticket lands — **DONE (`3e9a203`)**
4. Operator-stamp pass applied — **NOT YET APPLIED**

**Rev-3 trigger sufficiency** [MODELED]: ~50% of recommended pre-Phase-3 work landed. Phase 3 dispatched anyway per Wave-4 operator-direct — implies operator chose signal-velocity over resolution. Phase 3 may surface TARGET-ABSENT for items not yet shipped (BypassPermsIndicator + T8-sibling-exec cost-meter + getContextWindow wiring + T2-header data-path) — TARGET-ABSENT graceful-degradation per γ tooling scope.

---

## §6 — Phase 5 scoping candidates (NEW — from FOLLOWUPS Tier 1/2 OPEN rows)

[MODELED] Harvested 2026-05-13 from `docs/FOLLOWUPS.md` direct-read survey at HEAD `178b994`. Filtered to OPEN Tier 1 + 2 rows NOT absorbed by Phase 4 rev-2/rev-3 scope. Grouped by candidate Phase 5 cluster.

### §6.1 — Vision §8.1 ship-gate cluster

| Followup row | Tier | Scope | Notes for Phase 5 |
|---|---|---|---|
| `MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT` | 1 | Build esbuild script (`build-onboarding.mjs` mirroring `build-coarchitect.mjs`); add `onboarding.html` + `mount.tsx`; bundle into production renderer; mount conditionally on first launch | Vision §8.1 ship-gate blocker. Operator-visible UX. Recommended priority: HIGH in Phase 5 |
| `MB-F-MB-T08-VISION-PROJECT-LIST-CONFIG` | 1 | Operator decision: (a) accept gap as v3.0.x followup OR (b) extend onboarding with project-picker step | OPERATOR-ARBITRATION required before any Phase 5 ticket scopes this row |
| `MB-F-CONSOLE-T03-SHELL-INTEGRATION` | 1 | Wire `dist/console-panel/` renderer into `workstation-shell.html`; UX placement decision: (a) third splitter region / (b) tab replacement / (c) separate BrowserWindow | v3.0 §10.10 ship-gate blocker. Recommended priority: HIGH in Phase 5 |
| `MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX` (line 173) | 1 | Empty-state placeholder ("No active sessions — click + Spawn Session to start") | Operator-perceived-broken-UI risk. Recommend Phase 5 bundle with onboarding shipping |

### §6.2 — HSO architecture + dispatch automation cluster

[KNOWN — Tier 1 OPEN] These rows form a logically-coupled cluster around HSO orchestrator-substrate productionization:

| Followup row | Tier | Phase 5 scope hint |
|---|---|---|
| `MB-F-HSO-01-TURN-DISPATCH-SYNCHRONOUS` | 1 | Turn-dispatch synchronization architecture |
| `MB-F-HSO-01-WEEKLY-RATE-LIMIT-DOGFOOD` | 1 | Rate-limit window dogfood validation |
| `MB-F-HSO-02-FULL-SCOPE-DOGFOOD` | 1 | Full-scope HSO dogfood criterion |
| `MB-F-HSO-02-PROTOCOL-DRIFT-TEMPLATE-ENFORCEMENT` | 1 | Protocol-drift template enforcement |
| `MB-F-HSO-CLARIFICATION-FIRST-VS-Q-V35-7A-THRESHOLD-DEFINITION` | 1 | Clarification-first vs §7A threshold definition |
| `MB-F-MB-T41-DIRECTIVE-FORM-VS-NATURAL-LANGUAGE-OPERATOR-INPUT` | 1 | Directive-form vs natural-language operator input handling |
| `MB-F-ORCHESTRATOR-AUTO-RESTART-PARTIAL-AUTOMATION` | 1 | Orchestrator auto-restart partial automation |
| `MB-F-SUB-SESSION-CONTEXT-PRESSURE-HANDOFF-CONTRACT` | 1 | Sub-session context-pressure handoff contract (e.g., gen-N → gen-N+1 token-threshold handoff per Round 9 §0) |
| `MB-F-SUB-SESSION-AUTO-RESTART-FULL-AUTOMATION` | 1 | Sub-session auto-restart full automation |
| `MB-F-ORCHESTRATOR-AUTO-ATTACH-ON-SPAWN` | 1 | Orchestrator auto-attach on spawn |
| `MB-F-WORKSTATION-SESSION-LIFECYCLE-UI-MIRRORING` | 1 | Workstation session-lifecycle UI mirroring |
| `MB-F-ORCHESTRATOR-UNEXPECTED-EXIT-DETECTION` | 1 | Unexpected-exit detection |
| `MB-F-COORD-ARCHITECTURE-ROLE-DECOMPOSITION` | 1 | Coord-architecture role decomposition |
| `MB-F-ORCHESTRATOR-SCOPE-EXPANSION-2026-05-11` | 1 | Orchestrator scope expansion |
| `MB-F-SUBSESSION-90PCT-IDLE-STANDBY-CASE` | 1 | Sub-session 90% idle standby case (standby HSO peers — relevant to current `__orchestrator_standby` role) |

**Phase 5 cluster proposal** [MODELED]: bundle into "HSO Production Hardening" Phase 5 super-cluster (`MB-T-PHASE-5-HSO-*`). Recommend operator-arbitration on bundle granularity (single super-ticket vs decomposed multi-ticket cluster).

### §6.3 — Wireframe parity + methodology infrastructure cluster

[KNOWN — Tier 1 OPEN] Methodology-evidence-translates-to-architectural-requirement pattern from Round 7 §3.4 / cairn-formalization-v0.1-DRAFT.md §3.7:

| Followup row | Tier | Phase 5 scope hint |
|---|---|---|
| `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` | 1 | Operator-screenshot-based gap detection; γ tooling consumer pattern |
| `MB-F-RUNTIME-BUILD-STALENESS-INVISIBLE-PROGRESS` | 1 | Build-staleness detection (overlaps with α verify:build-freshness already shipped); residual scope TBD |
| `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` | 1 | Multi-arm parent followup (α/β/γ shipped; δ DOM-probes in Cluster D; ε visual-diff in Wave-4 in-flight); residual closure-path stamps |
| `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` | 1 | Wireframe-parity scope underestimation — methodology lesson row |

**Phase 5 cluster proposal** [MODELED]: residual closure-stamp pass — most arms already shipped (α/β/γ + Wave-4 ε in-flight). Maintenance/stamp pass + δ DOM-probes scope.

### §6.4 — Parallel-cairn methodology hardening cluster

[KNOWN — Tier 1 OPEN] These rows form the dispatch-tooling-roadmap input per Round 7 §7.4 + cairn-formalization-v0.1-DRAFT.md §3.2:

| Followup row | Tier | Phase 5 scope hint |
|---|---|---|
| `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` | 1 | Atomic add→diff-verify→commit chain primitive (closure path enumerated in row body) |
| `MB-F-PARALLEL-CAIRN-WORKING-TREE-BLOCKING` | 1 | Working-tree-blocking class (structural fix: per-session worktrees per CLAUDE.md §4.3) |
| `MB-F-PARALLEL-CAIRN-SHARED-TREE-CONTENT-SWEEP` | 1 | Shared-tree content-sweep class |
| `MB-F-PARALLEL-CAIRN-STASH-CROSS-SESSION-RECOVERY` | 1 | Cross-session stash recovery |
| `MB-F-PARALLEL-CAIRN-CROSS-SESSION-STASH-DESTRUCTIVE` | 1 | Destructive cross-session stash class |
| `MB-F-PARALLEL-CAIRN-WORKTREE-DUAL-AUTHORSHIP-OVERLAP` | 1 | Worktree dual-authorship overlap |
| `MB-F-T26-METHO-1-T21-T26-CROSS-SESSION-SWEEP` | 2 | Specific instance of `INDEX-RACE-ATOMIC-COMMIT` |
| `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` | 1 | Round 9 §1.1 recurrence row |
| `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` | 1 | T6 sibling-filing-angle of same incident |
| `MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW` | 1 | Round 9 §1.3 EVICTION class row |

**Phase 5 cluster proposal** [MODELED]: cairn-tooling MVP scope per cairn-formalization §8.4. Operator may consolidate into single super-ticket "MB-T-PHASE-5-CAIRN-TOOLING-MVP" with verify-pathspec-commit + pre-commit hook + per-session-worktree-migration as bundled WBs.

### §6.5 — Test infrastructure cluster

| Followup row | Tier | Phase 5 scope hint |
|---|---|---|
| `MB-F-INTEGRATION-TEST-ELECTRON-PROCESS-LEAK` | 1 | afterEach/afterAll cleanup that explicitly kills spawned Electron processes |
| `MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH` | 1 | pnpm pre-test hook that runs dispatch-core build if dist/ absent or older than src/ |
| `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE` | 1 | postinstall hook running `pnpm -r build` for dispatch-core OR merge-gate addition OR operator-discipline note |
| `MB-F-PRE-WB6-COST-ESTIMATE-VS-SCHEMA-MAXIMA-DIVERGENCE` | 1 | Rescope authoring SOP: back-calculate from schema field caps + arithmetic not from typical-content modeling |
| `MB-F-PARALLEL-CAIRN-SCHEMA-FILE-MERGE-CONFLICT` | 1 | Parallel-cairn coordination prompt template addition: "Second-merging schema-file branch must rebase onto post-first-merge main BEFORE attempting its own merge" |
| `MB-F-CC-STREAM-IDLE-TIMEOUT-MID-COMMIT` | 1 | Recovery prompt template: default to verify-existing rather than regenerate when a recovered uncommitted artifact exists |

**Phase 5 cluster proposal** [MODELED]: bundle into "Phase 5 Build-System Hardening" — discrete actionable items; operator may pick subset.

### §6.6 — Build-md + dispatch dispatch-architecture cluster

| Followup row | Tier | Phase 5 scope hint |
|---|---|---|
| `MB-F-BUILD-MD-SPEC-NOT-IN-REPO` | 1 | BUILD.md spec authoring (closes spec-not-in-repo gap) |
| `MB-F-§3.18-OPERATOR-ARTIFACT-ERROR-HALT-AND-SURFACE` | 1 | Operator artifact-error halt-and-surface primitive codification |

### §6.7 — Tier 2 OPEN rows from Wave-3-shipped territory

[KNOWN — Tier 2 OPEN] Surfaced by Wave-1/Wave-2/Wave-3 ticket closures; collected for Phase 5 stamping/closure:

| Followup row | Tier | Source |
|---|---|---|
| `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` | 2 | WORKSTATION_CONTRACT §6 drift audit |
| `MB-F-DOGFOOD-POOL-STANDBY-RESPAWN-LOOP-UNDER-SESSIONCAP` | 2 | Pool-standby-respawn loop under session cap |
| `MB-F-DISPATCH-WORKSTATION-DIST-REBUILD-DISCIPLINE` | 2 | Dist-rebuild discipline (cousin of Tier 1 dispatch-core post-pull) |
| `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` | 2 | T9-advanced row; source plug arm remains (Sub-Q-T9-A path-conditional) |
| `MB-F-METHODOLOGY-β-MINIFY-COUPLING` | 2 | β bundle-fingerprint minify-coupling |
| `MB-F-T2-TOOL-PARSE-REGEX-BRITTLE-CC-FORMAT-DRIFT` | 2 | T2 tool-parse drift (in Cluster F rev-2) |
| `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH` | 2 | T2-header (now unblocked per §4.2) |
| `MB-F-T5-COMPLETED-TASK-IDS-PRODUCTION-WIRING` | 2 | T5 completed-task-ids production wiring |
| `MB-F-T5-FIRESPAWN-ORCHESTRATOR-FIRE-SPAWN-WIRING` | 2 | T5 fireSpawn orchestrator wiring |
| `MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING` | 2 | T5 build-md status-line mount wiring |
| `MB-F-T5-WIREFRAME-AUTO-DISPATCH-AMBIGUITY` | 2 | T5 wireframe auto-dispatch ambiguity |
| `MB-F-ORCH-DISPATCH-ENVELOPE-CREEP-POST-ALL-RECMD-2026-05-12` | 2 | Orch-dispatch envelope creep post-all-recmd |
| `MB-F-T7-VISUAL-DIFF-AUTOMATION-DEFERRED-TO-T6-GAMMA-CLOSURE` | 2 | T7 visual-diff automation deferred (closed by Wave-4 ε ship) |

### §6.8 — Phase 5 candidate count + cluster summary

| Phase 5 cluster | Tier 1 rows | Tier 2 rows | Phase 5 cluster name (proposed) |
|---|---|---|---|
| §6.1 Vision §8.1 ship-gate | 4 | — | `MB-T-PHASE-5-VISION-SHIP-GATE` |
| §6.2 HSO architecture | 15 | — | `MB-T-PHASE-5-HSO-PRODUCTION` |
| §6.3 Wireframe + methodology | 4 | — | `MB-T-PHASE-5-METHODOLOGY-RESIDUAL-STAMPS` |
| §6.4 Parallel-cairn methodology | 10 | — | `MB-T-PHASE-5-CAIRN-TOOLING-MVP` |
| §6.5 Test infrastructure | 6 | — | `MB-T-PHASE-5-BUILD-SYSTEM-HARDENING` |
| §6.6 Build-md + dispatch | 2 | — | (folds into §6.2 HSO production OR §6.4 cairn tooling) |
| §6.7 Tier 2 stamping | — | 13 | per-ticket-residual stamps (no Phase 5 super-cluster) |

**Total Phase 5 candidates surfaced:** ~41 Tier 1 + ~13 Tier 2 OPEN rows mapped to ~5 super-clusters. Operator scopes Phase 5 envelope (super-clusters / decomposed / mix) at Phase 5 entry.

---

## §7 — Updated parallelization clusters + Wave-N sequencing (Rev-3)

### §7.1 — Wave 4 in-flight (concurrent with this rev authoring)

| Session | Cluster | Scope | Status |
|---|---|---|---|
| `__orchestrator_active` | (methodology meta) | Phase 3 visual verification execution | Screenshot `178b994.png` captured; analysis docs pending |
| `phase4-t9-exec` | F | `MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW` ticket body + WB1+ ladder | Per dispatch-queue Wave-4 row 2 |
| `phase4-t8-exec` | D | `MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF` (Cluster D-ε) ticket body + WB1+ ladder | Per dispatch-queue Wave-4 row 3 |
| `r11-archive-writer` | (methodology meta) | §5 round-close synthesis FINAL draft | Round 11 archive close-out preparation |
| `__orchestrator_standby-p3-rev` (this session) | (methodology meta) | Phase 4 roadmap rev-3 (this doc) | IN PROGRESS |

### §7.2 — Wave 5 next (recommended sequencing)

[MODELED]:

| Priority | Work | Required manifest scope |
|---|---|---|
| HIGH | `phase4-t8-sibling-exec` ladder execution (T8 workstation src/main wiring) | NEW `cost-meter-aggregator.ts` + MOD `coarchitect-ipc.ts:89` |
| HIGH | T2-header data-path ticket (now unblocked) | renderer-only consumer of Cluster A `spawnedAtMs` |
| HIGH | T10 ladder WB-final (Wave-3 partial at `6ce548f` WB5) | per current manifest scope OR scope-expansion §6.6 amendment |
| MEDIUM | `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` residual closure (rev-3 §4.1 ROW-A1) | renderer-only patch tile-header.tsx |
| MEDIUM | Operator-stamp pass for Wave-3 closures (proposed Tier 2/3 followups from `294ed23`) | operator-only territory OR sherpa-authored manifest with FOLLOWUPS WRITE |
| MEDIUM | Phase 5 scoping decision (operator) | scope envelope + super-cluster granularity |

### §7.3 — Wave N+ deferred

- Cluster B 3 IPC-amendment tickets (post-Round-11 territorial-relaxation)
- Sub-Q-T9-A path-conditional T9 source plug
- BUILD.md real-fixture cycle + tool-parse drift (Phase-3-trigger-dependent)
- Cluster D-δ DOM probes (ε first; δ second)
- Phase 5 super-clusters per §6 (operator-scoped)

---

## §8 — Updated open questions for operator (Rev-3)

`[SPECULATIVE]` Items requiring operator decision:

### Q1 — Sub-Q-T9-A path selection (CARRIED from rev-2 Q1)

UNCHANGED — Sub-Q-T9-A path still unresolved at Wave-4 entry. T9 source plug work fires conditional on path: (a) workstation Anthropic API key / (b) daemon-side + §6.6 amendment / (d) accept-STUB indefinitely.

### Q2 — Cluster A "synthesis-recommendation-binding" question (NEW per Wave-3 reality)

Cluster A Wave-3 reality diverged from synthesis defaults (Sub-Q-C=(ii) NOT (i); Sub-Q-E=(β) NOT (α)). Question: should rev-N+ roadmap weaken "recommended default" framing on Sub-Q rows to "synthesis recommendation; operator may revise at ticket-body-authoring time"? OR: should synthesis-default Q resolution be operator-bound at synthesis-authoring time (HALT-SYNTHESIS-RESOLUTION-PRE-COMMIT)? Methodology question; operator decides framing.

### Q3 — BypassPermsIndicator scope coupling (CLOSED in rev-3)

Was rev-2 Q3. Resolved by Wave-4 in-flight `phase4-t9-exec` separate-ticket dispatch — bundle-into-Cluster-A option NOT taken (consistent with rev-2 recommended default SEPARATE).

### Q4 — Cluster D-ε dispatch timing (CLOSED in rev-3)

Was rev-2 Q4. Resolved by Wave-4 in-flight `phase4-t8-exec` dispatch — ε now in-flight (rev-2 recommended default was (ii) Defer-to-post-Wave-3 — operator chose (i) Dispatch-now-pre-Phase-3-entry).

### Q5 — Phase 3 entry timing (operator-chose-signal-velocity)

Was rev-2 Q5 (DEFER). Resolved by Wave-4 operator-direct Phase 3 dispatch — operator chose signal-velocity over resolution per rev-3 §5.3. ~50% of recommended pre-Phase-3 work landed; Phase 3 may surface TARGET-ABSENT for items not yet shipped.

### Q6 — Phase-3-tooling scope extension (CARRIED from rev-2 Q6)

UNCHANGED. T9 WB8 TARGET-ABSENT graceful-degradation pattern; multi-data-flow-ticket pattern. May surface again in Phase 3 results doc.

### Q7 — operator-stamp surface scheduling (CARRIED from rev-2 Q7)

UNCHANGED. 7 FOLLOWUPS row deltas + 2 audit reclassifications from phase-4-status §2 still accumulated. PLUS Wave-3 proposed Tier 2/3 followups from `294ed23` findings §VII (4 new rows).

### Q8 — Phase 5 envelope scoping (NEW per rev-3 §6)

~41 Tier 1 + ~13 Tier 2 OPEN FOLLOWUPS rows surfaced as Phase 5 candidates across 5 super-clusters. Question:
- (i) Single Phase 5 envelope absorbing all 5 clusters as sequential super-tickets
- (ii) Phase 5 decomposed into 5 parallel waves (one super-cluster per wave)
- (iii) Phase 5 scoped to ship-gate-blocking subset only (§6.1 vision + §6.5 build-system + §6.4 cairn-tooling); §6.2 HSO + §6.3 wireframe deferred to v3.6+ envelope

**Recommended default** [MODELED]: (iii) — ship-gate first; HSO + wireframe-residual to v3.6 envelope. Reduces Phase 5 envelope to ~14-20 Tier 1 rows.

### Q9 — Manifest TERRITORY listing update for rev-N (CARRIED methodology observation per §1)

`orch-standby-p3-roadmap-rev.txt` TERRITORY listing did not update for Wave-4 rev-3 path. Methodology candidate: codify "Wave-N continuation of established sub-session task implicitly extends TERRITORY to next-rev file under same convention" OR require manifest update per rev cycle.

---

## §9 — Anti-fabrication audit + provenance

### §9.1 — Anti-fabrication audit [KNOWN]

- All 4 anchor SHAs (`3e9a203` + `294ed23` + `6ce548f` + `ff290c2`) verified via `git --no-pager log --oneline <SHA> -1` at HEAD `178b994`.
- Cluster A build-doc file existence verified via `ls docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` (NOW PRESENT — rev-2 §5 absence-finding closed).
- T10 build-doc file existence verified (present).
- Phase 3 results files verified ABSENT via `ls docs/coordination/phase-3-visual-verification-results-2026-05-13.md` (no-such-file-or-directory).
- Screenshot artifact existence verified via `ls packages/dispatch-workstation/dist-screenshots/` (`178b994.png` present).
- FOLLOWUPS row survey performed at HEAD `178b994` via `grep -nE "^\| .MB-F-" docs/FOLLOWUPS.md | grep -E "Tier [12]"` filtered with CLOSED/RESOLVED exclusion. Cluster proposals MODELED; specific row contents quoted [KNOWN] from row body inspection.
- Manifest drift observation (§1) verified via direct `cat` of `orch-standby-p3-roadmap-rev.txt` — TERRITORY list quoted verbatim.

### §9.2 — Manifest territory honored [KNOWN]

- **WRITE:** this file (`phase-4-tier-1-roadmap-rev-3-2026-05-13.md`) + companion `phase-4-roadmap-update-notes-2026-05-13.md` (per operator-direct dispatch implicit-authorization per §1 above).
- **PRESERVED PREDECESSORS:** `phase-4-tier-1-roadmap-draft.md` (`d009e6f`) + `phase-4-tier-1-roadmap-rev-2-2026-05-12.md` (`738b576`) — both retained as historical anchors; rev-3 supersedes by reference.
- **READ-ONLY consulted:** `phase-4-status-2026-05-12.md` + `phase-4-synthesis-2026-05-12.md` + T8/T9/T10 build-docs + Cluster A build-doc (`CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md`) + `phase-4-tier-1-roadmap-rev-2-2026-05-12.md` + `docs/FOLLOWUPS.md` (for §6 Phase 5 candidate harvest) + manifest .txt files for territory awareness.
- **FORBIDDEN paths untouched** (verified clean pre-commit + post-commit):
  - `packages/**` (sibling `dist-screenshots/178b994.png` belongs to `__orchestrator_active` TERRITORY)
  - `docs/coordination/dispatch-queue-current.md` (read-consulted only)
  - `docs/coordination/territorial-manifests/**` (read-consulted only)
  - `docs/coordination/ORCHESTRATOR_STATE_CONTRACT.md`
  - `docs/cairn-*.md`
  - `CLAUDE.md`
  - `docs/build-docs/CONDUCTOR_API_CONTRACT.md`

### §9.3 — Provenance

**Authored by:** `__orchestrator_standby-p3-rev` sub-session per Round 11 Wave 4 dispatch.
**Authority:** dispatch-queue-current.md `__orchestrator_standby` Wave-4 row 32 + manifest `orch-standby-p3-roadmap-rev.txt` (implicit TERRITORY extension per §1 drift observation) + operator-direct dispatch text.
**Anti-fabrication:** CLAUDE.md §2.1 enforced; every claim cite-anchored or labeled-speculative.
**Status:** Rev-3 of PROVISIONAL roadmap. Subject to RATIFY/RESHAPE/DISCARD post-Phase-3 results landing (results doc pending at HEAD `178b994`).

**Source anchors:**
- `phase-4-tier-1-roadmap-rev-2-2026-05-12.md` (`738b576` Wave-3 — superseded by this rev-3)
- `phase-4-tier-1-roadmap-draft.md` (`d009e6f` Wave-0 — PRESERVED historical anchor)
- `phase-4-status-2026-05-12.md` (Wave-1 closures + cluster status synthesis)
- `phase-4-synthesis-2026-05-12.md` (`52f3d04` Cluster A DRAFT + Wave-N sequencing)
- Wave-3 anchor commits: `3e9a203` (Cluster A bundle WB-final) + `294ed23` (spawnMode sibling) + `6ce548f` (T10 WB5) + `ff290c2` (c5-trinity WB-final) — all verified at HEAD `178b994`.
- Phase 3 trigger γ tooling commit `a8e9a76`.
- FOLLOWUPS row survey at HEAD `178b994`.

---

**End of Phase 4 Tier 1 Roadmap Rev 3 (2026-05-13).**
