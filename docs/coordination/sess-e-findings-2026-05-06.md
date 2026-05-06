# Session E — parallel-batch-5-2026-05-05 — Findings (append-only)

**Branch:** `sess-e/layout-data-mock`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-e-layout-data-mock`
**Cut from:** `main` HEAD `1098ebb`
**Date opened:** 2026-05-05

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the reserved #155-#159 range (parallel-batch-5
sess-e slot). Numbers below are working entries; operator may
renumber on merge.

---

## Finding #155 — MB-F-LAYOUT-DATA-MOCK-PER-FIELD-BACKFILL

**Date filed:** 2026-05-05
**Tier:** 3 — UI consistency followup. Closes parallel-batch-4
sess-b finding #140 §Followups #2 (`sess-b-findings-2026-05-06.md`).
Migrates the header `data-mock="true"` marker from the cluster wrapper
in `Layout.tsx` to per-field placement on `PlanRing` + `CostPill`
roots, mirroring the pattern sess-b shipped on `FocusedDetailPanel` in
batch-4 (`detail-row-{model,plan,cost,stdout-snippet}`).
**Origin:** parallel-batch-4 sess-b finding #140 §Followups #2 — per-field
vs cluster `data-mock` divergence between `FocusedDetailPanel`
(per-field, shipped sess-b) and `Layout.tsx` (cluster wrapper, pre-existing
from `sess-1/dispatch-web-ui` parallel-batch-2 Phase 2 Step 5). Operator
arbitrated divergence at sess-b's Q6 (accept divergence, file followup),
filed as Followup #2, closed by sess-e in next batch.
**Discovered by:** sess-b finding #140 (filed); sess-e (this batch) executed.
**Resolution status:** SHIPPED on `sess-e/layout-data-mock`, ladder
commits `37c585d` (WB1) … `e4c4186` (WB7); WB8 (this entry) is the
final commit.

### Surface (KNOWN — direct read of source files at HEAD `1098ebb`)

Three files in `packages/dispatch-web/src/components/`:

| File | Pre-edit state | Post-edit state |
|---|---|---|
| `Layout.tsx:35` | `<div className="flex items-center gap-3" data-mock="true">` (cluster carries marker) | `<div className="flex items-center gap-3">` (no marker; per-field below) |
| `PlanRing.tsx:35` | `<div className="flex items-center gap-2 text-xs">` (no marker) | `<div data-mock="true" data-testid="header-plan-ring" className="flex items-center gap-2 text-xs">` |
| `CostPill.tsx:21-25` | `<span aria-label={...} className="...">` (no marker) | `<span data-mock="true" data-testid="header-cost-pill" aria-label={...} className="...">` |

Plus comment-text updates in all three files reflecting the new
per-field model. Layout.tsx daemon-finding sentence (lines 19-21)
preserved verbatim per operator Q-E3.

### Test surface shipped

| Test file | Pre | Post | Delta |
|---|---|---|---|
| `test/plan-ring.test.tsx` | 8 | 9 | +1 per-field probe |
| `test/cost-pill.test.tsx` | 5 | 6 | +1 per-field probe |
| `test/layout.test.tsx` | 9 | 9 | obsolete cluster-wrapper test removed; negative-assertion test added (net 0) |
| **dispatch-web full suite** | 279 | **281** | +2 (KNOWN post-edit; pre-edit MODELED from delta math) |

All 281 tests pass at HEAD `e4c4186` (KNOWN — `pnpm --filter
dispatch-web test` output captured WB6).

### Operator-arbitrated decisions applied

Phase 1 close report §7 Q-E1 through Q-E5 + brief Q1-Q3:

| Q | Decision | Status |
|---|---|---|
| Q1 (brief) | Per-field marker placement; remove cluster wrapper marker | APPLIED |
| Q2 (brief) | Both — new per-field tests + remove cluster-wrapper test (replace with negative assertion) | APPLIED |
| Q3 (brief) | `data-testid="header-plan-ring"` + `"header-cost-pill"` | APPLIED |
| Q-E1 | CostPill comment update for symmetry with PlanRing | APPLIED — WB3 |
| Q-E2 | REPORT.md location: `packages/dispatch-web/test/layout-data-mock-backfill/REPORT.md` (NEW dir, mirrors sess-b WB7) | APPLIED — WB7 |
| Q-E3 | Drafted Layout.tsx comment replacement APPROVED verbatim; preserve daemon-finding sentence (lines 19-21) | APPLIED — WB4 |
| Q-E4 | testid literals exactly `"header-plan-ring"` + `"header-cost-pill"` | APPLIED — verbatim production + tests |
| Q-E5 | Probes inside existing `describe` blocks (not new) | APPLIED — WB1 |

### Methodology lesson

**Divergence-flagged-then-fixed is a valid two-batch arc when scope-fence
requires it.** sess-b (batch-4) introduced the per-field pattern on
`FocusedDetailPanel` while leaving the pre-existing cluster pattern on
`Layout.tsx` intact, filing the divergence as Followup #2 rather than
expanding scope mid-batch. sess-e (batch-5) closed the followup as
its own focused finding. Three benefits to this discipline:

1. **Scope fences hold.** Sess-b's batch-4 brief was about `FocusedDetailPanel`'s
   Standard bundle refactor; touching `Layout.tsx` would have introduced
   cross-component coupling and slowed the batch. Filing the followup
   kept the batch atomic.
2. **Diff sizes stay small.** sess-e's full delta is 6 files / +42/-17
   lines (KNOWN — `git diff --stat 1098ebb..HEAD`). A reviewer can
   verify the per-field migration in one sitting.
3. **Pattern propagation is intentional, not implicit.** The fact that
   per-field placement won and cluster-wrapper lost is now explicit in
   the Layout comment + finding entry rather than left as tribal knowledge.
   Future readers see the migration recorded.

The cluster-wrapper test deletion (FACT-E10) is also load-bearing as
methodology: a test that uses `container.querySelector('[data-mock="true"]')`
without anchoring to a specific element silently transitions from
regression-catcher to regression-hider when the marker moves. Replace,
don't invert.

### Followups (operator-deferred to separate batches)

1. **Real plan/cost/model/stdout daemon endpoints** (Tier-2 candidate). Pre-existing
   followup carried forward from sess-b finding #140 §Followups #1.
   When the daemon surfaces real fields, both `FocusedDetailPanel` mock
   markers (sess-b territory) and `Layout.tsx` header per-field markers
   (sess-e territory) flip off. Currently expressed as `MOCK_USAGE_PCT`,
   `MOCK_RESET_MS`, `MOCK_USD_TODAY` constants in `Layout.tsx:22-24`
   and the comment block at `Layout.tsx:13-21` (preserved verbatim).
2. **Other dispatch-web components with `data-mock="true"`** — not
   audited. Layout cluster was the only divergence sess-b's finding
   #140 §Followups #2 named; a future scout pass could verify no other
   cluster-wrapper-only mock placements survive. SPECULATIVE — no audit run.
3. **Layout.tsx comment line 13 references `/tmp/sess-1-dispatch-web-ui-diagnose.md`** —
   that's a Phase-1 scratchpad from a much earlier batch. Stale reference,
   non-load-bearing. Cleanup candidate for a future docs sweep.

### §G gaps surfaced this batch (not load-bearing for the resolution)

- **G-E1 Pre-edit dispatch-web full-suite count not directly captured.**
  Post-migration count of 281 with +2 new tests implies a baseline of
  279, consistent with brief estimate "46+ files / 280+ tests" but not
  directly verified. Future similar batches should run
  `pnpm --filter dispatch-web test` once at start to lock the baseline.
  MODELED.
- **G-E2 No e2e / browser verification.** sess-e is unit-test only.
  Per-field markers should be visible in dev-tools after `pnpm dev`,
  but visual confirmation is left to the operator merge step. KNOWN —
  brief did not require browser verification.
- **G-E3 Vitest stdout shows error-boundary "test error" log spam**
  during `layout.test.tsx` runs. Pre-existing, intentional (the
  per-panel error isolation test at lines 173-214 fires real errors
  into mocked panels). Not introduced by sess-e and not in scope to
  silence. KNOWN.

### Cross-session coordination

- **Session D (`sess-d/...`)** — dispatch-daemon test only. NO overlap
  with sess-e's dispatch-web territory (KNOWN — sess-e diff is
  exclusively in `packages/dispatch-web/`).
- **Session F (`sess-f/...`)** — dispatch-core. NO overlap (KNOWN).
- **Session B (parallel-batch-4)** — `sess-b/detail-pane-rearb` shipped
  to `main` at HEAD `8c8e616` before sess-e cut. sess-e treats sess-b's
  files as FORBIDDEN (`FocusedDetailPanel.tsx`, `focused-detail.test.tsx`).
  Verified byte-identical to main in WB6 (KNOWN —
  `git diff --stat 1098ebb..HEAD` shows zero entries for those paths).

### Anti-fabrication

Every factual claim in this entry is one of: (a) a quoted source-file
location verifiable by reading the cited path:line, (b) a
test-execution observation reproducible via `pnpm --filter dispatch-web
test`, or (c) labeled MODELED / SPECULATIVE with the basis named. No
claim asserts a behavioral change beyond per-field marker placement
and accompanying test surface. This batch ships UI-marker placement +
test surface only; no production data flow, no daemon contract, no
state-store change.
