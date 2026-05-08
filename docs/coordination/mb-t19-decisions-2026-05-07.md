# MB-T19 Phase 2 — Operator-Arbitrated Decisions

**Date:** 2026-05-07
**HEAD at decision time:** post-Phase-1-diagnose (`0e957d7`)
**Source:** `docs/coordination/mb-t19-diagnose-2026-05-07.md` + operator
ack 2026-05-07: "Q-MBT19-1 canonical scope confirmed: ... use option 1
with this scope: ... proceed with tentative dispositions, begin Phase 2
WB1."

This doc captures the dispositions on Q-MBT19-1..10 + R-MBT19-1..7 +
the Phase 2 ladder for MB-T19 (hero/squad layout). The canonical
scope gap surfaced at HALT 0 was resolved via operator paste — see §I.

---

## I. Canonical hero/squad scope (Q-MBT19-1 — operator-arbitrated)

**Definition (KNOWN per operator paste 2026-05-07):**
ONE tile maximized as the hero region (top, ~70-75% vertical space);
ALL other tiles minimized as a horizontal strip below the hero region
(~25-30% vertical space, single row, equal-width within available
width).

**Layout shape by N:**

| N | Hero | Squad strip |
|---|---|---|
| 1 | fullscreen | (none — degenerate) |
| 2 | top, ~75% | 1 squad tile, ~25% bottom |
| 3 | top, ~75% | 2 squad tiles side-by-side, ~25% bottom |
| 4 | top, ~75% | 3 squad tiles, ~25% bottom |
| 5-8 | top, ~75% | (N-1) squad tiles, ~25% bottom |
| ≥9 | top, ~75% | (N-1) squad tiles; strip horizontally scrolls |

**Hero region:** ~70-75% of vertical space.
**Squad strip:** ~25-30% of vertical space, single row, equal-width
squad tiles within available width.

**Squad-strip overflow behavior (Q-MBT19-10 — operator decision):**
horizontal scroll for v3.0 (preserves tile minimum width). Shrink-to-
fit polish deferred to v3.1 followup
`MB-F-T19-SQUAD-STRIP-SHRINK-TO-FIT` (filed at WB5).

## II. Q-MBT19-N dispositions

| ID | Disposition | One-line rationale |
|---|---|---|
| Q-MBT19-1 | (operator paste) | Canonical scope per §I above |
| Q-MBT19-2 | (d) out-of-band `heroSessionName` in tile-grid-state.json | No frozen-contract touch; mirrors WB12 splitter-state pattern |
| Q-MBT19-3 | (a) singular hero only | Term semantics; promoting new session demotes previous |
| Q-MBT19-4 | (a) new `computeHeroSquadLayout()` separate fn | API clarity; testable in isolation; mirrors `computeNewSizesAfterDrag` pattern |
| Q-MBT19-5 | (b) drag-resize permitted at hero/squad boundary only | v3.0: row-1/row-2 split is operator-resizable; within-strip resize deferred to v3.1 |
| Q-MBT19-6 | (d) all controls operate identically | Minimal disruption; collapse/detach work on hero same as squad |
| Q-MBT19-7 | (a) tile-grid-state.json adds `heroSessionName: string \| null` | Cohesive state; mirrors gridOverride field |
| Q-MBT19-8 | (a) hero tile renders SAME chrome as squad | Ship-minimum; v3.1 polish followup if operator wants enhanced |
| Q-MBT19-9 | (operator decision) | Spec in §I sufficient — no separate wireframes paste needed |
| Q-MBT19-10 | (operator: horizontal scroll for v3.0) | Preserves tile minimum width; shrink-to-fit as v3.1 followup |

## III. R-MBT19-N dispositions

| ID | Disposition | Action |
|---|---|---|
| R-MBT19-1 | RESOLVED | Canonical scope provided at HALT 0 |
| R-MBT19-2 | PREFER (d) — out-of-band | No SessionV2 amendment; tile-grid-state.json field only |
| R-MBT19-3 | SCOPE-DEPENDENT — ACCEPT v3.0 | Drag at hero/squad boundary only (Q-MBT19-5=b); existing computeNewSizesAfterDrag handles 2-band split natively |
| R-MBT19-4 | PRESERVE | Hero opt-in; uniform default unchanged; existing tile-grid-tile + tile-grid-app probes stay GREEN |
| R-MBT19-5 | ATOMIC-CHAIN AT EVERY WB + COORDINATE T18-WB3 vs T19-WB3 | T18 WB3 ships before my WB3; if T18 has uncommitted state at shared paths during my WB3+, HALT and surface |
| R-MBT19-6 | ADD WITH OPTIONAL DEFAULT | `heroSessionName: string \| null` defaulting to `null` |
| R-MBT19-7 | NOTE IN FINDINGS | 00_BUILD_INDEX.md missing; file as Tier 3 methodology FU at WB5 |

## IV. Phase 2 ladder (5 WBs, single session)

1. **WB1 (red)** — scaffold tile-hero-squad-layout.ts + this decisions
   doc + probe-00 stub.
   Commit: `spike(MB-T19): WB1 — scaffold tile-hero-squad-layout + decisions doc`.
