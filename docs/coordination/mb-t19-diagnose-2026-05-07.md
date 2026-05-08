# MB-T19 Phase 1 Diagnose — Hero/squad layout

**Date:** 2026-05-07
**Authoring HEAD:** `453100f` (post-MB-T18-WB2)
**Status:** Phase 1 reads-only inventory + open questions; HALT 0
before Phase 2 WB1.

This doc surfaces the existing tile-layout territory + the
**canonical-scope gap** that defines Q-MBT19-1 + tentative open
questions Q-MBT19-2..9 + risks R-MBT19-1..7 with tentative
dispositions for the **hero/squad layout** ticket. MB-T19 is the last
entry in Family A — Tile chrome (MB-T15 header, T16 picker, T17
autopilot toggle, T18 footer, **T19 hero+squad**) per CLAUDE.md §5.3.

**Critical anti-fabrication note:** the canonical hero/squad spec
lives in operator-side `/mnt/user-data/outputs/wireframe-tickets-
inventory.md` (CLAUDE.md §5.3) which is NOT accessible from this
repo. The internal-source inventory below confirms NO hero/squad code
or spec exists in `docs/build-docs/` or `docs/coordination/` beyond
naming references. Per CLAUDE.md §2.1: I cannot claim what hero/squad
"is" without operator confirmation. Q-MBT19-1 surfaces this
explicitly.

---

## I. Surface inventory

### I-A. Hero/squad mentions across the codebase

**KNOWN (via grep + git log --grep):**

| File / commit | Reference type |
|---|---|
| `CLAUDE.md:247` | Family A inventory line: "T19 hero+squad" |
| `docs/coordination/mb-t15-diagnose-2026-05-07.md:26` | Family-A roadmap reference (no detail) |
| `docs/coordination/mb-t17-diagnose-2026-05-07.md:482` | Family-A roadmap reference (no detail) |
| `docs/coordination/mb-t18-diagnose-2026-05-07.md:613` | Family-A roadmap reference (no detail) |
| `docs/coordination/mb-t20-diagnose-2026-05-07.md:631` | Family-A roadmap reference (no detail) |

**No commits with "hero" or "squad" in message bodies (`git log
--all --grep="hero\|squad"` empty).** No source code with hero/squad
identifiers. **All references are forward-pointing roadmap mentions,
none load-bearing for spec content.**

### I-B. CONDUCTOR_V3_RESCOPE.md hero/squad coverage

**NOT FOUND (KNOWN):** Comprehensive grep of
`docs/build-docs/CONDUCTOR_V3_RESCOPE.md` for "hero|squad|focus|
prominent|featured|spotlight|primary tile|main tile" returned NO
explicit hero/squad layout section.

