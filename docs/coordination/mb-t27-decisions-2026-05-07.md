# MB-T27 Decisions — Model mix indicator

**Terminal:** D (parallel-cairn 4-session run)
**Date:** 2026-05-07
**Companion to:** `/tmp/mb-t27-diagnose.md`
**Status:** Phase 1 dispositions PENDING operator markup. Operator
acks (or flips) each Q-MBT27-N + R-MBT27-N before Phase 2 WB1.

This doc is the operator-skim review surface. Full inventory + risks
+ prose live in the diagnose doc; here, each question gets one row
with the tentative disposition + the option set + a one-line
rationale.

---

## Q-MBT27-N — open questions + tentative dispositions

| ID | Question | Options | Tentative | Rationale (1 line) |
|---|---|---|---|---|
| Q-MBT27-1 | **Where does the mix indicator render in chat-shell?** | (a) NEW header bar above tab strip with named slots / (b) inline in tab strip / (c) floating overlay | **(a)** | Wireframe places meters above tabs as stable bar; inline crowds tabs; overlay clips on resize. |
| Q-MBT27-2 | **Slot pattern (parallel-cairn with T26 cost meter)** | (a) discrete `renderModelMixSlot` + `renderCostMeterSlot` props / (b) generic `renderHeaderSlot` shared / (c) children-array | **(a)** | Discrete named slots minimize Terminal C ↔ D collision surface; each session adds ONE prop. |
| Q-MBT27-3 | **Session list source** | (a) `workstationBridge.onSpawnResult` subscription in chat-shell mount / (b) new IPC `onSessionsListUpdated` / (c) daemon `/v3/sessions` query | **(a)** | Operator-stated "minimal coupling" recommendation; no new IPC contract surface; preload.mts UNCHANGED. |
| Q-MBT27-4 | **Kill-event coverage (acceptance: "within 1s of kill")** | (a) accept gap + Tier 2 v3.1 followup / (b) add `onSessionKilled` IPC in this ticket (+2 WBs) / (c) scope-relax acceptance | **(a)** | Kill propagation needs new IPC infrastructure; out of scope for 2-3 WB ticket. Cairn-honest "Capability enabled with known limitations" framing. |
| Q-MBT27-5 | **Treatment of `model=undefined`** (all live sessions today) | (a) "unknown" bucket NOT shown in chips (chips at 0) / (b) default to S4.6 / (c) chips at 0 + sub-line "N w/ unknown model" | **(a)** | Avoid inflating S4.6; meets zero-state acceptance literally; flags model-plumb gap as Tier 2 FU. |
| Q-MBT27-6 | New directory / file location | (a) `src/chat-shell/mix-indicator.tsx` (co-located) / (b) new `chat-shell-meters/` dir / (c) `src/chat-shell/header-meters/` shared with T26 | **(a)** | CLAUDE.md §3.2 flat convention; shared-dir with T26 risks scope creep. |
| Q-MBT27-7 | data-testid contract | (a) `mix-indicator-root` + `mix-indicator-chip-{S46,O46,O471M,H}` / (b) composite `mix-indicator-chips` + role-per-chip | **(a)** | Per-chip testid discoverability for probe assertions. |
| Q-MBT27-8 | WB count | (a) 3 (red → green render+wire → docs) / (b) 2 (combine red+green, docs in WB2) | **(a)** | Mirror MB-T20 ladder shape; 3 WBs gives clean docs separation. |
| Q-MBT27-9 | Closes any existing followup? | (a) none / (b) MB-F-T15-MODEL-CHIP-DEFAULT (if exists) | **(a)** | Wireframe-led; no inherited FU dependency. |
| Q-MBT27-10 | tsconfig / package.json edits | (a) verify-no-edit at WB1 (already covered) / (b) append mix-indicator.tsx | **(a) verify** | chat-shell pattern likely covers; check at WB1. |

---

## R-MBT27-N — risks + dispositions