2. **WB2 (green)** — `computeHeroSquadLayout(n, heroIndex)` impl +
   probe-01 spec-table covering N=1..9 hero placements + heroIndex
   bounds.
   Commit: `green(MB-T19): WB2 — computeHeroSquadLayout impl + spec-table`.
3. **WB3 (green)** — tile-grid.tsx integration: accept
   `heroSessionName?` prop on TileGridProps; route to new layout
   when set; render unchanged when null. Render tests + drag-resize
   boundary tests.
   Commit: `green(MB-T19): WB3 — tile-grid hero/squad render + boundary drag tests`.
4. **WB4 (green)** — TileGridApp: `heroSessionName` state +
   tile-grid-state.ts schema extension + persistence wire +
   integration tests + main.ts persistence callbacks if needed.
   Commit: `green(MB-T19): WB4 — TileGridApp hero state + persistence + integration tests`.
5. **WB5 (docs)** — findings doc + v3.1 polish followups
   (`MB-F-T19-SQUAD-STRIP-SHRINK-TO-FIT` + others as discovered).
   Commit: `docs(MB-T19): WB5 — findings doc + followups`.

**Estimated total tests: ~40-50** (WB2 spec-table ~20, WB3 render
~15, WB4 integration ~10).

## V. Discipline

- **Atomic-chain commit pattern at every WB** (per
  `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT`, established at
  MB-T17 WB5 commit `5843480`):
  ```
  git pull --ff-only && git add <explicit paths> && \
  git diff --cached --name-only | sort > /tmp/staged.txt && \
  diff /tmp/staged.txt <(printf <intended paths> | sort) && \
  git commit && git push && git log origin/main..HEAD
  ```
- Per-path git operations (NEVER `-A` or `.`) — CLAUDE.md §2.7
- Pre-commit territory check via `git status --short`
- Post-commit territory verification via `git log -1 --stat`
- Confidence labels KNOWN / MODELED / SPECULATIVE — §2.2
- Anti-fabrication: read source, don't infer — §2.1
- Each cairn-grammar commit body includes self-check Q1-Q9 — §2.4
- All work happens directly on main (additive) — §2.7
- Per-commit-push: each WB pushed + verified via empty
  `git log --oneline origin/main..HEAD` — §2.6
- WB11a discoveries applied:
  - Run scoped vitest dirs SEQUENTIALLY (avoid happy-dom hang)
  - tsconfig .tsx exclude pattern N/A — MB-T19 layout module is
    pure `.ts` (no JSX); tile-grid.tsx integration at WB3 already
    has its tsconfig exclude entry from MB-T12 WB6
- MB-T15/T16/T17 ladder lessons applied:
  - Render-prop slot population pattern N/A — MB-T19 is layout
    geometry, not slot population
  - Bridge adapter pattern N/A — no bridge methods needed
  - Read-before-Write across turns — preemptive 1-line Reads
    before Writes of cross-turn files

## VI. Coordination (parallel-cairn awareness)

Operator brief 2026-05-07:
- **Terminal A (this session)** MB-T17 ladder COMPLETE at `5843480`.
- **Terminal B (MB-T18 footer)** WB3 should ship BEFORE my MB-T19
  WB3 (both touch tile.tsx + tile-grid.tsx + tile-grid-app.tsx).
- **Terminal C (MB-T20 chat panel)** ladder COMPLETE at `734298b`.

**Mitigation strategy:**
- WB1 has NO shared-file edits (3 new paths only) — no contention risk.
- WB2 has NO shared-file edits (impl + tests in new tile-hero-squad-
  layout dirs only) — no contention risk.
- WB3 + WB4 touch shared files (tile.tsx + tile-grid.tsx +
  tile-grid-app.tsx) — atomic-chain at every commit; pre-commit
  `git status --short` MUST verify no T18 uncommitted state at
  shared paths; if surfaced, HALT before commit.

**WB1 status (this commit) — 3 new paths, no shared-file touches:**
- `docs/coordination/mb-t19-decisions-2026-05-07.md` (NEW)
- `packages/dispatch-workstation/src/tile-grid/tile-hero-squad-layout.ts` (NEW)
- `packages/dispatch-workstation/test/unit/tile-hero-squad-layout/probe-00-module-loads.spec.ts` (NEW)

## VII. References

- Phase 1 diagnose: `docs/coordination/mb-t19-diagnose-2026-05-07.md`
  (`0e957d7`)
- Operator brief 2026-05-07: "Q-MBT19-1 canonical scope confirmed:
  ONE tile maximized as the hero region; ALL other tiles minimized
  as a horizontal strip below" + "use option 1 with this scope" +
  "proceed with tentative dispositions, begin Phase 2 WB1"
- MB-T17 ladder precedent (atomic-chain commit pattern):
  - `5843480` docs(MB-T17): WB5 — findings doc
  - `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (Tier 1)
- MB-T12 tile-layout source (pattern template):
  `packages/dispatch-workstation/src/tile-grid/tile-layout.ts`
- Existing tile-grid renderer:
  `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx`
- CLAUDE.md sections governing: §2.1 anti-fabrication, §2.5 halt,
  §2.6 per-commit-push, §2.7 per-path git, §3.6 test layout, §4.1 WB
  ladder, §4.2 HALT gates, §4.3 cross-session coordination.
