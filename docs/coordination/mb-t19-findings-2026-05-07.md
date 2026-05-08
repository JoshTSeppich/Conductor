# MB-T19 Phase 2 Findings — 2026-05-07

**Status:** WB5 (final) commit
**HEAD at authoring:** `422269a` (post-MB-T19-WB4)
**Ship outcome:** 5 commits across the MB-T19 ladder (Phase 1 +
WB1-WB5), **60 tests** across 4 directories, 100% GREEN. **End-to-
end hero/squad layout** functional via `heroSessionName` prop on
TileGridApp; **storage + API surfaces complete**; mount.ts
persistence wire bridges to existing `MB-F-T12-RENDERER-PERSISTENCE-
WIRING` followup (no new T19-specific gap). **5 v3.1 polish + 1
methodology followup filed at WB5.** **0 contract amendments, 0
frozen-zone touches, 0 latent code bugs.**

This doc summarizes the MB-T19 (hero/squad layout) ladder outcome.

---

## I. Ladder outcome by WB

| WB | Commit | Type | Headline | Net new tests |
|---|---|---|---|---|
| Phase 1 | `0e957d7` | spike | Diagnose — surface inventory + canonical-scope-gap surface (Q-MBT19-1 HALT 0 BLOCKER) | 0 |
| WB1 | `e5a9f46` | red   | scaffold tile-hero-squad-layout.ts + decisions doc + probe-00 stub | 3 stub tests (replaced WB2) |
| WB2 | `b613ed8` | green | computeHeroSquadLayout impl + probe-01 spec-table covering N=1..12 | 25 (replaced WB1 stubs) |
| WB3 | `76f01a2` | green | tile-grid.tsx hero-mode integration + probe-01 render tests | 16 |
| WB4 | `422269a` | green | tile-grid-state heroSessionName field + TileGridApp passthrough + 2 probes | 19 (12 state + 7 app) |
| WB5 | (this commit) | docs  | findings + 5 followups (4 v3.1 polish + 1 methodology) | 0 |

**Cumulative MB-T19 test surface: 60 tests across 4 directories
(tile-hero-squad-layout 25 + tile-grid-hero-squad 16 + tile-grid-
state probe-03 12 + tile-grid-app probe-07 7), 100% GREEN on
origin/main HEAD `422269a`.** Plus 76 prior tile-* regression tests
(89 tile-grid-tile + 41 tile-grid-app pre-WB4 + 30 tile-grid-state
probe-01..02 - duplicates) all preserved.

## II. Cumulative test surface (cross-reference)

| Suite | Tests | Source |
|---|---|---|
| `tile-hero-squad-layout/probe-01-spec-table` | 25 | WB2 (`b613ed8`) |
| `tile-grid-hero-squad/probe-01-render` | 16 | WB3 (`76f01a2`) |
| `tile-grid-state/probe-03-hero-session-name` | 12 | WB4 (`422269a`) |
| `tile-grid-app/probe-07-hero-session-name` | 7 | WB4 (`422269a`) |
| **MB-T19 total** | **60** | — |
| (regression preserved) tile-grid-tile/01..08 | 89 | MB-T12/T15/T16/T17/T18 |
| (regression preserved) tile-grid-app/01..06 | 46 | MB-T12/T15/T16/T17/T18 |
| (regression preserved) tile-grid-state/01..02 | 30 | MB-T12 WB7 |
| (regression preserved) tile-hero-squad-layout (already counted) | — | — |

136-test cumulative tile-* sweep all GREEN at every WB validation.

## III. 0 latent code issues caught

MB-T19 shipped without surfacing any latent code bugs. The MB-T15/
T16/T17 lessons (applied forward at WB1) prevented all the recurring
patterns:

- Read-before-Write tracking — preemptive Reads on cross-turn file
  edits worked.
- happy-dom act() — render tests used `act()` + `waitFor()`
  correctly; all 16 probe-01-render + 7 probe-07-hero tests passed
  first try.
