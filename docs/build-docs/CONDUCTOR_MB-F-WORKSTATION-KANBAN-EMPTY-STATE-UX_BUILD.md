# CONDUCTOR MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX — build doc

**Status**: CLOSED 2026-05-16 (Tier 1 ship-gate concern resolved)
**Closure session**: SESSION-r12-t1c-w1-kanban-empty-state-ux (Round 12 Wave T1-CLOSURE-Wave-1 expansion cohort)
**Source row**: `docs/FOLLOWUPS.md:173` (filed `a94fecb` 2026-05-06 evening; OPEN through 2026-05-15)

---

## §1 — Problem

Operator screenshot 2026-05-06 evening showed a blank dispatch-web kanban region in the workstation embedded webview. Triangulation: all sessions in `killed` state, no live tmux server; dispatch-web kanban was rendering correctly (4 empty columns + "No <status> sessions" placeholders inside each) but the **operator perceived the region as broken UI rather than zero-state**.

Distinct from the earlier `MB-F-WORKSTATION-KANBAN-VIEWPORT-BLANK` (Tier 1, renderer crash, RESOLVED at `01dfd54`) — this entry tracked a separate UX gap: even when the renderer works correctly, the visual presentation under all-killed conditions reads as a bug.

---

## §2 — Ship-gate framing

Operator-visible perceived-broken-UI ship-gate concern (Tier 1). Until closed, every all-killed-session screenshot looked like a regression of the renderer-crash fix, masking real bugs and burning operator triage time.

---

## §3 — Closure path landed

### §3.1 — Component
**NEW** `packages/dispatch-web/src/components/KanbanEmptyState.tsx` (13 lines)
- Pure functional React component
- Renders `<p>No active sessions</p>` + `<p>Click + Spawn Session to start.</p>`
- Exposes `data-testid="kanban-empty-state"` for conditional-render probe assertions
- Tailwind classes match dispatch-web `src/components/` convention (flex-1 fill, dark-mode-aware gray text, centered)

### §3.2 — Consumer wiring
**EDIT** `packages/dispatch-web/src/components/KanbanPanel.tsx`
- Import KanbanEmptyState
- Replace column-grid `<div>` (lines 87-107 pre-edit) with conditional ternary:
  ```tsx
  {main.length === 0 && archived.length === 0 ? (
    <KanbanEmptyState />
  ) : (
    <div className="grid …">…columns…</div>
  )}
  ```
- Header (Sessions title + Show archived checkbox) preserved unconditionally

### §3.3 — Conditional semantic (Q-KANBAN-2 refinement)
Empty-state renders when **no visible sessions** (main=0 AND archived=0), not strictly when 0-non-killed. Rationale: when `showArchived=true` and there ARE killed sessions, the Archived column is visible — that's not a blank rectangle; the operator can see content. Refinement caught via per-WB consumer non-regression check against the existing `kanban.test.tsx:190-212` localStorage-restore test.

### §3.4 — Test coverage
- **NEW** `test/probe-mbf-kanban-empty-state-01-renders-placeholder-text.test.tsx` (2 tests) — component-level render contract
- **NEW** `test/probe-mbf-kanban-region-empty-02-conditional-render.test.tsx` (4 tests) — KanbanPanel conditional render: empty-state on 0-visible (3 cases) + grid on ≥1-non-killed (1 control) + header preservation
- **EDIT** `test/kanban.test.tsx:50-67` — seed `'seed-session'` so sort-order test still exercises the column grid (was previously seeding `{}` and asserting columns render with 0 sessions — that was the bug)

---

## §4 — Commit ladder

| WB | Commit | Subject |
|---|---|---|
| WB1 RED | `c79470f` | red(MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX): WB1 — RED probe asserts KanbanEmptyState renders placeholder text + testid |
| WB1 GREEN | `92fbc41` | green(MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX): WB1 — KanbanEmptyState component renders placeholder text + testid |
| WB2 RED | `43e97fe` | red(MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX): WB2 — RED probe asserts KanbanPanel conditional-render swap empty-state⇄grid |
| WB2 GREEN | `d212c80` | green(MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX): WB2 — KanbanPanel renders KanbanEmptyState when no visible sessions; kanban.test.tsx seeded for new semantics |
| WB-final | (this commit) | docs(MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX): WB-final — 4 docs + verification ledger |

---

## §5 — Verification

| Gate | Result |
|---|---|
| Full dispatch-web vitest | 326 passed (54 files) |
| `pnpm --filter dispatch-web build` | CLEAN (893ms) |
| `pnpm --filter dispatch-web typecheck` | CLEAN |
| Per-WB consumer non-regression check | applied at WB2 GREEN; caught Q-KANBAN-2 refinement |
| Per-path `git add` + `git commit -o` discipline | applied at all 5 commits; zero cross-session contamination |

---

## §6 — Arbitrations (manifest expansions)

3 HALT-MANIFEST-EXPANSION cycles during this closure (all operator-acked within minutes):

- **Expansion-2** (Path A vs B disambiguation) — operator confirmed `src/components/` flat-convention over `src/kanban/` nested-directory creation
- **Expansion-3** (TERRITORY redirect from `src/kanban/*` to `src/components/*`) — explicit grant for the actual file paths
- **Expansion-4** (TERRITORY add `packages/dispatch-web/test/kanban.test.tsx` lines 50-67) — single test seed update for consumer regression repair

---

## §7 — Methodology evidence

Documented in coordination findings doc §III. Notable:
- Anti-fabrication discipline (§2.1) caught territorial-path mismatch via `ls` before any RED authoring
- Bidirectional territory fences (§2.9) refused interpretation of operator-internal-inconsistency, surfaced for disambiguation
- Per-WB consumer non-regression check (`[[feedback_consumer_non_regression_per_wb]]`) caught the Q-KANBAN-2 refinement need before commit
- Per-path discipline (§2.7) defended against ≥3 concurrent sibling-session in-flight writes

---

## §8 — Followup proposals

| ID | Tier | Disposition |
|---|---|---|
| MB-F-T12-TILE-GRID-EMPTY-STATE | 2 | Sibling-surface propagation: MB-T12 tile-grid likely needs the same "main+archived count" pattern. Verify against MB-T12 WB13 closure; if uncovered, file. |
| MB-F-PROBE-AUTHOR-WAITFOR-DATA-NOT-SCAFFOLDING | 3 | Probe-author discipline: wait on data-bearing text, not scaffolding (which renders before data resolves). Worth a CLAUDE.md §3.6 note. |

---

## §9 — References

- Source row: `docs/FOLLOWUPS.md:173`
- Coordination findings: `docs/coordination/mb-f-kanban-empty-state-ux-findings-2026-05-16.md`
- Coordination decisions: `docs/coordination/mb-f-kanban-empty-state-ux-decisions-2026-05-16.md`
- Coordination impl-coord: `docs/coordination/mb-f-kanban-empty-state-ux-impl-coord-2026-05-16.md`
- Dispatch: `/tmp/r12-t1c-w1-kanban-empty-state-ux-dispatch.txt`
- Territorial manifest: `docs/coordination/territorial-manifests/r12-t1c-w1-kanban-empty-state-ux.txt` (gen-6 manifest-expansion-3 + 4)
