# Phase 4 Roadmap Update Notes — 2026-05-12 (Rev-1 → Rev-2 redline summary)

**Companion to:** `docs/coordination/phase-4-tier-1-roadmap-rev-2-2026-05-12.md`
**Authored:** 2026-05-12 by `__orchestrator_standby-p3-rev` per Round 11 Wave 3 dispatch + manifest `orch-standby-p3-roadmap-rev.txt`.
**Purpose:** Compact redline summary so operator can scan rev-1 → rev-2 deltas without re-reading the full rev-2 document.
**HEAD at authoring time:** `d342986`.

---

## §0 — TL;DR

Rev-2 reflects four anchor events since draft `d009e6f` Wave-0:

| # | Event | Anchor | Disposition in rev-2 |
|---|---|---|---|
| 1 | T8 cost-meter ship | `155933f` (WB-final + β-amendment) | Cluster F partially advanced; sibling-exec OPERATOR-APPROVED for next wave |
| 2 | T9 plan-timer ship | `afd3778` (WB8 + runtime smoke) | Cluster F partially advanced; NEW Sub-Q-T9-A=(f) "skeleton-with-deferred-source" disposition adopted |
| 3 | Cluster A operator-acked single-bundle scope | `52f3d04` (synthesis §2 DRAFT) | Cluster A bundling RATIFIED; formal build-doc authoring requires NEW manifest-spawned session (file currently ABSENT) |
| 4 | Phase 3 trigger tooling shipped | `a8e9a76` (verify:phase-3-smoke CLI + §C amendment + FOLLOWUPS row 335 closure) | γ DISPATCH-READY → Cluster D-ε now dispatch-ready (was draft-state "DEPENDS ON γ; serialize") |

---

## §1 — Rows CLOSED / ADVANCED since draft

| Draft row | New status | Anchor | Notes |
|---|---|---|---|
| `MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION` | ADVANCED (aggregated-total ratified; per-session attribution future Wave-N) | `155933f` | Sub-Q-T8-A=(b) daemon pure-fn + Sub-Q-T8-C=(i) aggregated-total-only RESOLVED |
| `MB-T-PHASE-4-PLAN-TIMER-RESET-COUNTDOWN-ACCURACY` | ADVANCED (skeleton + null-source default shipped) | `afd3778` | `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` RATIFIED-CLOSED at Sub-Q-T9-B=(i); source plug DEFERRED |
| ~~`MB-T-PHASE-4-METHODOLOGY-γ-HEADLESS-SCREENSHOT`~~ | SHIPPED PRE-WAVE-1 | `a8e9a76` | `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` (FOLLOWUPS.md:335) closure stamp landed |

---

## §2 — Rows NEW since draft

