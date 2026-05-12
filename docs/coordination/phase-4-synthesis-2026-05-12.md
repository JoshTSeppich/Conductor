# Phase 4 Synthesis — Wave-N sequencing + Cluster A bundled ticket-body DRAFT (2026-05-12)

**Status:** DRAFT — coordination-doc forward-positioning per `__orchestrator_active` manifest scope (Round 11 §3.9 Wave 2). NOT a formal build-doc ticket body; formal authoring at `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` requires a future manifest-spawned session with appropriate territory grant.
**Authored:** 2026-05-12 by `__orchestrator_active` per dispatch-queue IN-FLIGHT row + manifest WRITE territory (`docs/coordination/phase-4-synthesis-2026-05-12.md`).
**HEAD at authoring time:** `71b5e00` (post-`MB-F-CHATSHELL-POLISH-REMAINING` WB-final progress report).
**Companion doc:** `docs/coordination/phase-4-status-2026-05-12.md` (`1e936a0`) — Wave-1 closures + cluster status. This doc extends §4 (remaining cluster work) with Wave-N sequencing detail + drafts the next bundled ticket per operator-acked §6 defaults.

**Operator authorization** (2026-05-12 turn-3): operator-acked all §6 recommended defaults from companion doc — Sub-Q-T9-A path open; operator-stamp surface deferred to operator natural cycle; Cluster A bundling = SINGLE BUNDLED (per P3 §4 Cluster A explicit recommendation); Phase-3 entry timing deferred; `phase4-t8-sibling-exec` spawn approved. Full §C envelope; per-path commit pathspec mandatory.

Confidence labels per CLAUDE.md §2.2. `[KNOWN]` = direct-read of cited commit/doc at HEAD `71b5e00`; `[MODELED]` = reasoned from observed facts; `[SPECULATIVE per dispatch /tmp/dispatch-p5.txt STATUS FRAMING]` = forward claim awaiting Phase 3 evidence.

---

## §0 — Reading protocol

1. §1 — Wave-N sequencing detail (extension of companion doc §4): operator-acked-default ordering + recommended next dispatches.
2. §2 — Cluster A bundled ticket-body DRAFT: `MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS` (model + spawnedAtMs arms; spawnMode arm sibling-coordinated).
3. §3 — Cross-cluster sequencing observations.
4. §4 — Provenance + scope-discipline notes (why this is a coordination-doc DRAFT, not a build-doc ticket body).

---

## §1 — Wave-N sequencing detail (post-operator-ack)

### §1.1 — Immediate next dispatches (operator-acked + applicable)

`[KNOWN]` Per operator turn-3 ack of companion doc §6 recommended defaults:

| # | Dispatch unit | Manifest scope | Status | Anchor |
|---|---|---|---|---|
| 1 | **`phase4-t8-sibling-exec` Wave-2/3 spawn** — close P5 WB1 RED `31709e0` 2/2 conditions via workstation src/main wiring | NEW manifest: `packages/dispatch-workstation/src/main/cost-meter-aggregator.ts` (NEW) + `coarchitect-ipc.ts:89` MOD + cross-package import from `dispatch-daemon/src/cost-aggregator.js` | APPROVED PER OPERATOR ACK; awaits orchestrator dispatch with manifest authoring | T8 findings §VIII closure-path (4 steps) |
| 2 | **`MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS` formal authoring** — bundled ticket body covering model + spawnedAtMs (+ optional spawnMode absorption per Sub-Q-C below) | NEW manifest: `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` (build-doc) + RED probe scaffolds at `packages/dispatch-workstation/test/unit/spawn-handler/probe-mbtwfprfe-*.spec.ts` | DRAFT in §2 of this doc; formal landing requires manifest-spawned session | P3 §4 Cluster A explicit "single bundled" recommendation |
| 3 | **Operator stamp pass** — apply 7 FOLLOWUPS row deltas + 2 audit reclassifications enumerated in companion doc §2 | operator-only territory OR sherpa-authored manifest with `docs/FOLLOWUPS.md` + `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` WRITE | DEFERRED PER OPERATOR ACK (natural cycle) | companion §2 |

### §1.2 — Wave-2 in-flight cross-reference (per dispatch-queue snapshot 2026-05-12)

`[KNOWN]` Per companion doc §3.1 read-only consultation of dispatch-queue. Wave-2 sessions concurrent with this synthesis:

| Session | Cluster | Scope | Closure path for Cluster-A bundle |
|---|---|---|---|
| `commit-plan-doc-1334` | A (spawnMode arm) | `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` (a) closure: add spawnMode field + spawn-handler plumbing + FrameCRoot pass-through | If lands first → bundled ticket absorbs as already-shipped (Sub-Q-C=(i)); if lands second → bundled ticket implements spawnMode arm directly OR sibling closes independently |
| `c5-ticket-wb1` | C (tile-grid-app integration trinity) | `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP` + `FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` + `FRAME-C-IPC-LOOKUP-SESSION` | Path-disjoint from Cluster A; coordinate on `tile-grid-app.tsx` edit window only |
| `t3-ticket-body-0905` | C (lookup-session) | `MB-F-FRAME-C-IPC-LOOKUP-SESSION` production wiring | Depends on c5-trinity (sequential); path-disjoint from Cluster A |
| `t6-ticket-body-0905` | F (sibling validation-driven) | NEW `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW` ticket body draft | Forward-positioning per Phase 4; absorbs `MaxParallelCounter` arm of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (mirrors T8 + T9 data-flow pattern) |
| `t1-ticket-body-0905` + `verify-chat-mount-1319` | E (T7 visual polish residual) | `MB-F-CHATSHELL-POLISH-REMAINING` execution (T7 followon) | Path-disjoint from Cluster A; absorbs Cluster E in Wave 2 |
| `r11-archive-writer` + `r11-queue-watcher` + `r11-manifest-validator` | (methodology meta) | Round 11 archive + queue audit + manifest grammar audit | Out-of-cluster; orthogonal |

`[MODELED]` Implication: Cluster A bundled ticket (§2 below) should explicitly cross-reference `commit-plan-doc-1334` and parameterize spawnMode absorption per Sub-Q-C (recommended default: `(i) absorb if commit-plan-doc-1334 ships first; else implement spawnMode arm in-bundle`).

### §1.3 — Phase-3-entry readiness assessment

`[SPECULATIVE per dispatch /tmp/dispatch-p5.txt STATUS FRAMING]` Per operator deferral on §6 question 4 ("Phase-3-entry timing"):

Recommended sequencing — DO NOT enter Phase 3 until:
- Wave-2 in-flight sessions (above table) all land their commits (≥7 sessions; estimate 1-3 days at Round-11 §3.9 cadence).
- `phase4-t8-sibling-exec` lands (closes P5 WB1 RED `31709e0`).
- Operator-stamp pass applied (FOLLOWUPS + audit row deltas land).
- Cluster A bundled ticket lands (closes model + spawnedAtMs arms; partially closes T2-header data-path arm of Cluster C downstream).

`[MODELED]` Phase-3 entry post-this-list maximizes RATIFY rate by minimizing the "honest em-dash visible to operator" surface that would dilute Phase-3 visual-verification signal. Operator may override at any time per dispatch /tmp/dispatch-p5.txt STATUS FRAMING.

---

## §2 — Cluster A bundled ticket-body DRAFT: `MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS`

`[KNOWN-OPERATOR-ARBITRATED]` per operator turn-3 ack of companion doc §6 Q3 default = "single bundled" + per P3 §4 Cluster A explicit recommendation. DRAFT scope below; formal manifest-spawned session at `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` mechanically translates this DRAFT to build-doc form per §3.4 discipline.

### §2.1 — Scope

#### §2.1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per P3 §1.1 row aggregation:

1. **`SpawnSessionResult.model: string` field** (P3 §1.1 row `MB-T-PHASE-4-MODEL-SOURCE-WIRING`) — extend spawn-handler.ts SpawnSessionResult shape with `model?: string`; populate from spawn-request payload (operator selects model at spawn-time OR default-from-env); propagate through `workstation:onSpawnResult` IPC payload (mirrors MB-T18 cwd propagation pattern). FrameCRoot + TileGridApp consume new field; SessionList already renders the badge via `modelToLabel`/`modelToFamily` (shipped at T1 commits `1b2c7a5` + `77deec0`).

2. **`SpawnSessionResult.spawnedAtMs: number` field** (P3 §1.1 row `MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE`) — extend SpawnSessionResult with `spawnedAtMs: number = Date.now()` recorded at spawn-handler request-handler entry; propagate through TileGridSessionEntry; SessionList + DetailPane consume for true-session-uptime semantics (closes `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` Tier 3 closure-path-(iii)).

