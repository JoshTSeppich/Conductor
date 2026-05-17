# MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX closure — findings (2026-05-16)

**Session**: SESSION-r12-t1c-w1-kanban-empty-state-ux
**Wave**: Round 12 / T1-CLOSURE-Wave-1 expansion cohort
**Dispatch**: `/tmp/r12-t1c-w1-kanban-empty-state-ux-dispatch.txt` (gen-6 orchestrator-2026-05-16-handoff)
**Session-start HEAD**: `735703f` [KNOWN]
**Session-end HEAD**: WB-final commit pending [KNOWN]
**Token posture at WB-final commit**: see RESUMPTION POSTURE surface

---

## §I — KNOWN findings during diagnose

[KNOWN per `ls packages/dispatch-web/src/kanban/` 2026-05-16]
**Territorial-path mismatch.** Dispatch manifest specified WRITE on `packages/dispatch-web/src/kanban/empty-state.tsx` + `kanban-region.tsx`, but `packages/dispatch-web/src/kanban/` directory does not exist. Actual layout: `packages/dispatch-web/src/components/KanbanPanel.tsx` (110 lines, the consumer) + `KanbanColumn.tsx` (column subcomponent). dispatch-web uses flat `src/components/` convention.

HALT-MANIFEST-EXPANSION-Q-1 surfaced to gen-6. Operator initially ACK'd "Path A" (use actual convention) with paths still naming `src/kanban/` — internal inconsistency. HALT-MANIFEST-EXPANSION-Q-2 surfaced. Operator confirmed A′ (use `src/components/`) and credited the disambiguation halt for §11(VIII) plugin retrofit evidence.

[KNOWN per `grep -n "sessions: {}" packages/dispatch-web/test/kanban.test.tsx`]
**Consumer-regression hazard at kanban.test.tsx:50-67.** Existing test asserted `0 sessions → 4 columns render`, encoding the BUG the followup is closing. After WB2 GREEN, that test would have failed. HALT-MANIFEST-EXPANSION-Q-3 surfaced; manifest-expansion-4 granted WRITE on the file (lines 50-67 only — single test seed update).

[KNOWN per vitest output during WB2 GREEN authoring]
**Second consumer-regression caught during pre-commit verification.** Initial conditional `main.length === 0 → empty-state` regressed the existing "on mount with localStorage='true', restores showArchived (Archived column visible)" test (line 190-212), which seeds killed-only sessions with `showArchived=true` — operator CAN see content via the Archived column in that scenario. Refined to `main.length === 0 && archived.length === 0` — empty-state only renders when nothing visible. Per `[[feedback_consumer_non_regression_per_wb]]` — running consumer probes at every WB caught this before commit.

[KNOWN per `cat packages/dispatch-web/vitest.config.ts`]
**Probe extension constraint.** Dispatch specified `.spec.tsx` for probe files. dispatch-web vitest config glob is `test/**/*.test.{ts,tsx}` — `.spec.tsx` would not be discovered. Adapted probes to `.test.tsx` extension (mechanical naming adjustment, not scope change).

---

## §II — Q-KANBAN envelope dispositions

| ID | Disposition | Rationale + verification |
|---|---|---|
| Q-KANBAN-1 | (a) existing-hook-consumption via `useSessions` | `packages/dispatch-web/src/query/useSessions.ts:14` returns `UseQueryResult<SessionsListResponseType>`; `KanbanPanel.tsx:25` already consumes it. No new hook authored (FORBIDDEN territory on `hooks/` avoided naturally). WB3 not triggered. |
| Q-KANBAN-2 | REFINED from row-body "0 non-killed" to "0 visible sessions" | Initial naïve `main.length === 0` regressed the localStorage-restore test (killed-only + showArchived=true → archived column visible, but empty-state would have hidden it). Refined to `main.length === 0 && archived.length === 0`. This better matches the operator's actual perceived-broken-UI failure mode: a TRULY blank rectangle, not a strict non-killed count. |
| Q-KANBAN-3 | (a) REPLACE-CONTENT preserving header | `KanbanPanel.tsx:70-109` structure `<section><header>…</header><div class="grid">…columns…</div></section>` — replaced ONLY the grid `<div>` (now ternary); header unchanged. Probe assertion #4 ("preserves the Sessions header") verifies. |

One refinement (Q-KANBAN-2) above auto-ack envelope — surfaced via consumer-regression discipline, not new arbitration. Documented in decisions doc.

---

## §III — Methodology observations (Round 12 §2 propagation evidence)

[KNOWN] **Three HALT-MANIFEST-EXPANSION surfaces during Phase 1 + WB2 RED.** Operator-authored manifest paths did not match actual codebase layout — caught via `ls` + `grep` reads before any RED authoring. Anti-fabrication discipline (§2.1) operating exactly as intended.