- tsconfig .tsx exclude — N/A; layout module is pure `.ts` (no JSX).
- Slot/render-prop preservation — N/A; MB-T19 is layout geometry,
  not slot population.
- Atomic-chain commit pattern (MB-T17 WB5 establishment) — applied
  at every WB1-WB5; ZERO commit-capture incidents during MB-T19
  (compare T18 WB1 which experienced the index race that MB-F-
  PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT diagnosed).

The "no latent code issues" outcome reflects pattern maturity (4th
hero/squad-class ticket in the Family A chrome series) + simpler
scope (workstation-side only; pure-fn layout module).

## IV. Phase-1 canonical-scope-gap discipline (load-bearing)

MB-T19 Phase 1 surfaced Q-MBT19-1 as a **HALT 0 BLOCKER** with
explicit refusal to fabricate a tentative answer. Per CLAUDE.md §2.1
anti-fabrication: the canonical hero/squad scope lives in operator-
side `wireframe-tickets-inventory.md` (CLAUDE.md §5.3), not
accessible from this repo. The diagnose doc presented 4 plausible
interpretations as MODELED (NOT KNOWN) and waited for operator paste
rather than picking one and shipping the wrong layout.

Operator paste at HALT 0 (2026-05-07): "ONE tile maximized as the
hero region; ALL other tiles minimized as a horizontal strip below
the hero region" + cell-count table for N=1..9+ + Q-MBT19-10
horizontal-scroll-for-v3.0 decision.

**This is the Phase 1 diagnose's load-bearing discipline:** when
operator paste is required, refuse the tentative-default convenience
and HALT explicitly. Saved a 25%-chance-correct ladder (4
interpretations).

## V. 3 architectural insights surfaced

### Insight 1 — Pure-fn layout module composes with existing tile-grid render

`tile-hero-squad-layout.ts` is pure-fn TS (no React, no DOM
dependencies). Returns a structured `HeroSquadLayout` descriptor
that tile-grid.tsx narrows via `'defaultRowSizes' in layout` (TS
discriminated union over `GridLayout | HeroSquadLayout`). 25 spec-
table tests at WB2 cover N=1..12 hero placements + heroIndex bounds
+ invariants (squad-row membership, hero-row span). The clean
separation enables fast WB2 validation (~6ms total runtime) +
makes the WB3 integration a thin branch (~30 LoC additions to
tile-grid.tsx).

**Pattern reusable for v3.1 layout extensions:** any new layout
mode (e.g., focus mode, side-by-side variant) can ship a sibling
pure-fn module + extend the discriminated union. Existing CSS Grid
rendering path stays intact.

### Insight 2 — Conditional drag-handle rendering preserves drag math

Q-MBT19-5=b suppressed vertical (col-border) drag handles in hero
mode for v3.0 to defer within-squad-strip resize to v3.1. The
implementation is a single `if (!isHeroMode)` guard around the
verticalHandles loop. The HORIZONTAL handle (between hero and squad
rows) re-uses the existing 2-band drag flow from MB-T12 WB7
(`computeNewSizesAfterDrag` math is band-count-agnostic). NO new
drag math; NO refactor of the existing drag state machine.

**Pattern lesson:** layout-mode features that affect AFFORDANCE
SURFACES (which handles render) are cheaper than features that
affect DRAG MATH (how movement maps to sizes). Future layout modes
should similarly suppress affordances rather than add new drag
modes.

### Insight 3 — Persistence-wire bridging vs duplication

WB4's `tile-grid-state.ts` heroSessionName field could have been
pushed end-to-end (mount.ts startup-read + IPC plumb-through), but
the existing MB-F-T12-RENDERER-PERSISTENCE-WIRING followup ALREADY
covers the gap for `gridOverride` + `perTile`. MB-T19's
heroSessionName joins those fields under the SAME pending-wire
followup — no new T19-specific persistence followup needed.