The §3.1 line 45 layout spec ("1→fullscreen, 2→side-by-side, 3-4→2×2,
5-6→2×3, 7-8→2×4, 9+→scroll") describes uniform-grid behavior.
**MODELED:** MB-T19 likely INTRODUCES asymmetric layout as an
extension beyond the v3.0 rescope baseline — but this is operator-
arbitrated scope, not a documented in-repo spec.

### I-C. 00_BUILD_INDEX.md MB-T19 entry

**NOT FOUND (KNOWN):** File does not exist at
`docs/build-docs/00_BUILD_INDEX.md` despite being referenced in
CLAUDE.md §6.

### I-D. Existing tile-layout.ts API + behavior

**File:** `packages/dispatch-workstation/src/tile-grid/tile-layout.ts`
(133 lines, MB-T12 WB6).

**Public API (KNOWN):**
```ts
export function computeGridLayout(n: number): GridLayout;
export function computeNewSizesAfterDrag(
  initialSizes: number[],
  borderIdx: number,
  delta: number,
  minPx: number,
): number[];

export interface GridLayout {
  readonly rows: number;
  readonly cols: number;
  readonly overflow: boolean;
  readonly gridTemplateAreas: readonly string[];
}
```

**Layout output for N=1..8+ (KNOWN):**
- N=1 → 1×1
- N=2 → 1×2
- N=3-4 → 2×2 (last tile spans remaining cells per lines 120-127)
- N=5-6 → 2×3
- N=7-8 → 2×4
- N≥9 → 2×4 + implicit-row overflow

**Cell uniformity (KNOWN):** all cells are equal-sized (1fr × 1fr) at
initial layout. Last-tile-spans-remaining is a pre-existing mild
asymmetry but every CELL is still uniform; only the AREA assignment
varies (e.g., N=3 puts t2 spanning 2 cols).

**Drag-resize math (KNOWN, lines 86-107):**
`computeNewSizesAfterDrag` operates on arbitrary band sizes — already
supports non-uniform cells AFTER drag. Initial layout is always
uniform; drag-resize introduces asymmetry; persistence via
`GridOverride` (`{colSizes?, rowSizes?}` of CSS strings).

### I-E. tile-grid.tsx layout rendering

**File:** `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx`
(390 lines).

**`gridTemplateAreas` construction (lines 278-286, KNOWN):**
```tsx
gridTemplateAreas: layout.gridTemplateAreas
  .map((row) => `"${row}"`)
  .join(' '),
```

**Tile-to-gridArea mapping (lines 308-316, KNOWN):**
```tsx
const cellStyle: React.CSSProperties =
  idx < explicitCellCount ? { gridArea: `t${idx}` } : {};
```

Each `<Tile>` gets `gridArea: t${index}`. Index maps directly to
template-area position. **CSS Grid will handle ANY non-uniform area
spec; the constraint is at the compute-layer (tile-layout.ts) which
currently produces uniform layouts only.**

### I-F. MB-T12 ladder docs hero/squad context

**Searched:** `mb-t12-decisions-2026-05-07.md`,
`mb-t12-findings-2026-05-07.md`, `mb-t12-architecture-flow.md`.

**NOT FOUND (KNOWN):** zero hero/squad/focus/featured mentions.
MB-T12 architecture-flow describes uniform tile rendering with no
placeholder for asymmetric/featured cells.

### I-G. FOLLOWUPS.md MB-T19 hits

**NOT FOUND (KNOWN):** zero matches for "hero|squad|focus|featured|
MB-T19" in `docs/FOLLOWUPS.md`.

### I-H. TileGridSessionEntry shape (current)

**File:** `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx:25-40`.

```ts
interface TileGridSessionEntry {
  readonly name: string;
  readonly status?: TileStatus;
  readonly collapsed?: boolean;
  readonly branchName?: string;
  readonly repoName?: string;
  readonly model?: string;
  readonly tokensUsed?: number;
  readonly tokenBudget?: number;
}
```

**No hero/featured field today (KNOWN).** MB-T19 may add one OR use
out-of-band designation (e.g., a separate `heroSessionName: string |
null` prop on TileGridApp).

### I-I. Recent commit log + parallel-session anchor

**HEAD `453100f` (KNOWN per `git log --oneline -5`):**
- `453100f` green(MB-T18): WB2 — tile-footer impl + spawn-handler cwd plumb
- `2d8d260` chore(coordination): MB-T18 WB1 index-race clarification + Tier 1 methodology FU
- `5843480` docs(MB-T17): WB5 — findings doc + 3 v3.1 polish followups
- `734298b` docs(MB-T20): WB5 — findings doc + 4 v3.1 polish followups + 1 methodology followup
- `6b4866b` green(MB-T20): WB4 — ChatPanel wrap + workstation-shell line-555 swap

**Parallel-session map (KNOWN):**
- **Terminal B (MB-T18 footer):** WB2 just shipped at `453100f`. WB3
  (Tile.tsx + TileGrid + TileGridApp integration) is NEXT. **Same
  shared files MB-T19 will likely touch.** High WB-overlap risk.
- **Terminal C (MB-T20 chat panel):** WB5 docs landed at `734298b`.
  T20 ladder is COMPLETE.
- **Terminal D (docs):** completed at `2ec696a`.
- **MB-T17 (this Terminal A):** WB5 at `5843480`. Ladder COMPLETE.

---

## II. Open questions Q-MBT19-1..9

### Q-MBT19-1: What IS the hero/squad layout? (CRITICAL — CANONICAL SCOPE GAP)

**Surface:** No internal source documents the hero/squad layout. The
operator-side `wireframe-tickets-inventory.md` (per CLAUDE.md §5.3)
holds the canonical scope. I cannot fabricate the design.

**Possible interpretations (MODELED, NOT KNOWN):**
- **(a) "Promoted tile within existing grid"** — same N×M grid; one
  tile spans extra cells (e.g., 2×2 with hero spanning t0+t1 row).
  Minimal change to compute layer.
- **(b) "Hero center + squad strip"** — asymmetric layout where hero
  takes ~60% area and squad fills remaining ~40% as a row/column
  strip. Requires new compute function with hero-area + squad-area
  split.
- **(c) "Hero left + squad column right"** — two-column asymmetric
  with hero left ~60-70% and squad in vertical strip right ~30-40%.
- **(d) "Mode-toggle hero/squad"** — workstation-level layout mode;
  when ON, layout switches to hero+squad; when OFF, falls back to
  uniform grid.
- **(e) Other / multi-mode / canonical-spec-required**

**Tentative disposition: NONE — operator paste required at HALT 0.**

### Q-MBT19-2: Hero designation source

When (a) one session is "hero" — how is that decided?

- **(a)** Explicit per-tile affordance ("promote to hero" button in
  tile-header, parallel to MB-T17 toggle)
- (b) Auto-derived (e.g., the most-recently-spawned or most-active)
- (c) Persisted `isHero?: boolean` field on SessionV2 schema (frozen
  contract — would need amendment)
- (d) Out-of-band: workstation-level state `heroSessionName` in
  tile-grid-state.json (no schema change)

**Tentative disposition: (d)** — minimal frozen-contract impact;
mirrors WB12 tile-grid-state pattern.

### Q-MBT19-3: Single hero vs multi-hero

If "hero" is a singular promoted tile, can multiple sessions be hero
simultaneously?

- **(a)** Single hero only — promoting a new session demotes the
  previous hero
- (b) Multi-hero — multiple promoted tiles share equal hero status
- (c) No hero — fallback to uniform grid

**Tentative disposition: (a)** — singular semantics matches the term
"hero" + simpler state management.

### Q-MBT19-4: Implementation strategy

- **(a)** New `computeHeroSquadLayout(n, heroIndex)` separate from
  `computeGridLayout` — two functions; tile-grid.tsx selects
  by mode/hero presence
- (b) Branch within existing `computeGridLayout` — single function,
  optional `heroIndex` arg
- (c) Render-time wrapper — keep tile-layout.ts uniform; transform
  the GridLayout post-compute when hero is set

**Tentative disposition: (a)** — separate function = clearer API +
testable in isolation; mirrors how `computeNewSizesAfterDrag` is its
own function.

### Q-MBT19-5: Drag-resize interaction with hero mode

- **(a)** Hero mode is a layout MODE — drag-resize disabled while in
  hero mode (forces fall-back to uniform to enable drag)
- (b) Drag-resize permitted in hero mode — operator can resize hero
  area + squad cells independently
- (c) Drag-resize transforms hero into uniform — first drag exits
  hero mode

**Tentative disposition: (b)** — drag-resize is a separate concern
from layout mode; both can coexist via independent CSS grid overrides.

### Q-MBT19-6: Interaction with collapsed/detached tiles

- **(a)** Hero tile cannot be collapsed (UI hides collapse button on
  hero) — invariant: hero is always visible
- (b) Collapsing the hero auto-demotes (next session becomes hero)
- (c) Detaching the hero auto-demotes
- (d) All MB-T12 controls operate identically; only the layout
  geometry differs

**Tentative disposition: (d)** — minimal disruption; hero is a
LAYOUT concern, not a TILE-CONTROL concern.

### Q-MBT19-7: Persistence

- **(a)** `tile-grid-state.json` adds `heroSessionName: string | null`
  field at top level
- (b) New `hero-state.json` file in userData
- (c) No persistence (hero designation resets each launch)

**Tentative disposition: (a)** — mirrors splitter-state pattern + the
existing `gridOverride` field; one file keeps state cohesive.

### Q-MBT19-8: Hero tile chrome customization

- **(a)** Hero tile renders SAME chrome as squad tiles (header, body,
  footer per MB-T15/16/17/18); only geometry differs
- (b) Hero tile shows ENHANCED chrome (larger model chip, expanded
  token meter, more prominent footer)
- (c) Hero tile shows REDUCED chrome (focus mode — minimal header)

**Tentative disposition: (a)** — preserves existing tile component
contracts; ship-minimum scope; v3.1 polish followup if operator wants
enhanced chrome.

### Q-MBT19-9: Operator wireframes / canonical visual

The operator-side wireframes likely show the visual + cell-count
behavior (N=1, N=2..8, N≥9 hero+squad sizes). Does the operator
intend to paste those at HALT 0 review?

**Tentative disposition: REQUEST PASTE** — Phase 1 cannot proceed to
specific WB ladder without canonical visual behavior + cell-count
behavior.

---

## III. Risks R-MBT19-1..7

### R-MBT19-1: Canonical scope gap (load-bearing)

**Surface:** Without operator paste, MB-T19 risks building wrong
thing. Q-MBT19-1 surfaces this explicitly.

**Severity:** HIGH. Building (a) when operator wants (b) wastes a
ladder.

**Tentative disposition: HALT 0 BLOCKER** — operator paste required
before Phase 2 WB1 authorization.

### R-MBT19-2: TileGridSessionEntry vs out-of-band hero designation

**Surface:** If hero designation goes on the entry (Q-MBT19-2=c), it
risks frozen-contract amendment at SessionV2; if out-of-band (d), it
needs a new state-store path.

**Severity:** MEDIUM. (c) requires operator-arbitrated contract
change; (d) is workstation-internal.

**Tentative disposition: PREFER (d)** — out-of-band; no contract
touch.

### R-MBT19-3: gridTemplateAreas asymmetry + drag-resize math

**Surface:** Existing `computeNewSizesAfterDrag` operates on uniform
band counts. Hero mode's asymmetric grid may have non-equal band
counts (e.g., 2-row hero + 1-row squad). Drag-resize across the
hero/squad boundary would need updated math.

**Severity:** MEDIUM. CSS Grid handles render fine; the constraint is
at the drag-math layer.

**Tentative disposition: SCOPE-DEPENDENT** — if Q-MBT19-5=a (disable
drag in hero mode), no update needed; if Q-MBT19-5=b (permit drag),
math extension required.

### R-MBT19-4: Existing tile-grid-tile + tile-grid-app probe regressions

**Surface:** 89 tile-grid-tile + 41 tile-grid-app tests assume
uniform layout default. MB-T19 must NOT regress them.

**Severity:** LOW. Hero mode should be opt-in; uniform default
preserves existing behavior.

**Tentative disposition: PRESERVE** — hero mode = opt-in via new
prop / state; uniform default unchanged; existing tests stay GREEN.

### R-MBT19-5: Parallel-session collision with MB-T18 WB3

**Surface:** Terminal B's MB-T18 WB3 is NEXT (Tile.tsx + TileGrid +
TileGridApp integration for footer). MB-T19 will likely touch the
SAME 3 files. Index-race repeat risk per the
`MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` followup.

