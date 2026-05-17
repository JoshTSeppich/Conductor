// MB-T-MVP-W2-AGENT-GRID WB1 — pure-fn agent-grid layout calculator.
//
// Operator vision Component 2 (docs/coordination/operator-vision-three-
// pane-conductor-2026-05-17.md:80-85):
//   - "2x2 or 2x3 grid of live tmux mirror tiles for active sub-sessions"
//   - "Should handle 1-12 concurrent tiles gracefully"
//
// Spec table (Q-W2-5 disposition, auto-acked as mechanical-translation
// per CLAUDE.md §3.4 under operator-binding scope-gate "Layout restyle
// ONLY"):
//   N=1     → 1×1
//   N=2     → 1×2
//   N=3-4   → 2×2     ← operator-vision "2x2" anchor
//   N=5-6   → 2×3     ← operator-vision "2x3" anchor
//   N=7-9   → 3×3
//   N=10-12 → 3×4
//   N≥13    → 3×4 explicit grid + overflow=true (graceful degradation
//             beyond stated "1-12 gracefully" range; consumer applies
//             CSS Grid auto-flow + overflow-y: auto on container per
//             tile-layout.ts MB-T12 WB2 precedent).
//
// Peer-module convention: returns same shape as `GridLayout` from
// tile-layout.ts (rows / cols / overflow / gridTemplateAreas) so
// tile-grid.tsx consumes both via a single layout-result variable.
//
// Tile naming + last-tile-spans-leftover-cells visual-balance convention
// mirrors tile-layout.ts:18-24:
//   N=3 → "t0 t1" / "t2 t2"
//   N=5 → "t0 t1 t2" / "t3 t4 t4"
//   N=7 → "t0 t1 t2" / "t3 t4 t5" / "t6 t6 t6"
//   N=10 → "t0..t3" / "t4..t7" / "t8 t9 t9 t9"
// (Even-fit N matches grid capacity exactly → no spans.)

export interface AgentGridLayout {
  readonly rows: number;
  readonly cols: number;
  readonly overflow: boolean;
  readonly gridTemplateAreas: readonly string[];
}

export function computeAgentGridLayout(n: number): AgentGridLayout {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(
      `computeAgentGridLayout: n must be a positive integer, got ${n}`,
    );
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
  } else if (n <= 9) {
    rows = 3;
    cols = 3;
    overflow = false;
  } else if (n <= 12) {
    rows = 3;
    cols = 4;
    overflow = false;
  } else {
    rows = 3;
    cols = 4;
    overflow = true;
  }

  return {
    rows,
    cols,
    overflow,
    gridTemplateAreas: buildAgentGridTemplateAreas(n, rows, cols),
  };
}

function buildAgentGridTemplateAreas(
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