3. **`SpawnSessionResult.spawnMode?: 'auto' | 'ask'` field** (P3 §1.1 row `MB-T-PHASE-4-SPAWN-MODE-FIELD`) — extend SpawnSessionResult with spawnMode field populated from SpawnSessionRequest at spawn-handler entry; propagate through TileGridSessionEntry; FrameCRoot consumes for `BypassPermsIndicator` real-data render (T3 Sub-Q-E=(ii) `e713cbd` shipped consumer; field absent today causing `spawnMode={undefined}` fallback). **SCOPE-COORDINATED PER §2.3 SUB-Q-C** — may be absorbed pre-shipped from `commit-plan-doc-1334` Wave-2 sibling.

4. **TileGridSessionEntry consumer extension** — extend type at `tile-grid/tile-grid.tsx:29-52` with the three new fields (additive); update `isSpawnSuccessReply` + `SpawnSuccessReply` parsing at `tile-grid-app.tsx:121-141`; update `TileGridSessionEntry` construction at spawn-result handler to thread fields.

5. **`getContextWindow(model)` wiring** (CONDITIONAL per Sub-Q-E below) — close `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` Tier 3 by wiring `getContextWindow()` from `model-context-windows.ts` into TileGridApp entry construction; sets `tokenBudget = getContextWindow(entry.model ?? '')` instead of the 200_000 hardcoded default at `tile-header.tsx:139`.

6. **Audit reclassification + FOLLOWUPS closure stamps** (operator-stamp surface only; this ticket cannot directly stamp): audit §7 Dim 5 rows `model` + `time` advance from STUB → SHIPPED-VIA-WORKSTATION-EXTENSION; cross-ref `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` closure-path-(iii).