**Pattern lesson:** when a new feature shares a deferred
infrastructure gap with existing features, BRIDGE to the existing
followup rather than DUPLICATE a new one. Keeps closure paths
consolidated; reduces the followup-tracking surface.

## VI. Operator dispositions honored

All Q-MBT19-1..10 + R-MBT19-1..7 dispositions landed without
amendment:

| Disposition | Honored? | Where |
|---|---|---|
| Q-MBT19-1 (operator paste) | ✅ | WB2 layout impl encodes the canonical scope |
| Q-MBT19-2=d (out-of-band heroSessionName) | ✅ | WB4 tile-grid-state.json field |
| Q-MBT19-3=a (singular hero) | ✅ | WB2 single-heroIndex parameter |
| Q-MBT19-4=a (separate fn) | ✅ | WB2 `tile-hero-squad-layout.ts` distinct from `tile-layout.ts` |
| Q-MBT19-5=b (drag-resize at boundary only) | ✅ | WB3 vertical-handle suppression in hero mode |
| Q-MBT19-6=d (controls operate identically) | ✅ | WB3 — Tile component unchanged for hero/squad; collapse/detach/kill paths intact |
| Q-MBT19-7=a (heroSessionName: string \| null) | ✅ | WB4 TileGridStateFile field |
| Q-MBT19-8=a (same chrome) | ✅ | WB3 — TileHeader/TileFooter/picker/autopilot unchanged in hero mode |
| Q-MBT19-9 (no separate wireframes paste) | ✅ | Q-MBT19-1 paste at HALT 0 was sufficient |
| Q-MBT19-10 (horizontal scroll for v3.0) | ✅ | WB3 `gridStyle.overflowX = 'auto'` in hero mode + WB5 v3.1 followup filed |
| R-MBT19-1..7 ACCEPT/PRESERVE/SCOPE-DEPENDENT/ATOMIC-CHAIN/etc | ✅ | per Phase 1 dispositions |

## VII. Methodology audit

CLAUDE.md disciplines + MB-T17 ladder lessons + atomic-chain commit
pattern: held throughout 5 commits. ZERO methodology incidents.

| Discipline | Held? |
|---|---|
| Atomic-chain commit pattern at every WB | ✅ all 5 commits — verified `diff /tmp/staged.txt <(printf intended)` empty before commit |
| Per-path git operations (no -A or .) | ✅ all commits |
| Pre-commit territory check via `git status --short` | ✅ all commits |
| Post-commit territory verification via `git log -1 --stat` | ✅ all commits (chained as final atomic-chain step) |
| Confidence labels KNOWN/MODELED/SPECULATIVE | ✅ all commit bodies + diagnose + decisions doc |
| Anti-fabrication (Q-MBT19-1 canonical-scope refusal) | ✅ Phase 1 HALT 0 BLOCKER discipline applied (load-bearing) |
| Each cairn-grammar commit body includes self-check Q1-Q9 | ✅ all 4 cairn-grammar commits + this docs commit |
| Per-commit-push (origin/main..HEAD empty post-push) | ✅ all 5 commits |
| Scoped sequential test runs (WB11a discovery) | ✅ all WB validations |
| 5-package typecheck (CLAUDE.md §4.4 one command at a time) | ✅ all WB validations |
| Read-before-Write across turns (MB-F-WRITE-TOOL-READ-TRACKING-CROSS-TURN) | ✅ preemptive reads worked |

## VIII. WB5 followups filed (5 entries)

| Tier | ID | Status | Origin |
|---|---|---|---|
| 3 | `MB-F-T19-SQUAD-STRIP-SHRINK-TO-FIT` | filed | Q-MBT19-10 deferred — v3.1 alternative to horizontal scroll for narrow viewports |
| 2 | `MB-F-T19-MUTATION-UI` | filed | v3.0 ships storage + API; UI affordance to designate hero deferred to v3.1 (operator-edit-then-restart only in v3.0) |
| 3 | `MB-F-T19-WITHIN-STRIP-RESIZE` | filed | Q-MBT19-5=b deferred — v3.1 vertical-handle re-enablement within squad strip |
| 3 | `MB-F-T19-ENHANCED-HERO-CHROME` | filed | Q-MBT19-8=a same-chrome ship-minimum; v3.1 polish for enhanced hero-tile chrome |
| 3 | `MB-F-DOCS-BUILD-INDEX-MISSING` | filed | R-MBT19-7 — `docs/build-docs/00_BUILD_INDEX.md` referenced in CLAUDE.md §6 but doesn't exist |

