# MB-F-LAYOUT-DATA-MOCK-PER-FIELD-BACKFILL — Session E REPORT

**Branch:** sess-e/layout-data-mock (cut from main HEAD `1098ebb`)
**Batch:** parallel-batch-5
**Date:** 2026-05-05
**Origin:** sess-b finding #140 §Followups #2 — per-field vs cluster `data-mock` divergence between FocusedDetailPanel (per-field, shipped sess-b batch-4) and Layout.tsx (cluster wrapper, pre-existing).

---

## §1 What was shipped

Per-field `data-mock="true"` migration on the header mock cluster:

- **PlanRing root `<div>`** now carries `data-mock="true"` + `data-testid="header-plan-ring"`.
- **CostPill root `<span>`** now carries `data-mock="true"` + `data-testid="header-cost-pill"`.
- **Layout.tsx cluster `<div>`** no longer carries `data-mock` — per-field markers replace it (no redundancy).
- **Comment hygiene:** Layout.tsx rationale comment updated to per-field language; the daemon plan/cost endpoints followup sentence preserved verbatim. PlanRing + CostPill component header comments updated for accuracy.
- **Test surface:** Two new per-field probes (PlanRing + CostPill); one cluster-wrapper test removed from layout.test.tsx and replaced with a negative assertion that the cluster `<div>` lacks `data-mock` while the per-field roots carry it.

Mirrors the per-field pattern sess-b shipped on FocusedDetailPanel in batch-4 (`detail-row-{model,plan,cost,stdout-snippet}`).

**Confidence:** KNOWN — all changes verified by git diff + passing test suite.

---

## §2 Operator arbitrations applied

| ID | Question | Decision | Status |
|---|---|---|---|
| Q1 | Marker placement | Per-field on PlanRing + CostPill roots; remove cluster wrapper marker | APPLIED — WB2/WB3/WB4 |
| Q2 | Test surface | Add per-field tests + remove cluster-wrapper test (replace with negative assertion) | APPLIED — WB1/WB5 |
| Q3 | testid additions | `data-testid="header-plan-ring"` + `"header-cost-pill"` | APPLIED — verbatim per Q-E4 |
| Q-E1 | CostPill comment update for symmetry | YES, update | APPLIED — WB3 |
| Q-E2 | REPORT.md location | `packages/dispatch-web/test/layout-data-mock-backfill/REPORT.md` (NEW dir, mirrors sess-b WB7 pattern) | APPLIED — this file |
| Q-E3 | Layout.tsx comment rewrite text | APPROVED drafted replacement; preserve daemon-finding sentence at lines 19-21 | APPLIED — WB4 |
| Q-E4 | testid literals | Exactly `"header-plan-ring"` + `"header-cost-pill"` verbatim in production AND tests | APPLIED — WB1/WB2/WB3/WB5 |
| Q-E5 | Probe placement | Inside existing `describe('Phase 2 Step 3 — PlanRing')` and `describe('Phase 2 Step 4 — CostPill')` blocks | APPLIED — WB1 |

**Confidence:** KNOWN.

---

## §3 Probes ran (test count before/after)

### Before (main HEAD `1098ebb`)
- `test/plan-ring.test.tsx` — 8 tests
- `test/cost-pill.test.tsx` — 5 tests
- `test/layout.test.tsx` — 9 tests (including obsolete cluster-wrapper assertion at lines 149-153)
- **dispatch-web full suite — 46 files / 279 tests** (MODELED — pre-edit baseline derived from delta math; 281 post-migration minus 2 new probes; not directly captured pre-edit)

### After (sess-e tip `52526ef`)
- `test/plan-ring.test.tsx` — **9 tests** (+1: per-field data-mock probe)
- `test/cost-pill.test.tsx` — **6 tests** (+1: per-field data-mock probe)
- `test/layout.test.tsx` — **9 tests** (cluster-wrapper test removed; negative-assertion test added; net 0)
- **dispatch-web full suite — 46 files / 281 tests, all passing** (KNOWN — `pnpm --filter dispatch-web test` output captured WB6)

### Tests added
1. `plan-ring.test.tsx` — `marks root with data-mock="true" + data-testid="header-plan-ring" for per-field mock visibility` (KNOWN)
2. `cost-pill.test.tsx` — `marks root with data-mock="true" + data-testid="header-cost-pill" for per-field mock visibility` (KNOWN)
3. `layout.test.tsx` — `cluster wrapper does NOT carry data-mock; per-field markers live on PlanRing + CostPill roots` (KNOWN)

### Tests removed
1. `layout.test.tsx:149-153` — `marks the mock cluster with data-mock="true" for dev visibility` (the obsolete `container.querySelector('[data-mock="true"]')` test, removed per Q2 + FACT-E10) (KNOWN)

### Tests modified
- `layout.test.tsx` — describe-block label renamed `header mock cluster` → `header per-field mock markers`; describe-block header comment (lines 133-138) rewritten to reflect per-field model (KNOWN)

**Confidence:** KNOWN for after-state and added/removed tests; MODELED for the exact 279 pre-edit baseline (computed from 281 - 2 new probes).

---

## §4 Ladder commits