| New row | Cluster | Why surfaced |
|---|---|---|
| `MB-T-PHASE-4-T8-SIBLING-EXEC` | F | Operator-approved per synthesis §1.1 turn-3 ack; closes P5-shipped WB1 RED `31709e0` + workstation src/main wiring |
| `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW` | F | Wave-2 in-flight via `t6-ticket-body-0905` per T8/T9 architectural-pattern parity |
| `MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG` (CONDITIONAL Sub-Q-T9-A) | F | Closes T9 deferred-source per operator path selection (a / b / d) |
| `MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW` (proposed) | F | 4th and final arm of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING`; coupled to Cluster A spawnMode field |

---

## §3 — Cluster reshape summary

| Cluster | Draft framing | Rev-2 reality |
|---|---|---|
| A | "single bundled recommended" | OPERATOR-ACKED single-bundle; scope DRAFT at `52f3d04` synthesis §2; build-doc ABSENT |
| B | "serialize on §6 amendment cycles" | REMAINS BLOCKED (Round-11 forbid §6.6 amendments) |
| C | 3 rows pending | Wave-2 in-flight: focus-consumer + lookup-session; T2-header awaits Cluster A `spawnedAtMs` |
| D | γ + δ + ε pending | γ SHIPPED; ε DISPATCH-READY; δ pending |
| E | `[SPECULATIVE]` single follow-on | Wave-2 actively absorbing per `MB-F-CHATSHELL-POLISH-REMAINING` (first ship at `d342986`) |
| F | 4 rows pending | 2 ADVANCED (T8 + T9); +1 NEW in-flight (T10 body); +3 NEW forward-positioned |

---

## §4 — Cluster A build-doc absence finding [KNOWN]

**Critical state:** `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` is **ABSENT at HEAD `d342986`** (verified via `ls`). Cluster A operator-acked single-bundle exists as DRAFT-only in synthesis §2 (`52f3d04`).

**Implication:** Cluster A bundle execution requires NEW manifest-spawned session with that build-doc path in WRITE territory. Current `__orchestrator_standby-p3-rev` manifest reads it as READ-ONLY (anticipatory listing — operator pre-reserved the path).

**Recommended Wave 3 action** (per rev-2 §6.2): operator dispatches NEW manifest-spawned session to mechanically translate synthesis §2 DRAFT → formal build-doc per synthesis §4.2 translation map.

---

## §5 — Phase 3 entry assessment

γ tooling shipped → Phase 3 visual-verification CAN now fire technically. Recommended trigger criteria (per phase-4-status-2026-05-12.md §6 Q4 deferral + rev-2 §4.2 retrospective):

1. Wave-2 in-flight sessions all land their commits (1-3 days est.)
2. `phase4-t8-sibling-exec` lands
3. Cluster A bundled ticket lands
4. Operator-stamp pass applied (FOLLOWUPS + audit row deltas)

Operator override admissible per dispatch STATUS FRAMING — earlier entry trades resolution for signal-velocity.

**T9 WB8 already exercised γ:** runtime smoke produced TARGET-ABSENT graceful-degradation (γ sentinel scope-limited to frame-c-root). Multi-data-flow-ticket pattern suggests Phase-3-tooling scope-extension may be its own Phase-4 candidate (rev-2 §7 Q6).

---

## §6 — Operator decisions still open

Carried + new from rev-2 §7:

| Q | Topic | Status | Recommended default |
|---|---|---|---|
| Q1 | Sub-Q-T9-A path (a/b/d) | Carried-unresolved | — operator |
| Q2 | Cluster A build-doc authoring trigger | NEW | (ii) After Wave-2 lands |
| Q3 | BypassPermsIndicator bundle vs separate | NEW | SEPARATE |
| Q4 | Cluster D-ε dispatch timing | Promoted to active | (ii) Defer to post-Wave-3 |
| Q5 | Phase 3 entry timing | Carried-unresolved | After Wave-2 + T8-sibling + Cluster A bundle + stamp pass |
| Q6 | Phase-3-tooling scope extension | NEW | TBD per multi-ticket TARGET-ABSENT outcome rate |
| Q7 | Operator-stamp surface scheduling | Carried | operator natural cycle |

---

## §7 — What did NOT change

Rev-2 preserves draft framing for these rows (unchanged):
- `MB-T-PHASE-4-STATUS-DERIVATION-FROM-PTY`
- `MB-T-PHASE-4-FILTER-STATE-PERSISTENCE`
- `MB-T-PHASE-4-EXTERNAL-SESSION-DEATH-RECONCILIATION`
- `MB-T-PHASE-4-METHODOLOGY-δ-DOM-PROBES`
- `MB-T-PHASE-4-T7-RESIDUAL-VISUAL-GAPS`
- `MB-T-PHASE-4-BUILD-MD-REAL-FIXTURE-CYCLE`
- `MB-T-PHASE-4-TOOL-PARSE-CC-FORMAT-DRIFT`

Refer to `phase-4-tier-1-roadmap-draft.md` (`d009e6f`) for full scope on these rows.

---

## §8 — Cross-references

- Rev-2 doc: `phase-4-tier-1-roadmap-rev-2-2026-05-12.md` (full enumeration of all rev-1→rev-2 deltas)
- Draft (superseded by rev-2 by reference; PRESERVED as-is): `phase-4-tier-1-roadmap-draft.md` (`d009e6f`)
- Wave-1 status: `phase-4-status-2026-05-12.md`
- Cluster A scope DRAFT: `phase-4-synthesis-2026-05-12.md` (`52f3d04`)

---

**End of update notes.**
