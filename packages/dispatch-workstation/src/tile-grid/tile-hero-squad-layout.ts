// MB-T19 WB2 — hero/squad layout implementation.
//
// Pure-fn layout module producing CSS Grid areas + default row sizing
// for the hero/squad layout where ONE session is promoted to a large
// hero region (top, ~75% vertical) and remaining sessions occupy a
// horizontal squad strip below (~25% vertical, single row).
//
// Per Q-MBT19-1 (operator-arbitrated 2026-05-07): canonical scope is
// "ONE tile maximized as the hero region; ALL other tiles minimized
// as a horizontal strip below the hero region." Layout topology:
//   - N=1: hero only, fullscreen (degenerate; no squad strip)
//   - N=2: hero on top + 1 squad tile below
//   - N=3: hero on top + 2 squad tiles in strip
//   - N=4: hero on top + 3 squad tiles in strip
//   - N=5-8: hero on top + (N-1) squad tiles; strip becomes
//     horizontally scrollable on overflow (browser-managed via
//     CSS overflow-x: auto in tile-grid.tsx WB3)
//   - N≥9: same pattern; overflow=true signals layout-aware
//     scroll handling required
//
// Per Q-MBT19-4=a: separate function from computeGridLayout (uniform
// grid in tile-layout.ts) — keeps API surfaces independent + testable
// in isolation.
//
// Per Q-MBT19-10 (operator decision 2026-05-07): squad-strip overflow
// uses horizontal scroll for v3.0 (preserves tile minimum width).
// Shrink-to-fit deferred as v3.1 polish followup
// MB-F-T19-SQUAD-STRIP-SHRINK-TO-FIT.

/** Layout descriptor for a hero/squad render. Consumed by tile-grid.tsx
 *  (WB3 integration) which translates this into CSS Grid declarations. */
export interface HeroSquadLayout {
  /** Number of grid rows. 1 for N=1 (degenerate, hero-only); 2 for N≥2. */
  readonly rows: number;
  /** Number of grid columns. 1 for N=1; (N-1) for N≥2 (squad count). */
  readonly cols: number;
  /** True when the squad strip likely needs horizontal scroll at
   *  typical workstation viewport widths. v3.0 threshold: n > 8 →
   *  overflow=true (matches operator-stated "N≥9: scroll" rule).
   *  When false, the strip still has CSS overflow-x: auto (browser
   *  manages narrow-viewport scroll); the boolean signals layout-
   *  aware handling is required (e.g., scroll-into-view affordance
   *  for the active tile). */
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

/** Hero-row vertical size for the 2-row hero/squad split (Q-MBT19-1
 *  canonical: hero ~70-75% vertical). 75% picks the upper bound for
 *  visibility of hero content; operator-overrideable via drag-resize. */
const HERO_ROW_SIZE = '75%';

/** Squad-strip vertical size — 25% (complement of HERO_ROW_SIZE). */
const SQUAD_ROW_SIZE = '25%';

/** Squad-count threshold above which overflow handling is layout-
 *  aware (matches operator-stated "N≥9: scroll" rule). At threshold N≥9
 *  squad has 8+ tiles. */
const SQUAD_OVERFLOW_THRESHOLD_N = 8;

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
 *   - n=2: hero row 0 (75%), 1 squad row 1 (25%).
 *   - n≥3: hero row 0 (75%), (n-1) squad cells in row 1 (25%);
 *     overflow=true when n > 8 (operator-stated threshold).
 */
export function computeHeroSquadLayout(
  n: number,
  heroIndex: number,
): HeroSquadLayout {
  if (n < 1) {
    throw new Error(
      `computeHeroSquadLayout: n must be >= 1 (got ${n})`,
    );
  }
  if (heroIndex < 0 || heroIndex >= n) {
    throw new Error(
      `computeHeroSquadLayout: heroIndex out of bounds (got ${heroIndex}, n=${n})`,
    );
  }

  // Degenerate N=1: hero fullscreen, no squad strip.
  if (n === 1) {
    return {
      rows: 1,
      cols: 1,
      overflow: false,
      gridTemplateAreas: [`t${heroIndex}`],
      defaultRowSizes: ['100%'],
    };
  }

  // N>=2: 2-row layout with hero spanning all cols in row 0,
  // squad tiles in row 1 (one col each, source order preserving
  // sessions[] ordering minus the hero).
  const cols = n - 1;
  const heroAreaRow = Array(cols).fill(`t${heroIndex}`).join(' ');
  const squadIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== heroIndex) squadIndices.push(i);
  }
  const squadAreaRow = squadIndices.map((i) => `t${i}`).join(' ');

  return {
    rows: 2,
    cols,
    overflow: n > SQUAD_OVERFLOW_THRESHOLD_N,
    gridTemplateAreas: [heroAreaRow, squadAreaRow],
    defaultRowSizes: [HERO_ROW_SIZE, SQUAD_ROW_SIZE],
  };
}