[KNOWN] **Consumer-non-regression discipline caught a second consumer break during WB2 GREEN.** Initial GREEN passed my probes but regressed `kanban.test.tsx:190-212`. Detected pre-commit via running the full kanban suite. `[[feedback_consumer_non_regression_per_wb]]` reinforced.

[KNOWN] **Probe RED can fail for the wrong reason if waitFor target is independent of the data-loading signal.** Initial WB2 RED test 3 ("renders column grid when ≥1 non-killed") failed at 8ms — `waitFor(column)` succeeded immediately because columns render before useSessions resolves; the subsequent sync `getByText('live-session')` then failed against still-loading data. Corrected to wait on the data-bearing text. Worth surfacing as Tier 3 followup: probe-author discipline — wait-for-data, not wait-for-scaffolding.

[KNOWN] **Per-path discipline catches sibling-session in-flight writes.** During this session, ≥3 sibling sessions had files in the working tree (`docs/coordination/territorial-manifests/r12-t1c-w1-kanban-empty-state-ux.txt` — gen-6 manifest expansion; `packages/dispatch-core/test/worktree-fresh-dist/probe-mbfwfd-02-*` — POOL-C #1; `packages/dispatch-workstation/test/integration/_helpers/electron-process-cleanup.ts` — MB-F-ELEAK). All caught by pre-commit `git status --short`; none staged. Per-path `git add` + `git commit -o` discipline operated cleanly.

---

## §IV — Verification ledger

| Step | Command | Result |
|---|---|---|
| WB1 probe pre-implementation | `vitest run …probe-mbf-kanban-empty-state-01…` | RED — import-resolution failure (expected) |
| WB1 GREEN probe | `vitest run …probe-mbf-kanban-empty-state-01…` | 2 passed |
| WB2 probe pre-implementation | `vitest run …probe-mbf-kanban-region-empty-02…` | 3 failed (right-reason: empty-state missing) + 1 passed (control) |
| WB2 GREEN probes | `vitest run …probe-mbf-kanban-region-empty-02…` | 4 passed |
| Per-WB consumer non-regression | `vitest run …kanban.test.tsx …probe-mbf-kanban-empty-state-01… …probe-mbf-kanban-region-empty-02…` | 12 passed (after refinement) |
| Full dispatch-web suite | `pnpm exec vitest run` | 326 passed (54 files) |
| Build | `pnpm --filter dispatch-web build` | CLEAN — 893ms, dist/assets/index.js 347.63 kB |
| Typecheck | `pnpm --filter dispatch-web typecheck` | CLEAN — no output |

---

## §V — Closure-stamp proposal

`MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX` row body update proposal (operator-stamp envelope; gen-6 files):

```
**→ CLOSED 2026-05-16 by SESSION-r12-t1c-w1-kanban-empty-state-ux.**
Closure landed via:
- `92fbc41` green WB1 — KanbanEmptyState component + 2 probes
- `d212c80` green WB2 — KanbanPanel conditional render + kanban.test.tsx seed update + 4 conditional probes
- WB-final commit (this session) — 4 docs + verification ledger

Conditional semantic: empty-state renders when `main.length === 0 && archived.length === 0` (refined from row-body "0 non-killed" per Q-KANBAN-2 disposition — matches operator's actual perceived-blank-rectangle failure mode without hiding the visible Archived column in showArchived=true scenarios). Header (Sessions title + Show archived checkbox) preserved on the empty-state path per Q-KANBAN-3.

326/326 dispatch-web tests green. dispatch-web build + typecheck CLEAN. Tier 1 (CLOSED).
```

---

## §VI — Followup proposals

| ID | Body | Tier | Discoverability |
|---|---|---|---|
| MB-F-T12-TILE-GRID-EMPTY-STATE | Sibling surface to this closure. Per row-173 body: "Pairs with MB-T12 tile-grid empty-state (Q-MBT12-9 from diagnose) — both surfaces share the same operator-perception failure mode." Verify whether MB-T12 WB-final closure covered the tile-grid empty-state; if not, propagate this followup's "main+archived count" pattern to TileGridApp's zero-session conditional. Tier 2. | 2 | This row + MB-T12 WB13 verification doc |
| MB-F-PROBE-AUTHOR-WAITFOR-DATA-NOT-SCAFFOLDING | Probe-authoring discipline: when scaffolding renders before data resolves, `waitFor(scaffolding)` resolves immediately and a subsequent sync `getByText(data)` races still-loading data. Discipline: `waitFor(data-bearing-text)` directly. Surfaced from WB2 RED test 3 false-RED at 8ms during this session. Tier 3 — author-discipline reminder; CLAUDE.md §3.6 could note this. | 3 | This row + WB2 RED commit body `43e97fe` |
