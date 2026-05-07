// MB-T12 WB1 — fixture data for tile-layout grid-fit cases.
//
// Spec freeze (CONDUCTOR_V3_RESCOPE.md §3.1 line 45 + §3.3 line 78):
//   1   → 1×1
//   2   → 1×2
//   3-4 → 2×2
//   5-6 → 2×3
//   7-8 → 2×4
//   9+  → 2×4 with overflow scroll
//
// gridTemplateAreas string is intentionally NOT in this fixture — that
// design call (last-tile-spans-remainder vs. trailing-empty-cells) lives
// inside computeGridLayout's WB2 implementation and is tested inline there.
//
// N=0 (empty state) is excluded: per Q-MBT12-9 disposition (a), the
// tile-grid region collapses to height:0 when N=0 and computeGridLayout
// is not invoked. WB6 covers the empty-state path with its own test.

export interface LayoutCase {
  readonly n: number;
  readonly rows: number;
  readonly cols: number;
  readonly overflow: boolean;
}

export const TILE_LAYOUT_CASES: readonly LayoutCase[] = [
  { n: 1, rows: 1, cols: 1, overflow: false },
  { n: 2, rows: 1, cols: 2, overflow: false },
  { n: 3, rows: 2, cols: 2, overflow: false },
  { n: 4, rows: 2, cols: 2, overflow: false },
  { n: 5, rows: 2, cols: 3, overflow: false },
  { n: 6, rows: 2, cols: 3, overflow: false },
  { n: 7, rows: 2, cols: 4, overflow: false },
  { n: 8, rows: 2, cols: 4, overflow: false },
  { n: 9, rows: 2, cols: 4, overflow: true },
  { n: 10, rows: 2, cols: 4, overflow: true },
  { n: 11, rows: 2, cols: 4, overflow: true },
  { n: 12, rows: 2, cols: 4, overflow: true },
];
