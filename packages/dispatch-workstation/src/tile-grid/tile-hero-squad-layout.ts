// MB-T19 WB1 — hero/squad layout stub module.
//
// Pure-fn layout module producing CSS Grid areas + default row sizing
// for the hero/squad layout where ONE session is promoted to a large
// hero region (top, ~70-75% vertical) and remaining sessions occupy a
// horizontal squad strip below (~25-30% vertical, single row).
//
// Per Q-MBT19-1 (operator-arbitrated 2026-05-07): canonical scope is
// "ONE tile maximized as the hero region; ALL other tiles minimized
// as a horizontal strip below the hero region." Layout topology:
//   - N=1: hero only, fullscreen (degenerate; no squad strip)
//   - N=2: hero on top + 1 squad tile below
//   - N=3: hero on top + 2 squad tiles in strip
//   - N=4: hero on top + 3 squad tiles in strip
//   - N=5-8: hero on top + (N-1) squad tiles; strip becomes
//     horizontally scrollable on overflow
//   - N≥9: same pattern; strip horizontally scrolls
//
// Per Q-MBT19-4=a: separate function from computeGridLayout (uniform
// grid in tile-layout.ts) — keeps API surfaces independent + testable
// in isolation. Mirrors the tile-layout.ts pattern: pure-fn, no
// React, returns a structured layout descriptor consumed by
// tile-grid.tsx at WB3.
//
// Per Q-MBT19-10 (operator decision 2026-05-07): squad-strip overflow
// uses horizontal scroll for v3.0 (preserves tile minimum width).
// Shrink-to-fit deferred as v3.1 polish followup
// MB-F-T19-SQUAD-STRIP-SHRINK-TO-FIT.
//
// WB1 ships type signatures + stub that throws with WB2-deferral
// message (RED state guard). WB2 fills the implementation + probe-01
// spec-table tests covering N=1..9 hero placements + heroIndex bounds.

/** Layout descriptor for a hero/squad render. Consumed by tile-grid.tsx
 *  (WB3 integration) which translates this into CSS Grid declarations. */
export interface HeroSquadLayout {
  /** Number of grid rows. 1 for N=1 (degenerate, hero-only); 2 for N≥2. */
  readonly rows: number;
  /** Number of grid columns. 1 for N=1; (N-1) for N≥2 (squad count). */
  readonly cols: number;
  /** True when the squad strip needs horizontal scroll due to
   *  insufficient width at workstation default geometry. v3.0:
   *  true when cols exceed an internal overflow threshold; v3.1
   *  may switch to shrink-to-fit per the open followup
   *  MB-F-T19-SQUAD-STRIP-SHRINK-TO-FIT. */
  readonly overflow: boolean;
  /** CSS Grid template-areas as a string array (one entry per row).
   *  Hero spans all cols in row 0; squad tiles occupy row 1 each
   *  taking one col. Example for N=4 with heroIndex=2:
   *    ["t2 t2 t2", "t0 t1 t3"]
   *  Tile-grid.tsx maps each to `gridArea: t${idx}` per existing
   *  tile-rendering convention. Squad order preserves the source
   *  sessions[] order with the hero index removed. */
  readonly gridTemplateAreas: readonly string[];
  /** Default row sizing for the hero/squad split. Hero ~75%, squad
   *  strip ~25%. Operator-overrideable via drag-resize at the
   *  hero/squad boundary (Q-MBT19-5=b — drag permitted at the
   *  row-1/row-2 split only; within-strip resize deferred to v3.1).
   *  For N=1: ["100%"]. */
  readonly defaultRowSizes: readonly string[];
}

/**
 * Compute the hero/squad layout for `n` total sessions with the hero
 * at index `heroIndex` (0-based, into the source sessions[] array).
 *
 * Throws when:
 *   - n < 1 (no sessions to render)
 *   - heroIndex < 0 or heroIndex >= n (out of bounds)
 *
 * Layout produced (KNOWN per Q-MBT19-1 canonical scope):
 *   - n=1: hero fullscreen, no squad. defaultRowSizes=["100%"].
 *   - n=2: hero row 1 (~75%), 1 squad row 2 (~25%).
 *   - n≥3: hero row 1 (~75%), (n-1) squad cells in row 2 (~25%);
 *     overflow=true when squad strip would underflow the workstation
 *     default min tile width at the typical viewport — operator-
 *     specific threshold; WB2 picks an internal constant.
 *
 * WB1 stub: throws with WB2-deferral message. WB2 implements.
 */
export function computeHeroSquadLayout(
  _n: number,
  _heroIndex: number,
): HeroSquadLayout {
  throw new Error(
    'MB-T19 WB1 stub: computeHeroSquadLayout implementation lands at WB2',
  );
}