**Severity:** MEDIUM. Atomic-chain commit pattern (adopted at MB-T17
WB5) mitigates.

**Tentative disposition: ATOMIC-CHAIN AT EVERY WB** + coordinate
with operator on T18-WB3 vs MB-T19-WB1 ordering.

### R-MBT19-6: Tile-grid-state.ts schema migration

**Surface:** If Q-MBT19-7=a (add `heroSessionName` field to
tile-grid-state.json), existing JSON files lack this field. Reader
must handle missing field gracefully.

**Severity:** LOW. Existing readers use `?? defaults` for missing
fields.

**Tentative disposition: ADD WITH OPTIONAL DEFAULT** — `heroSessionName: string | null` defaulting to `null` (no hero).

### R-MBT19-7: 00_BUILD_INDEX.md missing

**Surface:** CLAUDE.md §6 references `docs/build-docs/00_BUILD_INDEX.md`
but the file doesn't exist. Not MB-T19's job to create, but the
absent reference is a documentation gap.

**Severity:** ZERO for MB-T19 ship.

**Tentative disposition: NOTE IN FINDINGS** — file as Tier 3
methodology followup at WB5.

---

## IV. Proposed ladder (5 WBs, tentative pending HALT 0 review)

| WB | Type | Scope (TENTATIVE pending Q-MBT19-1 confirmation) |
|---|---|---|
| WB1 | red | scaffold tile-hero-squad-layout module + decisions doc + tsconfig exclude (if any new .tsx) + stub probe directories |
| WB2 | green | `computeHeroSquadLayout(n, heroIndex)` impl + spec-table tests covering N=1..9 hero placements |
| WB3 | green | tile-grid.tsx integration: accept `heroSessionName?` prop on TileGridProps, route to new layout when set, render unchanged when null + render tests |
| WB4 | green | TileGridApp: `heroSessionName` state + persistence wire (tile-grid-state.ts addition) + main.ts persistence callbacks if needed + integration tests |
| WB5 | docs | findings doc + v3.1 polish followups + (potentially) close any chartered MB-F-T19 followup if one exists |