| WB | Hash | Type | Subject |
|---|---|---|---|
| WB1 | `37c585d` | red | `red(MB-F-LAYOUT-DATA-MOCK-PER-FIELD-BACKFILL): WB1 — per-field test probes` |
| WB2 | `99fe145` | green | `green(...): WB2 — PlanRing root data-mock + testid + comment` |
| WB3 | `c4e1373` | green | `green(...): WB3 — CostPill root data-mock + testid + comment` |
| WB4 | `8e8b8e9` | green | `green(...): WB4 — Layout cluster wrapper cleanup + comment` |
| WB5 | `52526ef` | green | `green(...): WB5 — layout.test negative assertion migration` |
| WB6 | (no commit) | regression | Full dispatch-web suite verification: 46 files / 281 tests pass; FORBIDDEN paths byte-identical to main; typecheck clean. No file delta, so per brief "may be combined into WB5 commit if no new file" — no separate commit. |
| WB7 | (this file) | refactor | `refactor(...): WB7 — REPORT.md aggregate` |
| WB8 | (pending) | docs | `docs(...): WB8 — sess-e finding entry` |

Per-commit-push: every commit pushed to `origin sess-e/layout-data-mock` immediately after creation.
Per-path `git add`: explicit paths only (NEVER `git add -A`).
Pre/post-commit discipline: `git status --short` pre, `git log -1 --stat` post — captured for every commit.

**Confidence:** KNOWN — hashes verified via `git log --oneline 1098ebb..HEAD`.

---

## §5 What this defends against

- **Per-field marker pattern consistency** with FocusedDetailPanel (sess-b batch-4). Future readers and dev-tools users see the same `data-mock="true"` placement convention everywhere mocks live: on the leaf primitive, not on a wrapper. (KNOWN)
- **Regression-hider deletion:** the old `container.querySelector('[data-mock="true"]')` test would have falsely passed post-migration (matching per-field markers on the wrong element — FACT-E10). Replacing it with a structural negative assertion + per-field positive assertions catches: (a) future cluster wrappers gaining a redundant marker, (b) future PlanRing or CostPill losing their per-field marker, (c) future tree restructuring that breaks the parent-child relationship. (KNOWN)
- **Comment-truth alignment:** PlanRing.tsx:7 previously claimed the marker stays at "the source-of-truth boundary" (Layout). After this migration that claim is reversed. Updating the comment now prevents future readers from being misled by stale prose. (KNOWN)

**Confidence:** KNOWN.

---

## §6 What this does NOT do

- Does NOT change Layout grid structure or the 60/40 lg breakpoint (KNOWN — Layout.tsx lines 30-50 unchanged except line 35 attribute removal).
- Does NOT modify FocusedDetailPanel.tsx or focused-detail.test.tsx (FORBIDDEN — sess-b territory) (KNOWN — git diff confirms zero bytes changed).
- Does NOT modify StateControlCluster, SendButton, PullButton, SendModal, ConnectionStatusBanner, PanelErrorBoundary, SessionListPanel, TickerPanel, InBannerHost, OrchestratorCardsExtras (KNOWN — git diff scope is exactly Layout/PlanRing/CostPill + their three tests).
- Does NOT modify `src/store/ui.ts` — no state changes needed (KNOWN).
- Does NOT modify daemon, core, or cli packages (KNOWN — Sessions D + F territories untouched).
- Does NOT change the daemon plan/cost endpoints followup status — that remains pending separate action per Layout.tsx comment lines 19-21 (preserved verbatim) (KNOWN).
- Does NOT add real plan/cost data — `MOCK_USAGE_PCT`, `MOCK_RESET_MS`, `MOCK_USD_TODAY` constants are unchanged (KNOWN).

**Confidence:** KNOWN.

---

## §7 §G gaps surfaced

1. **Stale comment in Layout.tsx:13 referencing `/tmp/sess-1-dispatch-web-ui-diagnose.md`** — that's a Phase-1 scratchpad file from a much earlier batch. The reference still exists post-migration (untouched). Cleaning it up is out of scope for this finding but worth flagging for a future docs sweep. (MODELED — minor.)

2. **Pre-edit dispatch-web full-suite count** was not directly captured before WB1 began. The post-migration count of 281 with +2 new tests implies a baseline of 279, which is consistent with the brief's "46+ / 280+" estimate but not directly verified. Future similar batches should run `pnpm --filter dispatch-web test` once at start to lock the baseline. (MODELED.)

3. **Other dispatch-web components with `data-mock="true"`** were not audited as part of Phase 1 (out of scope per Halt Class 2). A future scout pass could check for any remaining cluster-wrapper-only `data-mock` placements across `packages/dispatch-web/src/components/` and file followups if found. The Layout cluster was the only one identified by sess-b's finding #140 §Followups #2. (SPECULATIVE — no audit run.)

4. **Vitest stdout shows error-boundary "test error" log spam** during `layout.test.tsx` runs (visible in WB4/WB5 captures). Pre-existing, intentional (the per-panel error isolation test at lines 173-214 fires real errors into mocked panels). Not introduced by sess-e and not in scope to silence. (KNOWN.)

5. **No e2e / browser verification was run** — sess-e is unit-test only. Per-field markers should be visible in dev-tools after `pnpm dev`, but visual confirmation is left to the operator merge step. (KNOWN — brief did not require browser verification.)

**Confidence:** MODELED for items 1-3; KNOWN for items 4-5.

---

## §8 Operator next steps

1. Review the 5 ladder commits + the upcoming WB8 finding entry on `sess-e/layout-data-mock`.
2. Optionally run `pnpm dev` and inspect the header in browser dev-tools — confirm `data-mock="true"` appears on the PlanRing root `<div>` and the CostPill root `<span>`, NOT on the wrapping cluster `<div>`.
3. Merge `sess-e/layout-data-mock` → `main` (sess-e does NOT self-merge per Phase 2 close instruction).
4. After merge, the daemon plan/cost endpoints followup (carried forward from sess-b finding #140 §Followups #1, preserved verbatim in Layout.tsx:19-21 comment) remains pending separate action — operator may file as a Tier-2 or schedule for a future batch.

**Confidence:** KNOWN.

---

## End of report

HALT for operator merge after WB8.