#### §2.1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify v2 daemon `SessionSchemaV2` (FROZEN per CLAUDE.md §1; daemon-side fields are sibling concern per `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2 pattern).
- Does NOT modify `SpawnSessionResult.cwd` field (MB-T18 territory; preserved verbatim).
- Does NOT modify badge rendering or status-color derivation (T1 shipped; consumer-only).
- Does NOT modify `BypassPermsIndicator` component (T4 WB12 shipped; consumer-only; receives populated spawnMode field).
- Does NOT modify `PlanTimerText` / `BottomRailCostMeter` (T4 + T8/T9 territory).
- Does NOT close `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` MaxParallelCounter arm (sibling T10 in flight via `t6-ticket-body-0905`).
- Does NOT modify frozen surfaces. ZERO `WORKSTATION_CONTRACT.md` §6.6 amendment under defaults (Sub-Q resolutions stay workstation-internal).
- Does NOT introduce electron-store; persistence not required for any of the three fields.
- Does NOT close `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (sibling Cluster B daemon-SSE territory).

### §2.2 — Arbitration anchor

`[KNOWN-OPERATOR-ARBITRATED]` per full-build-mode dispatch §3.2 mechanical-translation framing + P3 §4 Cluster A bundling recommendation + operator turn-3 ack of single-bundle default.

**Construction order** (file ownership for parallel-CC discipline):
- MOD `packages/dispatch-workstation/src/main/spawn-handler.ts` (additive `model`, `spawnedAtMs`, `spawnMode` fields on `SpawnSessionResult`; populate at request-handler entry)
- MOD `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx:29-52` (additive `TileGridSessionEntry` fields)
- MOD `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx:121-141` (additive `SpawnSuccessReply` parsing + entry construction)
- CONDITIONAL MOD `packages/dispatch-workstation/src/tile-grid/tile-header.tsx:139` (replace hardcoded `tokenBudget = 200_000` with `getContextWindow(entry.model ?? '')` — Sub-Q-E)
- NEW probes at `packages/dispatch-workstation/test/unit/spawn-handler/probe-mbtwfprfe-*.spec.ts` AND/OR `packages/dispatch-workstation/test/unit/tile-grid/probe-mbtwfprfe-*.spec.ts` (multi-target probe scope)

Path-disjoint from co-active Wave-2 sub-sessions:
- `commit-plan-doc-1334`: SHARED EDIT TERRITORY at `spawn-handler.ts` + `tile-grid.tsx` (spawnMode arm). Coordinate via `docs/coordination/cluster-a-coord-2026-05-12.md` if both concurrent; sequence if uncertain.
- `c5-ticket-wb1`: SHARED EDIT TERRITORY at `tile-grid-app.tsx` (tile-grid-app integration trinity). Coordinate edit window.
- All other Wave-2 sessions: path-disjoint.

### §2.3 — Sub-Q gate arbitrations

Five operator decisions parameterize WB scope. Surface at HALT-TICKET-BODY-PRE-COMMIT for batch resolution; defaults `[MODELED]` recommendations per P3 §1.1 + companion doc §6 operator-acked defaults.

#### Sub-Q-A: model field source

Required before WB3 (model field impl). Default: **(i) workstation spawn-handler extension** (per P3 §1.1 row `MB-T-PHASE-4-MODEL-SOURCE-WIRING` + parity with T1 Sub-Q-B=(i) default).

| Option | Mechanism | Frozen-surface touch | Risk |
|---|---|---|---|
| (i) Workstation spawn-handler extension (recommended) | Add `model?: string` to SpawnSessionResult; populate from spawn-request payload (operator-selected at spawn-time OR default-from-env). Mirrors `cwd` propagation pattern. | NONE (workstation-internal per §2.10 mechanical-translation) | LOW |
| (ii) PTY scrape | Parse model from CC startup banner via tile-token-scraper.ts-pattern observer | NONE | MEDIUM (PTY brittleness) |
| (iii) Daemon SessionSchemaV2 field | Add `model?: string` to v2 schema (FROZEN per CLAUDE.md §1) | YES — operator-arbitration required | HIGH (frozen schema cycle) |
| (iv) Defer | Keep STUB; do not render badge in this ticket | NONE | ZERO |

`[MODELED]` Recommend (i). Risk surface: model may not be known at spawn-handler entry if CC invocation defers model selection — fallback to (ii) PTY scrape if observed at WB3 GREEN.

#### Sub-Q-B: spawnedAtMs field source

Required before WB5 (uptime field impl). Default: **(iii) workstation spawn-handler extension** (per P3 §1.1 row + T1 Sub-Q-D=(iii) default precedent).

| Option | Mechanism | Frozen-surface touch | Persistence |
|---|---|---|---|
| (i) Renderer-internal mount-time | Lazy `useState(Date.now())` on row mount; resets on Frame C re-mount | NONE | LOST on re-mount |
| (ii) Daemon SessionSchemaV2 field | `spawnedAtMs?: number` on v2 schema (FROZEN) | YES | TRUE session-lifetime |
| (iii) Workstation spawn-handler extension (recommended) | `spawnedAtMs: number = Date.now()` at request-handler entry; propagate via SpawnSessionResult + TileGridSessionEntry; persisted via existing `tile-grid-state.json` | NONE | PERSISTS across renderer re-mounts |

`[MODELED]` Recommend (iii). Rationale: true-session-uptime semantics + zero-frozen-surface-touch + leverages existing persistence path (`tile-grid-state.ts` already persists TileGridSessionEntry fields).

#### Sub-Q-C: spawnMode arm coordination with `commit-plan-doc-1334`

Required at WB1 (coord decision). Default: **(i) absorb `commit-plan-doc-1334` ship if landed first; implement directly otherwise**.

| Option | Mechanism | Coordination |
|---|---|---|
| (i) Absorb if landed first (recommended) | Check at WB1 RED: if `commit-plan-doc-1334` has landed (spawnMode field shipped via SpawnSessionResult), bundled ticket consumes as-is (zero re-shipping); if not, bundled ticket implements spawnMode arm directly (covers all 3 fields per single-bundle default) | Cross-session coord note at WB1 |
| (ii) Sibling-only | Always defer to `commit-plan-doc-1334`; bundled ticket implements only model + spawnedAtMs | Sequential dep on sibling; bundled ticket blocked if sibling stalls |
| (iii) Always implement in-bundle | Bundled ticket always covers all 3 fields; potential conflict if `commit-plan-doc-1334` lands concurrently | Cross-session-contamination risk per CLAUDE.md §2.7 |

`[MODELED]` Recommend (i) for flexibility + ship-velocity. Pre-WB1 check of `commit-plan-doc-1334` status via `git log --oneline --grep=spawnMode` resolves the branch.

#### Sub-Q-D: Consumer non-regression scope (per CLAUDE.md memory `feedback_consumer_non_regression_per_wb`)

Required at every WB GREEN. Default: **scoped consumer suites (not full workstation suite)**.

| Suite | Run cadence | Coverage |
|---|---|---|
| `test/unit/spawn-handler/` | Every WB GREEN | SpawnSessionResult shape + populator |
| `test/unit/tile-grid/` | Every WB GREEN affecting TileGridSessionEntry | type extension + parsing + entry construction |
| `test/unit/chat-shell/` | WB-final only | model badge + uptime rendering (consumer-non-regression sweep) |
| `test/unit/frame-c/` | WB-final only | `BypassPermsIndicator` consumer if spawnMode arm in-bundle |
| Full workstation suite | NEVER per WB (per CLAUDE.md §9) | WB-final smoke only |

`[MODELED]` Recommend scoped-per-WB + full WB-final smoke per CLAUDE.md §4.4 + §4.6 + ladder-internal verification memory.

#### Sub-Q-E: `getContextWindow(model)` wiring (close `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP`)

Required before WB7 (token-budget wiring decision). Default: **(α) include in-bundle**.

| Option | Mechanism | Scope impact |
|---|---|---|
| (α) Include in-bundle (recommended) | WB7 wires `getContextWindow(entry.model ?? '')` at TileGridApp entry construction; replaces `tile-header.tsx:139` hardcoded 200_000 with derived value. Closes `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` Tier 3 as bonus. | +1 WB; +1 follow-up closure stamp |
| (β) Defer to dedicated follow-on | Keep `tile-header.tsx:139` hardcoded; file dedicated ticket. | ZERO WB delta; `MB-F-C5` stays OPEN |

`[MODELED]` Recommend (α). Rationale: model field is the unblocking dependency for getContextWindow wiring; bundling them together is YAGNI-compliant + closes adjacent follow-up; alternative is shipping model field then waiting for sibling to consume which adds operator-arbitration cycles.

### §2.4 — WB ladder

7-9 WBs baseline (defaults: A=(i), B=(iii), C=(i), D=scoped, E=(α)). 7 WB default path if Sub-Q-C=(i) absorbs sibling ship; 8-9 if Sub-Q-C=(i) needs in-bundle spawnMode implementation.

| WB | Verb | Surface | Acceptance | Frozen contracts |
|---|---|---|---|---|
| WB1 | red | `probe-mbtwfprfe-01-stub-state.spec.ts` (NEW; source-text sentinel that all 3 SpawnSessionResult fields exist + TileGridSessionEntry type has them) | 3-condition probe; all RED at HEAD pre-Sub-Q-C resolution | none |
| WB2 | red | `probe-mbtwfprfe-02-model-roundtrip.spec.ts` (NEW; mock spawn-handler emit → assert SpawnSessionResult.model populated) | probe RED; flips at WB3 | none |
| WB3 | green | MOD `spawn-handler.ts` adding `model?: string`; MOD `tile-grid.tsx` TileGridSessionEntry; MOD `tile-grid-app.tsx` parsing | WB2 + WB1 cond (1) GREEN | none |
| WB4 | red | `probe-mbtwfprfe-03-spawnedat-roundtrip.spec.ts` (NEW; mock spawn-handler emit → assert SpawnSessionResult.spawnedAtMs populated + monotonic) | probe RED; flips at WB5 | none |
| WB5 | green | MOD `spawn-handler.ts` adding `spawnedAtMs: number = Date.now()`; MOD `tile-grid.tsx` + `tile-grid-app.tsx` | WB4 + WB1 cond (2) GREEN | none |
| WB6 (conditional Sub-Q-C=(i)+needs-impl) | green | MOD `spawn-handler.ts` adding `spawnMode?` from SpawnSessionRequest; MOD propagation | WB1 cond (3) GREEN | none |
| WB6/WB7 (Sub-Q-E=(α)) | green | MOD `tile-grid-app.tsx` (or `tile-header.tsx:139`) wiring `tokenBudget = getContextWindow(model ?? '')` | closes `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` | none |
| WB-final | green (smoke + docs) | runtime-launch smoke per CLAUDE.md §4.6 + findings doc at `docs/coordination/mb-t-phase-4-spawn-result-field-extensions-findings-2026-05-12.md` + audit reclassification surface | WB1 + WB2 + WB4 GREEN; scoped consumer suites GREEN; runtime-render verifies model badge + uptime + bypass-perms-indicator visible post-spawn | none |

### §2.5 — Cross-references

**Followups CLOSED / ADVANCED by this ticket:**

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` (T1 findings) | 3 | WB5: `spawnedAtMs` propagation via SpawnSessionResult sibling pattern (closure-path-(iii)) | WB5 |
| `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` (T3 findings) | 2 | WB6 (CONDITIONAL Sub-Q-C=(i)+needs-impl) OR absorbed via `commit-plan-doc-1334` ship | WB6 OR sibling |
| `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` (§C.5 WB4 findings) | 3 | WB7 (CONDITIONAL Sub-Q-E=(α)): wire `getContextWindow(model)` at TileGridApp entry construction | WB7 |
| P3 §1.1 row `MB-T-PHASE-4-MODEL-SOURCE-WIRING` | (roadmap row) | bundled-ticket closure | WB3 |
| P3 §1.1 row `MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE` | (roadmap row) | bundled-ticket closure | WB5 |
| P3 §1.1 row `MB-T-PHASE-4-SPAWN-MODE-FIELD` | (roadmap row) | bundled-ticket OR sibling absorption per Sub-Q-C | WB6 OR sibling |
| Audit §7 Dim 5 rows `model` + `time` | (audit rows) | advance STUB → SHIPPED-VIA-WORKSTATION-EXTENSION | WB-final |