**Persistence-wire status (NO new T19-specific followup):**
heroSessionName end-to-end persistence (mount.ts startup-read +
plumb-through) bridges to existing `MB-F-T12-RENDERER-PERSISTENCE-
WIRING` (Tier 2). When that followup closes, hero designation will
auto-load on workstation startup; until then, operator-edit-then-
restart of `<userData>/tile-grid-state.json` is the manual path.

## IX. Open questions for v3.1 (out of MB-T19 scope)

1. **Hero designation UX flow** — which interaction model triggers
   hero promotion/demotion? Options surveyed at Phase 1 diagnose
   Q-MBT19-2: (a) per-tile button (parallel to MB-T16 picker),
   (b) auto-derived from activity, (c) global keyboard shortcut.
   `MB-F-T19-MUTATION-UI` will need this resolved before v3.1.

2. **Hero collapse/detach interaction** — Q-MBT19-6=d says all
   controls operate identically; if operator collapses/detaches the
   hero tile, the grid renders an empty hero region (the
   gridTemplateAreas still references `t<heroIndex>`). v3.0 ships
   "honest broken layout" (visible empty hero); v3.1 may want auto-
   demotion or hero-can't-be-collapsed invariant. Open question
   pending operator preference.

3. **Drag-resize override persistence** — when operator drags the
   hero/squad boundary, the resulting `rowCss` updates via existing
   `gridOverride` field. But `gridOverride.rowSizes` is a
   2-element array for hero mode (75%/25% adjusted), and the
   existing override-shape-validator checks length matches the
   layout's `rows`. Hero mode rows=2, uniform mode rows could be
   1/2/2 — shape mismatch on mode toggle could discard a previously-
   saved override. v3.1 may need mode-aware override storage.

## X. References

- decisions doc: `docs/coordination/mb-t19-decisions-2026-05-07.md`
  (`e5a9f46`)
- Phase 1 diagnose: `docs/coordination/mb-t19-diagnose-2026-05-07.md`
  (`0e957d7`)
- WB1-WB4 commits: `e5a9f46` (WB1) + `b613ed8` (WB2) + `76f01a2`
  (WB3) + `422269a` (WB4) + this commit (WB5)
- MB-T12 layout source (template):
  - `packages/dispatch-workstation/src/tile-grid/tile-layout.ts`
  - `packages/dispatch-workstation/src/main/tile-grid-state.ts`
- MB-T17 atomic-chain commit precedent:
  - `5843480` docs(MB-T17): WB5 — findings doc
  - `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (Tier 1, FOLLOWUPS.md:196)
- Bridged followups (NOT re-filed):
  - `MB-F-T12-RENDERER-PERSISTENCE-WIRING` (Tier 2) — covers
    heroSessionName mount.ts wiring along with gridOverride/perTile
- Operator brief 2026-05-07: "Confirmed: MB-T19 — Hero/squad
  layout. Phase 1 diagnose authorized" + canonical-scope paste at
  HALT 0 + per-WB "continue to wbN" authorizations.
- CLAUDE.md sections governing: §2.1 anti-fabrication, §2.5 halt,
  §2.6 per-commit-push, §2.7 per-path git, §3.6 test layout, §4.1
  WB ladder, §4.2 HALT gates, §4.3 cross-session coordination, §5.3
  Family A roadmap (MB-T19 = last entry; chrome family complete
  with MB-T15+T16+T17+T18+T19 all shipped).