**Estimated total tests: ~40-50** (mirrors MB-T17 size).
**Estimated commits: 5 + Phase 1 diagnose.**
**Atomic-chain commit pattern at every WB** (MB-T17 WB5 establishment).

## V. Out-of-scope confirmations

Pending operator confirmation, the following should likely be OUT
OF SCOPE for MB-T19:

- **Hero tile chrome customization** — Q-MBT19-8=a tentative (same
  chrome); v3.1 polish.
- **Drag-resize math extension for asymmetric grids** — Q-MBT19-5=a
  tentative (disable drag in hero mode); v3.1 if operator wants drag.
- **SessionV2 schema amendment** — Q-MBT19-2=d tentative (out-of-
  band designation; no frozen-contract touch).
- **Picker (T16) "make hero" affordance** — separate concern; v3.1.
- **Animations / transitions** — out of scope for v3.0 ship-minimum.

## VI. References

- CLAUDE.md §5.3 (Family A roadmap mention)
- Operator-side canonical scope (NOT accessible from this repo):
  `/mnt/user-data/outputs/wireframe-tickets-inventory.md`
- MB-T12 tile-layout source: `packages/dispatch-workstation/src/
  tile-grid/tile-layout.ts`
- MB-T12 tile-grid renderer: `packages/dispatch-workstation/src/
  tile-grid/tile-grid.tsx`