**Related shipped tickets (read-required at WB1 start):**

| Ticket | Anchor | Read scope |
|---|---|---|
| MB-T18 tile-footer | MB-T18 chain | `cwd?: string` propagation pattern via SpawnSessionResult (sibling pattern to all 3 fields) |
| MB-T-WIREFRAME-T1-SESSION-DATA-FLOW | `8eab991` body + findings | model badge + uptime renderer (already shipped; consumer of this ticket's data) |
| MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS | `f8fc24d` body + WB14 findings `4e8ec96` | BypassPermsIndicator consumer (T4 WB12 `26ff2c2`); ship-shy default when spawnMode undefined |
| MB-T-WIREFRAME-T3-ACTION-BAR-WIRING | T3 findings | Sub-Q-E=(ii) spawnMode shipping at `e713cbd`; consumer non-regression target |
| §C.5 PTY-scrape (`tile-token-scraper.ts`) | `13b7607` | tokenBudget consumer pattern; Sub-Q-E getContextWindow wiring depends on this |
| MB-T-WIREFRAME-T8 | `155933f` (β) | daemon-side aggregator pattern parity reference |
| MB-T-WIREFRAME-T9 | `afd3778` | skeleton-with-deferred-source pattern reference |

**Dispatch + roadmap anchors:**

- `docs/coordination/full-build-mode-dispatch.md` §3.2 mechanical-translation
- `docs/coordination/phase-4-tier-1-roadmap-draft.md` (`d009e6f`) §1.1 + §4 Cluster A bundling recommendation
- `docs/coordination/phase-4-status-2026-05-12.md` (`1e936a0`) §3.1 cluster status + §6 operator-acked defaults
- This synthesis doc §1.1 (operator turn-3 ack)

**Co-active Wave-2 coordination:**

- `commit-plan-doc-1334` — SHARED EDIT TERRITORY at `spawn-handler.ts` + `tile-grid.tsx`; coord note at WB1 mandatory.
- `c5-ticket-wb1` — SHARED EDIT TERRITORY at `tile-grid-app.tsx`; coord note at WB1.
- All other Wave-2 sessions: path-disjoint.

### §2.6 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sub-Q-A=(i) model field not known at spawn-handler entry (CC invocation defers selection) | `[MODELED-MEDIUM]` per T1 §8 risk table | `[MODELED-MEDIUM]` (model field stays undefined → badge renders empty) | WB3 documents gap; fallback to Sub-Q-A=(ii) PTY scrape; file Tier 3 if observed |
| `commit-plan-doc-1334` lands concurrent with this ticket's WB6 (Sub-Q-C=(i)) — merge conflict at `spawn-handler.ts` | `[KNOWN]` shared edit territory | `[MODELED-MEDIUM]` (conflict resolution per CLAUDE.md §2.7 per-path commits) | WB1 coord note; pre-WB6 `git log` check on `commit-plan-doc-1334` ship status |
| Sub-Q-B=(iii) `spawnedAtMs` divergence from MB-T18 TileFooter mount-time uptime (two-semantics-per-uptime) | `[MODELED-LOW]` per T1 §8 risk table | `[MODELED-LOW]` (cosmetic) | WB5 emits `data-uptime-semantic` attribute; file Tier 3 `MB-F-UPTIME-SEMANTICS-DIVERGENCE-FOOTER-VS-FRAME-C` if observed in smoke |
| Sub-Q-E=(α) `getContextWindow` wiring surfaces unknown model strings (future substrate) | `[MODELED-LOW]` (`getContextWindow` falls back to default per existing impl; new substrates rare) | `[MODELED-LOW]` (token-budget defaults to 200_000 fallback) | WB7 verifies fallback behavior; document in commit body |
| Phase-3 visual-verification post-this-ticket surfaces model-badge UX requirement not yet shipped (e.g., per-family color coding for new substrate) | `[SPECULATIVE]` per dispatch STATUS FRAMING | `[MODELED-LOW]` (T1 + T7 shipped badge UX; this ticket only populates data; visual layer separate) | Operator-acknowledged revision-cost per dispatch |
| 5-package typecheck failure if `SpawnSessionResult` propagation breaks consumers | `[MODELED-LOW]` (additive fields; existing consumers tolerate) | `[MODELED-MEDIUM]` (cross-package contract surface) | WB3/WB5 GREEN runs `pnpm --filter dispatch-workstation typecheck` post-edit; full 5-package per CLAUDE.md §4.4 at WB-final |

### §2.7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. WB1-WB-final cairn ladder lands; commit chain pushed to origin/main per CLAUDE.md §2.6.
2. `SpawnSessionResult` exposes `model?: string` + `spawnedAtMs: number` + `spawnMode?: 'auto' | 'ask'` fields (3rd CONDITIONAL on Sub-Q-C resolution).
3. `TileGridSessionEntry` extended with all 3 fields (additive); existing consumers tolerate.
4. SessionList renders model badge with real-data-driven label.
5. Uptime renders `HH:MM` true-session-duration semantics; survives Frame A↔C toggle.
6. BypassPermsIndicator visible when spawnMode='auto' (CONDITIONAL on Sub-Q-C closure).
7. `getContextWindow(model)` wired at TileGridApp entry construction (Sub-Q-E=(α)); `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` closed.
8. 5-package typecheck CLEAN per CLAUDE.md §4.4.
9. No regression in shipped probes (scoped consumer suites + WB-final full smoke).
10. WB-final runtime-launch smoke per CLAUDE.md §4.6: WINDOW_READY + spawn ≥2 sessions + verify badge + uptime + bypass-perms-indicator visible per Sub-Q-C disposition.
11. WB-final findings doc + audit reclassification surface land.
12. Operator-visible UX: post-spawn Frame C session rows show model badge populated + uptime ticking + bypass-perms indicator visible (when spawnMode='auto').

### §2.8 — §6.6 amendment outline (CONDITIONAL — DEFAULT = NO AMENDMENT)

`[KNOWN]` Default Sub-Q resolutions (A=(i), B=(iii), C=(i), D=scoped, E=(α)) produce ZERO frozen-surface touch. All extensions are workstation-internal additive fields per CLAUDE.md §2.10 mechanical-translation framing. No new IPC channels. No daemon contract additions. No `WORKSTATION_CONTRACT.md` §6.6 amendment required.

Non-default selections (A=(iii), B=(ii)) would trigger amendment cycles — recommend HALT-WB-PRE-COMMIT-OPERATOR-ARBITRATION if operator selects those paths.

---

## §3 — Cross-cluster sequencing observations

`[MODELED]` From companion doc §5 + this synthesis §1-§2:

### §3.1 — Cluster A bundling unlocks Cluster C T2-header data path

Per P3 §1.1 row `MB-T-PHASE-4-T2-HEADER-DATA-PATH`: "depends on MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE; serialize". This ticket's WB5 ship unblocks T2-header data path closure. Recommend dispatching T2-header follow-on Wave-3 after Cluster A bundle lands.

### §3.2 — Cluster D-ε ready for dispatch (γ shipped pre-Wave-1)

`[KNOWN]` Per companion §3.1 row D: γ shipped via `030c2d6` + `a8e9a76`. Per P3 §1.2: ε (visual-diff automation) depends on γ + canonical wireframe target image committed. Operator may dispatch Cluster D-ε now if Phase 3 entry timing depends on visual-diff automation (operator deferral on §6 Q4 leaves this open).

### §3.3 — Cluster B IPC-amendment cluster remains blocked

Per companion §3.1 row B: "manifests at `e5c7c96` + Round-11 forbid §6.6 amendments". Cluster B tickets (status-derivation, filter-persist, external-death-reconciliation) remain Phase-4-Wave-N-post-Round-11-territorial-relaxation pending. Operator may relax post-Wave-2 completion.

### §3.4 — Daemon-side aggregator pattern adoption (T8 + T9 parity → potential Cluster A daemon-side variant?)

`[MODELED]` T8 + T9 shipped daemon-side or workstation-aggregator-with-pluggable-source patterns. Cluster A (this ticket) does NOT follow this pattern — model + spawnedAtMs + spawnMode are workstation-internal fields, no aggregation. The pattern parity question is a future-architecture consideration if v3.6+ wireframe target requires daemon-authoritative session metadata; out-of-scope for v3.5 Phase 4.

---

## §4 — Provenance + scope-discipline notes

### §4.1 — Why this is a coordination-doc DRAFT, not a build-doc ticket body

`[KNOWN]` Per `__orchestrator_active` manifest at `docs/coordination/territorial-manifests/orch-active-phase4-status.txt`: WRITE territory = `docs/coordination/phase-4-status-2026-05-12.md` + `docs/coordination/phase-4-synthesis-2026-05-12.md` ONLY. `docs/build-docs/CONDUCTOR_*_BUILD.md` paths are OUTSIDE TERRITORY (neither WRITE-listed nor explicitly FORBIDDEN — defaults to no-write per §3.9.A enforcement).

Per CLAUDE.md §2.9 bidirectional territory fences: "A misdirected operator instruction that crosses session territory should be refused, not interpreted." Operator turn-3 instruction "author next-cluster ticket-body draft if applicable" includes the "if applicable" escape hatch — interpreted as `author DRAFT in TERRITORY scope; formal build-doc authoring requires separate manifest-spawned session`.

### §4.2 — Mechanical-translation path to formal build-doc

`[MODELED]` Future session with manifest scoping `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` may mechanically translate §2 of this doc to formal ticket body per CLAUDE.md §3.4 + §2.10 mechanical-translation discipline. Translation map:
- §2.1 Scope → ticket body §1 (DOES + DOES NOT)
- §2.2 Arbitration anchor → ticket body §2 (Arbitration anchor)
- §2.3 Sub-Q gates → ticket body §3 (Sub-Q gate arbitrations)
- §2.4 WB ladder → ticket body §4 (WB ladder)
- §2.5 Cross-references → ticket body §5 (Cross-references)
- §2.6 Risk register → ticket body §8 (Risk register)
- §2.7 Definition of done → ticket body §7 (Definition of done)
- §2.8 §6.6 amendment outline → ticket body §9 (§6.6 amendment outline)
- ticket body §6 (Self-check Q1-Q9 expectations) — author at formal-body time per CONDUCTOR_API_CONTRACT.md §10.5

### §4.3 — Operator-stamp surface accumulated post-Wave-1 (companion §2) — UNCHANGED by this synthesis

`[KNOWN]` This synthesis does NOT advance any FOLLOWUPS / audit row stamps — manifest FORBIDS those paths. Operator-stamp surface accumulated in companion doc §2 remains operative; new entries from §2.5 of this draft (when ticket-body formally lands and WB ladder ships) will accumulate to the same stamp surface in a future findings doc.

### §4.4 — Anti-fabrication discipline

`[KNOWN]` Every factual claim citation-anchored at HEAD `71b5e00` direct-read of cited commit/doc OR `[MODELED]`/`[SPECULATIVE]`-labeled with stated basis. Source-of-truth for §2 Cluster A scope: P3 PROVISIONAL roadmap (`d009e6f`) §1.1 rows MODEL-SOURCE-WIRING + UPTIME-SPAWN-TIME-SOURCE + SPAWN-MODE-FIELD + §4 Cluster A bundling recommendation. P3 already synthesized T1/T3 findings doc evidence; T1/T3 findings not in this session's READ-ONLY scope per manifest — `[KNOWN]` claims about T1/T3 ship state cite P3 row content directly, not T1/T3 findings docs themselves.

### §4.5 — Provenance

**Authored by:** `__orchestrator_active` Round 11 §3.9 Wave 2 continuation dispatch (operator-direct turn-3 ack).
**Authority:** dispatch-queue-current.md IN-FLIGHT row + manifest at `orch-active-phase4-status.txt` + operator turn-3 ack of companion doc §6 recommended defaults.
**Status:** DRAFT. Mechanical-translation path to formal build-doc requires separate manifest-spawned session per §4.1-§4.2.

**Source anchors:**
- `docs/coordination/phase-4-status-2026-05-12.md` (`1e936a0` companion doc; this synthesis extends §4 + drafts §2 ticket-body per operator turn-3)
- `docs/coordination/phase-4-tier-1-roadmap-draft.md` (`d009e6f` P3 PROVISIONAL roadmap)
- `docs/coordination/full-build-mode-dispatch.md` (operator directive 2026-05-11)
- `docs/coordination/territorial-manifests/orch-active-phase4-status.txt` (this session's manifest)
- Operator turn-3 transcript: "Operator acks all recmd defaults on Phase 4 status §6 5 open questions ... Per default-recommendations in your synthesis §6: proceed Phase 4 forward planning + author next-cluster ticket-body draft if applicable. Full §C envelope. Per-path git add + commit pathspec."

---

**End of Phase 4 Synthesis (2026-05-12) — Wave-N sequencing detail + Cluster A bundled ticket-body DRAFT.**
