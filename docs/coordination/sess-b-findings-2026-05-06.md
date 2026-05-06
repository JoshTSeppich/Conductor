# Session B — parallel-batch-4-2026-05-06 — Findings (append-only)

**Branch:** `sess-b/detail-pane-rearb`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-b-detail-pane-rearb`
**Cut from:** `main` HEAD `b3da626`
**Date opened:** 2026-05-06

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the reserved #140-#144 range (Phase 2 brief
WB8). Numbers below are working entries; operator may renumber on
merge.

---

## Finding #140 — MB-F-DETAIL-PANE-STANDARD-BUNDLE-SHIPPED

**Date filed:** 2026-05-06
**Tier:** 2 (UI surface delivery; closes parallel-batch-3 Session 1
no-op work via re-arbitration. Not Tier 1 because no production-
runtime defect was at play; not Tier 3 because the work
substantively closes operator-acked ship gap from a prior batch).
**Origin:** parallel-batch-3 Session 1 was closed as a no-op because
its Phase 1 brief was drafted under the incorrect assumption that no
detail panel existed (the brief said "create a NEW DetailPane.tsx").
The first session's Phase 1 scout found the existing
`FocusedDetailPanel.tsx` already mounted in `Layout.tsx:48`,
surfaced the collision, and HALTed for re-arbitration. Operator
re-drafted the parallel-batch-4 Session B brief with the existing
surface acknowledged upfront and the work re-scoped from "create
new" to "REFACTOR FocusedDetailPanel in place."
**Discovered by:** Operator at parallel-batch-3 close (no-op
arbitration); resolved by Session B (this batch) Phase 2.
**Resolution status:** SHIPPED on `sess-b/detail-pane-rearb`,
ladder commits `2e1eb95` … `66e5c65` (7 commits across WB1-WB7); WB8
(this entry) is the final commit.

### Symptom (KNOWN — direct read of pre-refactor source)

`packages/dispatch-web/src/components/FocusedDetailPanel.tsx` at
main HEAD `b3da626` rendered six rows in its success branch:
**State / Status / Last commit / Tests / Phase / Last action** —
none of which match the Wireframe Detail Pane "Standard bundle"
field set (model + status + last activity + plan + cost + stdout).
The pre-refactor body was inconsistent with the Wireframe header
which already mocked plan + cost via `Layout.tsx:35` (the
`PlanRing` + `CostPill` cluster with `data-mock="true"`).

The collision between "no detail panel" (parallel-batch-3 Session 1
brief assumption) and "FocusedDetailPanel exists at L48 of
Layout.tsx" (verified scout finding) caused a full Phase-1 no-op,
costing one session of parallel work.

### Defect class

UI-surface-delivery defect — the wireframe specification (Standard
bundle field set) was not yet realised in the focused-session
detail surface despite the panel itself shipping. Re-arbitration
overhead was the secondary cost (one no-op session); methodology
gap is the lesson.

### Resolution

8 work blocks (WB1-WB8) shipped via 8 ladder commits with cairn
RED→GREEN discipline (per-commit-push, per-path `git add`,
`git status --short` pre-commit verification, `git log -1 --stat`
post-commit verification, Confidence label in every commit body):

| WB | Surface | Evidence |
|---|---|---|
| WB1 | Test migration — delete 6 obsolete tests, migrate 1, keep 3, add 9 new RED cases targeting Standard bundle | RED phase: 5/6 pass/fail; new tests target post-refactor production state |
| WB2 | Refactor success branch: remove State / Last commit / Tests / Phase rows; rename "Last action" → "Last activity"; drop dead helpers (`formatTests`, `formatPhase`, `formatCommit`) and dead imports (`CommitEntry`, `StatusJson`); drop `commitBySession` subscription | 7/4 pass/fail post-WB2; REAL-field tests now green |
| WB3 | Add MOCK field renderers + per-field `data-mock="true"`: model chip + plan summary + cost summary + stdout snippet (10 lines); `MockSummaryRow` component + inline `MOCK_*` constants | 11/0 pass/fail post-WB3; all bundle tests green |
| WB4 | Last-activity null-both edge case verified; `formatLastActivity` comment formalises the both-null → DASH contract | Test "renders em dash for last activity when both timestamps are null" passes since WB2; comment defends future-edits |
| WB5 | `MOCK_STDOUT_LINES` content finalised — accuracy fix ("✓ 8 tests passed" → "✓ 11 tests passed (1 file)") + narrative-arc tightening (edit → tests → tsc → lint → commit → push → handoff → idle) | 11/0 pass/fail; exact-10-line assertion still passes |
| WB6 | Full-suite regression check (46 files / 279 tests pass); FORBIDDEN files (`Layout.tsx` / `StateControlCluster.tsx` / `SendButton.tsx` / `PullButton.tsx` / `ui.ts` / `schema.ts`) byte-identical to main HEAD `b3da626`; JSDoc on `FocusedDetailPanel` anchors the Standard bundle contract | `git diff b3da626 HEAD -- <FORBIDDEN>` returns 0 lines |
| WB7 | Aggregate REPORT.md at `packages/dispatch-web/test/focused-detail-refactor/REPORT.md` | KNOWN; documents probes, ladder, evidence chain, defends-against matrix, §G gaps |
| WB8 | This finding entry | n/a |

**Net source LOC:** +91 / -68 in production code
(`FocusedDetailPanel.tsx`); +89 / -97 in test code
(`focused-detail.test.tsx`); +265 in REPORT.md; +~180 in this
finding entry. **Total branch diff vs main:** 2 production / test
files (181 net additions) + 2 documentation files.

### Source-side seam additions

- **`MockSummaryRow` component** — internal to
  `FocusedDetailPanel.tsx`; mirrors `Row`'s flex layout but the
  wrapper itself carries `data-mock` + `data-testid`, avoiding
  duplicate-testid hazard from wrapping `Row` directly.
- **`MOCK_*` inline constants** — `MOCK_MODEL_LABEL`,
  `MOCK_PLAN_SUMMARY`, `MOCK_COST_SUMMARY`, `MOCK_STDOUT_LINES`
  (readonly array, 10 entries). Inline placement matches
  `Layout.tsx:22-24` precedent (`MOCK_USAGE_PCT` etc.).
- **JSDoc on `FocusedDetailPanel`** — documents the Standard bundle
  field set + data-mock placement + preserved-cluster decision so
  future edits read the contract at the function declaration site.
- **`formatLastActivity` comment** — formalises the both-null →
  DASH contract; defends against future edits stripping the null
  check on the implicit assumption that one timestamp is always
  present (`Date.parse(null)` would yield `NaN` → `"NaNm"`
  regression).

### What this DOES NOT do (operator-acked)

Per Phase 2 brief explicit non-goals:

- **Does not change the 60/40 grid layout.** `Layout.tsx` is
  unchanged on disk vs main HEAD `b3da626`.
- **Does not modify `StateControlCluster.tsx`, `SendButton.tsx`,
  `PullButton.tsx`.** Forbidden per Phase 2 brief; verified
  byte-identical via `git diff b3da626 HEAD --`. Their preserved
  positioning + props is the operator-action surface the panel
  holds at its bottom (regression-tested in WB1 §3.4).
- **Does not modify `store/ui.ts`.** The `commitBySession` slice +
  `setFocus` action stay as-is. The panel's subscription to
  `commitBySession` is removed but the slice's other consumers
  (GAP-2 commit reduce et al.) are untouched.
- **Does not modify `dispatch-core/src/v2/schema.ts`.** Schema is
  frozen; mock fields exist precisely because the schema does not
  surface model / plan / cost / stdout.
- **Does not add real plan / cost / model / stdout endpoints to
  the daemon.** Daemon-side surface is a §G2 followup (Tier-2),
  not this batch's scope.
- **Does not replicate per-field `data-mock="true"` markers in
  `Layout.tsx`.** Operator Q6 explicitly accepts the per-field /
  cluster-wrapper divergence between the two files; backfill is a
  §G1 followup (Tier-3) if pattern consistency matters.

### Methodology lesson (operator-relevant)

Drafting a Phase 1 brief from an incorrect assumption about the
existing surface ("no detail panel exists" → "create a NEW
DetailPane.tsx") cost parallel-batch-3 Session 1 a full no-op. The
re-arbitrated parallel-batch-4 Session B brief opened with explicit
acknowledgment ("FocusedDetailPanel.tsx ALREADY EXISTS at
packages/dispatch-web/src/components/FocusedDetailPanel.tsx,
mounted in Layout.tsx:48 in a permanent lg:grid-cols-[60%_40%]
layout"), pre-arbitrated the architecture decision (REFACTOR not
replace not coexist not slide-in overlay), pre-arbitrated the field
set (which fields are REAL vs MOCK), pre-arbitrated test territory
(MODIFY focused-detail.test.tsx is normal and required), and listed
8 §6 arbitration questions covering edge cases + label rename +
mock content format + per-field-vs-cluster `data-mock` precedent +
filename date drift. The re-drafted brief shipped clean in 8
commits.

**Generalizable rule:** Phase 1 briefs MUST verify the existing
surface (reading the production tree, not assuming) BEFORE drafting.
The brief's "READ THESE FILES BEFORE DRAFTING ANYTHING" step in
parallel-batch-4 Session B is the pattern. This rule was already
implicit in cairn §3.1; the parallel-batch-3 Session 1 no-op makes
it explicit.

### Followups (not addressed; for operator triage)

1. **Real plan / cost / model / stdout endpoints on daemon-side
   `SessionResponseV2`.** Currently MOCK because schema does not
   surface them. UI flips `data-mock` off when shipped. **Tier-2.**
2. **Per-field vs cluster `data-mock="true"` consistency between
   `FocusedDetailPanel.tsx` (this batch, per-field) and
   `Layout.tsx:35` (existing, cluster).** Backfill batch could lift
   `Layout.tsx` to per-field markers. Not load-bearing for either
   surface today. **Tier-3.**
3. **Recent stdout vs `recent_events` naming.** `recent_events` is
   a REAL field on `SessionResponseV2` (max 50 events) but is
   structured event-log, not stdout text. Brief explicitly directed
   MOCK rendering. A future batch may render `recent_events`
   directly under a "Recent events" label, leaving stdout snippet
   as a separate (still-mock) field if ever surfaced. **Tier-3.**
4. **External-monorepo testid refs.** `detail-row-last-action` was
   removed everywhere in `packages/`. External e2e suites or
   browser-extension tests outside this monorepo (none known)
   would be affected if any exist. **Tier-3.**
5. **Layout.tsx similar followup note exists for daemon plan/cost
   endpoints.** Lines 19-21 (Layout.tsx pre-existing comment): "A
   finding for daemon plan/cost endpoints will be filed as part of
   post-batch followup." This finding (#140) does NOT discharge that
   note — Layout.tsx's plan/cost are PlanRing + CostPill in the
   header, distinct from the Detail Pane's plan summary + cost
   summary rows. Operator may merge the followups into a single
   §G2 daemon-side feature batch.

### Cross-references

- Phase 1 close report — `/tmp/sess-b-detail-pane-rearb-diagnose.md`
  (operator-reviewed; operator-arbitrated Phase 2 brief is the
  in-conversation message that authorized Phase 2 execution).
- `packages/dispatch-web/test/focused-detail-refactor/REPORT.md`
  — aggregate REPORT for this cluster's WB1-WB6 ladder.
- Operator-acked existing finding-style note in `Layout.tsx:18-21`
  — pre-batch comment about daemon plan/cost endpoint absence.
- parallel-batch-3 Session 1 close (no-op) — operator-arbitrated
  closure noted in this batch's Phase 1 brief origin paragraph.

### Confidence

- **Symptom**: KNOWN per direct read of pre-refactor source at main
  HEAD `b3da626` (Phase 1 §1 enumerated the 6 rows, line ranges,
  data sources, and confirmed the Standard-bundle mismatch).
- **Resolution structure**: KNOWN per WB1-WB6 ladder; 11 tests in
  the focused-detail.test.tsx file all KNOWN-pass; full
  dispatch-web suite (46 files / 279 tests) KNOWN-pass.
- **Forbidden-file invariance**: KNOWN — `git diff b3da626 HEAD --
  <FORBIDDEN>` returns 0 lines for all six listed files.
- **Schema verification**: KNOWN — `SessionResponseV2` has no
  model / plan / cost / stdout fields (verified at schema.ts:86-98
  + L264-268, Phase 1 §2).
- **Methodology lesson generalizability**: MODELED — the rule
  ("Phase 1 briefs must verify existing surface before drafting")
  is consistent with cairn §3.1 but the no-op cost data point is
  N=1 (parallel-batch-3 Session 1).

### §10.5 self-check (resolution append)

1. **API verified by spike?** n/a — refactor of existing UI
   component; no novel transport. The `SessionResponseV2` shape +
   `useSession` hook + `useUIStore.focusedSessionName` subscription
   are all pre-existing surfaces with prior test coverage.
2. **Test exercises behavior or mocks?** exercises — 11 probes use
   real React Testing Library render against MSW-mocked daemon
   responses. The `useSession` query layer + `useUIStore` zustand
   store + `formatAge` util are real implementations under test.
   Mocks limited to MSW HTTP responses (the standard pattern in
   dispatch-web) and the StateControlCluster/Send/Pull buttons run
   their real implementations against MSW responses too.
3. **Implementation deleted, test still passes?** no — verified
   per-WB:
   - WB2: revert testid rename → status+last-activity test fails
     (`getByTestId('detail-row-last-activity')` throws).
   - WB2: revert label rename → "Last activity" text assertion fails.
   - WB3: delete model chip render → `getByTestId('detail-row-model')`
     test fails.
   - WB3: delete `data-mock="true"` from any mock wrapper →
     `toHaveAttribute('data-mock', 'true')` test for that row fails.
   - WB3: drop the `MOCK_STDOUT_LINES` array to 9 entries →
     "exactly 10 lines" test fails.
   - WB6: drop StateControlCluster from success branch →
     regression-cluster test fails (Arm/Pause/Hold/Kill not found).
4. **Anything outside contract?** no — `CONDUCTOR_API_CONTRACT.md`
   unchanged; v2 schema unchanged; UI store shape unchanged. The
   refactor is internal to one component file plus its test file.
5. **Modified contract?** no.
6. **Unlabeled claims?** no — KNOWN / MODELED / SPECULATIVE used
   per-claim throughout this entry, REPORT.md, and per-commit
   bodies.
7. **Touched a file another session may modify?** no — all source
   changes inside `packages/dispatch-web/src/components/
   FocusedDetailPanel.tsx` + test changes inside
   `packages/dispatch-web/test/focused-detail.test.tsx` (Session B
   territory per Phase 2 brief). Cross-checked: no edits to
   `packages/dispatch-daemon/` (Session A + Session C territories),
   `packages/dispatch-cli/` (Session C territory),
   `packages/dispatch-core/` (Session A territory; frozen for this
   batch). Per-commit `git status --short` recorded in each commit's
   commit message; per-path `git add` enforced.
8. **Pre-push protocol?** per-commit-push (`git push origin
   sess-b/detail-pane-rearb` after each of 8 commits; per-commit
   `git log -1 --stat` verification). Per-path `git add` (no `git
   add -A`). Pre-commit `git status --short`.
9. **Confidence labels?** KNOWN / MODELED / SPECULATIVE used
   per-claim; defends-against matrix in REPORT.md §5 labels each
   row.