- MB-T12 architecture-flow: `docs/coordination/mb-t12-architecture-
  flow.md`
- Methodology precedent: `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-
  COMMIT` (Tier 1, filed 2026-05-07) — atomic-chain commit pattern
  established at MB-T17 WB5 (`5843480`).
- CLAUDE.md sections governing: §2.1 anti-fabrication, §2.5 halt,
  §3.3 sentinel, §3.6 test layout, §4.1 WB ladder, §4.2 HALT gates,
  §4.3 cross-session coordination.

---

**HALT 0 — Phase 1 complete.** Awaiting operator review.

**Two operator-required items before Phase 2 WB1 authorization:**

1. **Q-MBT19-1: canonical hero/squad scope.** Paste the operator-side
   `wireframe-tickets-inventory.md` MB-T19 entry (or equivalent
   canonical visual + cell-count behavior + interaction semantics).
   Without this, Phase 2 cannot proceed without fabrication risk.

2. **Q-MBT19-2..9 + R-MBT19-1..7 dispositions.** Either:
   - "Proceed with tentative dispositions" (operator accepts (a)/(d)/
     (a)/(b)/(d)/(a)/(a)/(REQUEST PASTE) for Q-MBT19-2..9 + ALL
     risks ACCEPT/PRESERVE/SCOPE-DEPENDENT/PRESERVE/ATOMIC-CHAIN/
     ADD-WITH-DEFAULT/NOTE-IN-FINDINGS), OR
   - "Adjust Q-MBT19-N to (b/c)" — flip specific dispositions before
     Phase 2.

**Coordination note for operator:** Terminal B's MB-T18 WB3 is the
next-shipped commit on the parallel-cairn track (touches Tile.tsx +
TileGrid + TileGridApp — same shared files as MB-T19 will likely
touch). Recommend operator-decided ordering: (a) MB-T19 WB1 starts
AFTER T18 WB3 ships, OR (b) atomic-chain pattern at every WB across
both sessions.
