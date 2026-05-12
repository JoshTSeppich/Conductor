# Phase 4 Status — 2026-05-12 (T8 + T9 Wave 1 closures + forward planning)

**Status:** SPECULATIVE-RATIFIED — Wave 1 of SPECULATIVE Phase-4 forward-positioning (per /tmp/dispatch-p5.txt 2026-05-12 + Round 11 §3.9 continuation) has SHIPPED two of the fifteen P3 PROVISIONAL Phase-4 dispatch units (T8 + T9 cluster F). Phase 3 visual-verification still not yet triggered; operator-acknowledged revision-cost remains operative for every row in §3 + §4 below.

**Authored:** 2026-05-12 by `__orchestrator_active` (Round 11 §3.9 Wave 2 continuation dispatch; territorial-partition manifest `docs/coordination/territorial-manifests/orch-active-phase4-status.txt`).
**HEAD at authoring time:** `8d35c93` (queue-watcher Wave-2 spike).
**Authoring envelope:** §3.4 mechanical translation; manifest WRITE = `phase-4-status-2026-05-12.md` + `phase-4-synthesis-2026-05-12.md`; READ-ONLY = T8/T9 ticket bodies + T8/T9 findings + P3 roadmap; FORBIDDEN = FOLLOWUPS.md + orchestrator-state + dispatch-queue + territorial-manifests/** + cairn-*.md + CLAUDE.md + packages/** + CONDUCTOR_API_CONTRACT.md.

Confidence labels per CLAUDE.md §2.2 apply. `[KNOWN]` = direct-read of cited commit/doc at HEAD `8d35c93`; `[MODELED]` = reasoned from observed facts; `[SPECULATIVE]` = forward claim awaiting Phase 3 evidence.

---

## §0 — Reading protocol

1. §1 — Wave 1 closures (T8 + T9): what shipped, under which Sub-Q resolutions, what's deferred.
2. §2 — Open sibling-session arms post-Wave-1 (the *runtime-visible* gap between architectural ship and operator-visible UX).
3. §3 — Phase 4 forward planning: P3 roadmap cluster-by-cluster status update with promotion-gate evidence from Wave 1.
4. §4 — Remaining cluster work + recommended Wave-N sequencing.
5. §5 — Cross-cluster Sub-Q observations + adopted patterns.
6. §6 — Risks + open questions for Phase 3 entry.
7. §7 — Provenance + signing.

---

## §1 — Wave 1 closures (T8 cost-meter + T9 plan-timer)

### §1.1 — Summary table

| Ticket | Final commit | WB count | Outcome (per CLAUDE.md §2.11) | Source-of-truth gap |
|---|---|---|---|---|
| MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW | `155933f` (WB-final, β-amendment) | 4 cairn + 1 docs (WB5 SKIPPED) | **Capability enabled with known limitations** — daemon pure-fn aggregator ready; workstation src/main wiring deferred to sibling session | YES — workstation `coarchitect-ipc.ts:89` STUB unchanged |
| MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW | `afd3778` (WB8 runtime smoke + findings) | 8 cairn (full default ladder) | **Capability enabled with known limitations** — full architectural seam shipped; null-source default per ADR-MBTWFT9-A | YES — `createNullRateLimitSource` default emits nothing; real source plug deferred |

`[KNOWN]` Both tickets ratified the "skeleton-with-deferred-source" + "daemon-side-aggregator" architectural patterns; both consumed/respected frozen `CostInfoSchema` (T8) and `RateLimitState` (T9) shapes without modification. Neither ticket required `WORKSTATION_CONTRACT.md` §6 amendment.

### §1.2 — T8 cost-meter (β-reshape detail)

`[KNOWN-OPERATOR-ARBITRATED]` per `docs/coordination/mb-t-wireframe-t8-decisions-2026-05-12.md` §1: operator selected candidate-(β) reshape at turn-2 after `phase4-t8-exec` surfaced HALT-TERRITORY-MISMATCH between original ticket body §2.4 paths (which included workstation `src/main/*.ts`) and the t8 manifest scope (which excluded `src/main/`).

**Under (β), T8 ship scope:**
1. WB2 RED — daemon pure-fn aggregator probe (`packages/dispatch-daemon/test/unit/cost-aggregator.test.ts`; 4 conditions) — `1ca2e15`.
2. WB3 GREEN — daemon `aggregateDailyCost(sessions): number` pure-fn module (`packages/dispatch-daemon/src/cost-aggregator.ts`) — `39c514b` flips WB2 4/4 GREEN.
3. WB4 RED-inverted — cross-package consumer-integration probe in workstation (`test/unit/chat-shell/probe-mbtwft8-02-aggregator-driven-render.spec.tsx`; 3 conditions) — `1238193`. Cairn `red:` verb preserved per CLAUDE.md §2.3 (regression-shield semantic); honest inversion captured in commit body.
4. WB-final docs — decisions doc + findings doc + coord doc + ticket-body §1.5 (β)-reshape amendment — `155933f`.

**WB5 SKIPPED** under (β): workstation src/main wiring is sibling-session deliverable. P5-shipped WB1 RED probe (`31709e0`) remains RED in workstation territory because conditions (1) STUB-not-removed + (2) workstation-aggregator-absent are not flipped within T8 territory.

**Sub-Q final dispositions** (per findings §II):
- Sub-Q-T8-A: `(b) daemon-side pure-fn` (vs default `(c)` workstation-daemon-polling) — RESOLVED.
- Sub-Q-T8-B: emission channel — DEFERRED to sibling (workstation-side wiring).
- Sub-Q-T8-C: `(i) aggregated total only` — RESOLVED.
- Sub-Q-T8-D: poll cadence + lifecycle — DEFERRED to sibling (cadence-agnostic pure-fn).
- Sub-Q-T8-E: `(α) workstation-side only; daemon mock-to-real deferred` — RESOLVED via mock-transparent aggregator design.

### §1.3 — T9 plan-timer (skeleton-with-deferred-source)

`[KNOWN]` per `docs/coordination/mb-t-wireframe-t9-findings-2026-05-12.md` §II + §IV: T9 shipped the full 8-WB default ladder. WB2 spike (`3baa241`) per CLAUDE.md §2.8 external-API discipline found Sub-Q-T9-A=(c) PTY-scrape default NON-VIABLE per SPIKE-HSO-01 scenario-5 evidence (CC CLI `/cost` command surfaces extra-usage overage meter only; weekly rate-limit window not surfaced in CLI; per-session PTY emits token-count line only). Operator-arbitrated NEW Sub-Q-T9-A=(f) disposition: **skeleton-with-deferred-source** (precedent from MB-T-METHODOLOGY-PHASE-3 `a8e9a76` graceful-degradation pattern).

**Under (f), T9 ship scope** (per findings §V architectural shape):
1. NEW `packages/dispatch-workstation/src/main/rate-limit-aggregator.ts` exporting `createRateLimitAggregator({source})` + `createNullRateLimitSource()` (WB4 GREEN `3fef80d`; 6/6 RED→GREEN).
2. MOD `packages/dispatch-workstation/src/main/coarchitect-ipc.ts:94` — STUB removed; aggregator-driven handler + broadcast emitter on `coarchitect:rate-limit-update` channel (WB6 GREEN `6d8af23`; 3/3 RED→GREEN; coarchitect-ipc 6/6 consumer non-regression preserved).
3. NEW `PlanTimerTextContainer` + MOD `chat-shell/mount.ts` `resolveRenderPlanTimerText` auto-wire (WB7 GREEN `de6620e`; closes WB1 condition (3); closes T4 `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` PlanTimerText arm).
4. WB8 docs + runtime-launch smoke — Phase-3 headless smoke launched electron + captured screenshot `de6620e.png` (TARGET-ABSENT graceful-degradation per Phase-3-tooling scope; T9-specific UX validation requires operator-manual screenshot OR Phase-3 target-extension).

**Sub-Q final dispositions:**
- Sub-Q-T9-A: `(f) skeleton-with-deferred-source` [NEW disposition] — operator-arbitrated post-WB2 spike.
- Sub-Q-T9-B: `(i) state.requests?.reset primary` — RATIFIED (matches T4 WB10 default + dispatch P5b operator-direction).
- Sub-Q-T9-C: `(β) 60s tick` — RESOLVED.
- Sub-Q-T9-D: `(i) reuse coarchitect:rate-limit-update` — RESOLVED; zero §6.6 amendment.
- Sub-Q-T9-E: `(α) "Max plan" literal` — RATIFIED.

---

## §2 — Open sibling-session arms (runtime-visible gap)

`[KNOWN]` Both Wave-1 closures land their architectural ingredients but leave runtime-visible UX in honest-em-dash state. Bridging the gap requires:

| Open arm | Closure path | Manifest scope required | Blocker |
|---|---|---|---|
| T8 workstation src/main wiring | NEW `packages/dispatch-workstation/src/main/cost-meter-aggregator.ts` (workstation-side poller importing daemon pure-fn `aggregateDailyCost`); MOD `coarchitect-ipc.ts:89` STUB → aggregator-driven handler + broadcast emitter on `coarchitect:cost-update`. Closes P5-shipped WB1 RED `31709e0` 2/2 conditions. | `packages/dispatch-workstation/src/main/*.ts` write + cross-package import from `dispatch-daemon/src/cost-aggregator.js` | None — additive; daemon pure-fn ready. Recommend: spawn `phase4-t8-sibling-exec` Wave 2/3 |
| T9 real source plug | NEW source-implementation file (e.g., `rate-limit-anthropic-source.ts` for path (a) OR `rate-limit-daemon-source.ts` for path (b)) implementing `RateLimitSource` interface; MOD `coarchitect-ipc.ts` aggregator construction to inject real source in place of `createNullRateLimitSource()`. | depends on path: (a) needs workstation Anthropic API key provisioning (operator decision; no precedent in workstation env today); (b) needs `WORKSTATION_CONTRACT.md` §6.6 amendment (currently FORBIDDEN by manifest territory) | OPERATOR-DECISION on Sub-Q-T9-A path selection (a / b / d-accept-stub) |

**Operator-stamp surface** (FORBIDDEN to t8/t9/this-session manifests; aggregated for visibility):

`[KNOWN]` per t8 findings §IX + t9 findings §VII — the following `docs/FOLLOWUPS.md` rows accumulate stamp deltas pending operator-driven update:

- `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` (Tier 3) — PARTIAL ADVANCE; full closure on sibling-WB5 ship.
- `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` (Tier 3) — closure-path UPDATED: daemon pure-fn aggregator is current source-of-truth; PTY-scrape remains future-alternative if daemon stays mocked indefinitely.
- `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2) — PARTIAL-STAMP at T9 WB6: infrastructure ARM CLOSED; source-of-truth ARM remains OPEN. Cross-ref NEW `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED`.
- `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` (Tier 3) — RATIFIED-CLOSED at T9 WB2 (Sub-Q-T9-B=(i) confirmed).
- `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (Tier 2) — PARTIAL-STAMP: PlanTimerText arm CLOSED at T9 WB7; cost-meter arm awaits T8 sibling; MaxParallelCounter + BypassPermsIndicator arms remain OPEN (separate Phase 4 follow-ons).
- **NEW** `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` (proposed Tier 2; body in T9 findings §VII).
- **NEW** `MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING` (proposed Tier 2; body in T9 findings §VII; CONDITIONAL on operator pursuing Sub-Q-T9-A=(a) path).

Audit `wireframe-vs-shipped-audit-2026-05-09.md` row deltas pending operator stamp:
- §10.6 "cost meter $/day" — held at SHIPPED-with-stub pending T8 sibling closure.
- §10.7 "PlanRing placement" — promote SHIPPED-with-stub → SHIPPED-with-architectural-seam-and-deferred-source.

---

## §3 — Phase 4 forward planning per P3 PROVISIONAL roadmap

`[KNOWN]` Per `docs/coordination/phase-4-tier-1-roadmap-draft.md` (`d009e6f` Wave-0 P3 dispatch). The roadmap enumerated 15 dispatch units across 6 clusters (cluster A spawn-handler bundle + cluster B IPC-amendment + cluster C renderer-only + cluster D methodology infra + cluster E visual polish + cluster F validation-driven). Wave 1 of SPECULATIVE forward-positioning shipped 2/15 (cluster F partial). Status snapshot below.

### §3.1 — Cluster status

| Cluster | Wave 1 status | Sibling/Wave-2 work surfaced | Notes |
|---|---|---|---|
| **A — Spawn-handler field extensions** (model / spawnedAtMs / spawnMode) | NOT STARTED in Phase 4 forward-positioning; **partial in-flight via `commit-plan-doc-1334`** (sibling Wave-2 session per dispatch-queue 2026-05-12) closing `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` (a) closure path = spawnMode field + spawn-handler plumbing | spawnMode arm in-flight; model + spawnedAtMs arms remain pending | `[MODELED]` Recommend keeping P3 §4 Cluster A "single bundled MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS" framing intact for model + spawnedAtMs; commit-plan-doc-1334 closes spawnMode arm independently |
| **B — IPC-amendment-requiring** (status-derivation + filter-persist + external-death-reconciliation) | NOT STARTED | None Wave-2 (manifests at `e5c7c96` + Round-11 forbid §6.6 amendments) | `[KNOWN]` Cluster B blocked on §6.6 operator-arbitration cycle; defer to Phase-4 Wave-N post-Round-11 territorial-relaxation |
| **C — Renderer-only consumer additions** (lookup-session + focus-consumer + T2-header) | **Frame-C-focus-consumer in-flight via `c5-ticket-wb1`** (Wave-2; closes `MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` per tile-grid-app integration trinity); **lookup-session in-flight via `t3-ticket-body-0905`** (Wave-2; depends on c5 trinity for tile-grid-app integration anchor) | t2-header-data-path arm remains pending (depends on Cluster A `spawnedAtMs` ship) | `[KNOWN]` Cluster C partial-ship in Wave 2; depends on Cluster A spawn-result extension for full closure |
| **D — Methodology infrastructure** (γ headless screenshot + δ DOM-probes + ε visual-diff) | γ shipped pre-Wave-1 via `MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING` (`030c2d6` ticket body; `a8e9a76` graceful-degradation ship per T9 findings §IV). T9 WB8 consumed γ headless-smoke pipeline (TARGET-ABSENT outcome — Phase-3 target sentinel scope-limited to frame-c-root). δ + ε remain pending. | None Wave-2 explicitly; T9 already consumed γ tooling | `[KNOWN]` γ pre-superseded P3 §1.2 row per P3 §2 ruled-out list. δ closure path (DOM-mount-in-jsdom against bundled renderer) is the next methodology investment if Wave-2+ surfaces shipped-but-doesn't-render regressions |
| **E — Visual polish residual (T7-RESIDUAL)** | **In-flight via `verify-chat-mount-1319` + `t1-ticket-body-0905`** (Wave-2; both target `MB-F-CHATSHELL-POLISH-REMAINING` T7 follow-on) | Cluster E being actively absorbed by Wave-2 sibling sessions | `[KNOWN]` Cluster E scope shape per P3 §1.3 was `[SPECULATIVE]` pre-Phase-3; concrete polish items being identified at chat-shell granularity by sibling sessions |
| **F — Validation-driven** (cost-meter + plan-timer + BUILD.md fixture + tool-parse) | **T8 + T9 PARTIAL-SHIPPED Wave 1** (this synthesis §1). MB-T-PHASE-4-BUILD-MD-REAL-FIXTURE-CYCLE + MB-T-PHASE-4-TOOL-PARSE-CC-FORMAT-DRIFT remain pending. | None Wave-2 explicit for BUILD-MD-FIXTURE / TOOL-PARSE | `[KNOWN]` Cluster F 2/4 ship at Wave 1; remaining 2 are `[SPECULATIVE]` Phase-3-trigger-dependent per P3 §3 promotion gates |

### §3.2 — P3 promotion-gate evidence (Wave 1 retrospective)

`[KNOWN]` Per P3 §3 Phase-3-entry preconditions table, the following promotion gates **fired pre-Phase-3** via Wave 1 SPECULATIVE forward-positioning rather than from operator screenshot evidence:

| P3 gate | Triggered by | T8/T9 disposition |
|---|---|---|
| "Operator dogfood surfaces cost-meter inaccuracy or plan-timer drift" | NOT TRIGGERED — Phase 3 not yet entered | Tickets promoted via direct dispatch /tmp/dispatch-p5.txt 2026-05-12, **not** by P3 gate firing |
| (other P3 gates for Clusters A/B/C/E) | Not yet entered Phase 3 | Cluster A/C arms in-flight via Wave-2 dispatch (operator-direct), not P3 gate firing |

`[MODELED]` Implication: P3 §3 promotion-gate table remains the canonical reference for **post-Phase-3** dispatch sequencing; Wave 1 SPECULATIVE is an orthogonal authority path per dispatch §0 STATUS FRAMING (operator-acknowledged revision-cost). Both paths coexist; Phase 3 entry will re-evaluate Wave 1 ships for RATIFY / RESHAPE / DISCARD per dispatch /tmp/dispatch-p5.txt.

---

## §4 — Remaining cluster work (recommended Wave-N sequencing)

`[MODELED]` Sequencing recommendation contingent on operator decisions on (a) workstation Anthropic API key provisioning + (b) §6.6 amendment relaxation timing + (c) Phase 3 entry timing.

### §4.1 — Near-term (post-Wave-2 land; pre-Phase-3 entry)

| Priority | Work | Anchor | Manifest scope |
|---|---|---|---|
| HIGH | **T8 sibling exec** — close P5 WB1 RED `31709e0` 2/2 conditions; workstation src/main wiring | T8 findings §VIII closure-path (4 steps) | `packages/dispatch-workstation/src/main/cost-meter-aggregator.ts` (NEW) + `coarchitect-ipc.ts:89` MOD; no §6 touch |
| HIGH | **operator stamp surface** (FOLLOWUPS.md + audit `wireframe-vs-shipped-audit-2026-05-09.md` §10.6/§10.7 + new follow-on row authoring) | §2 of this doc | operator-only territory (or sherpa-authored manifest with FOLLOWUPS-write) |
| MEDIUM | Wait for Wave-2 in-flight sessions to land (`c5-ticket-wb1` trinity + `commit-plan-doc-1334` spawnMode + `t3-ticket-body-0905` lookup-session + `t1-ticket-body-0905` + `verify-chat-mount-1319` polish + `t6-ticket-body-0905` T10 body) — re-evaluate Wave-N scope post-land | dispatch-queue-current.md (FORBIDDEN to this session) | (Wave-2 manifests) |

### §4.2 — Conditional on operator decision (Sub-Q-T9-A path selection)

| Decision | Resulting work | Cluster |
|---|---|---|
| (a) workstation Anthropic API key | NEW T9-sibling ticket: implement `rate-limit-anthropic-source.ts` + workstation key provisioning + plug into aggregator. Closes `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` (proposed Tier 2). | F |
| (b) §6.6 amendment + daemon-side ping | NEW `contract:` commit amending WORKSTATION_CONTRACT.md §6.6 with `workstation:plan-timer` channel; daemon route addition; workstation thin-client source. Sibling of Cluster B IPC-amendment work. | B + F |
| (d) accept STUB indefinitely | Filing of `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-NOT-FIXABLE-IN-CURRENT-ARCHITECTURE` Tier 2; T9 closure status reframes to "No improvement + structural finding" per CLAUDE.md §2.11. | F |

### §4.3 — Phase-3-entry-gated (per P3 §3 + dispatch /tmp/dispatch-p5.txt STATUS FRAMING)

Pending Phase 3 visual-verification operator evidence. The following P3 rows remain `[SPECULATIVE]` per P3 §1 confidence labels:

| P3 row | Trigger evidence required | Disposition path |
|---|---|---|
| `MB-T-PHASE-4-MODEL-SOURCE-WIRING` | Phase 3 screenshot shows model badges empty/missing | Cluster A bundling — recommend single `MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS` ticket per P3 §4 Cluster A recommendation |
| `MB-T-PHASE-4-STATUS-DERIVATION-FROM-PTY` | Phase 3 shows status dots stuck on green for visibly-erroring sessions | Cluster B; needs §6.6 amendment |
| `MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE` | Phase 3 shows uptime reset after Frame toggle | Cluster A bundling |
| `MB-T-PHASE-4-T2-HEADER-DATA-PATH` | Phase 3 shows literal `uptime —` / `plan —` placeholders | Cluster C; DEPENDS-ON Cluster A |
| `MB-T-PHASE-4-FILTER-STATE-PERSISTENCE` | Operator complaint about filter loss across Frame A↔C toggle | Cluster B; needs §6.6 amendment |
| `MB-T-PHASE-4-EXTERNAL-SESSION-DEATH-RECONCILIATION` | Phase 3 shows stale entries for externally-killed sessions | Cluster B; needs §6.6 amendment + daemon-SSE work |
| `MB-T-PHASE-4-METHODOLOGY-δ-DOM-PROBES` | Operator CI requirement for catch-shipped-but-not-rendered gap | Cluster D |
| `MB-T-PHASE-4-METHODOLOGY-ε-VISUAL-DIFF` | Operator CI requirement post-γ ship (γ shipped pre-Wave-1) | Cluster D; can dispatch now if operator prioritizes |
| `MB-T-PHASE-4-T7-RESIDUAL-VISUAL-GAPS` | Phase 3 visual-diff identifies specific items | Cluster E; **partially absorbed by Wave-2 sibling sessions** |
| `MB-T-PHASE-4-BUILD-MD-REAL-FIXTURE-CYCLE` | Operator surfaces BUILD.md-driven spawn-loop failure under real repo | Cluster F |
| `MB-T-PHASE-4-TOOL-PARSE-CC-FORMAT-DRIFT` | CC version-bump introduces format drift | Cluster F; HARD-ESCALATION if CC doesn't expose structured events |

---

## §5 — Cross-cluster Sub-Q observations + adopted patterns

`[MODELED]` Wave 1 ship surfaced several patterns that affect Phase-4 Wave-N planning:

### §5.1 — Daemon-side pure-fn aggregator pattern (T8 + T9 parity)

Both T8 (`packages/dispatch-daemon/src/cost-aggregator.ts`, `39c514b`) and T9 (`packages/dispatch-workstation/src/main/rate-limit-aggregator.ts`, `3fef80d`) shipped aggregators. T8 lives daemon-side (consumed by workstation via cross-package import per WB4 probe `1238193`); T9 lives workstation-side (because T9 aggregator orchestrates pluggable RateLimitSource implementations not yet shipped). **Two different file locations but the same architectural shape**: pure-fn-over-snapshot + injection seam + onUpdate fan-out.

`[MODELED]` Recommend Cluster A "spawn-handler field extensions" follow the same pattern for `spawnedAtMs` aggregation (workstation-internal source-of-truth).

### §5.2 — "Skeleton-with-deferred-source" outcome classification

`[KNOWN]` T9 ADR-MBTWFT9-A introduces a NEW Sub-Q disposition `(f) skeleton-with-deferred-source` that maps to CLAUDE.md §2.11 outcome "Capability enabled with known limitations". Adopted pattern: ship architectural seam + emitter + consumer auto-wire under graceful-degradation default; defer the data-tap to a follow-on plug-in.

`[MODELED]` Recommend extending this disposition into the Sub-Q toolkit for future Phase-4 data-flow tickets (especially Cluster B IPC-amendment tickets blocked on §6.6 cycles). Allows ship-velocity on infrastructure without blocking on operator-arbitration for a single moving piece.

### §5.3 — Manifest territorial discipline incidents (Wave 1)

`[KNOWN]` Two HALT-TERRITORY-MISMATCH incidents surfaced during T8 (per T8 decisions §4):
1. **§4.1** — Daemon vitest `.spec.ts → .test.ts` collision (manifest authoring missed daemon vitest config `*.test.{ts,tsx}`-only discovery). Operator-arbitrated correction at `6d7dff3`.
2. **§4.2** — P5-shipped WB1 RED probe at `31709e0` landed in `chat-shell/` path that was NOT in original t8 manifest scope (manifest scoped `bottom-rail/probe-mbtwft8-*.spec.tsx` only). Operator-arbitrated correction at `6d7dff3` added `chat-shell/probe-mbtwft8-*.spec.{ts,tsx}` to t8 territory.

`[MODELED]` These incidents validate the §3.9.A enforcement (`every git add glob-matched against session manifest at add step`) — both fired at add-time, not at commit-time. Recommend keeping the §3.9.A discipline operative as Cluster B/C/E sessions spawn.

### §5.4 — Cairn-grammar inversion (T8 WB4 RED-at-authoring-GREEN)

`[KNOWN]` per T8 decisions §3: T8 WB4 probe (`1238193`) was authored AFTER WB3 GREEN (`39c514b`) shipped the aggregator, so the probe is GREEN at authoring (not RED). Operator-acked the cairn `red:` grammar nonetheless because the regression-shield semantic is preserved (deletion of WB3 aggregator re-flips RED). Documented honestly in commit body + decisions doc.

`[MODELED]` Future Phase-4 tickets that ship probes *consuming* artifacts shipped earlier in the same WB ladder may follow this pattern. **Honest framing in commit body is mandatory**; do not silently elide the inversion.

---

## §6 — Risks + open questions for Phase 3 entry

### §6.1 — Risks

`[SPECULATIVE]` Per dispatch /tmp/dispatch-p5.txt STATUS FRAMING:

1. **Wave 1 ratification rate** — operator-stated `[SPECULATIVE]` ≥80% RATIFY estimate; calibration data only post-Phase-3 entry. Wave 1 tickets (T8 + T9) may be RESHAPED (e.g., if Phase 3 surfaces per-session cost UX requirement) or DISCARDED (e.g., if wireframe target reframes to no plan-timer at all).
2. **Sibling-session ship gap** — T8 architectural ship is invisible to operator until sibling-WB5-equivalent lands; T9 architectural ship renders honest em-dash until source plug lands. Both expected per (β) reshape + (f) disposition; risk is operator interpreting em-dash as Wave 1 ship failure rather than honest-deferred-source.
3. **§6.6 amendment cycle bottleneck** — Cluster B + Sub-Q-T9-A=(b) both gated on operator-arbitrated §6.6 amendments. Concurrent batching ("single consolidated `contract:` commit covering all new channels" per T8 body §2.3) may reduce ack cycles.
4. **Round-11 territorial-partition manifest discipline** — multiple Wave-2 sessions concurrently in-flight per dispatch-queue. Cross-session contamination risk is partially mitigated by per-path commits + glob-validation; recommend `r11-manifest-validator` + `r11-queue-watcher` Wave-2 reports for Wave 1 + Wave 2 audit.

### §6.2 — Open questions for operator

1. **Sub-Q-T9-A path selection** — (a) workstation API key / (b) daemon-side + §6.6 / (d) accept-STUB. Affects which Wave-N work fires.
2. **operator stamp surface timing** — when does operator close the deferrals enumerated in §2 (FOLLOWUPS.md row updates + audit §10.6/§10.7 row stamps + NEW row authoring)? Stays accumulated until next manifest-relaxation cycle.
3. **Bundle vs split for Cluster A** — single MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS (3 fields, 1 cycle) OR 3 separate tickets? P3 §5 Q1 unresolved. `commit-plan-doc-1334` currently bundles only spawnMode arm; model + spawnedAtMs arms not yet in flight.
4. **Phase-3-entry timing** — does operator enter Phase 3 visual-verification now (with Wave 1 + Wave 2 partial ship visible) OR wait for full Wave-N completion? Phase-3 entry will RATIFY/RESHAPE/DISCARD Wave 1 tickets per dispatch §0 STATUS FRAMING.
5. **Sibling-session for T8 closure** — recommend spawning a dedicated `phase4-t8-sibling-exec` Wave-2/3 session with manifest scoping `packages/dispatch-workstation/src/main/cost-meter-aggregator.ts` + `coarchitect-ipc.ts` to close P5 WB1 RED + WB5-equivalent. Operator approval requested.

---

## §7 — Provenance + signing

**Authored by:** `__orchestrator_active` Round 11 §3.9 Wave 2 continuation dispatch (operator-direct).
**Authority:** dispatch-queue-current.md IN-FLIGHT row `__orchestrator_active` scope = "Phase 4 status synthesis doc — T8 + T9 closures + Phase 4 forward planning" per `docs/coordination/territorial-manifests/orch-active-phase4-status.txt`.
**Anti-fabrication discipline:** CLAUDE.md §2.1 enforced; every factual claim citation-anchored at HEAD `8d35c93` direct-read OR `[MODELED]`/`[SPECULATIVE]`-labeled with stated basis.
**Status:** Wave 1 + Wave 2 in-flight snapshot. Subject to RATIFY/RESHAPE/DISCARD post-Phase-3 entry per dispatch /tmp/dispatch-p5.txt STATUS FRAMING; subject to revision as Wave-2 sessions land their commits.

**Source anchors:**
- `/tmp/dispatch-p5.txt` (P5a + P5b dispatch 2026-05-12, Round 10)
- `docs/coordination/full-build-mode-dispatch.md` (operator directive 2026-05-11)
- `docs/coordination/phase-4-tier-1-roadmap-draft.md` (`d009e6f` P3 PROVISIONAL roadmap)
- `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW_BUILD.md` (post-`155933f` §1.5 β-amendment)
- `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW_BUILD.md` (`5a27f2f` body)
- `docs/coordination/mb-t-wireframe-t8-findings-2026-05-12.md` (T8 findings I-X)
- `docs/coordination/mb-t-wireframe-t8-decisions-2026-05-12.md` (T8 operator-arbitrations §1-§6)
- `docs/coordination/mb-t-wireframe-t9-findings-2026-05-12.md` (T9 findings §I-§X)

---

**End of Phase 4 Status (2026-05-12) synthesis.**
