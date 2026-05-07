// MB-T12 WB2 — pure-fn tile-layout grid-fit calculator.
//
// Spec freeze (CONDUCTOR_V3_RESCOPE.md §3.1 line 45 + §3.3 line 78):
//   1   → 1×1
//   2   → 1×2
//   3-4 → 2×2
//   5-6 → 2×3
//   7-8 → 2×4
//   9+  → 2×4 explicit grid; tiles 9+ flow into implicit rows via
//         CSS Grid auto-flow (consumer applies `grid-auto-rows: 1fr`
//         + `overflow-y: auto` on the container).
//
// Per Q-MBT12-1=a (operator-arbitrated 2026-05-07): pure-fn TS calc
// returning a CSS Grid template; no layout libraries.
// Per Q-MBT12-10=a: tab-strip overflow deferred to v3.1; v3.0 ships
// scroll-only at N≥9 via implicit-row auto-flow.
//
// Tile naming convention: "t0", "t1", ..., up to "t{rows*cols-1}".
// Last tile in each row spans any leftover cells in its row to fill
// the grid evenly — operator-friendly visual balance:
//   N=3 → "t0 t1" / "t2 t2"
//   N=5 → "t0 t1 t2" / "t3 t4 t4"
//   N=7 → "t0 t1 t2 t3" / "t4 t5 t6 t6"
// (Even-fit N matches grid capacity exactly → no spans.)

export interface GridLayout {
  readonly rows: number;
  readonly cols: number;
  readonly overflow: boolean;
  readonly gridTemplateAreas: readonly string[];
}

export function computeGridLayout(n: number): GridLayout {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`computeGridLayout: n must be a positive integer, got ${n}`);
  }

  let rows: number;
  let cols: number;
  let overflow: boolean;
  if (n === 1) {
    rows = 1;
    cols = 1;
    overflow = false;
  } else if (n === 2) {
    rows = 1;
    cols = 2;
    overflow = false;
  } else if (n <= 4) {
    rows = 2;
    cols = 2;
    overflow = false;
  } else if (n <= 6) {
    rows = 2;
    cols = 3;
    overflow = false;
  } else if (n <= 8) {
    rows = 2;
    cols = 4;
    overflow = false;
  } else {
    rows = 2;
    cols = 4;
    overflow = true;
  }

  return {
    rows,
    cols,
    overflow,
    gridTemplateAreas: buildGridTemplateAreas(n, rows, cols),
  };
}

// MB-T12 WB7 — drag-resize sizing math.
//
// Pure fn: takes initial pixel sizes for the row or column band, the
// border-index being dragged (between i and i+1), the pixel delta, and
// a min-size clamp. Returns new sizes for all bands.
//
// Delta semantics: positive delta grows band[borderIdx] (the LEFT/TOP
// band) and shrinks band[borderIdx + 1]. Negative delta does the reverse.
// Min-pixel clamp: the function will not let either adjacent band shrink
// below `minPx`. If the requested delta would violate the clamp, the
// effective delta is clipped to fit.
export function computeNewSizesAfterDrag(
  initialSizes: readonly number[],
  borderIdx: number,
  deltaPx: number,
  minPx = 80,
): number[] {
  if (!Number.isInteger(borderIdx) || borderIdx < 0 || borderIdx >= initialSizes.length - 1) {
    throw new Error(
      `computeNewSizesAfterDrag: borderIdx=${borderIdx} out of range for ${initialSizes.length} sizes`,
    );
  }
  const newSizes = [...initialSizes];
  // Allowable delta range:
  //   upper: how far we can grow band[borderIdx] before band[borderIdx+1] hits minPx
  //   lower: how far we can shrink band[borderIdx] before it hits minPx (negative)
  const upper = newSizes[borderIdx + 1] - minPx;
  const lower = minPx - newSizes[borderIdx];
  const clamped = Math.max(lower, Math.min(upper, deltaPx));
  newSizes[borderIdx] += clamped;
  newSizes[borderIdx + 1] -= clamped;
  return newSizes;
}

function buildGridTemplateAreas(
  n: number,
  rows: number,
  cols: number,
): readonly string[] {
  const totalCells = rows * cols;
  const visibleN = Math.min(n, totalCells);
  const cells: string[] = [];
  for (let i = 0; i < totalCells; i++) {
    cells.push(i < visibleN ? `t${i}` : '.');
  }
  const lastTileIdx = visibleN - 1;
  if (lastTileIdx >= 0) {
    const lastTileRow = Math.floor(lastTileIdx / cols);
    const rowEndIdx = (lastTileRow + 1) * cols;
    for (let i = lastTileIdx + 1; i < rowEndIdx; i++) {
      cells[i] = `t${lastTileIdx}`;
    }
  }
  const areas: string[] = [];
  for (let r = 0; r < rows; r++) {
    areas.push(cells.slice(r * cols, (r + 1) * cols).join(' '));
  }
  return areas;
}