| ID | Risk | Severity | Disposition |
|---|---|---|---|
| R-MBT27-1 | Shared-file conflict on `chat-shell.tsx` with Terminal C (MB-T26 cost meter) | HIGH | **MITIGATE via Q-MBT27-2=a + Terminal C coordination at HALT 0 + per-path git add.** Whoever lands header-bar structural edit first writes sentinel; second adds slot-prop only. |
| R-MBT27-2 | Frozen contract crossing (preload.mts changes if Q-MBT27-3=b) | ZERO under (a) | **AVOID via Q-MBT27-3=a — preload.mts UNCHANGED.** |
| R-MBT27-3 | Kill-event gap means "within 1s of kill" acceptance not literally met | MEDIUM | **ACCEPT with operator-confirmed scope-relaxation + Tier 2 followup `MB-F-T27-KILL-EVENT-PROPAGATION`.** |
| R-MBT27-4 | model=undefined for all live sessions today → indicator chips at 0 with N>0 live | LOW (zero-state IS the acceptance) | **ACCEPT — counts ARE accurate against the model field as currently populated.** File `MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN`. |
| R-MBT27-5 | dispatch-core dist rebuild (CLAUDE.md §3.4) | ZERO | **NO SCHEMA SPINE INGRESS.** |
| R-MBT27-6 | Runtime-launch smoke as merge gate (CLAUDE.md §4.6) | HIGH if skipped | **WB2 RUNS SMOKE** — `WINDOW_READY` + `RENDER_OK` ≤10s. |
| R-MBT27-7 | Test directory layout per CLAUDE.md §3.6 | ZERO | New tests at `test/unit/chat-shell-mix-indicator/probe-NN-*.spec.tsx`. |
| R-MBT27-8 | esbuild script (CLAUDE.md §3.7) | ZERO | mix-indicator co-bundled via existing `scripts/build-chat-shell.mjs`. |
| R-MBT27-9 | Pre-existing test failures (CLAUDE.md §4.5) | ZERO new | **NOT RE-DIAGNOSED.** Noted in WB3 surface as expected. |
| R-MBT27-10 | Cross-session origin advance during ladder | LOW | **`git pull --ff-only` at top of every atomic-chain commit per operator prompt methodology.** |

---

## Cross-session coordination question (operator-arbitrated)

**C-MBT27-1:** Terminal C is shipping MB-T26 cost meter in same chat-shell header bar region. Pre-arbitration paths:
- **(a) Sequence:** Terminal C lands header-bar structural edit + `renderCostMeterSlot` first; Terminal D rebases and adds only `renderModelMixSlot` slot prop.
- **(b) Coordination doc:** Both terminals agree on header bar testid contract + slot prop names via `docs/coordination/mb-t26-mb-t27-chat-shell-header-coord-2026-05-07.md` BEFORE either Phase 2 WB1.
- **(c) Independent racing:** First-to-commit lands structural edit; second rebases.

**Tentative:** **(a) sequence** — cleanest cairn discipline, zero collision surface; depends on Terminal C status. **(b) coordination doc** is fallback if Terminal C is also at HALT 0.

---

## Operator markup template

When this doc returns from operator review, expected forms:

- **Unanimous accept:** "proceed with tentative dispositions, begin Phase 2 WB1 (with Terminal C coord per C-MBT27-1=a/b)."
- **Disposition flips:** e.g., "Q-MBT27-4 flip to (b); kill-event coverage IS in scope. Re-plan to 4-5 WBs."
- **New question:** e.g., "Q-MBT27-11: should chip set show all 4 even when total=0, or hide collapsed?"
- **Rejected scope:** e.g., "MB-T27 deferred until MB-T34/T35 plumbs model field; close ticket as not-yet-shippable."

---

## Confidence labels

All claims in this decisions doc + the companion diagnose doc carry CLAUDE.md §2.2 confidence labels:
- **[KNOWN]** observations from this session's tool reads (file contents, line counts, grep results, git state)
- **[MODELED]** reasoned from observed facts + stated model (e.g., cross-renderer state behavior, future ticket dependencies)
- **[SPECULATIVE]** hypotheses without current evidence (e.g., timing of MB-T34/T35 model-field plumb)

See diagnose §VII (verification trail) for explicit labels per claim.
