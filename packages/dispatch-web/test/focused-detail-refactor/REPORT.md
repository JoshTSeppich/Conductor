# MB-F-DETAIL-PANE-STANDARD-BUNDLE — REPORT

**Cluster:** Wireframe Detail Pane re-arbitrated — refactor `FocusedDetailPanel` to render the Standard bundle
**Branch:** `sess-b/detail-pane-rearb` cut from `main` HEAD `b3da626`
**Phase:** 2 (build + ship)
**Date:** 2026-05-06
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-b-detail-pane-rearb`
**Origin:** parallel-batch-3 Session 1 was no-op'd because its Phase-1 brief was drafted under the incorrect assumption that no detail panel existed. This batch re-arbitrates with `FocusedDetailPanel.tsx` acknowledged upfront.

This report aggregates the WB1-WB6 ladder commits, the test surface
shipped, the evidence chain, and the failure modes each WB defends
against. Confidence labels (KNOWN / MODELED / SPECULATIVE) appear
inline.

---

## §1 What was shipped

### §1.1 Refactor — `packages/dispatch-web/src/components/FocusedDetailPanel.tsx`

The success branch of `FocusedDetailPanel` now renders the Standard
bundle in the order specified by Phase 1 §2. The pre-refactor 6-row
block (State / Status / Last commit / Tests / Phase / Last action)
is replaced with a 6-field bundle (Model chip / Status / Last
activity / Plan summary / Cost summary / Recent stdout snippet) plus
the preserved h2 + StateControlCluster + Send + Pull surface.

| Field | Real / mock | Source / value | Wrapper test ID | `data-mock` |
|---|---|---|---|---|
| h2 heading | n/a | `focusedName` | (none) | n/a |
| Model chip | MOCK | `MOCK_MODEL_LABEL = 'claude-opus-4-7'` | `detail-row-model` | yes (on chip span) |
| Status | REAL | `data.computed_status` | `detail-row-status` | n/a |
| Last activity | REAL | `formatAge(Date.now() - max(last_prompt_sent_at, last_handoff_pulled_at))` or DASH | `detail-row-last-activity` | n/a |
| Plan summary | MOCK | `MOCK_PLAN_SUMMARY = 'usage 47% • resets in 2h 14m'` | `detail-row-plan` | yes (on row wrapper) |
| Cost summary | MOCK | `MOCK_COST_SUMMARY = '$0.42 today • $3.17 this week'` | `detail-row-cost` | yes (on row wrapper) |
| Recent stdout (10 lines) | MOCK | `MOCK_STDOUT_LINES.join('\n')` inside `<pre>` | `detail-stdout-snippet` | yes (on snippet wrapper) |
| StateControlCluster | n/a (preserved) | `<StateControlCluster session={data} name={focusedName} />` | (cluster's own buttons) | n/a |
| Send + Pull | n/a (preserved) | `<SendButton session={data} />` + `<PullButton session={data} />` | (button labels) | n/a |

Code-level deletions (helpers + imports + subscriptions that are no
longer reachable):
- `formatTests`, `formatPhase`, `formatCommit` — pre-refactor row
  formatters, deleted in WB2.
- `import type { CommitEntry } from '../store/ui.js'` — type was
  used only by `formatCommit`, deleted in WB2.
- `import type { StatusJson } from 'dispatch-core/src/v2/schema.js'`
  — used only by `formatTests` / `formatPhase`, deleted in WB2.
- `useUIStore((s) => s.commitBySession)` — last-commit row was the
  sole consumer in this file. The slice itself stays in
  `store/ui.ts` (other consumers / GAP-2 commit reduce unaffected;
  Phase 1 §G7 surfaced the dependency, Phase 2 verified clean).

Code-level additions (Standard bundle renderers):
- `MOCK_MODEL_LABEL`, `MOCK_PLAN_SUMMARY`, `MOCK_COST_SUMMARY` —
  inline string constants per operator Q7 (matches Layout.tsx:22-24
  `MOCK_USAGE_PCT` precedent).
- `MOCK_STDOUT_LINES` — readonly 10-element array, plausible CC-
  session-output style per operator Q3 (timestamps + commands +
  outcome lines; data-mock attr is the dev-tools fake-marker, not
  visual "FAKE" leakage).
- `MockSummaryRow({label, value, testId})` — new component mirroring
  `Row`'s flex layout but the wrapper itself carries `data-mock` +
  `data-testid` (avoids duplicate-testid hazard from wrapping `Row`).
- `formatLastActivity` — renamed from `formatLastAction`; null-both
  contract documented in WB4 comment.
- JSDoc on `FocusedDetailPanel` — anchors the Standard bundle field
  set + data-mock convention + preserved-cluster decision at the
  function declaration (WB6).

### §1.2 Test migration — `packages/dispatch-web/test/focused-detail.test.tsx`

The pre-refactor test surface (10 cases targeting the 6-row block)
is replaced with 11 cases targeting the Standard bundle + preserved
operator-action surface.

Inventory delta (per Phase 1 §3 plan):

| Pre-refactor verdict | Count | Detail |
|---|---|---|
| KEEP unchanged | 3 | placeholder, loading, error |
| MIGRATE | 1 | T2 — drop `state`, rename "Last action" → "Last activity", testid lookup |
| DELETE | 6 | status_json phase + tests rows (3); commit 3-tier (3) |
| ADD (RED in WB1, GREEN by WB3) | 9 | status+last-activity, last-activity-null-both edge, model chip, plan, cost, stdout snippet (10 lines), regression cluster, regression Send+Pull, stdout-data-mock |

Net pre→post: 10 → 11 (+1).

---

## §2 Operator arbitrations applied (Phase 1 §6 → Phase 2 brief)

| Q | Decision | Where applied |
|---|---|---|
| Q1 | Rename "Last action" → "Last activity" | WB2 — label + testid + helper rename |
| Q2 | Keep `<h2>{focusedName}</h2>` | WB2 — preserved at top of success branch |
| Q3 | Stdout snippet uses plausible CC-session-output style | WB3 → finalized in WB5 |
| Q4 | `beforeEach` `commitBySession: {}` reset preserved | WB1 — kept in test setup |
| Q5 | Coordination doc filename uses 2026-05-06 | WB8 — `docs/coordination/sess-b-findings-2026-05-06.md` |
| Q6 | Per-field `data-mock="true"` accepted (Layout.tsx cluster precedent untouched) | WB3 — chip + plan + cost + stdout wrappers |
| Q7 | Mock constants inline in `FocusedDetailPanel.tsx` | WB3 — top-of-file constants |
| Q8 | Old testid `detail-row-last-action` external-ref scout clean | WB1 — `git grep` confirmed only this file referenced it |

---

## §3 Probes ran (KNOWN unless labeled otherwise)

11 tests in `test/focused-detail.test.tsx`. All KNOWN-pass on the
worktree at HEAD of `sess-b/detail-pane-rearb`.

### §3.1 Render-state coverage (3 KEEP-unchanged probes)

| Test | Confidence | Pre-refactor → Post-refactor |
|---|---|---|
| renders placeholder "Click a session card" when no focus | KNOWN | unchanged |
| shows loading state while useSession is fetching | KNOWN | unchanged |
| shows error message when useSession fetch fails | KNOWN | unchanged |

### §3.2 REAL-field coverage (2 probes)

| Test | Confidence | Asserts |
|---|---|---|
| renders status (computed_status) and last activity age in success branch | KNOWN | `awaiting_review` text + `detail-row-last-activity` contains "5m" + label "Last activity" |
| renders em dash for last activity when both timestamps are null | KNOWN | `detail-row-last-activity` contains `—` (DASH) |

### §3.3 MOCK-field coverage (4 probes)

| Test | Confidence | Asserts |
|---|---|---|
| renders mock model chip with `data-mock="true"` | KNOWN | `detail-row-model` `data-mock="true"` + text matches `/claude-/i` |
| renders mock plan summary with `data-mock="true"` | KNOWN | `detail-row-plan` `data-mock="true"` |
| renders mock cost summary with `data-mock="true"` | KNOWN | `detail-row-cost` `data-mock="true"` |
| renders mock stdout snippet with exactly 10 lines and `data-mock="true"` | KNOWN | `detail-stdout-snippet` `data-mock="true"` + `<pre>` textContent splits to 10 entries |

### §3.4 Operator-action-surface regression (2 probes)

| Test | Confidence | Asserts |
|---|---|---|
| regression: StateControlCluster Arm/Pause/Hold/Kill render | KNOWN | All 4 buttons by accessible name |
| regression: SendButton + PullButton render | KNOWN | Send + Pull buttons by accessible name |

### §3.5 Cross-suite regression evidence

- `pnpm --filter dispatch-web test` — 46 files / 279 tests pass.
  Pre-WB1 baseline (per parallel-batch-3 close at b3da626): 278.
  Net +1, consistent with the test-inventory delta in §1.2.
- `pnpm --filter dispatch-web exec tsc --noEmit` — clean.
- `git diff b3da626 HEAD -- <FORBIDDEN>` (Layout.tsx,
  StateControlCluster.tsx, SendButton.tsx, PullButton.tsx, ui.ts,
  schema.ts) → **0 lines changed**.

---

## §4 Ladder commits

| WB | Type | SHA (post-push) | Headline |
|---|---|---|---|
| WB1 | RED | `2e1eb95` | test migration + new red cases |
| WB2 | GREEN | `8846938` | refactor success branch field set |
| WB3 | GREEN | `d27ce60` | mock field renderers + data-mock markers |
| WB4 | GREEN | `78a2a99` | last-activity null-both edge case verified |
| WB5 | GREEN | `f5a45bd` | stdout mock content finalized |
| WB6 | GREEN | `4b5c272` | regression check + forbidden files unchanged |
| WB7 | refactor | (this commit) | REPORT.md aggregate |
| WB8 | docs | (next commit) | sess-b finding entry |

Each commit body carries a `Confidence:` line. Each push is
per-commit per cairn discipline (verified via `git log --oneline
origin/sess-b/detail-pane-rearb`).

---

## §5 What this batch defends against

1. **Wireframe drift between Layout's PlanRing/CostPill header and
   FocusedDetailPanel's body.** Pre-refactor the panel surfaced
   `state` / `last_commit_sha` / `tests` / `phase` — none of which
   appear in the Standard bundle wireframe. Operator-visible
   inconsistency between header (mocks plan + cost) and body (real
   tests + commit) is now removed: body shows the same Standard
   bundle the wireframe specifies.

2. **Per-field mock visibility.** Operator Q6's per-field
   `data-mock="true"` placement gives dev-tools (and tests) per-mock
   independence: a future "real plan endpoint" can flip the plan
   row's `data-mock` off without disturbing model / cost / stdout.
   The cluster-wrapper precedent in Layout.tsx:35 would have
   required all-or-nothing flipping.

3. **Standard bundle contract anchored at the call site.** WB6's
   JSDoc on `FocusedDetailPanel` documents the field set + mock
   placement convention. Future edits read the contract before
   touching the success branch instead of reverse-engineering the
   field set from removed-row commit history.

4. **Last-activity null-both visual stability.** WB4's comment on
   `formatLastActivity` documents the both-null → DASH contract so a
   future edit doesn't strip the null check on the implicit
   assumption that one timestamp is always present (which would
   `Date.parse(null)` → `NaN` → `"NaNm"` regression).

5. **Operator-action-surface preservation.** Two regression tests in
   §3.4 pin the StateControlCluster + Send + Pull mounts inside the
   success branch. A future edit that strips them (because they're
   not in the Standard bundle "fields" list) would fail two tests
   immediately.

---

## §6 What this batch does NOT do

- Does NOT change the 60/40 grid layout. `Layout.tsx` is unchanged
  on disk.
- Does NOT move FocusedDetailPanel's mount point. Still at
  `Layout.tsx:48` inside `PanelErrorBoundary`.
- Does NOT modify `StateControlCluster.tsx`, `SendButton.tsx`,
  `PullButton.tsx`. Forbidden per Phase 2 brief; verified
  byte-identical to main HEAD `b3da626`.
- Does NOT modify `store/ui.ts`. The `commitBySession` slice +
  `setFocus` action + every other piece stays as-is. The
  `FocusedDetailPanel`'s subscription to `commitBySession` is
  removed but the slice's other consumers (GAP-2 commit reduce, etc.)
  are untouched.
- Does NOT modify `dispatch-core/src/v2/schema.ts`. The schema is
  frozen for this batch; mock fields exist precisely because the
  schema does not surface them.
- Does NOT add real plan / cost / stdout endpoints to the daemon.
  Daemon-side surface for these is a §G followup, not this batch's
  scope (Phase 1 §5.1 surfaced the gap; Layout.tsx already carries a
  similar followup note).
- Does NOT replicate per-field `data-mock="true"` markers in
  `Layout.tsx`. Operator Q6 explicitly accepts the per-field /
  cluster-wrapper divergence between the two files.

---

## §7 §G gaps surfaced

| ID | Gap | Tier | Followup home |
|---|---|---|---|
| §G1 | Per-field `data-mock="true"` divergence from Layout.tsx:35's cluster-wrapper precedent. | 3 | Backfill batch could lift Layout.tsx to per-field markers; not load-bearing for either surface today. |
| §G2 | Daemon does not expose model / plan / cost / stdout fields on `SessionResponseV2`. The Standard bundle surfaces them as MOCK because the schema is frozen. | 2 | Daemon-side feature batch — schema additions + endpoint(s); UI flips `data-mock` off when shipped. |
| §G3 | `recent_events` (REAL field, max 50) is the closest real surface to "stdout snippet" but is structured event-log, not stdout text. Brief explicitly directed MOCK rendering rather than rendering recent_events. Decision is recorded; a future batch may render recent_events directly under a different label (e.g. "Recent events"). | 3 | UI batch revisiting recent_events vs stdout naming. |
| §G4 | Old testid `detail-row-last-action` is now removed everywhere in `packages/`. External e2e suites or browser-extension tests outside this monorepo (none known) would be affected. | 3 | Operator review at merge time. |

---

## §8 Operator next steps

1. **Review the diff** `git diff main..sess-b/detail-pane-rearb`.
   Two files changed: `FocusedDetailPanel.tsx` (+159/-93) and
   `focused-detail.test.tsx` (+89/-97). Forbidden files
   byte-identical to `main`.
2. **Merge to main** when ready. No conflicts expected with
   parallel-batch-4 sess-a / sess-c branches per disjoint-territory
   guarantee in the Phase 2 brief (sess-a touches dispatch-core +
   dispatch-daemon; sess-c is read-only against dispatch-daemon +
   dispatch-cli).
3. **Restart `pnpm dev`** in the dispatch-web workspace to see the
   refactored panel rendered live. Expected visual: focused-session
   pane shows model chip + status + last activity (real) + plan +
   cost + stdout snippet (mocks, with `data-mock="true"` visible in
   dev-tools), then StateControlCluster buttons + Send + Pull below.
4. **Followup decisions** (each its own batch):
   - §G2 (real plan / cost / stdout endpoints) — daemon team.
   - §G1 (per-field vs cluster `data-mock` consistency) — UI cleanup
     batch if pattern consistency matters.
