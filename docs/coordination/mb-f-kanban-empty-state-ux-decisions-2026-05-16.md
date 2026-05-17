# MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX closure — decisions (2026-05-16)

**Session**: SESSION-r12-t1c-w1-kanban-empty-state-ux
**Source**: Phase 1 diagnose + WB1/WB2 implementation observations

---

## Decision 1 — File location: `src/components/` (not `src/kanban/`)

**Original dispatch territory**: `packages/dispatch-web/src/kanban/empty-state.tsx` + `kanban-region.tsx` (NEW directory).

**Decision**: Place new component at `packages/dispatch-web/src/components/KanbanEmptyState.tsx`; edit existing `packages/dispatch-web/src/components/KanbanPanel.tsx`.

**Rationale**:
- [KNOWN per `ls`] `src/kanban/` does not exist; `src/components/` is the established flat convention for dispatch-web (`KanbanPanel.tsx`, `KanbanColumn.tsx`, `CostPill.tsx`, `Layout.tsx`, ~22 sibling components).
- CLAUDE.md §3.2 explicitly forbids nested category directories for `dispatch-workstation`; dispatch-web shares the convention spirit.
- Operator-acked via manifest-expansion-3 (2026-05-16) after HALT-MANIFEST-EXPANSION-Q-2 disambiguation.

**Trade-off**: Followup row body referenced "kanban-region" generically; redirecting to the actual file names (`KanbanPanel.tsx`, `KanbanEmptyState.tsx`) preserves semantic intent.

---

## Decision 2 — Conditional semantic: "no visible sessions" (refined from "0 non-killed")

**Row body wording**: "renders an explicit empty-state placeholder when zero non-killed sessions exist in `sessions.json`".

**Decision**: Empty-state condition is `main.length === 0 && archived.length === 0` (no visible sessions), NOT strictly `main.length === 0` (no non-killed).

**Rationale**:
- The operator's actual perceived-broken-UI failure mode is a blank rectangle. If `showArchived=true` AND there are killed sessions, the Archived column IS visible — the rectangle is NOT blank. Showing empty-state in that case would HIDE the visible content (regressing the `kanban.test.tsx:190-212` "on mount with localStorage='true', restores showArchived" test).
- The literal "0 non-killed" wording captures the common case (`showArchived=false`, where `archived` is always `[]`) but breaks the showArchived-true edge case.
- Semantic refinement matches operator INTENT (close the perceived-blank-UI bug) over LITERAL wording.

**Verification**: caught via per-WB consumer non-regression discipline (`[[feedback_consumer_non_regression_per_wb]]`) — initial naïve condition passed all 4 new probes but regressed 1 existing test; refined before commit.

**Trade-off**: Refinement exceeds row body verbatim wording. Surfaced explicitly in commit body + this decisions doc + closure-stamp proposal.

---

## Decision 3 — Q-KANBAN-3 REPLACE-CONTENT pattern (header preserved)

**Decision**: Replace only the column-grid `<div>` (KanbanPanel.tsx lines 87-107 pre-WB2-GREEN) with the ternary `{empty? <KanbanEmptyState/> : <div class="grid">…</div>}`. The `<header>` element (Sessions title + Show archived checkbox) renders unconditionally.

**Rationale**:
- The Show archived toggle MUST remain accessible even when empty-state shows — operator can flip it to see killed sessions if any exist.
- The Sessions h2 provides region identity (`role="region" aria-label="Sessions"`).
- Test assertion #4 ("preserves the Sessions header") verifies header survives the conditional.

**Trade-off**: Alternative OVERLAY pattern (render empty-state on top of grid) was considered and rejected — would visually contradict the "no sessions" message if columns showed in the background.

---

## Decision 4 — Probe extension: `.test.tsx` (not `.spec.tsx`)

**Dispatch wording**: `probe-mbf-kanban-empty-state-01-renders-placeholder-text.spec.tsx`.

**Decision**: Use `.test.tsx` extension.

**Rationale**:
- [KNOWN per `cat packages/dispatch-web/vitest.config.ts`] glob is `test/**/*.test.{ts,tsx}` — `.spec.tsx` would not be discovered without a config change (outside territory + scope-inflating).
- Mechanical naming adaptation only; no behavioral or scope change.

---

## Decision 5 — kanban.test.tsx:50-67 test seed update (not test deletion)

**Pre-existing test**: `it('renders 4 main columns in v1 sort order...', async () => { server.use(...{ sessions: {} }...); … })`

**Decision**: Seed 1 session (`'seed-session'` with `computed_status: 'idle'`) so the grid renders; preserve sort-order assertion intent. Do NOT delete the test.

**Rationale**:
- Sort-order assertion is independent of which session is seeded; the column-order check (`awaiting_review > stale > running > idle`) remains valuable.
- Test deletion would lose the regression guard for column-order semantics.
- Single-session seed is the minimal change preserving original test intent.
- Operator-acked via manifest-expansion-4 (2026-05-16) for the in-place edit.

---

## Decision 6 — WB3 not triggered (no new hook needed)

**Original dispatch conditional**: "WB3 (CONDITIONAL — if Q-KANBAN-1 surfaces new hook need)".

**Decision**: WB3 not authored. Existing `useSessions()` hook sufficient.

**Rationale**: `KanbanPanel.tsx` already consumes `useSessions()` at line 25; the conditional render at line 70 has direct access to `main` and `archived` derived values without needing a separate `useNonKilledSessionCount` hook.

**Trade-off**: A dedicated hook could centralize the "count" semantic if other consumers later need it. Deferred to YAGNI — no second consumer exists.
